import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import {
  createBrandEmailLayout,
  generateOtpBoxHtml,
  generateButtonHtml,
} from './email-layout';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly apiKey: string;
  private readonly senderEmail: string;
  private readonly senderName: string;

  constructor() {
    this.apiKey = process.env.BREVO_API_KEY || '';
    this.senderEmail = process.env.BREVO_SENDER_EMAIL || 'yqbuddysa@gmail.com';
    this.senderName = process.env.BREVO_SENDER_NAME || 'Qmova';
  }

  async sendOTP(
    email: string,
    otpCode: string,
    purpose: 'signup' | 'login' | 'reset',
  ) {
    try {
      if (!this.apiKey) {
        this.logger.warn(`
=========================================================
 📨 MOCK EMAIL SENT (No BREVO_API_KEY found)
---------------------------------------------------------
 To:      ${email}
 Purpose: ${purpose.toUpperCase()}
 OTP:     ${otpCode}
=========================================================
        `);
        return;
      }

      let subject = '';
      let title = '';
      let bodyContent = '';
      if (purpose === 'signup') {
        subject = 'Verify your Qmova Account';
        title = 'Account Verification';
        bodyContent = `<h2 style="color: #111827; margin-top: 0; font-size: 22px; font-weight: 700;">Verify Your Email Address</h2>
        <p style="color: #4b5563; line-height: 1.6;">Thank you for registering with Qmova. Please use the verification code below to complete your account authentication:</p>
        ${generateOtpBoxHtml(otpCode)}
        <p style="color: #4b5563; line-height: 1.6; font-size: 14px;">This verification code is valid for <strong>10 minutes</strong>. For security purposes, do not disclose this code to anyone. If you did not initiate this request, simply disregard this message.</p>`;
      } else if (purpose === 'login') {
        subject = 'Your Qmova Authentication Code';
        title = 'Login Verification';
        bodyContent = `<h2 style="color: #111827; margin-top: 0; font-size: 22px; font-weight: 700;">Login Authentication Code</h2>
        <p style="color: #4b5563; line-height: 1.6;">A sign-in request was initiated for your Qmova account. Enter the verification code below to proceed securely:</p>
        ${generateOtpBoxHtml(otpCode)}
        <p style="color: #4b5563; line-height: 1.6; font-size: 14px;">This code expires in <strong>10 minutes</strong>. If you did not attempt to sign in, please review your account security immediately or contact support.</p>`;
      } else {
        subject = 'Reset your Qmova Password';
        title = 'Password Reset Code';
        bodyContent = `<h2 style="color: #111827; margin-top: 0; font-size: 22px; font-weight: 700;">Password Reset Verification</h2>
        <p style="color: #4b5563; line-height: 1.6;">We received a request to reset the password associated with your Qmova account. Use the verification code below to authorize this change:</p>
        ${generateOtpBoxHtml(otpCode)}
        <p style="color: #4b5563; line-height: 1.6; font-size: 14px;">This verification code is valid for <strong>10 minutes</strong>. If you did not request a password reset, no action is required and your existing password remains safe.</p>`;
      }

      const htmlContent = createBrandEmailLayout({
        title,
        preheader: `Your verification code is ${otpCode}. Valid for 10 minutes.`,
        content: bodyContent,
      });

      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'api-key': this.apiKey,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          sender: {
            name: `${this.senderName} Authentication`,
            email: this.senderEmail,
          },
          to: [{ email }],
          subject,
          htmlContent,
        }),
        signal: AbortSignal.timeout(10000),
      });

      if (!res.ok) {
        const error = await res.text();
        throw new InternalServerErrorException(`Brevo API error: ${error}`);
      }

      this.logger.log(`Sent ${purpose} OTP to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send OTP to ${email}`, error);
    }
  }

  async sendLoginNotification(email: string) {
    try {
      if (!this.apiKey) return;

      const htmlContent = createBrandEmailLayout({
        title: 'Security Notice: New Login Detected',
        preheader: 'A successful login occurred on your Qmova account.',
        content: `<h2 style="color: #111827; margin-top: 0; font-size: 22px; font-weight: 700;">Security Notification</h2>
        <p style="color: #4b5563; line-height: 1.6;">We observed a successful login to your Qmova account on <strong>${new Date().toLocaleString()}</strong>.</p>
        <p style="color: #4b5563; line-height: 1.6;">If this login activity was initiated by you, no further action is required. If you do not recognize this access, please change your password immediately to secure your account.</p>`,
      });

      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'api-key': this.apiKey,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          sender: {
            name: `${this.senderName} Security`,
            email: this.senderEmail,
          },
          to: [{ email }],
          subject: 'Security Alert: New login to your Qmova Account',
          htmlContent,
        }),
        signal: AbortSignal.timeout(10000),
      });

      if (!res.ok) {
        const error = await res.text();
        throw new InternalServerErrorException(`Brevo API error: ${error}`);
      }
    } catch (error) {
      this.logger.error(`Failed to send login notification to ${email}`, error);
    }
  }

  async addContactToMarketingList(email: string) {
    try {
      if (!this.apiKey) {
        this.logger.warn(
          `BREVO_API_KEY missing. Skipped adding ${email} to marketing list.`,
        );
        return;
      }

      const listId = Number(process.env.BREVO_LIST_ID) || 2;

      const res = await fetch('https://api.brevo.com/v3/contacts', {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'api-key': this.apiKey,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          email,
          listIds: [listId],
          updateEnabled: true,
        }),
        signal: AbortSignal.timeout(10000),
      });

      if (!res.ok) {
        const errorText = await res.text();
        // Ignore duplicate contact error
        if (
          errorText.includes('duplicate_parameter') ||
          errorText.includes('Contact already exist')
        ) {
          return;
        }
        throw new InternalServerErrorException(`Brevo API error: ${errorText}`);
      }

      this.logger.log(`Added ${email} to Brevo marketing list`);
    } catch (error: any) {
      this.logger.error(
        `Failed to add contact to marketing list: ${email}`,
        error,
      );
    }
  }

  async sendStaffInvitation(
    email: string,
    workspaceName: string,
    role: string,
    inviteUrl: string,
    code: string,
  ) {
    try {
      if (!this.apiKey) {
        this.logger.warn(
          `[MOCK EMAIL] Staff invitation to ${email} for workspace "${workspaceName}" (Role: ${role}). URL: ${inviteUrl}`,
        );
        return { success: true, mocked: true };
      }

      const title = 'You have been invited to join Qmova';
      const content = `<h2 style="color: #111827; margin-top: 0; font-size: 22px; font-weight: 700;">Workspace Collaboration Invitation</h2>
      <p style="color: #4b5563; line-height: 1.6;">You have been invited to join the <strong>${workspaceName}</strong> workspace on Qmova as a <strong>${role}</strong>.</p>
      <p style="color: #4b5563; line-height: 1.6;">Click the button below to accept your invitation, create your Qmova account, and connect directly to your workspace team:</p>
      ${generateButtonHtml('Accept Invite & Join Team', inviteUrl)}
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; margin-top: 24px;">
        <p style="margin: 0; font-size: 13px; color: #64748b;">Or join manually by entering your invitation code during signup: <strong style="color: #0f172a; font-family: monospace; font-size: 14px; letter-spacing: 1px;">${code}</strong></p>
      </div>
      <p style="color: #4b5563; line-height: 1.6; font-size: 14px; margin-top: 24px;">This secure invitation link is valid for <strong>3 days</strong>. If you do not recognize this invitation, simply disregard this notice.</p>`;

      const htmlContent = createBrandEmailLayout({
        title,
        preheader: `You've been invited to join ${workspaceName} as ${role}`,
        content,
      });

      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'api-key': this.apiKey,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          sender: {
            name: `${this.senderName} Team`,
            email: this.senderEmail,
          },
          to: [{ email }],
          subject: `Invitation to join ${workspaceName} on Qmova`,
          htmlContent,
        }),
        signal: AbortSignal.timeout(10000),
      });

      if (!res.ok) {
        const errorText = await res.text();
        this.logger.error(
          `Brevo API error in sendStaffInvitation: ${errorText}`,
        );
        return { success: false, error: errorText };
      }

      this.logger.log(`Sent staff invitation email via Brevo to ${email}`);
      return { success: true };
    } catch (error: any) {
      this.logger.error(`Failed to send staff invitation to ${email}`, error);
      return { success: false, error: error?.message };
    }
  }

  async sendInvitationExpiredNotification(
    adminEmail: string,
    staffEmail: string,
    workspaceName: string,
  ) {
    try {
      if (!this.apiKey) {
        this.logger.warn(
          `[MOCK EMAIL] Invitation expired notice to admin ${adminEmail} for unaccepted invite ${staffEmail}`,
        );
        return;
      }

      const content = `<h2 style="color: #111827; margin-top: 0; font-size: 22px; font-weight: 700;">Staff Invitation Expired</h2>
      <p style="color: #4b5563; line-height: 1.6;">The workspace invitation sent to <strong>${staffEmail}</strong> to join <strong>${workspaceName}</strong> has remained unaccepted for over 3 days and has expired.</p>
      <p style="color: #4b5563; line-height: 1.6;">For organizational security, the joining code has been automatically disabled. You can easily reissue a fresh 3-day invitation anytime directly from your Staff Directory settings in the dashboard.</p>
      ${generateButtonHtml('Manage Staff & Resend', 'https://yq-qmova.vercel.app/dashboard/settings/staff')}`;

      const htmlContent = createBrandEmailLayout({
        title: 'Staff Invitation Expired Notice',
        preheader: `Staff invite for ${staffEmail} expired without acceptance`,
        content,
      });

      await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'api-key': this.apiKey,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          sender: {
            name: `${this.senderName} Notifications`,
            email: this.senderEmail,
          },
          to: [{ email: adminEmail }],
          subject: `Notice: Invitation for ${staffEmail} has expired`,
          htmlContent,
        }),
        signal: AbortSignal.timeout(10000),
      });

      this.logger.log(
        `Sent invitation expiration notification to admin ${adminEmail}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send invitation expiration notification to ${adminEmail}`,
        error,
      );
    }
  }

  async sendRoleUpdatedEmail(
    email: string,
    workspaceName: string,
    newRole: string,
  ) {
    try {
      if (!this.apiKey) {
        this.logger.warn(
          `[MOCK EMAIL] Role updated for ${email} in ${workspaceName} to ${newRole}`,
        );
        return;
      }

      const content = `<h2 style="color: #111827; margin-top: 0; font-size: 22px; font-weight: 700;">Role Updated</h2>
      <p style="color: #4b5563; line-height: 1.6;">Your role in the workspace <strong>${workspaceName}</strong> has been updated.</p>
      <p style="color: #4b5563; line-height: 1.6;">You are now assigned the role of <strong>${newRole}</strong>.</p>
      <p style="color: #4b5563; line-height: 1.6;">If you believe this was a mistake, please contact your workspace administrator.</p>
      ${generateButtonHtml('Go to Dashboard', 'https://yq-qmova.vercel.app/dashboard')}`;

      const htmlContent = createBrandEmailLayout({
        title: 'Your Qmova Role was Updated',
        preheader: `Your role in ${workspaceName} was changed to ${newRole}`,
        content,
      });

      await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'api-key': this.apiKey,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          sender: {
            name: `${this.senderName} Notifications`,
            email: this.senderEmail,
          },
          to: [{ email }],
          subject: `Your Role was updated in ${workspaceName}`,
          htmlContent,
        }),
        signal: AbortSignal.timeout(10000),
      });

      this.logger.log(`Sent role update notification to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send role update email to ${email}`, error);
    }
  }

  async sendAdminTransferEmail(
    oldAdminEmail: string,
    newAdminEmail: string,
    workspaceName: string,
  ) {
    try {
      if (!this.apiKey) return;

      const content = `<h2 style="color: #111827; margin-top: 0; font-size: 22px; font-weight: 700;">Admin Privileges Granted</h2>
      <p style="color: #4b5563; line-height: 1.6;">You have been granted full <strong>Admin</strong> privileges in the workspace <strong>${workspaceName}</strong> by ${oldAdminEmail}.</p>
      <p style="color: #4b5563; line-height: 1.6;">You now have full control over the workspace settings, billing, and staff management.</p>
      ${generateButtonHtml('Access Workspace', 'https://yq-qmova.vercel.app/dashboard')}`;

      const htmlContent = createBrandEmailLayout({
        title: 'You are now an Admin',
        preheader: `You have been granted Admin privileges in ${workspaceName}`,
        content,
      });

      await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'api-key': this.apiKey,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          sender: {
            name: `${this.senderName} Notifications`,
            email: this.senderEmail,
          },
          to: [{ email: newAdminEmail }],
          subject: `You are now an Admin in ${workspaceName}`,
          htmlContent,
        }),
        signal: AbortSignal.timeout(10000),
      });

      this.logger.log(`Sent admin transfer notification to ${newAdminEmail}`);
    } catch (error) {
      this.logger.error(
        `Failed to send admin transfer email to ${newAdminEmail}`,
        error,
      );
    }
  }

  // --- Phase 1: Compliance & Production Email Placeholders ---

  async sendWelcomeEmail(email: string, name: string) {
    this.logger.log(`Placeholder: Sent Welcome email to ${email}`);
    // TODO: Implement Brevo call with createBrandEmailLayout
  }

  async sendPolicyUpdateEmail(email: string, policyName: string, version: string) {
    this.logger.log(`Placeholder: Sent Policy Update email to ${email}`);
  }

  async sendAccountDeletedEmail(email: string) {
    this.logger.log(`Placeholder: Sent Account Deleted email to ${email}`);
  }

  async sendSubscriptionActivatedEmail(email: string, planName: string) {
    this.logger.log(`Placeholder: Sent Subscription Activated email to ${email}`);
  }

  async sendSubscriptionCancelledEmail(email: string, planName: string) {
    this.logger.log(`Placeholder: Sent Subscription Cancelled email to ${email}`);
  }

  async sendDemoRequestReceivedEmail(email: string) {
    this.logger.log(`Placeholder: Sent Demo Request Received email to ${email}`);
  }
}
