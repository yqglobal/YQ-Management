import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
  Param,
  HttpCode,
  HttpStatus,
  Delete,
  Patch,
  Inject,
  Query,
} from '@nestjs/common';
import { CommunicationService } from './communication.service';
import { CommunicationEvent } from './events/communication-events.enum';
import type { EmailProvider } from './interfaces/email.provider';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { TemplateService } from './templates/template.service';
import {
  CommunicationLogService,
  CommunicationChannel,
  CommunicationStatus,
} from './logging/communication-log.service';
import { createBrandEmailLayout } from '../email/email-layout';
import { WhatsAppTemplateService } from './templates/whatsapp-template.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { RequirePermissions } from '../permissions/permissions.guard';
import { PermissionsGuard } from '../permissions/permissions.guard';
import { Permission } from '../permissions/permissions.enum';
import { WorkspaceGuard } from '../auth/workspace.guard';
import {
  CreateTemplateDto,
  UpdateTemplateDto,
  TestEmailDto,
} from './dto/communication.dto';

@Controller('communication')
export class CommunicationController {
  constructor(
    private readonly communicationService: CommunicationService,
    @Inject('EmailProvider') private readonly emailProvider: EmailProvider,
    private readonly whatsappService: WhatsappService,
    private readonly templateService: TemplateService,
    private readonly communicationLogService: CommunicationLogService,
    private readonly whatsappTemplateService: WhatsAppTemplateService,
  ) {}

