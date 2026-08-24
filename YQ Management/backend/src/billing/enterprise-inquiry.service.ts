import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SystemLogService } from '../system-log/system-log.service';

export class CreateEnterpriseInquiryDto {
  name: string;
  email: string;
  companyName: string;
  phone?: string;
  message: string;
}

@Injectable()
export class EnterpriseInquiryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly systemLogService: SystemLogService,
  ) {}

  async createInquiry(
    tenantId: string | undefined,
    dto: CreateEnterpriseInquiryDto,
  ) {
    try {
      const inquiry = await this.prisma.enterpriseInquiry.create({
        data: {
          tenantId,
          name: dto.name,
          email: dto.email,
          companyName: dto.companyName,
          phone: dto.phone,
          message: dto.message,
          status: 'PENDING',
        },
      });

      // Optionally log this event
      await this.systemLogService.log(
        'INFO',
        `New enterprise inquiry from ${dto.companyName} (${dto.email})`,
      );

      return inquiry;
    } catch (error) {
      await this.systemLogService.log(
        'ERROR',
        'Failed to create enterprise inquiry',
        { error: error.message },
      );
      throw new InternalServerErrorException('Failed to submit inquiry');
    }
  }

  async getAllInquiries() {
    return this.prisma.enterpriseInquiry.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        tenant: {
          select: { name: true, subdomain: true },
        },
      },
    });
  }

  async updateInquiryStatus(id: string, status: string) {
    return this.prisma.enterpriseInquiry.update({
      where: { id },
      data: { status },
    });
  }
}
