import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  async sendSms(tenantId: string, phone: string, message: string): Promise<{ success: boolean; error?: string; providerId?: string }> {
    this.logger.log(`[STUB] Sending SMS to ${phone} for tenant ${tenantId}: ${message}`);
    // Stub implementation. Here we would integrate Twilio or Africa's Talking.
    return {
      success: true,
      providerId: `sms_stub_${Date.now()}`,
    };
  }
}
