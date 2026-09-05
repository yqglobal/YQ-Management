import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { Injectable } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';

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
    const rawBackendUrl = process.env.BACKEND_URL || 'https://api.qmova.yqbuddy.com';
    const backendUrl = rawBackendUrl.replace(/\/+$/, '');
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
      scope: [
        'email',
        'profile',
        'https://www.googleapis.com/auth/calendar.events',
        'https://www.googleapis.com/auth/business.manage',
      ],
      passReqToCallback: true,
    });
  }

  authorizationParams(): any {
    return {
      access_type: 'offline',
      prompt: 'consent select_account',
    };
  }

  async validate(
    req: any,
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    const email = profile.emails?.[0]?.value;
    const googleId = profile.sub || profile.id;
    const fullName =
      profile.displayName ||
      `${profile.name?.givenName || ''} ${profile.name?.familyName || ''}`.trim() ||
      undefined;

    if (!email) {
      return done(new Error('No email found in Google profile'));
    }

    const intent = req.query.state || 'login';

    if (intent === 'link_tenant') {
      const token = req.cookies?.token;
      if (!token) {
        return done(new Error('Not logged in to link account'));
      }
      try {
        const secret = process.env.JWT_SECRET || 'fallback-secret-for-jwt';
        const decoded: any = jwt.verify(token, secret);
        const user = await this.authService.linkGoogleAccount(
          decoded.sub,
          googleId,
          email,
          accessToken,
          refreshToken,
        );
        return done(null, user);
      } catch (error) {
        return done(error as Error);
      }
    }

    // Passing accessToken and refreshToken to be handled in validateOAuthLogin
    const user = await this.authService.validateOAuthLogin(
      email,
      googleId,
      fullName,
      intent,
      accessToken,
      refreshToken,
    );
    done(null, user);
  }
}
