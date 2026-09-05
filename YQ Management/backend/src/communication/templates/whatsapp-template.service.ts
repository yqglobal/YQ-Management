import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class WhatsAppTemplateService {
  private readonly logger = new Logger(WhatsAppTemplateService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getTemplates(tenantId: string) {
    return this.prisma.whatsAppTemplate.findMany({
      where: { tenantId },
      orderBy: { key: 'asc' },
    });
  }

  async getTemplate(tenantId: string, key: string) {
    return this.prisma.whatsAppTemplate.findFirst({
      where: { tenantId, key },
    });
  }

  async upsertTemplate(
    tenantId: string,
    data: {
      key: string;
      name: string;
      content: string;
      variables?: string[];
      isActive?: boolean;
    },
  ) {
    const existing = await this.prisma.whatsAppTemplate.findFirst({
      where: { tenantId, key: data.key },
    });

    if (existing) {
      return this.prisma.whatsAppTemplate.update({
        where: { id: existing.id },
        data: {
          name: data.name,
          content: data.content,
          variables: data.variables || [],
          isActive: data.isActive ?? existing.isActive,
        },
      });
    }

    return this.prisma.whatsAppTemplate.create({
      data: {
        tenantId,
        key: data.key,
        name: data.name,
        content: data.content,
        variables: data.variables || [],
        isActive: data.isActive ?? true,
      },
    });
  }

  async deleteTemplate(tenantId: string, key: string) {
    const existing = await this.prisma.whatsAppTemplate.findFirst({
      where: { tenantId, key },
    });

    if (!existing) {
      return null;
    }

    return this.prisma.whatsAppTemplate.delete({
      where: { id: existing.id },
    });
  }
}
