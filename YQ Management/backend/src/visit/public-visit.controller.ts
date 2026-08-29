import { Controller, Get, Param, Post, Body, Query, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { VisitService } from './visit.service';
import { RedisService } from '../redis/redis.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { PrismaService } from '../prisma/prisma.service';

@Controller('public-visit')
export class PublicVisitController {
  private readonly logger = new Logger(PublicVisitController.name);

  constructor(
    private readonly visitService: VisitService,
    private readonly redisService: RedisService,
    private readonly whatsappService: WhatsappService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('status-multiple')
  async statusMultiple(@Query('tokens') tokens: string) {
    if (!tokens) return [];
    const tokenArray = tokens
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    return this.visitService.findMultiplePublic(tokenArray);
  }

  @Post('request-recovery-otp')
  async requestRecoveryOtp(@Body() body: { phone: string; tenantId: string }) {
    if (!body.phone || !body.tenantId) {
      throw new HttpException('Missing phone or tenantId', HttpStatus.BAD_REQUEST);
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: body.tenantId },
      include: {
        subscriptions: {
          where: { status: { in: ['ACTIVE', 'TRIAL', 'PAST_DUE'] } },
          include: { plan: true },
        },
      },
    });

    if (!tenant) {
      throw new HttpException('Tenant not found', HttpStatus.NOT_FOUND);
    }

    if (!tenant.whatsappConnected || !tenant.whatsappInstanceId) {
      throw new HttpException('WhatsApp not connected for this tenant', HttpStatus.SERVICE_UNAVAILABLE);
    }

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const redisKey = `otp:recovery:${body.tenantId}:${body.phone}`;

    // Store in Redis with 5 minutes TTL
    await this.redisService.client.set(redisKey, otpCode, 'EX', 300);

    // Check custom branding
    const sub = tenant.subscriptions?.[0];
    let planFeatures: any = sub?.plan?.features || {};
    if (typeof planFeatures === 'string') {
      try { planFeatures = JSON.parse(planFeatures); } catch (e) { planFeatures = {}; }
    }
    const hasCustomBranding = sub?.status === 'TRIAL' || planFeatures.customBranding === true;
    const watermark = hasCustomBranding ? '' : '\n\nPowered by Qmova';

    const message = `Your Qmova ticket recovery code is ${otpCode}. It expires in 5 minutes.${watermark}`;

    this.whatsappService.sendToTenant(tenant.id, body.phone, message).then((res) => {
      if (!res.success) {
        this.logger.error(`Failed to send recovery OTP to ${body.phone}: ${res.error}`);
      }
    });

    return { success: true };
  }

  @Post('recover')
  async recoverTickets(@Body() body: { phone: string; tenantId: string; otp: string }) {
    if (!body.phone || !body.tenantId || !body.otp) {
      throw new HttpException('Missing phone, tenantId, or otp', HttpStatus.BAD_REQUEST);
    }

    const redisKey = `otp:recovery:${body.tenantId}:${body.phone}`;
    const storedOtp = await this.redisService.client.get(redisKey);
    
    if (storedOtp !== body.otp) {
      throw new HttpException('Invalid or expired OTP', HttpStatus.BAD_REQUEST);
    }
    
    await this.redisService.client.del(redisKey);

    const visits = await this.prisma.visit.findMany({
      where: {
        customer: { phone: body.phone },
        tenantId: body.tenantId,
        currentState: { notIn: ['COMPLETED', 'NO_SHOW', 'CANCELLED'] },
      },
      select: {
        accessToken: true,
      },
    });

    return { success: true, tokens: visits.map(v => v.accessToken) };
  }

  @Get(':accessToken')
  async getPublicVisit(@Param('accessToken') accessToken: string) {
    // In a real scenario, this would only return non-sensitive data
    const visit = await this.visitService.findOnePublic(accessToken);
    return visit;
  }

  @Post(':accessToken/cancel')
  async cancelPublicVisit(@Param('accessToken') accessToken: string) {
    return this.visitService.cancelPublicVisit(accessToken);
  }

  @Post('queue/:queueId/join')
  async joinQueue(
    @Param('queueId') queueId: string,
    @Body() body: { name: string; phone?: string | null },
  ) {
    return this.visitService.joinQueue(queueId, body);
  }

  @Post('join-multiple')
  async joinMultiple(
    @Body()
    body: {
      customerName: string;
      phone?: string | null;
      otp?: string;
      language?: string;
      bookings: {
        serviceId: string;
        queueId?: string; // Made optional so frontend can specify or we infer
        scheduledFor?: string;
        formResponses?: any;
      }[];
    },
  ) {
    return this.visitService.joinMultiple(body);
  }
}
