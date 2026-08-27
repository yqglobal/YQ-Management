import {
  Controller,
  Post,
  Body,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';

@Controller('token')
export class TokenController {
  private readonly logger = new Logger(TokenController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    private readonly whatsappService: WhatsappService,
  ) {}

  @Post('request-otp')
  async requestOtp(@Body() body: { phone: string; serviceId: string }) {
    if (!body.phone || !body.serviceId) {
      throw new HttpException('Missing phone or serviceId', HttpStatus.BAD_REQUEST);
    }

    const service = await this.prisma.service.findUnique({
      where: { id: body.serviceId },
      include: { tenant: true },
    });

    if (!service || !service.tenant) {
      throw new HttpException('Service not found', HttpStatus.NOT_FOUND);
    }

    const tenant = service.tenant;
    
    // If WhatsApp is not connected for this tenant, throw 503 so frontend bypasses OTP
    if (!tenant.whatsappConnected || !tenant.whatsappInstanceId) {
      throw new HttpException('WhatsApp not connected for this tenant', HttpStatus.SERVICE_UNAVAILABLE);
    }

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const redisKey = `otp:booking:${body.phone}`;

    // Store in Redis with 5 minutes TTL
    await this.redisService.client.set(redisKey, otpCode, 'EX', 300);

    // Send OTP via WhatsApp
    const message = `Your Qmova verification code is ${otpCode}. It expires in 5 minutes.`;
    
    // Send in background to avoid blocking
    this.whatsappService
      .sendToTenant(tenant.id, body.phone, message)
      .then((res) => {
        if (!res.success) {
          this.logger.error(`Failed to send OTP to ${body.phone}: ${res.error}`);
        }
      })
      .catch((err) => {
        this.logger.error(`Error sending OTP to ${body.phone}`, err);
      });

    return { success: true, message: 'OTP sent successfully' };
  }
}