  @UseGuards(AuthGuard('jwt'), RolesGuard, PermissionsGuard, WorkspaceGuard)
  @Roles(Role.TENANT_ADMIN, Role.SUPER_ADMIN)
  @RequirePermissions(Permission.SETTINGS_WRITE)
  @Post('test-email')
  async testEmail(@Request() req: any, @Body() body: TestEmailDto) {
    const htmlContent = createBrandEmailLayout({
      title: 'Email Channel Verification',
      preheader: 'Verification of mail delivery service.',
      content: `<h2 style="color: #111827; margin-top: 0; font-size: 22px; font-weight: 700;">Communication Service Active</h2>
      <p style="color: #4b5563; line-height: 1.6;">This verification message confirms that your tenant email relay is operating normally and relaying messages without error.</p>`,
    });

    const result = await this.emailProvider.send({
      to: body.to,
      subject: body.subject || 'Qmova System Verification Notice',
      htmlContent,
      textContent: 'Qmova System Verification Notice: Your email service is operating normally.',
    });

    await this.communicationLogService.log({
      channel: CommunicationChannel.EMAIL,
      type: 'test',
      recipient: body.to,
      subject: body.subject || 'Qmova Test Email',
      body: 'Test Email - This is a test email from Qmova.',
      status: result.success
        ? CommunicationStatus.SENT
        : CommunicationStatus.FAILED,
      provider: 'brevo',
      providerId: result.providerId,
      errorMessage: result.error,
      workspaceId: req.user.workspaceId,
    });

    return { success: result.success, error: result.error };
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard, PermissionsGuard, WorkspaceGuard)
  @Roles(Role.TENANT_ADMIN, Role.SUPER_ADMIN)
  @RequirePermissions(Permission.SETTINGS_READ)
  @Get('email/connection')
  async testEmailConnection() {
    const connected = await this.emailProvider.testConnection();
    return { connected };
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard, PermissionsGuard, WorkspaceGuard)
  @Roles(Role.TENANT_ADMIN, Role.SUPER_ADMIN)
  @RequirePermissions(Permission.SETTINGS_WRITE)
  @Post('test-whatsapp')
  async testWhatsApp(
    @Request() req: any,
    @Body() body: { phone: string; message?: string },
  ) {
    const tenantId = req.user?.tenantId || req.user?.workspaceId;
    const result = tenantId
      ? await this.whatsappService.sendToTenant(tenantId, body.phone, body.message || 'Test message from Qmova')
      : { success: false, error: 'No tenant context for WhatsApp test' };

    await this.communicationLogService.log({
      channel: CommunicationChannel.WHATSAPP,
      type: 'test',
      recipient: body.phone,
      body: body.message || 'Test message from Qmova',
      status: result.success
        ? CommunicationStatus.SENT
        : CommunicationStatus.FAILED,
      provider: 'evolution',
      providerId: (result as any).providerId,
      errorMessage: result.error,
      workspaceId: req.user.workspaceId,
    });

    return { success: result.success, error: result.error };
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard, PermissionsGuard, WorkspaceGuard)
  @Roles(Role.TENANT_ADMIN, Role.SUPER_ADMIN)
  @RequirePermissions(Permission.SETTINGS_READ)
  @Get('templates/email')
  getEmailTemplates() {
    return this.templateService.getEmailTemplateKeys().map((key: string) => ({
      key,
      name: key
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (l: string) => l.toUpperCase()),
    }));
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard, PermissionsGuard, WorkspaceGuard)
  @Roles(Role.TENANT_ADMIN, Role.SUPER_ADMIN)
  @RequirePermissions(Permission.SETTINGS_READ)
  @Get('templates/email/:key')
  previewEmailTemplate(@Param('key') key: string, @Request() req: any) {
    const template = this.templateService.renderEmail(key, {
      otp: '123456',
      name: 'John Doe',
      email: 'john@example.com',
      timestamp: new Date().toLocaleString(),
      dashboard_url: `${process.env.APP_URL || 'http://localhost:3001'}/dashboard`,
      workspace: 'My Business',
      amount: '299.00',
      currency: 'ZAR',
      days: '7',
      next_billing_date: new Date().toLocaleDateString(),
      reset_link: `${process.env.APP_URL || 'http://localhost:3001'}/reset-password`,
      inviter_name: 'Admin User',
      code: 'ABC123',
    });
    return {
      subject: template.subject,
      html: template.html,
      text: template.text,
    };
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard, PermissionsGuard, WorkspaceGuard)
  @Roles(Role.TENANT_ADMIN, Role.SUPER_ADMIN)
  @RequirePermissions(Permission.SETTINGS_READ)
  @Get('templates/whatsapp')
  async getWhatsAppTemplates(@Request() req: any) {
    const dbTemplates = await this.whatsappTemplateService.getTemplates(
      req.user.workspaceId,
    );
    const defaultKeys = this.templateService.getWhatsAppTemplateKeys();

    const templates = defaultKeys.map((key: string) => {
      const dbTemplate = dbTemplates.find((t: any) => t.key === key);
      return {
        key,
        name: key
          .replace(/_/g, ' ')
          .replace(/\b\w/g, (l: string) => l.toUpperCase()),
        content:
          dbTemplate?.content ||
          this.templateService.renderWhatsApp(key, {
            otp: '123456',
            name: 'Customer',
            queue_name: 'Queue',
            position: '1',
            wait_time: '5',
            link: `${process.env.APP_URL || 'http://localhost:3001'}/customer/status/abc123`,
          }),
        active: dbTemplate?.active ?? true,
      };
    });

    return templates;
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard, PermissionsGuard, WorkspaceGuard)
  @Roles(Role.TENANT_ADMIN, Role.SUPER_ADMIN)
  @RequirePermissions(Permission.SETTINGS_WRITE)
  @Post('templates/whatsapp/:key')
  async saveWhatsAppTemplate(
    @Request() req: any,
    @Param('key') key: string,
    @Body() body: UpdateTemplateDto,
  ) {
    const template = await this.whatsappTemplateService.upsertTemplate(
      req.user.workspaceId,
      {
        key,
        name: body.name || '',
        content: body.content || '',
        isActive: body.isActive ?? true,
      },
    );
    return template;
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard, PermissionsGuard, WorkspaceGuard)
  @Roles(Role.TENANT_ADMIN, Role.SUPER_ADMIN)
  @RequirePermissions(Permission.SETTINGS_READ)
  @Get('templates/whatsapp/:key/preview')
  previewWhatsAppTemplate(@Param('key') key: string) {
    const template = this.templateService.renderWhatsApp(key, {
      otp: '123456',
      name: 'John Doe',
      queue_name: 'General Queue',
      position: '3',
      wait_time: '10',
      link: `${process.env.APP_URL || 'http://localhost:3001'}/customer/status/abc123`,
    });
    return { template };
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard, PermissionsGuard, WorkspaceGuard)
  @Roles(Role.TENANT_ADMIN, Role.SUPER_ADMIN)
  @RequirePermissions(Permission.SETTINGS_WRITE)
  @Delete('templates/whatsapp/:key')
  async resetWhatsAppTemplate(@Request() req: any, @Param('key') key: string) {
    await this.whatsappTemplateService.deleteTemplate(
      req.user.workspaceId,
      key,
    );
    return { success: true };
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard, PermissionsGuard, WorkspaceGuard)
  @Roles(Role.TENANT_ADMIN, Role.SUPER_ADMIN)
  @RequirePermissions(Permission.SETTINGS_READ)
  @Get('logs')
  getLogs(@Request() req: any, @Query() params: any) {
    const page = Number(params.page) || 1;
    const limit = Number(params.limit) || 50;
    return this.communicationLogService.getLogs(
      req.user.workspaceId,
      page,
      limit,
    );
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard, PermissionsGuard, WorkspaceGuard)
  @Roles(Role.TENANT_ADMIN, Role.SUPER_ADMIN)
  @RequirePermissions(Permission.SETTINGS_READ)
  @Get('logs/failed')
  getFailedLogs(@Request() req: any) {
    return this.communicationLogService.getFailedLogs(req.user.workspaceId);
  }
}
