import {
  Injectable,
  Logger,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from '../models/user.entity';
import { FamilyGroup } from '../models/family-group.entity';
import { DatabaseService } from '../database/database.service';
import { EmailService } from '../common/email/email.service';
import {
  RegisterDto,
  LoginDto,
  VerifyCodeDto,
  ResetPasswordDto,
} from './dto/auth.dto';
import {
  AuthCodesService,
  maskEmail,
  type CodePurpose,
} from './auth-codes.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly db: DatabaseService,
    private readonly emailService: EmailService,
    private readonly codes: AuthCodesService,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(FamilyGroup)
    private readonly familyGroupRepo: Repository<FamilyGroup>,
  ) {}

  async register(data: RegisterDto) {
    const existing = await this.userRepo.findOne({
      where: { email: data.email },
    });
    if (existing) throw new BadRequestException('E-mail já cadastrado');

    let familyGroup: FamilyGroup | null = null;
    if (data.inviteCode) {
      familyGroup = await this.familyGroupRepo.findOne({
        where: { inviteCode: data.inviteCode },
      });
      if (!familyGroup)
        throw new BadRequestException('Código de família inválido');
    }

    const hashedPassword = await bcrypt.hash(data.password, 12);
    const user = this.userRepo.create({
      name: data.name,
      email: data.email,
      password: hashedPassword,
      ...(familyGroup ? { familyGroup } : {}),
    });
    await this.userRepo.save(user);
    if (!this.twoFactorOn)
      return { ...this.generateToken(user), firstLogin: true };
    await this.db.query(
      'UPDATE db_dtasc.users SET email_verified = false WHERE id = $1',
      [user.id],
    );

    // Account is only usable after confirming the e-mail code
    await this.codes.issue(user, 'verify_email');
    return this.challengeFor(user.email, 'verify_email');
  }

  /**
   * Without SMTP in production nobody could receive a code (lockout), so the
   * second factor is skipped there and the problem is logged loudly. In dev the
   * code is printed in the server log instead.
   */
  private get twoFactorOn() {
    if (this.emailService.isConfigured || process.env.NODE_ENV !== 'production')
      return true;
    this.logger.error(
      'SMTP não configurado em produção — verificação em duas etapas DESATIVADA. Configure SMTP_HOST/SMTP_USER/SMTP_PASS.',
    );
    return false;
  }

  /** Response telling the client to show the code screen. */
  private challengeFor(email: string, purpose: CodePurpose) {
    return {
      requiresCode: true as const,
      purpose,
      email: maskEmail(email),
      challenge: this.codes.signChallenge(email, purpose),
    };
  }

  private async isVerified(userId: string) {
    const [row] = await this.db.query<{ email_verified: boolean }>(
      'SELECT email_verified FROM db_dtasc.users WHERE id = $1',
      [userId],
    );
    return row?.email_verified !== false;
  }

  async login(data: LoginDto) {
    const user = await this.userRepo.findOne({ where: { email: data.email } });

    if (!user || !(await bcrypt.compare(data.password, user.password))) {
      throw new UnauthorizedException('E-mail ou senha inválidos');
    }

    // Se forneceu invite code e ainda não está em um grupo, entra no grupo
    if (data.inviteCode && !user.familyGroupId) {
      const familyGroup = await this.familyGroupRepo.findOne({
        where: { inviteCode: data.inviteCode },
      });
      if (familyGroup) {
        user.familyGroup = familyGroup;
        await this.userRepo.save(user);
      }
    }

    if (!this.twoFactorOn)
      return { ...this.generateToken(user), firstLogin: false };

    // Second factor: e-mail not confirmed yet → confirm it first
    if (!(await this.isVerified(user.id))) {
      await this.codes.issue(user, 'verify_email', { reuseRecent: true });
      return this.challengeFor(user.email, 'verify_email');
    }
    // Known device (verified in the last 30 days) → straight in
    if (await this.codes.isTrusted(user.id, data.deviceToken)) {
      return { ...this.generateToken(user), firstLogin: false };
    }
    await this.codes.issue(user, 'login', { reuseRecent: true });
    return this.challengeFor(user.email, 'login');
  }

  /** Second step: checks the e-mail code and logs the user in. */
  async verifyCode(data: VerifyCodeDto, userAgent?: string) {
    const { email, purpose } = this.codes.readChallenge(data.challenge);
    if (purpose === 'reset_password')
      throw new BadRequestException('Use a tela de nova senha.');
    const user = await this.userRepo.findOne({ where: { email } });
    if (!user) throw new BadRequestException('Código expirado. Peça um novo.');
    await this.codes.verify(user.id, purpose, data.code);
    if (purpose === 'verify_email') {
      await this.db.query(
        'UPDATE db_dtasc.users SET email_verified = true WHERE id = $1',
        [user.id],
      );
    }
    const deviceToken = data.trustDevice
      ? await this.codes.trustDevice(user.id, userAgent)
      : undefined;
    return {
      ...this.generateToken(user),
      firstLogin: purpose === 'verify_email',
      deviceToken,
    };
  }

  async resendCode(challenge: string) {
    const { email, purpose } = this.codes.readChallenge(challenge);
    const user = await this.userRepo.findOne({ where: { email } });
    // Unknown e-mail (password reset) answers the same way — no account enumeration
    if (user) await this.codes.issue(user, purpose);
    return { success: true, email: maskEmail(email) };
  }

  async loginSocial(profile: { email: string; name: string; avatar?: string }) {
    let user = await this.userRepo.findOne({ where: { email: profile.email } });
    const isNew = !user;

    if (!user) {
      const randomPass = await bcrypt.hash(Math.random().toString(36), 12);
      user = this.userRepo.create({
        email: profile.email,
        name: profile.name,
        avatar: profile.avatar,
        password: randomPass,
      });
      await this.userRepo.save(user);
    }
    // Google already verified this e-mail
    await this.db.query(
      'UPDATE db_dtasc.users SET email_verified = true WHERE id = $1 AND email_verified = false',
      [user.id],
    );

    return { ...this.generateToken(user), firstLogin: isNew };
  }

  /** Google callback → one-time code for the redirect (the token never goes in the URL). */
  async googleRedirectCode(profile: {
    email: string;
    name: string;
    avatar?: string;
  }) {
    const result = await this.loginSocial(profile);
    return this.codes.issueOAuthCode(result.user.id, result.firstLogin);
  }

  /** The app trades the one-time code for the session. */
  async exchangeOAuthCode(code: string) {
    const { userId, firstLogin } = await this.codes.consumeOAuthCode(code);
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('Sessão inválida.');
    return { ...this.generateToken(user), firstLogin };
  }

  /** Always answers with a challenge, whether the e-mail exists or not. */
  async forgotPassword(email: string) {
    const normalized = email.trim().toLowerCase();
    const user =
      (await this.userRepo.findOne({ where: { email: normalized } })) ??
      (await this.userRepo.findOne({ where: { email: email.trim() } }));
    if (user)
      await this.codes.issue(user, 'reset_password', { reuseRecent: true });
    return this.challengeFor(user?.email ?? normalized, 'reset_password');
  }

  /** Validates the e-mailed code, sets the new password and signs the user in. */
  async resetPassword(data: ResetPasswordDto) {
    const { email } = this.codes.readChallenge(
      data.challenge,
      'reset_password',
    );
    const user = await this.userRepo.findOne({ where: { email } });
    if (!user) throw new BadRequestException('Código incorreto.');
    await this.codes.verify(user.id, 'reset_password', data.code);
    const hashedPassword = await bcrypt.hash(data.password, 12);
    await this.db.query(
      'UPDATE db_dtasc.users SET password = $1, email_verified = true, password_changed_at = NOW() WHERE id = $2',
      [hashedPassword, user.id],
    );
    // A password change logs out every remembered device
    await this.codes.revokeDevices(user.id);
    return { ...this.generateToken(user), firstLogin: false };
  }

  async getProfile(userId: string) {
    const rows = await this.db.query(
      `SELECT
         u.id, u.name, u.email, u.avatar,
         u.phone, u.theme, u.plan, u.is_admin AS "isAdmin",
         u.whatsapp_consent AS "whatsappConsent",
         u.whatsapp_alert_hour AS "whatsappAlertHour",
         u.google_calendar_sync AS "googleCalendarSync",
         u.plan_expires_at AS "planExpiresAt",
         u.plan_status AS "planStatus",
         u.plan_billing_cycle AS "planBillingCycle",
         u.family_group_id  AS "familyGroupId",
         fg.id              AS "fgId",
         fg.name            AS "fgName",
         fg.invite_code     AS "fgInviteCode"
       FROM db_dtasc.users u
       LEFT JOIN db_dtasc.family_groups fg ON fg.id = u.family_group_id
       WHERE u.id = $1`,
      [userId],
    );
    const u = rows[0];
    if (!u) return null;
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      avatar: u.avatar ?? null,
      phone: u.phone ?? null,
      theme: u.theme ?? 'system',
      plan: u.plan ?? 'free',
      isAdmin: u.isAdmin ?? false,
      whatsappConsent: u.whatsappConsent ?? false,
      whatsappAlertHour: u.whatsappAlertHour ?? 8,
      googleCalendarSync: u.googleCalendarSync ?? true,
      planExpiresAt: u.planExpiresAt ?? null,
      planStatus: u.planStatus ?? 'active',
      planBillingCycle: u.planBillingCycle ?? null,
      familyGroupId: u.familyGroupId ?? null,
      familyGroup: u.fgId
        ? { id: u.fgId, name: u.fgName, inviteCode: u.fgInviteCode }
        : null,
    };
  }

  async updateProfile(
    userId: string,
    data: {
      name?: string;
      phone?: string;
      avatar?: string;
      whatsappConsent?: boolean;
      whatsappAlertHour?: number;
      googleCalendarSync?: boolean;
    },
  ) {
    const sets: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (data.name !== undefined) {
      sets.push(`name = $${idx++}`);
      params.push(data.name || null);
    }
    if (data.phone !== undefined) {
      sets.push(`phone = $${idx++}`);
      params.push(data.phone || null);
    }
    if (data.avatar !== undefined) {
      sets.push(`avatar = $${idx++}`);
      params.push(data.avatar || null);
    }
    if (data.whatsappConsent !== undefined) {
      sets.push(`whatsapp_consent = $${idx++}`);
      params.push(data.whatsappConsent);
    }
    if (data.whatsappAlertHour !== undefined) {
      sets.push(`whatsapp_alert_hour = $${idx++}`);
      params.push(data.whatsappAlertHour);
    }
    if (data.googleCalendarSync !== undefined) {
      sets.push(`google_calendar_sync = $${idx++}`);
      params.push(data.googleCalendarSync);
    }

    if (sets.length > 0) {
      params.push(userId);
      await this.db.query(
        `UPDATE db_dtasc.users SET ${sets.join(', ')} WHERE id = $${idx}`,
        params,
      );
    }
    return this.getProfile(userId);
  }

  async updateTheme(userId: string, theme: string) {
    await this.db.query('UPDATE db_dtasc.users SET theme = $1 WHERE id = $2', [
      theme,
      userId,
    ]);
    return { success: true, theme };
  }

  private generateToken(user: User) {
    const payload = { sub: user.id, email: user.email };
    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        familyGroupId: user.familyGroupId,
      },
      token: this.jwtService.sign(payload),
    };
  }
}
