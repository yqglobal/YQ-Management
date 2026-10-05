import {
  Injectable,
  Logger,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { computeTax } from './tax-engine';

@Injectable()
export class InvoiceService {
  private readonly logger = new Logger(InvoiceService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ───────────────────────────────────────────────────────────────────────────
  // PLATFORM BILLING INVOICES (Legacy)
  // ───────────────────────────────────────────────────────────────────────────
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

  // ───────────────────────────────────────────────────────────────────────────
  // PER-VISIT INVOICES (Taxation-aware)
  // ───────────────────────────────────────────────────────────────────────────
  
  async generateVisitInvoice(visitId: string) {
    const visit = await this.prisma.visit.findUnique({
      where: { id: visitId },
      include: { 
        tenant: true,
        service: true,
        customer: true,
        visitInvoice: true
      },
    });

    if (!visit) throw new NotFoundException('Visit not found');
    if (visit.visitInvoice) return visit.visitInvoice; // Already exists

    const tenant = visit.tenant;
    const taxConfig = (tenant.taxConfig as any) || {
      country: 'IN',
      defaultTaxRatePercent: 18,
      taxInclusive: false,
    };

    const price = visit.service.basePrice || 0;
    const qty = 1; // Assuming 1 service booked per visit
    const lineItemSubtotal = price * qty;

    const computed = computeTax(
      lineItemSubtotal,
      taxConfig.country,
      taxConfig.defaultTaxRatePercent || 0,
      taxConfig.taxInclusive || false
    );

    // Generate Invoice Number safely with transaction locking on tenant counter
    const updatedTenant = await this.prisma.tenant.update({
      where: { id: tenant.id },
      data: { invoiceCounter: { increment: 1 } },
    });
    
    const prefix = updatedTenant.invoicePrefix || 'INV';
    const year = new Date().getFullYear();
    const sequence = updatedTenant.invoiceCounter.toString().padStart(4, '0');
    const invoiceNumber = `${prefix}-${year}-${sequence}`;

    const lineItemsSnap = [{
      name: visit.service.name,
      qty,
      unitPrice: price,
      taxable: true
    }];

    const newInvoice = await this.prisma.visitInvoice.create({
      data: {
        tenantId: tenant.id,
        visitId: visit.id,
        customerId: visit.customerId,
        invoiceNumber,
        currency: visit.service.priceCurrency || 'ZAR',
        status: 'DRAFT',
        subtotal: computed.subtotal,
        totalTax: computed.totalTax,
        total: computed.total,
        taxLines: computed.taxLines as any,
        lineItemsSnap: lineItemsSnap as any,
      },
    });

    this.logger.log(`Visit Invoice generated: ${newInvoice.invoiceNumber} for visit ${visit.id}`);
    return newInvoice;
  }
}
