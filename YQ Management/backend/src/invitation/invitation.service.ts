import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';
import { randomBytes } from 'crypto';
import { SubscriptionService } from '../subscription/subscription.service';

@Injectable()
export class InvitationService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => SubscriptionService))
    private subscriptionService: SubscriptionService,
  ) {}

  private generateCode(): string {
    return randomBytes(6).toString('hex').toUpperCase().substring(0, 8);
  }

  async createInvitation(
    tenantId: string,
    data: {
      email?: string;
      role?: string;
      maxUses?: number;
      expiresInDays?: number;
      allowedLocationIds?: string[];
      allowedServiceIds?: string[];
      allowedPages?: string[];
    },
  ) {
    const [currentUsersCount, pendingInvitesCount] = await Promise.all([
      this.prisma.user.count({ where: { tenantId } }),
      this.prisma.invitation.count({
        where: {
          tenantId,
          used: false,
          ...(data.email ? { email: { not: data.email } } : {}),
        },
      }),
    ]);
    await this.subscriptionService.checkLimit(
      tenantId,
      'staff',
      currentUsersCount + pendingInvitesCount,
    );

    const code = this.generateCode();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (data.expiresInDays || 7));

    return this.prisma.invitation.create({
      data: {
        tenantId,
        code,
        email: data.email ?? null,
        role: (data.role as Role) || Role.MANAGER,
        maxUses: data.maxUses || 1,
        expiresAt,
        allowedLocationIds: data.allowedLocationIds ?? [],
        allowedServiceIds: data.allowedServiceIds ?? [],
        allowedPages: data.allowedPages ?? [],
      },
    });
  }

  async createJoinCode(tenantId: string, role: Role = Role.MANAGER) {
    const code = this.generateCode();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    return this.prisma.invitation.create({
      data: {
        tenantId,
        code,
        email: null,
        role,
        maxUses: 100,
        expiresAt,
      },
    });
  }

  async getInvitations(tenantId: string) {
    return this.prisma.invitation.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getInvitationByCode(code: string) {
    return this.prisma.invitation.findFirst({
      where: { code: code.toUpperCase() },
    });
  }

  async revokeInvitation(id: string, tenantId: string) {
    const invitation = await this.prisma.invitation.findFirst({
      where: { id, tenantId },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    return this.prisma.invitation.update({
      where: { id },
      data: { used: true, usedAt: new Date() },
    });
  }

  async validateAndUseInvitation(code: string): Promise<{
    tenantId: string;
    role: string;
    allowedLocationIds: string[];
    allowedServiceIds: string[];
    allowedPages: string[];
  }> {
    const invitation = await this.prisma.invitation.findFirst({
      where: { code: code.toUpperCase(), used: false },
    });

    if (!invitation) {
      throw new BadRequestException('Invalid invitation code');
    }

    if (invitation.expiresAt && invitation.expiresAt < new Date()) {
      throw new BadRequestException('Invitation code has expired');
    }

    if (invitation.usedCount >= invitation.maxUses) {
      throw new BadRequestException('Invitation code has reached maximum uses');
    }

    await this.prisma.invitation.update({
      where: { id: invitation.id },
      data: {
        usedCount: { increment: 1 },
        used: invitation.usedCount + 1 >= invitation.maxUses,
        usedAt:
          invitation.usedCount + 1 >= invitation.maxUses
            ? new Date()
            : undefined,
      },
    });

    return {
      tenantId: invitation.tenantId,
      role: invitation.role,
      allowedLocationIds: invitation.allowedLocationIds,
      allowedServiceIds: invitation.allowedServiceIds,
      allowedPages: invitation.allowedPages,
    };
  }

  async getInvitePreview(code: string) {
    const invitation = await this.prisma.invitation.findFirst({
      where: { code: code.toUpperCase(), used: false },
      include: {
        tenant: { select: { name: true, subdomain: true, branding: true } },
      },
    });

    if (!invitation) {
      throw new BadRequestException('Invalid or already used invitation code.');
    }

    if (invitation.expiresAt && invitation.expiresAt < new Date()) {
      throw new BadRequestException('This invitation has expired.');
    }

    return {
      valid: true,
      code: invitation.code,
      role: invitation.role,
      tenantName: invitation.tenant?.name || 'A Team',
      tenantId: invitation.tenantId,
      branding: invitation.tenant?.branding,
      email: invitation.email,
    };
  }

  async getUserTenantRole(userId: string, tenantId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { tenantId: true, role: true, email: true },
    });

    if (!user) return null;
    if (user.tenantId === tenantId) return user.role;

    const invitation = await this.prisma.invitation.findFirst({
      where: { tenantId, email: user.email, used: false },
    });

    return invitation?.role ?? null;
  }
}
