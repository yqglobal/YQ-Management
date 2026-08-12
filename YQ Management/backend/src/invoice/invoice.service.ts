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
      include: { workspace: { select: { name: true } } },
    });
  }

  async listInvoices(workspaceId: string, offset = 0, limit = 50) {
    return this.prisma.invoice.findMany({
      where: { workspaceId },
      skip: offset,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
  }

  async generateInvoice(workspaceId: string) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { name: true, subdomain: true },
    });

    if (!workspace) {
      throw new InternalServerErrorException('Workspace not found');
    }

    const amount = 0;
    const currency = 'ZAR';

    const invoice = await this.prisma.invoice.create({
      data: {
        workspaceId,
        amount,
        currency,
        status: 'DRAFT',
      },
    });

    this.logger.log(
      `Invoice generated: ${invoice.id} for workspace ${workspaceId}`,
    );
    return invoice;
  }
}
