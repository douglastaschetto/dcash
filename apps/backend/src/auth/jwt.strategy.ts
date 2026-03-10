// apps/backend/src/auth/strategies/jwt.strategy.ts
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'dcash_secret_key',
    });
  }

  async validate(payload: any) {
    // Debug: Veja no console do NestJS se o 'sub' ou 'id' está chegando
    // console.log('JWT Payload:', payload);

    const userId = payload.sub || payload.id;

    if (!userId) {
      throw new UnauthorizedException('Payload do token inválido');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, familyGroupId: true, name: true }
    });

    if (!user) {
      throw new UnauthorizedException('Usuário não encontrado no banco');
    }

    return user; // Isso vira o req.user
  }
}