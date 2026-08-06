import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Param,
  Body,
  UseGuards,
  UnauthorizedException,
  Req,
  Query,
} from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SuperAdminService } from './super-admin.service';
import type { EmailProvider } from '../communication/interfaces/email.provider';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { CommunicationLogService, CommunicationChannel, CommunicationStatus } from '../communication/logging/communication-log.service';
import { TemplateService } from '../communication/templates/template.service';
import { PaymentsService } from '../payments/payments.service';
import { createBrandEmailLayout } from '../email/email-layout';

@Controller('super-admin')
@UseGuards(AuthGuard('jwt'))
export class SuperAdminController {
  constructor(
    private readonly superAdminService: SuperAdminService,
    @Inject('EmailProvider') private readonly emailProvider: EmailProvider,
    private readonly whatsappService: WhatsappService,
    private readonly communicationLogService: CommunicationLogService,
    private readonly templateService: TemplateService,
    private readonly paymentsService: PaymentsService,
  ) {}

  private checkSuperAdmin(req: any) {
    if (req.user?.role !== 'SUPER_ADMIN') {
      throw new UnauthorizedException('Access denied. Super Admin only.');
    }
  }

  @Get('metrics')
  async getMetrics(@Req() req: any) {
    this.checkSuperAdmin(req);
    return this.superAdminService.getGlobalMetrics();
  }

  @Get('tenants')
  async getTenants(@Req() req: any, @Query('search') search?: string) {
    this.checkSuperAdmin(req);
    return this.superAdminService.getAllTenants({ search });
  }

  @Get('tenants/:id')
  async getTenantById(@Req() req: any, @Param('id') id: string) {
    this.checkSuperAdmin(req);
    return this.superAdminService.getTenantById(id);
  }

  @Get('whatsapp-instances')
  async getWhatsappInstances(@Req() req: any) {
    this.checkSuperAdmin(req);
    return this.superAdminService.getWhatsappInstances();
  }

  @Delete('tenants/:id')
  async deleteTenant(@Req() req: any, @Param('id') id: string) {
    this.checkSuperAdmin(req);
    return this.superAdminService.deleteTenant(id);
  }

  @Get('users')
  async getUsers(@Req() req: any, @Query('search') search?: string, @Query('role') role?: string) {
    this.checkSuperAdmin(req);
    return this.superAdminService.getAllUsers({ search, role });
  }

  @Post('users')
  async createUser(@Req() req: any, @Body() body: { email: string; role: string; tenantId: string }) {
    this.checkSuperAdmin(req);
    return this.superAdminService.createUser(body);
  }

  @Patch('users/:id')
  async updateUser(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    this.checkSuperAdmin(req);
    return this.superAdminService.updateUser(id, body);
  }

  @Delete('users/:id')
  async deleteUser(@Req() req: any, @Param('id') id: string) {
    this.checkSuperAdmin(req);
    return this.superAdminService.deleteUser(id);
  }

  @Get('subscriptions')
  async getSubscriptions(@Req() req: any) {
    this.checkSuperAdmin(req);
    const subs = await this.superAdminService.getAllSubscriptions();
    return { subscriptions: subs };
  }

  @Get('analytics')
  async getAnalytics(@Req() req: any) {
    this.checkSuperAdmin(req);
    return this.superAdminService.getPlatformAnalytics();
  }

  @Get('transactions')
  async getTransactions(@Req() req: any) {
    this.checkSuperAdmin(req);
    return this.superAdminService.getRecentTransactions();
  }

  @Get('plans')
  async listPlans(@Req() req: any, @Query('status') statusFilter?: string, @Query('offset') offset?: number, @Query('limit') limit?: number) {
    this.checkSuperAdmin(req);
    return this.superAdminService.listPlans(statusFilter, offset ?? 0, limit ?? 50);
  }

  @Post('plans')
  async createPlan(@Req() req: any, @Body() dto: any) {
    this.checkSuperAdmin(req);
    return this.superAdminService.createPlan(dto);
  }

  @Put('plans/:id')
  async updatePlan(@Req() req: any, @Param('id') id: string, @Body() dto: any) {
    this.checkSuperAdmin(req);
    return this.superAdminService.updatePlan(id, dto);
  }

  @Delete('plans/:id')
  async archivePlan(@Req() req: any, @Param('id') id: string) {
    this.checkSuperAdmin(req);
    return this.superAdminService.archivePlan(id);
  }

  @Patch('plans/:id/status')
  async changePlanStatus(@Req() req: any, @Param('id') id: string, @Body() dto: { status: string }) {
    this.checkSuperAdmin(req);
    return this.superAdminService.changePlanStatus(id, dto.status);
  }

  @Post('plans/:id/duplicate')
  async duplicatePlan(@Req() req: any, @Param('id') id: string, @Body() dto: { name: string }) {
    this.checkSuperAdmin(req);
    return this.superAdminService.duplicatePlan(id, dto.name);
  }

  @Get('communication/email/connection')
  async testEmailConnection(@Req() req: any) {
    this.checkSuperAdmin(req);
    const connected = await this.emailProvider.testConnection();
    return { connected, configured: !!process.env.BREVO_API_KEY };
  }

