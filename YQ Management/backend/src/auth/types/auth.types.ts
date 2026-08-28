import { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    sub: string;
    email: string;
    role: string;
    tenantId: string;
    personalSettings?: any;
    isNewUser?: boolean;
  };
}
