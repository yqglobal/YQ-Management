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
        visitInvoice: {
          include: {
            customer: true,
            tenant: {
              select: {
                id: true,
                name: true,
                taxConfig: true,
              },
            },
          },
        },
      },
    });

    if (!visit) throw new NotFoundException('Visit not found');
    if (visit.visitInvoice) {
      const inv = visit.visitInvoice as any;
      if (!inv.customer && visit.customer) {
        inv.customer = visit.customer;
      }
      if (!inv.tenant && visit.tenant) {
        inv.tenant = {
          id: visit.tenant.id,
          name: visit.tenant.name,
          taxConfig: visit.tenant.taxConfig,
        };
      }
      return inv;
    }

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
      taxConfig.taxInclusive || false,
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

    const lineItemsSnap = [
      {
        name: visit.service.name,
        qty,
        unitPrice: price,
        taxable: true,
      },
    ];

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
      include: {
        customer: true,
        tenant: {
          select: {
            id: true,
            name: true,
            taxConfig: true,
          },
        },
      },
    });

    this.logger.log(
      `Visit Invoice generated: ${newInvoice.invoiceNumber} for visit ${visit.id}`,
    );
    const created = newInvoice as any;
    if (!created.customer && visit.customer) {
      created.customer = visit.customer;
    }
    return created;
  }

  async updateVisitInvoice(visitId: string, lineItems: any[]) {
    const invoice = await this.prisma.visitInvoice.findUnique({
      where: { visitId },
      include: { tenant: true },
    });

    if (!invoice)
      throw new NotFoundException('Invoice not found for this visit');

    const taxConfig = (invoice.tenant.taxConfig as any) || {
      country: 'IN',
      defaultTaxRatePercent: 18,
      taxInclusive: false,
    };

    let subtotal = 0;
    lineItems.forEach((item) => {
      subtotal += item.unitPrice * item.qty;
    });

    const computed = computeTax(
      subtotal,
      taxConfig.country,
      taxConfig.defaultTaxRatePercent || 0,
      taxConfig.taxInclusive || false,
    );

    const updated = await this.prisma.visitInvoice.update({
      where: { id: invoice.id },
      data: {
        subtotal: computed.subtotal,
        totalTax: computed.totalTax,
        total: computed.total,
        taxLines: computed.taxLines as any,
        lineItemsSnap: lineItems as any,
      },
    });

    await this.prisma.visit.update({
      where: { id: visitId },
      data: {
        lineItems: lineItems as any,
      },
    });

    return updated;
  }
}
