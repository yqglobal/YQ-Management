import {
  Injectable,
  UnauthorizedException,
  Logger,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private emailService: EmailService,
    private prisma: PrismaService,
  ) {}

  private generateOTP(): string {
    if (process.env.TEST_MODE === 'true') {
      return '000000';
    }
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.usersService.findOneByEmail(email);
    if (!user) return null;

    if (!user.password && user.googleId) {
      throw new UnauthorizedException('ACCOUNT_LINKED_GOOGLE');
    }

    if (user.password && (await bcrypt.compare(pass, user.password))) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async generateAndSendOTP(
    email: string,
    purpose: 'signup' | 'login' | 'reset',
  ) {
    const otp = this.generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await this.prisma.user.update({
      where: { email },
      data: { otpCode: otp, otpExpiresAt: expiresAt },
    });

    try {
      await this.emailService.sendOTP(email, otp, purpose);
    } catch (error) {
      this.logger.error(`Failed to send OTP email to ${email}`, error);
    }
  }

  async verifyOTP(
    email: string,
    otp: string,
    intent: 'login' | 'signup' | 'reset' = 'login',
  ) {
    const user = await this.usersService.findOneByEmail(email);
    if (
      !user ||
      user.otpCode !== otp ||
      !user.otpExpiresAt ||
      user.otpExpiresAt < new Date()
    ) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    await this.prisma.user.update({
      where: { email },
      data: { otpCode: null, otpExpiresAt: null },
    });

    if (intent === 'signup') {
      const settings = (user.personalSettings as Record<string, any>) || {};
      const fullName = settings.fullName || '';
      this.emailService
        .sendWelcomeEmail(email, fullName)
        .catch((err) =>
          this.logger.error(`Failed to send welcome email to ${email}`, err),
        );
    } else if (intent === 'login') {
      this.emailService
        .sendLoginNotification(email)
        .catch((err) =>
          this.logger.error(
            `Failed to send login notification to ${email}`,
            err,
          ),
        );
    }

    return user;
  }

  async validateOAuthLogin(
    email: string,
    googleId: string,
    fullName?: string,
    intent: string = 'login',
    accessToken?: string,
    refreshToken?: string,
  ) {
    try {
      let user = await this.usersService.findOneByEmail(email);
      let isNewUser = false;

      if (intent === 'login') {
        if (!user) {
          this.logger.log(`Google Login attempted but no account: ${email}`);
          return { _oauthError: 'NO_ACCOUNT' };
        }
        if (!user.googleId) {
          return { _oauthError: 'EMAIL_PWD_ACCOUNT' };
        }
      } else if (intent === 'signup') {
        if (user) {
          return {
            _oauthError: user.googleId
              ? 'ALREADY_LINKED_GOOGLE'
              : 'EMAIL_PWD_ACCOUNT',
          };
        }

        this.logger.log(
          `Creating tenant + user for Google SSO signup: ${email}`,
        );
        const tenantName = email.split('@')[0] + "'s Workspace";

        const tenant = await this.prisma.tenant.create({
          data: { name: tenantName, subdomain: `tenant-${Date.now()}` },
        });

        user = await this.prisma.user.create({
          data: {
            email,
            googleId,
            role: 'TENANT_ADMIN',
            tenantId: tenant.id,
            personalSettings: {
              theme: 'light',
              language: 'en',
              notificationsEnabled: true,
              onboardingCompleted: false,
              ...(fullName ? { fullName } : {}),
            },
          },
        });

        isNewUser = true;
      }

      if (
        user &&
        user.role === 'TENANT_ADMIN' &&
        (accessToken || refreshToken)
      ) {
        await this.prisma.tenant.update({
          where: { id: user.tenantId },
          data: {
            ...(accessToken ? { googleAccessToken: accessToken } : {}),
            ...(refreshToken ? { googleRefreshToken: refreshToken } : {}),
          },
        });
      }

      return { ...user, isNewUser };
    } catch (error) {
      this.logger.error('Error in validateOAuthLogin', error as Error);
      throw error;
    }
  }

  async login(user: any, ip?: string, userAgent?: string) {
    const jti = require('crypto').randomUUID();
    const payload = {
      email: user.email,
      sub: user.id,
      role: user.role,
      tenantId: user.tenantId,
      personalSettings: user.personalSettings,
      jti,
    };
    const access_token = this.jwtService.sign(payload);

    try {
      await this.prisma.userSession.create({
        data: {
          userId: user.id,
          token: access_token,
          ipAddress: ip,
          userAgent: userAgent,
          deviceInfo: { raw: userAgent },
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });
    } catch (e) {
      this.logger.error('Failed to create session record', e);
    }

    return { access_token };
  }

  async registerUser(email: string, password: string, fullName?: string) {
    // Tenant is the single root entity — no Workspace created on registration
    const tenant = await this.prisma.tenant.create({
      data: {
        name: 'My Company',
        subdomain: `tenant-${Date.now()}`,
      },
    });

    const newUser = await this.usersService.create({
      email,
      password,
      role: 'TENANT_ADMIN',
      tenantId: tenant.id,
      personalSettings: {
        theme: 'light',
        language: 'en',
        notificationsEnabled: true,
        onboardingCompleted: false,
        ...(fullName ? { fullName } : {}),
      },
    });

    const user = await this.prisma.user.findUnique({
      where: { id: newUser.id },
    });
    if (!user) {
      throw new InternalServerErrorException(
        'User not found after registration',
      );
    }

    return user;
  }

  /**
   * Join an existing tenant via an invitation code.
   * Called when a new or existing user accepts a team invite.
   */
  async joinWithInvite(
    userId: string,
    inviteCode: string,
  ): Promise<{ tenantId: string; role: string }> {
    const invitation = await this.prisma.invitation.findFirst({
      where: { code: inviteCode.toUpperCase(), used: false },
    });

    if (!invitation)
      throw new BadRequestException('Invalid or already used invitation code');
    if (invitation.expiresAt && invitation.expiresAt < new Date()) {
      throw new BadRequestException('Invitation code has expired');
    }
    if (invitation.usedCount >= invitation.maxUses) {
      throw new BadRequestException('Invitation has reached its maximum uses');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found');

    if (user.tenantId === invitation.tenantId) {
      throw new BadRequestException('You are already a member of this team');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        tenantId: invitation.tenantId,
        role: invitation.role,
        allowedLocationIds: invitation.allowedLocationIds,
        allowedServiceIds: invitation.allowedServiceIds,
        allowedPages: invitation.allowedPages,
      },
    });

    const newCount = invitation.usedCount + 1;
    await this.prisma.invitation.update({
      where: { id: invitation.id },
      data: {
        usedCount: newCount,
        used: newCount >= invitation.maxUses,
        usedAt: newCount >= invitation.maxUses ? new Date() : undefined,
      },
    });

    this.logger.log(
      `User ${userId} joined tenant ${invitation.tenantId} via invite ${inviteCode}`,
    );
    return { tenantId: invitation.tenantId, role: invitation.role };
  }
}
