import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback, StrategyOptions } from 'passport-google-oauth20';
import { Injectable } from '@nestjs/common';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor() {
    super({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      // MUDANÇA AQUI: Removemos o localhost e usamos a variável de ambiente
      callbackURL: process.env.GOOGLE_CALLBACK_URL, 
      scope: ['email', 'profile'],
      passReqToCallback: false, 
    } as StrategyOptions);
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    const { name, emails, photos } = profile;
    
    const user = {
      email: emails[0].value,
      name: `${name.givenName} ${name.familyName}`,
      avatar: photos[0].value,
      accessToken,
    };
    
    done(null, user);
  }
}