import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'prisma/prisma.service';
import { RegisterDto, LoginDto, GoogleLoginDto } from './dto/auth.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(data: RegisterDto) {
    const exists = await this.prisma.user.findUnique({ where: { email: data.email } });
    if (exists) throw new BadRequestException('E-mail já cadastrado');

    let familyGroupId: string | null = null;

    if (data.inviteCode) {
      const group = await this.prisma.familyGroup.findUnique({
        where: { inviteCode: data.inviteCode },
      });
      if (!group) throw new BadRequestException('Código de família inválido');
      familyGroupId = group.id;
    }

    const hashedPassword = await bcrypt.hash(data.password, 12);
    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        password: hashedPassword,
        familyGroupId: familyGroupId,
      },
    });

    return this.generateToken(user);
  }

  async login(data: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: data.email } });
    
    // Importante verificar se o usuário tem senha (usuários Google puramente podem não ter)
    if (!user || !user.password || !(await bcrypt.compare(data.password, user.password))) {
      throw new UnauthorizedException('Credenciais incorretas');
    }
    return this.generateToken(user);
  }

  /**
   * Método para o fluxo WEB (Passport Google Strategy)
   * Recebe o perfil vindo do Google e valida no banco
   */
  async loginSocial(profile: any) {
    let user = await this.prisma.user.findUnique({
      where: { email: profile.email },
    });

    if (!user) {
      // Cria o usuário se for o primeiro acesso via Google
      user = await this.prisma.user.create({
        data: {
          email: profile.email,
          name: profile.name,
          avatar: profile.avatar,
          // Senha nula ou aleatória para segurança
          password: await bcrypt.hash(Math.random().toString(36), 12),
        },
      });
    }

    return this.generateToken(user);
  }

  /**
   * Método para o fluxo MOBILE ou chamadas via POST direto
   */
  async googleLogin(data: GoogleLoginDto) {
    let user = await this.prisma.user.findUnique({ where: { email: data.email } });

    if (!user) {
      let familyGroupId: string | null = null;

      if (data.inviteCode) {
        const group = await this.prisma.familyGroup.findUnique({
          where: { inviteCode: data.inviteCode },
        });
        familyGroupId = group?.id || null;
      }

      user = await this.prisma.user.create({
        data: {
          email: data.email,
          name: data.name,
          avatar: data.avatar,
          password: await bcrypt.hash(Math.random().toString(36), 12),
          familyGroupId,
        },
      });
    }

    return this.generateToken(user);
  }

  private generateToken(user: any) {
    const payload = { sub: user.id, email: user.email };
    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        familyGroupId: user.familyGroupId,
      },
      // Corrigido para retornar o nome padrão camelCase para o frontend
      access_token: this.jwtService.sign(payload),
    };
  }
}