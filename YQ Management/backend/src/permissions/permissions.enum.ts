export enum Permission {
  WORKSPACE_READ = 'workspace:read',
  WORKSPACE_UPDATE = 'workspace:update',
  WORKSPACE_TRANSFER = 'workspace:transfer',
  USER_READ = 'user:read',
  USER_INVITE = 'user:invite',
  USER_UPDATE_ROLE = 'user:update:role',
  USER_DISABLE = 'user:disable',
  USER_DELETE = 'user:delete',
  QUEUE_READ = 'queue:read',
  QUEUE_CREATE = 'queue:create',
  QUEUE_UPDATE = 'queue:update',
  QUEUE_DELETE = 'queue:delete',
  QUEUE_OPERATE = 'queue:operate',
  SETTINGS_READ = 'settings:read',
  SETTINGS_WRITE = 'settings:write',
  SETTINGS_BILLING = 'settings:billing',
  INVITATION_CREATE = 'invitation:create',
  INVITATION_READ = 'invitation:read',
  INVITATION_REVOKE = 'invitation:revoke',
  WEBHOOK_MANAGE = 'webhook:manage',
  WHATSAPP_CONNECT = 'whatsapp:connect',
  WHATSAPP_SETTINGS = 'whatsapp:settings',
}

const ADMIN_PERMISSIONS: Permission[] = [
  Permission.WORKSPACE_READ,
  Permission.WORKSPACE_UPDATE,
  Permission.WORKSPACE_TRANSFER,
  Permission.USER_READ,
  Permission.USER_INVITE,
  Permission.USER_UPDATE_ROLE,
  Permission.USER_DISABLE,
  Permission.USER_DELETE,
  Permission.QUEUE_READ,
  Permission.QUEUE_CREATE,
  Permission.QUEUE_UPDATE,
  Permission.QUEUE_DELETE,
  Permission.QUEUE_OPERATE,
  Permission.SETTINGS_READ,
  Permission.SETTINGS_WRITE,
  Permission.SETTINGS_BILLING,
  Permission.INVITATION_CREATE,
  Permission.INVITATION_READ,
  Permission.INVITATION_REVOKE,
  Permission.WEBHOOK_MANAGE,
  Permission.WHATSAPP_CONNECT,
  Permission.WHATSAPP_SETTINGS,
];

export const rolePermissions: Record<string, readonly Permission[]> = {
  ADMIN: ADMIN_PERMISSIONS,
  SUPER_ADMIN: ADMIN_PERMISSIONS,
  OWNER: ADMIN_PERMISSIONS,
  MANAGER: [
    Permission.QUEUE_READ,
    Permission.QUEUE_OPERATE,
    Permission.SETTINGS_READ,
    Permission.USER_READ,
  ],
  STAFF: [
    Permission.QUEUE_READ,
    Permission.QUEUE_OPERATE,
  ],
};

export function hasPermission(role: string, permission: Permission): boolean {
  const permissions = rolePermissions[role] || [];
  return permissions.includes(permission);
}

export function hasAllPermissions(
  role: string,
  permissions: Permission[],
): boolean {
  return permissions.every((p) => hasPermission(role, p));
}
