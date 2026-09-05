import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class InvoiceService {
  private readonly logger = new Logger(InvoiceService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getInvoice(invoiceId: string) {
    return this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { tenant: { select: { name: true } } },
    });
  }

  async listInvoices(tenantId: string, offset = 0, limit = 50) {
    return this.prisma.invoice.findMany({
      where: { tenantId },
      skip: offset,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
  }

  async generateInvoice(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true, subdomain: true },
    });

    if (!tenant) {
      throw new InternalServerErrorException('Workspace not found');
    }

    const amount = 0;
    const currency = 'ZAR';

    const invoice = await this.prisma.invoice.create({
      data: {
        tenantId,
        amount,
        currency,
        status: 'DRAFT',
      },
    });

    this.logger.log(
      `Invoice generated: ${invoice.id} for workspace ${tenantId}`,
    );
    return invoice;
  }
}