  @Get('communication/status')
  async getSystemStatus(@Req() req: any) {
    this.checkSuperAdmin(req);
    const emailConnected = await this.emailProvider.testConnection();
    return {
      email: {
        provider: 'Brevo (SMTP / RELAY)',
        connected: emailConnected,
        configured: !!process.env.BREVO_API_KEY,
        sender: process.env.BREVO_SENDER_EMAIL || 'yqbuddysa@gmail.com',
      },
      whatsapp: {
        provider: 'Evolution API',
        configured: !!process.env.EVOLUTION_API_KEY && !!process.env.EVOLUTION_API_URL,
        url: process.env.EVOLUTION_API_URL || 'Not set',
        backendPublicUrl: process.env.BACKEND_PUBLIC_URL || process.env.APP_URL || 'Not set',
        webhookSecret: process.env.WEBHOOK_SECRET ? 'Configured' : 'Not set',
        model: 'Per-tenant instances (tenant_{id})',
      },
      payments: {
        provider: 'Ozow Payments Gateway',
        configured: !!process.env.OZOW_SITE_CODE && !!process.env.OZOW_PRIVATE_KEY,
        siteCode: process.env.OZOW_SITE_CODE || 'Not set',
        mode: process.env.OZOW_IS_TEST === 'true' || process.env.NODE_ENV !== 'production' ? 'Sandbox Mode' : 'Production Mode (Bank Direct)',
      },
      otp: {
        engine: 'Redis OTP Storage (5 min expiry)',
        status: 'Active',
      }
    };
  }

  @Post('communication/test-email')
  async testEmail(@Req() req: any, @Body() body: { to: string; subject?: string; type?: 'standard' | 'otp' }) {
    this.checkSuperAdmin(req);
    let subject = body.subject || 'Qmova Platform Service Verification';
    let htmlContent = createBrandEmailLayout({
      title: 'Platform Communication Verification',
      preheader: 'Verification of mail delivery infrastructure.',
      content: `<h2 style="color: #111827; margin-top: 0; font-size: 22px; font-weight: 700;">Communication Service Verification</h2>
      <p style="color: #4b5563; line-height: 1.6;">This notification confirms that the Qmova email communication channel is operational and correctly configured with your email service provider.</p>
      <p style="color: #4b5563; line-height: 1.6; font-size: 14px;">No further action is required from system administrators.</p>`,
    });
    let textContent = 'Qmova Communication Service Verification: Your email channel is operational.';
    let logType = 'diagnostic';
    let otpCode = '';

    if (body.type === 'otp') {
      otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const template = this.templateService.renderEmail('login_otp', { otp: otpCode });
      subject = body.subject || 'Your Qmova Authentication Code';
      htmlContent = template.html;
      textContent = template.text || '';
      logType = 'login_otp';
    }

    const result = await this.emailProvider.send({
      to: body.to,
      subject,
      htmlContent,
      textContent,
    });
    await this.communicationLogService.log({
      channel: CommunicationChannel.EMAIL,
      type: logType,
      recipient: body.to,
      subject,
      body: textContent,
      status: result.success ? CommunicationStatus.SENT : CommunicationStatus.FAILED,
      provider: 'brevo',
      providerId: result.providerId,
      errorMessage: result.error,
    });
    return { success: result.success, error: result.error, otp: otpCode || undefined };
  }

  @Post('communication/test-whatsapp')
  async testWhatsApp(@Req() req: any, @Body() body: { phone: string; message?: string; type?: 'standard' | 'otp' }) {
    this.checkSuperAdmin(req);
    let content = body.message || 'Test message from Qmova system.';
    let logType = 'test';
    let otpCode = '';

    if (body.type === 'otp') {
      otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      content = this.templateService.renderWhatsApp('otp', { otp: otpCode });
      logType = 'otp';
    }

    const tenant = await this.superAdminService['prisma'].tenant.findFirst({
      where: { whatsappConnected: true, whatsappInstanceId: { not: null } },
      select: { id: true, name: true, whatsappInstanceId: true },
    });

    if (!tenant) {
      return { success: false, error: 'No tenant has WhatsApp connected. Connect WhatsApp for a tenant first.' };
    }

    const result = await this.whatsappService.sendToTenant(tenant.id, body.phone, content);
    await this.communicationLogService.log({
      channel: CommunicationChannel.WHATSAPP,
      type: logType,
      recipient: body.phone,
      body: content,
      status: result.success ? CommunicationStatus.SENT : CommunicationStatus.FAILED,
      provider: 'evolution',
      providerId: result.providerId,
      errorMessage: result.error,
      workspaceId: tenant.id,
    });
    return { success: result.success, error: result.error, otp: otpCode || undefined, tenant: tenant.name };
  }

  @Get('communication/templates/email')
  getEmailTemplates(@Req() req: any) {
    this.checkSuperAdmin(req);
    return this.templateService.getEmailTemplateKeys().map((key: string) => ({
      key,
      name: key.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
    }));
  }

  @Get('communication/templates/whatsapp')
  getWhatsAppTemplates(@Req() req: any) {
    this.checkSuperAdmin(req);
    const defaultKeys = this.templateService.getWhatsAppTemplateKeys();
    return defaultKeys.map((key: string) => ({
      key,
      name: key.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
    }));
  }

  @Get('communication/logs')
  async getCommunicationLogs(
    @Req() req: any,
    @Query('offset') offset?: number,
    @Query('limit') limit?: number,
  ) {
    this.checkSuperAdmin(req);
    return this.communicationLogService.getFailedLogs();
  }

  @Get('system-toggles')
  getSystemToggles(@Req() req: any) {
    this.checkSuperAdmin(req);
    return this.superAdminService.getSystemToggles();
  }

  @Post('system-toggles')
  updateSystemToggle(@Req() req: any, @Body() body: { service: string; enabled: boolean }) {
    this.checkSuperAdmin(req);
    return this.superAdminService.updateSystemToggle(body.service, body.enabled);
  }

  @Post('payments/test-redirect')
  async testPaymentRedirect(@Req() req: any, @Body() body: { amount?: number; isTestMode?: boolean }) {
    this.checkSuperAdmin(req);
    return this.paymentsService.generateTestPaymentLink(body.amount || 10.00, body.isTestMode || false);
  }
}