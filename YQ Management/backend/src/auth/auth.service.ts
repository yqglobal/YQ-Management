import {
  Injectable,
  UnauthorizedException,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { EmailService } from '../email/email.service';
import { WorkspaceService } from '../workspace/workspace.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private emailService: EmailService,
    private workspaceService: WorkspaceService,
  ) {}

  private generateOTP(): string {
    if (process.env.TEST_MODE === 'true') {
      return '000000';
    }
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.usersService.findOneByEmail(email);
    if (user && user.password && (await bcrypt.compare(pass, user.password))) {
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
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    await this.usersService['prisma'].user.update({
      where: { email },
      data: {
        otpCode: otp,
        otpExpiresAt: expiresAt,
      },
    });

    try {
      await this.emailService.sendOTP(email, otp, purpose);
    } catch (error) {
      this.logger.error(`Failed to send OTP email to ${email}`, error);
    }
  }

  async verifyOTP(email: string, otp: string) {
    const user = await this.usersService.findOneByEmail(email);
    if (
      !user ||
      user.otpCode !== otp ||
      !user.otpExpiresAt ||
      user.otpExpiresAt < new Date()
    ) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    // Clear OTP
    await this.usersService['prisma'].user.update({
      where: { email },
      data: {
        otpCode: null,
        otpExpiresAt: null,
      },
    });

    // Fire and forget login notification
    this.emailService
      .sendLoginNotification(email)
      .catch((err) =>
        this.logger.error(`Failed to send login notification to ${email}`, err),
      );

    return user;
  }

  async validateOAuthLogin(email: string, googleId: string) {
    try {
      let user = await this.usersService.findOneByEmail(email);
      let isNewUser = false;

      if (!user) {
        // Auto-create account via Google SSO (Sign Up flow)
        isNewUser = true;
        const tenant = await this.usersService['prisma'].tenant.create({
          data: {
            name: email.split('@')[0],
            subdomain: `${email
              .split('@')[0]
              .toLowerCase()
              .replace(/[^a-z0-9]/g, '')}-${Date.now()}`,
          },
        });
        user = await this.usersService.create({
          email,
          googleId,
          role: 'TENANT_ADMIN',
          tenantId: tenant.id,
          personalSettings: {
            theme: 'light',
            language: 'en',
            notificationsEnabled: true,
          },
        });
        await this.workspaceService.createWorkspace({
          name: email.split('@')[0],
          subdomain: `ws-${Date.now()}`,
          ownerId: user.id,
          tenantId: tenant.id,
        });
        user = await this.usersService['prisma'].user.findUnique({
          where: { id: user.id },
        });
        this.logger.log(`New user created via Google SSO: ${email}`);
      } else if (!user.googleId) {
        // Link Google ID if account already exists with email
        user = await this.usersService['prisma'].user.update({
          where: { id: user.id },
          data: { googleId },
        });
      }

      return { ...user, isNewUser };
    } catch (error) {
      this.logger.error('Error in validateOAuthLogin', error as Error);
      throw error;
    }
  }

  async login(user: any) {
    const payload = {
      email: user.email,
      sub: user.id,
      role: user.role,
      tenantId: user.tenantId,
      workspaceId: user.workspaceId || user.tenantId,
      personalSettings: user.personalSettings,
      jti: require('crypto').randomUUID(),
    };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async registerUser(email: string, password: string) {
    const tenant = await this.usersService['prisma'].tenant.create({
      data: {
        name: 'My Company',
        subdomain: `temp-${Date.now()}`,
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
      },
    });

    const workspace = await this.workspaceService.createWorkspace({
      name: 'My Company',
      subdomain: `mycompany-${Date.now()}`,
      ownerId: newUser.id,
      tenantId: tenant.id,
    });

    const updatedUser = await this.usersService['prisma'].user.findUnique({
      where: { id: newUser.id },
    });
    if (!updatedUser) {
      throw new InternalServerErrorException(
        'User not found after workspace assignment',
      );
    }

    return updatedUser;
  }
}
