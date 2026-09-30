import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { GoogleStrategy } from './google.strategy';
import { User } from '../models/user.entity';
import { FamilyGroup } from '../models/family-group.entity';
import { DatabaseModule } from '../database/database.module';
import { CommonModule } from '../common/common.module';
import { requireJwtSecret } from './jwt-secret';

@Module({
  imports: [
    DatabaseModule,
    CommonModule,
    PassportModule,
    TypeOrmModule.forFeature([User, FamilyGroup]),
    JwtModule.register({
      secret: requireJwtSecret(),
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, GoogleStrategy],
  exports: [AuthService],
})
export class AuthModule {}
