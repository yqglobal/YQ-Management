import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { Injectable } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {
    // Use process.env directly – ConfigService.get() may not be ready
    // when super() is called synchronously during DI construction.
    const clientID = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const backendUrl =
      process.env.BACKEND_URL || 'https://qmova-backend.onrender.com';
    const callbackURL = `${backendUrl}/auth/google/callback`;

    if (!clientID || !clientSecret) {
      console.error(
        '[GoogleStrategy] GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is missing! OAuth will fail.',
      );
    }

    super({
      clientID: clientID || 'missing-client-id',
      clientSecret: clientSecret || 'missing-client-secret',
      callbackURL,
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    const email = profile.emails?.[0]?.value;
    const googleId = profile.sub || profile.id;
    const fullName = profile.displayName || `${profile.name?.givenName || ''} ${profile.name?.familyName || ''}`.trim() || undefined;

    if (!email) {
      return done(new Error('No email found in Google profile'));
    }

    const user = await this.authService.validateOAuthLogin(email, googleId, fullName);
    done(null, user);
  }
}
