import { GoogleAuthGuard } from './google-auth.guard';
import {
  Controller,
  Post,
  Body,
  Patch,
  UnauthorizedException,
  Get,
  UseGuards,
  Req,
  Res,
  Logger,
  Ip,
  Headers,
  Delete,
  Param,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { AuthGuard } from '@nestjs/passport';
import { EmailService } from '../email/email.service';
import { ThrottlerGuard } from '@nestjs/throttler';
import { PasswordResetService } from './password-reset.service';
import type { AuthenticatedRequest } from './types/auth.types';
import { RedisService } from '../redis/redis.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
    private readonly emailService: EmailService,
    private readonly passwordResetService: PasswordResetService,
    private readonly redisService: RedisService,
  ) {}

  @UseGuards(ThrottlerGuard)
  @Post('login')
  async login(
    @Body() body: any,
    @Res({ passthrough: true }) res: any,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    const user = await this.authService.validateUser(body.email, body.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isSuperAdmin =
      user.role === 'SUPER_ADMIN' ||
      user.email?.toLowerCase() === 'yqbuddysa@gmail.com' ||
      user.email?.toLowerCase() ===
        process.env.SUPER_ADMIN_EMAIL?.toLowerCase();
    if (isSuperAdmin) {
      const { access_token } = await this.authService.login(user, ip, userAgent);
      res.cookie('token', access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        path: '/',
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });
      return { success: true, requiresOtp: false, user, access_token };
    }

    await this.authService.generateAndSendOTP(body.email, 'login');
    return { success: true, requiresOtp: true, email: body.email };
  }

  @UseGuards(ThrottlerGuard)
  @Post('resend-otp')
  async resendOtp(
    @Body() body: { email: string; purpose: 'signup' | 'login' | 'reset' },
  ) {
    await this.authService.generateAndSendOTP(
      body.email,
      body.purpose || 'login',
    );
    return {
      success: true,
      message: 'A new verification code has been sent to your email.',
    };
  }

  @UseGuards(ThrottlerGuard)
  @Post('verify-login')
  async verifyLogin(
    @Body() body: { email: string; otp: string },
    @Res({ passthrough: true }) res: any,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    const user = await this.authService.verifyOTP(body.email, body.otp);

    const { access_token } = await this.authService.login(user, ip, userAgent);

    res.cookie('token', access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
    return { success: true, user, access_token };
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('logout')
  async logout(@Req() req: any, @Res({ passthrough: true }) res: any) {
    if (req.user?.jti) {
      await this.redisService.client.set(
        `blocklist:${req.user.jti}`,
        '1',
        'EX',
        7 * 24 * 60 * 60,
      );
    }
    res.clearCookie('token', { path: '/' });
    return { success: true, message: 'Logged out successfully' };
  }

  @UseGuards(ThrottlerGuard)
  @Post('register')
  async register(@Body() body: any) {
    const existingUser = await this.usersService.findOneByEmail(body.email);
    if (existingUser) {
      throw new UnauthorizedException('Email already in use');
    }

    const newUser = await this.authService.registerUser(
      body.email,
      body.password,
      body.fullName,
    );

    await this.authService.generateAndSendOTP(newUser.email, 'signup');

    return { success: true, requiresOtp: true, email: newUser.email };
  }

  @UseGuards(ThrottlerGuard)
  @Post('verify-signup')
  async verifySignup(
    @Body() body: { email: string; otp: string },
    @Res({ passthrough: true }) res: any,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    const user = await this.authService.verifyOTP(body.email, body.otp);

    this.emailService
      .addContactToMarketingList(user.email)
      .catch((err) =>
        new Logger(AuthController.name).error(
          'Failed to add contact to marketing list',
          err,
        ),
      );

    const { access_token } = await this.authService.login(user, ip, userAgent);

    res.cookie('token', access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    return { success: true, user, access_token };
  }

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  async googleAuth(@Req() req: any) {
    // Initiates the Google OAuth2 login flow
  }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleAuthRedirect(
    @Req() req: any,
    @Res() res: any,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';

    if (req.user?._oauthError) {
      const intent = req.query.state || 'login';
      const redirectPage = intent === 'signup' ? 'register' : 'login';
      return res.redirect(`${frontendUrl}/${redirectPage}?error=${req.user._oauthError}`);
    }

    const { access_token } = await this.authService.login(req.user, ip, userAgent);

    res.cookie('token', access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    const isSuperAdmin =
      req.user?.role === 'SUPER_ADMIN' ||
      req.user?.email?.toLowerCase() === 'yqbuddysa@gmail.com' ||
      req.user?.email?.toLowerCase() ===
        process.env.SUPER_ADMIN_EMAIL?.toLowerCase();
    const isNewUser =
      req.user.isNewUser || (!req.user.workspaceId && !isSuperAdmin);

    if (isSuperAdmin) {
      res.redirect(`${frontendUrl}/super-admin?token=${access_token}`);
    } else if (isNewUser) {
      res.redirect(`${frontendUrl}/onboarding?token=${access_token}`);
    } else {
      res.redirect(`${frontendUrl}/dashboard?token=${access_token}`);
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  getProfile(@Req() req: any) {
    return req.user;
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('sessions')
  async getSessions(@Req() req: any) {
    const sessions = await this.usersService['prisma'].userSession.findMany({
      where: { userId: req.user.sub, isRevoked: false },
      orderBy: { lastActiveAt: 'desc' }
    });
    
    // We don't want to expose the raw JWT tokens to the frontend
    return sessions.map(s => ({
      id: s.id,
      ipAddress: s.ipAddress,
      userAgent: s.userAgent,
      deviceInfo: s.deviceInfo,
      lastActiveAt: s.lastActiveAt,
      isCurrentSession: req.cookies?.token === s.token || req.headers.authorization?.includes(s.token)
    }));
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete('sessions/:id')
  async revokeSession(@Req() req: any, @Param('id') id: string) {
    const session = await this.usersService['prisma'].userSession.findUnique({
      where: { id }
    });
    if (!session || session.userId !== req.user.sub) {
      throw new UnauthorizedException('Session not found');
    }
    await this.usersService['prisma'].userSession.update({
      where: { id },
      data: { isRevoked: true }
    });
    
    // Attempt to parse token for jti to blocklist it
    try {
      const decoded = this.authService['jwtService'].decode(session.token) as any;
      if (decoded?.jti) {
         await this.redisService.client.set(
          `blocklist:${decoded.jti}`,
          '1',
          'EX',
          7 * 24 * 60 * 60,
        );
      }
    } catch(e) {}
    
    return { success: true };
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch('personal-settings')
  async updatePersonalSettings(
    @Req() req: AuthenticatedRequest,
    @Body()
    body: {
      theme?: string;
      language?: string;
      notificationsEnabled?: boolean;
      fullName?: string;
      phone?: string;
      location?: string;
      companyName?: string;
      subdomain?: string;
    },
  ) {
    let currentSettings = req.user.personalSettings || {};

    if (body.theme !== undefined)
      currentSettings = { ...currentSettings, theme: body.theme };
    if (body.language !== undefined)
      currentSettings = { ...currentSettings, language: body.language };
    if (body.notificationsEnabled !== undefined)
      currentSettings = {
        ...currentSettings,
        notificationsEnabled: body.notificationsEnabled,
      };
    if (body.fullName !== undefined)
      currentSettings = { ...currentSettings, fullName: body.fullName };
    if (body.phone !== undefined)
      currentSettings = { ...currentSettings, phone: body.phone };
    if (body.location !== undefined)
      currentSettings = { ...currentSettings, location: body.location };

    const updates = { personalSettings: currentSettings };

    const updatedUser = await this.usersService['prisma'].user.update({
      where: { id: req.user.sub },
      data: updates,
      select: { id: true, email: true, role: true, personalSettings: true },
    });

    if (
      (body.companyName || body.subdomain) &&
      (req.user.role === 'ADMIN' ||
        req.user.role === 'SUPER_ADMIN' ||
        req.user.role === 'TENANT_ADMIN')
    ) {
      if (req.user.tenantId) {
        try {
          const tenant = await this.usersService['prisma'].tenant.findUnique({
            where: { id: req.user.tenantId },
          });
          if (tenant) {
            const dataToUpdate: any = {};
            if (body.companyName) dataToUpdate.name = body.companyName;
            if (body.subdomain) dataToUpdate.subdomain = body.subdomain;
            
            await this.usersService['prisma'].tenant.update({
              where: { id: req.user.tenantId },
              data: dataToUpdate,
            });
          }
        } catch (error) {
          new Logger(AuthController.name).warn(
            `Could not update tenant name: ${error}`,
          );
        }
      }
      if (body.companyName && req.user.workspaceId) {
        try {
          const existingWs = await this.usersService[
            'prisma'
          ].workspace.findUnique({
            where: { id: req.user.workspaceId },
          });
          if (existingWs) {
            await this.usersService['prisma'].workspace.update({
              where: { id: req.user.workspaceId },
              data: { name: body.companyName },
            });
          } else if (req.user.tenantId) {
            const tenantWs = await this.usersService[
              'prisma'
            ].workspace.findFirst({
              where: { tenantId: req.user.tenantId },
            });
            if (tenantWs) {
              await this.usersService['prisma'].workspace.update({
                where: { id: tenantWs.id },
                data: { name: body.companyName },
              });
            } else {
              const newWs = await this.usersService['prisma'].workspace.create({
                data: {
                  id:
                    req.user.workspaceId !== req.user.tenantId
                      ? req.user.workspaceId
                      : undefined,
                  name: body.companyName,
                  subdomain: `${body.companyName.toLowerCase().replace(/[^a-z0-9]/g, '')}-${Date.now()}`,
                  ownerId: req.user.sub,
                  tenantId: req.user.tenantId,
                },
              });
              await this.usersService['prisma'].user.update({
                where: { id: req.user.sub },
                data: { workspaceId: newWs.id },
              });
            }
          }
        } catch (error) {
          new Logger(AuthController.name).error(
            `Error updating or creating workspace: ${error}`,
          );
        }
      }
    }

    return { success: true, user: updatedUser };
  }

  @UseGuards(ThrottlerGuard)
  @Post('forgot-password')
  async forgotPassword(@Body() body: { email: string }) {
    const user = await this.usersService.findOneByEmail(body.email);
    if (!user) {
      // The user specifically requested to be prompted if the email is not in userbase.
      throw new UnauthorizedException('No account found with this email.');
    }
    await this.authService.generateAndSendOTP(body.email, 'reset');
    return { success: true, message: 'Password reset OTP sent.' };
  }

  @UseGuards(ThrottlerGuard)
  @Post('reset-password')
  async resetPassword(
    @Body() body: { email: string; otp: string; password: string },
  ) {
    // This will throw if OTP is invalid/expired
    await this.authService.verifyOTP(body.email, body.otp);

    // Once verified, we can update the password
    const user = await this.usersService.findOneByEmail(body.email);
    if (!user) throw new UnauthorizedException('User not found');

    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash(body.password, 10);

    await this.usersService['prisma'].user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    return { success: true, message: 'Password reset successfully' };
  }
}
