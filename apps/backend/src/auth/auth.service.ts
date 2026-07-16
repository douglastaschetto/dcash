import {
  Injectable,
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
import { RegisterDto, LoginDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly db: DatabaseService,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(FamilyGroup)
    private readonly familyGroupRepo: Repository<FamilyGroup>,
  ) {}

  async register(data: RegisterDto) {
    const existing = await this.userRepo.findOne({ where: { email: data.email } });
    if (existing) throw new BadRequestException('E-mail já cadastrado');

    let familyGroup: FamilyGroup | null = null;
    if (data.inviteCode) {
      familyGroup = await this.familyGroupRepo.findOne({
        where: { inviteCode: data.inviteCode },
      });
      if (!familyGroup) throw new BadRequestException('Código de família inválido');
    }

    const hashedPassword = await bcrypt.hash(data.password, 12);
    const user = this.userRepo.create({
      name: data.name,
      email: data.email,
      password: hashedPassword,
      ...(familyGroup ? { familyGroup } : {}),
    });
    await this.userRepo.save(user);

    return { ...this.generateToken(user), firstLogin: true };
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

    return { ...this.generateToken(user), firstLogin: false };
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

    return { ...this.generateToken(user), firstLogin: isNew };
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.userRepo.findOne({ where: { email } });
    if (!user) return; // silencioso por segurança
    // TODO: gerar token de reset + enviar e-mail
  }

  async getProfile(userId: string) {
    const rows = await this.db.query(
      `SELECT
         u.id, u.name, u.email, u.avatar,
         u.phone, u.theme, u.plan, u.is_admin AS "isAdmin",
         u.whatsapp_consent AS "whatsappConsent",
         u.whatsapp_alert_hour AS "whatsappAlertHour",
         u.google_calendar_sync AS "googleCalendarSync",
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
      familyGroupId: u.familyGroupId ?? null,
      familyGroup: u.fgId
        ? { id: u.fgId, name: u.fgName, inviteCode: u.fgInviteCode }
        : null,
    };
  }

  async updateProfile(userId: string, data: {
    name?: string; phone?: string; avatar?: string; whatsappConsent?: boolean;
    whatsappAlertHour?: number; googleCalendarSync?: boolean;
  }) {
    const sets: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (data.name !== undefined)               { sets.push(`name = $${idx++}`);                 params.push(data.name || null); }
    if (data.phone !== undefined)              { sets.push(`phone = $${idx++}`);                params.push(data.phone || null); }
    if (data.avatar !== undefined)             { sets.push(`avatar = $${idx++}`);               params.push(data.avatar || null); }
    if (data.whatsappConsent !== undefined)    { sets.push(`whatsapp_consent = $${idx++}`);      params.push(data.whatsappConsent); }
    if (data.whatsappAlertHour !== undefined)  { sets.push(`whatsapp_alert_hour = $${idx++}`);   params.push(data.whatsappAlertHour); }
    if (data.googleCalendarSync !== undefined) { sets.push(`google_calendar_sync = $${idx++}`);  params.push(data.googleCalendarSync); }

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
    await this.db.query(
      'UPDATE db_dtasc.users SET theme = $1 WHERE id = $2',
      [theme, userId],
    );
    return { success: true, theme };
  }

  async updatePlan(userId: string, plan: string) {
    const normalized = plan.toLowerCase();
    const valid = ['free', 'basico', 'intermediario', 'pro'];
    if (!valid.includes(normalized)) throw new BadRequestException('Plano inválido');
    plan = normalized;
    await this.db.query(
      'UPDATE db_dtasc.users SET plan = $1 WHERE id = $2',
      [plan, userId],
    );
    return { success: true, plan };
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
