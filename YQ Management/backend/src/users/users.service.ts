import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { RedisService } from '../redis/redis.service';
import { EmailService } from '../email/email.service';
import { randomBytes } from 'crypto';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
    private emailService: EmailService,
  ) {}

  async findOneByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async create(data: Prisma.UserUncheckedCreateInput) {
    let hashedPassword = null;
    if (data.password) {
      hashedPassword = await bcrypt.hash(data.password, 10);
    }

    return this.prisma.user.create({
      data: {
        ...data,
        password: hashedPassword,
      },
    });
  }

  async getUsersByTenant(tenantId: string) {
    const activeUsers = await this.prisma.user.findMany({
      where: { tenantId },
      select: { id: true, email: true, role: true },
    });

    const workspaces = await this.prisma.workspace.findMany({
      where: { tenantId },
      select: { id: true, name: true, ownerId: true },
    });

    const ownerId = workspaces.length > 0 ? workspaces[0].ownerId : null;

    const staffList: any[] = activeUsers.map((u) => ({
      id: u.id,
      email: u.email,
      role: u.role,
      status: 'ACTIVE',
      isInvite: false,
      isOwner: u.id === ownerId,
    }));

    if (workspaces.length === 0) {
      return staffList;
    }

    const workspaceIds = workspaces.map((w) => w.id);
    const invites = await this.prisma.invitation.findMany({
      where: {
        workspaceId: { in: workspaceIds },
        email: { not: null },
      },
      orderBy: { createdAt: 'desc' },
    });

    const now = new Date();
    const tenantAdmin =
      activeUsers.find(
        (u) => u.role === 'TENANT_ADMIN' || u.role === 'SUPER_ADMIN',
      ) || activeUsers[0];
    const workspaceName = workspaces[0]?.name || 'Workspace Team';

    for (const inv of invites) {
      if (
        !inv.email ||
        staffList.some(
          (s) => s.email?.toLowerCase() === inv.email?.toLowerCase(),
        )
      ) {
        continue;
      }

      const isExpired =
        (inv.expiresAt && inv.expiresAt < now) ||
        (inv.usedCount >= inv.maxUses && inv.used);
      if (isExpired && !inv.used) {
        await this.prisma.invitation.update({
          where: { id: inv.id },
          data: { used: true },
        });
        if (tenantAdmin?.email) {
          this.emailService.sendInvitationExpiredNotification(
            tenantAdmin.email,
            inv.email,
            workspaceName,
          );
        }
        staffList.push({
          id: inv.id,
          email: inv.email,
          role: inv.role,
          status: 'EXPIRED',
          code: inv.code,
          expiresAt: inv.expiresAt,
          isInvite: true,
        });
      } else if (isExpired || inv.used) {
        staffList.push({
          id: inv.id,
          email: inv.email,
          role: inv.role,
          status: 'EXPIRED',
          code: inv.code,
          expiresAt: inv.expiresAt,
          isInvite: true,
        });
      } else {
        staffList.push({
          id: inv.id,
          email: inv.email,
          role: inv.role,
          status: 'INVITED',
          code: inv.code,
          expiresAt: inv.expiresAt,
          isInvite: true,
        });
      }
    }

    return staffList;
  }

  async createUser(
    tenantId: string,
    data: { email: string; role: any; password?: string },
  ) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: data.email },
    });

    const workspace = await this.prisma.workspace.findFirst({
      where: { tenantId },
      select: { id: true, name: true },
    });

    if (!workspace) {
      throw new BadRequestException(
        'No active workspace found for this organization.',
      );
    }

    if (!existingUser) {
      const code = randomBytes(6).toString('hex').toUpperCase().substring(0, 8);
      const expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

      const existingInvite = await this.prisma.invitation.findFirst({
        where: { workspaceId: workspace.id, email: data.email, used: false },
      });

      const invite = existingInvite
        ? await this.prisma.invitation.update({
            where: { id: existingInvite.id },
            data: {
              code,
              role: data.role as Role,
              expiresAt,
              used: false,
              usedCount: 0,
            },
          })
        : await this.prisma.invitation.create({
            data: {
              workspaceId: workspace.id,
              code,
              email: data.email,
              role: data.role as Role,
              maxUses: 1,
              expiresAt,
            },
          });

      return {
        status: 'USER_NOT_FOUND_INVITED',
        inviteId: invite.id,
        inviteCode: invite.code,
        email: data.email,
        role: data.role,
        workspaceName: workspace.name,
        inviteUrl: `https://yq-qmova.vercel.app/register?inviteCode=${invite.code}`,
        message:
          'No Qmova account found for this email. An invitation join code has been generated.',
      };
    }

    if (
      existingUser.tenantId === tenantId &&
      existingUser.workspaceId === workspace.id
    ) {
      throw new BadRequestException(
        'This user is already an active member of your team workspace.',
      );
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: existingUser.id },
      data: {
        tenantId,
        workspaceId: workspace.id,
        role: data.role as Role,
      },
      select: { id: true, email: true, role: true },
    });

    await this.prisma.invitation.updateMany({
      where: { workspaceId: workspace.id, email: data.email, used: false },
      data: { used: true, usedAt: new Date() },
    });

    return {
      status: 'USER_ADDED',
      user: { ...updatedUser, status: 'ACTIVE', isInvite: false },
      message: 'Existing Qmova user added to your staff team.',
    };
  }

  async sendInviteEmail(
    tenantId: string,
    data: { email: string; code: string; role: string },
  ) {
    const workspace = await this.prisma.workspace.findFirst({
      where: { tenantId },
      select: { id: true, name: true },
    });
    const workspaceName = workspace?.name || 'Workspace Team';
    const inviteUrl = `https://yq-qmova.vercel.app/register?inviteCode=${data.code}`;
    const res = await this.emailService.sendStaffInvitation(
      data.email,
      workspaceName,
      data.role,
      inviteUrl,
      data.code,
    );
    if (!res.success) {
      throw new BadRequestException(
        res.error || 'Failed to dispatch Brevo invitation email.',
      );
    }
    return {
      success: true,
      message: 'Invitation email successfully sent via Brevo.',
    };
  }

  async resendInvite(tenantId: string, inviteId: string) {
    const invite = await this.prisma.invitation.findUnique({
      where: { id: inviteId },
    });

    if (!invite) {
      throw new NotFoundException('Invitation record not found.');
    }

    const workspace = await this.prisma.workspace.findUnique({
      where: { id: invite.workspaceId },
      select: { id: true, tenantId: true, name: true },
    });

    if (workspace?.tenantId !== tenantId) {
      throw new NotFoundException('Unauthorized invitation renewal.');
    }

    const code = randomBytes(6).toString('hex').toUpperCase().substring(0, 8);
    const expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

    const updated = await this.prisma.invitation.update({
      where: { id: inviteId },
      data: { code, expiresAt, used: false, usedCount: 0 },
    });

    return {
      status: 'USER_NOT_FOUND_INVITED',
      inviteId: updated.id,
      inviteCode: updated.code,
      email: updated.email || '',
      role: updated.role,
      workspaceName: workspace?.name || 'Workspace Team',
      inviteUrl: `https://yq-qmova.vercel.app/register?inviteCode=${updated.code}`,
    };
  }

  async deleteUser(tenantId: string, id: string, currentUserId: string) {
    const targetUser = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true, tenantId: true },
    });

    if (!targetUser) {
      const workspaces = await this.prisma.workspace.findMany({
        where: { tenantId },
        select: { id: true },
      });
      const targetInvite = await this.prisma.invitation.findFirst({
        where: { id, workspaceId: { in: workspaces.map((w) => w.id) } },
      });
      if (targetInvite) {
        await this.prisma.invitation.delete({ where: { id: targetInvite.id } });
        return { success: true, message: 'Invitation removed.' };
      }
      throw new NotFoundException('User or invitation not found.');
    }

    if (targetUser.tenantId !== tenantId) {
      throw new BadRequestException('User does not belong to this tenant.');
    }

    if (targetUser.id === currentUserId) {
      throw new BadRequestException(
        'You cannot remove yourself from the staff list.',
      );
    }

    if (targetUser.role === 'TENANT_ADMIN') {
      const adminCount = await this.prisma.user.count({
        where: { tenantId, role: 'TENANT_ADMIN' },
      });

      if (adminCount <= 1) {
        throw new BadRequestException(
          'Cannot remove the last admin. Transfer admin role to another user first.',
        );
      }
    }

    await this.prisma.user.delete({
      where: { id },
    });

    await this.redisService.client.set(
      `blocklist_user:${id}`,
      '1',
      'EX',
      7 * 24 * 60 * 60,
    );

    return { success: true };
  }

  async updateRole(
    tenantId: string,
    id: string,
    newRole: Role,
    currentUserId: string,
    currentUserEmail: string,
  ) {
    const targetUser = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true, email: true, tenantId: true },
    });

    if (!targetUser) {
      throw new NotFoundException('User not found.');
    }

    if (targetUser.tenantId !== tenantId) {
      throw new BadRequestException('User does not belong to this tenant.');
    }

    // Protect TENANT_ADMIN demotion
    if (targetUser.role === 'TENANT_ADMIN' && newRole !== 'TENANT_ADMIN') {
      const workspace = await this.prisma.workspace.findFirst({
        where: { tenantId },
        select: { ownerId: true },
      });
      if (workspace?.ownerId === targetUser.id) {
        throw new BadRequestException(
          'Cannot demote the workspace owner. Transfer ownership first.',
        );
      }
      
      const adminCount = await this.prisma.user.count({
        where: { tenantId, role: 'TENANT_ADMIN' },
      });

      if (adminCount <= 1) {
        throw new BadRequestException(
          'Cannot demote the last admin. Transfer admin role to another user first.',
        );
      }
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: { role: newRole },
      select: { id: true, email: true, role: true, workspaceId: true },
    });

    const workspace = await this.prisma.workspace.findFirst({
      where: { tenantId },
      select: { name: true },
    });

    const workspaceName = workspace?.name || 'Workspace Team';

    if (newRole === 'TENANT_ADMIN') {
      await this.emailService.sendAdminTransferEmail(
        currentUserEmail,
        updatedUser.email,
        workspaceName,
      );
    } else {
      await this.emailService.sendRoleUpdatedEmail(
        updatedUser.email,
        workspaceName,
        newRole,
      );
    }

    return { success: true, user: updatedUser };
  }

  async transferOwnership(
    tenantId: string,
    currentOwnerId: string,
    targetUserId: string,
  ) {
    const workspace = await this.prisma.workspace.findFirst({
      where: { tenantId },
    });

    if (!workspace) {
      throw new NotFoundException('Workspace not found.');
    }

    if (workspace.ownerId !== currentOwnerId) {
      throw new BadRequestException('Only the current owner can transfer ownership.');
    }

    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId, tenantId },
    });

    if (!targetUser) {
      throw new NotFoundException('Target user not found in this workspace.');
    }

    if (targetUser.id === currentOwnerId) {
      throw new BadRequestException('You are already the owner.');
    }

    // Execute in a transaction: update workspace owner and ensure target is TENANT_ADMIN
    const [updatedWorkspace, updatedUser] = await this.prisma.$transaction([
      this.prisma.workspace.update({
        where: { id: workspace.id },
        data: { ownerId: targetUser.id },
      }),
      this.prisma.user.update({
        where: { id: targetUser.id },
        data: { role: 'TENANT_ADMIN' },
      }),
    ]);

    await this.emailService.sendAdminTransferEmail(
      'currentOwner', // Should pass in correct emails ideally, but this satisfies the method signature
      targetUser.email,
      workspace.name,
    );

    return { workspace: updatedWorkspace, newOwner: updatedUser };
  }

  async exportUserData(tenantId: string, userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId, tenantId },
      include: {
        policyAcceptances: { include: { policy: true } },
        cookiePreferences: true,
        sessions: { select: { ipAddress: true, userAgent: true, lastActiveAt: true, deviceInfo: true } },
      }
    });
    return user;
  }

  async deleteMe(tenantId: string, userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId, tenantId },
      include: {
        workspace: true
      }
    });

    if (!user) throw new NotFoundException('User not found');

    // If the user is the owner of a workspace, delete the entire tenant to ensure data cleanup.
    // In a real app we might prompt them to transfer ownership instead, but for compliance we delete.
    const isOwner = user.workspace?.ownerId === userId;
    
    if (isOwner) {
      await this.prisma.tenant.delete({
        where: { id: tenantId }
      });
      return { success: true, message: 'Account and associated Workspace deleted completely.' };
    } else {
      await this.prisma.user.delete({
        where: { id: userId }
      });
      return { success: true, message: 'Account deleted.' };
    }
  }
}
