import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';
import { randomBytes } from 'crypto';

@Injectable()
export class InvitationService {
  constructor(private prisma: PrismaService) {}

  private generateCode(): string {
    return randomBytes(6).toString('hex').toUpperCase().substring(0, 8);
  }

  async createInvitation(
    workspaceId: string,
    data: {
      email?: string;
      role?: string;
      maxUses?: number;
      expiresInDays?: number;
    },
  ) {
    const code = this.generateCode();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (data.expiresInDays || 7));

    const invitation = await this.prisma.invitation.create({
      data: {
        workspaceId,
        code,
        email: data.email ?? null,
        role: (data.role as Role) || Role.OPERATOR,
        maxUses: data.maxUses || 5,
        expiresAt,
      },
    });

    return invitation;
  }

  async createJoinCode(workspaceId: string, role: Role = Role.OPERATOR) {
    const code = this.generateCode();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const invitation = await this.prisma.invitation.create({
      data: {
        workspaceId,
        code,
        email: null,
        role,
        maxUses: 100,
        expiresAt,
      },
    });

    return invitation;
  }

  async getInvitations(workspaceId: string) {
    return this.prisma.invitation.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getInvitationByCode(code: string) {
    return this.prisma.invitation.findFirst({
      where: { code: code.toUpperCase() },
    });
  }

  async revokeInvitation(id: string, workspaceId: string) {
    const invitation = await this.prisma.invitation.findFirst({
      where: { id, workspaceId },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    return this.prisma.invitation.update({
      where: { id },
      data: { used: true, usedAt: new Date() },
    });
  }

  async validateAndUseInvitation(
    code: string,
  ): Promise<{ workspaceId: string; role: string; allowedLocationIds: string[]; allowedServiceIds: string[]; allowedPages: string[] }> {
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
      workspaceId: invitation.workspaceId,
      role: invitation.role,
      allowedLocationIds: invitation.allowedLocationIds,
      allowedServiceIds: invitation.allowedServiceIds,
      allowedPages: invitation.allowedPages,
    };
  }

  async ensureWorkspaceHasAdmin(workspaceId: string) {
    const adminCount = await this.prisma.user.count({
      where: {
        workspaceId,
        role: { in: ['TENANT_ADMIN', 'SUPER_ADMIN'] },
      },
    });

    if (adminCount === 0) {
      const workspace = await this.prisma.workspace.findUnique({
        where: { id: workspaceId },
        include: { tenant: true },
      });

      if (!workspace) {
        throw new NotFoundException('Workspace not found');
      }

      const tenantAdmin = await this.prisma.user.findFirst({
        where: {
          tenantId: workspace.tenantId,
          role: 'TENANT_ADMIN',
        },
        orderBy: { id: 'asc' },
      });

      if (tenantAdmin) {
        await this.prisma.user.update({
          where: { id: tenantAdmin.id },
          data: { workspaceId },
        });
      }
    }
  }

  async getUserWorkspaceRole(userId: string, workspaceId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { workspaceId: true, role: true, tenantId: true, email: true },
    });

    if (!user) {
      return null;
    }

    if (user.workspaceId === workspaceId) {
      return user.role;
    }

    const invitation = await this.prisma.invitation.findFirst({
      where: {
        workspaceId,
        email: user.email,
        used: false,
      },
    });

    if (invitation) {
      return invitation.role;
    }

    return null;
  }
}
