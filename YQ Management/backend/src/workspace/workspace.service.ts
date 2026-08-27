import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InvitationService } from '../invitation/invitation.service';
import { Role } from '@prisma/client';

@Injectable()
export class WorkspaceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly invitationService: InvitationService,
  ) {}

  async getWorkspaceBySubdomain(subdomain: string) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { subdomain },
    });

    if (!workspace) {
      throw new NotFoundException(
        `Workspace with subdomain ${subdomain} not found`,
      );
    }

    return workspace;
  }

  async createWorkspace(data: {
    name: string;
    subdomain: string;
    branding?: any;
    ownerId: string;
    tenantId: string;
  }) {
    return this.prisma.workspace.create({
      data: {
        name: data.name,
        subdomain: data.subdomain,
        branding: data.branding,
        ownerId: data.ownerId,
        tenantId: data.tenantId,
      },
    });
  }

  async getAllWorkspaces() {
    return this.prisma.workspace.findMany();
  }

  async getInvitePreview(code: string) {
    const invitation = await this.prisma.invitation.findFirst({
      where: { code: code.toUpperCase(), used: false },
    });

    if (!invitation) {
      throw new BadRequestException('Invalid or already used invitation code.');
    }

    if (invitation.expiresAt && invitation.expiresAt < new Date()) {
      throw new BadRequestException('This workspace invitation has expired.');
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: invitation.tenantId },
      select: { name: true, subdomain: true, id: true },
    });

    return {
      valid: true,
      code: invitation.code,
      role: invitation.role,
      workspaceName: tenant?.name || 'Your Team',
      tenantName: tenant?.name || 'Your Team',
      subdomain: tenant?.subdomain || '',
      tenantId: invitation.tenantId,
      email: invitation.email,
    };
  }

  async joinWorkspace(userId: string, code: string) {
    const invitation =
      await this.invitationService.validateAndUseInvitation(code);

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        tenantId: invitation.tenantId,
        role: invitation.role as Role,
        allowedLocationIds: invitation.allowedLocationIds,
        allowedServiceIds: invitation.allowedServiceIds,
        allowedPages: invitation.allowedPages,
      },
    });

    if (user.role === 'OPERATOR' || user.role === 'MANAGER') {
      const personalSettings = user.personalSettings as any;
      const fullName = personalSettings?.fullName || user.email?.split('@')[0] || 'Staff';
      const primaryLocationId = invitation.allowedLocationIds[0] || null;

      try {
        await this.prisma.staff.create({
          data: {
            tenantId: invitation.tenantId,
            locationId: primaryLocationId,
            userId: user.id,
            name: fullName,
            status: 'ACTIVE',
          },
        });
      } catch (e) {
        console.error('Failed to auto-provision Staff record for new user', e);
      }
    }

    return {
      success: true,
      role: user.role,
      tenantId: user.tenantId,
    };
  }

  async getJoinInfo(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { workspace: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      hasWorkspace: !!user.workspaceId,
      workspace: user.workspace,
      role: user.role,
      isOwnWorkspace: user.workspace?.ownerId === user.id,
    };
  }

  async getUserWorkspace(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { workspace: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.workspaceId) {
      throw new BadRequestException('User has no workspace assigned');
    }

    if (!user.workspace) {
      throw new NotFoundException('Workspace not found');
    }

    return {
      workspace: user.workspace,
      role: user.role,
      isOwner: user.workspace.ownerId === user.id,
    };
  }
}
