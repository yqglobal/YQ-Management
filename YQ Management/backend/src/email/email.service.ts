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
      ${generateButtonHtml('Manage Staff & Resend', 'https://qmova.yqbuddy.com/dashboard/settings/staff')}`;

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
      ${generateButtonHtml('Go to Dashboard', 'https://qmova.yqbuddy.com/dashboard')}`;

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
      ${generateButtonHtml('Access Workspace', 'https://qmova.yqbuddy.com/dashboard')}`;

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

  private async sendEmail(
    to: string,
    subject: string,
    title: string,
    preheader: string,
    content: string,
  ) {
    if (!this.apiKey) {
      this.logger.warn(`[MOCK EMAIL] To: ${to} | Subject: ${subject}`);
      return;
    }
    try {
      const htmlContent = createBrandEmailLayout({
        title,
        preheader,
        content,
        logoUrl: 'https://qmova.yqbuddy.com/qmova-light-logo.png',
      });
      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'api-key': this.apiKey,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          sender: { name: this.senderName, email: this.senderEmail },
          to: [{ email: to }],
          subject,
          htmlContent,
        }),
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) {
        const err = await res.text();
        this.logger.error(`Brevo API error: ${err}`);
      }
    } catch (e) {
      this.logger.error(`Failed to send email to ${to}`, e);
    }
  }

  async sendWelcomeEmail(email: string, name: string) {
    const subject = 'Welcome to Qmova!';
    const content = `<h2 style="color: #111827; margin-top: 0; font-size: 22px; font-weight: 700;">Welcome aboard, ${name || 'there'}!</h2>
    <p style="color: #4b5563; line-height: 1.6;">Your Qmova account has been successfully created. We're thrilled to have you join us.</p>
    <p style="color: #4b5563; line-height: 1.6;">You can now log in and start configuring your workspace to manage queues and services effortlessly.</p>
    ${generateButtonHtml('Go to Dashboard', 'https://qmova.yqbuddy.com/dashboard')}`;
    await this.sendEmail(
      email,
      subject,
      'Welcome to Qmova',
      'Your account is ready!',
      content,
    );
  }

  async sendPolicyUpdateEmail(
    email: string,
    policyName: string,
    version: string,
  ) {
    this.logger.log(`Placeholder: Sent Policy Update email to ${email}`);
  }

  async sendAccountDeletedEmail(email: string) {
    this.logger.log(`Placeholder: Sent Account Deleted email to ${email}`);
  }

  async sendSubscriptionActivatedEmail(email: string, planName: string) {
    const subject = 'Subscription Activated';
    const content = `<h2 style="color: #111827; margin-top: 0; font-size: 22px; font-weight: 700;">Thank You for Your Purchase!</h2>
    <p style="color: #4b5563; line-height: 1.6;">Your payment was successful and your subscription to the <strong>${planName}</strong> plan is now active.</p>
    <p style="color: #4b5563; line-height: 1.6;">Enjoy the premium features of Qmova. You can review your billing details in the dashboard settings.</p>
    ${generateButtonHtml('View Billing', 'https://qmova.yqbuddy.com/dashboard/settings/billing')}`;
    await this.sendEmail(
      email,
      subject,
      'Subscription Activated',
      `Your ${planName} plan is now active`,
      content,
    );
  }

  async sendSubscriptionCancelledEmail(email: string, planName: string) {
    const subject = 'Subscription Cancelled';
    const content = `<h2 style="color: #111827; margin-top: 0; font-size: 22px; font-weight: 700;">Subscription Cancelled</h2>
    <p style="color: #4b5563; line-height: 1.6;">Your subscription to the <strong>${planName}</strong> plan has been cancelled.</p>
    <p style="color: #4b5563; line-height: 1.6;">You will continue to have access until the end of your current billing period. If this was a mistake, you can always renew your plan from the billing settings.</p>
    ${generateButtonHtml('Manage Billing', 'https://qmova.yqbuddy.com/dashboard/settings/billing')}`;
    await this.sendEmail(
      email,
      subject,
      'Subscription Cancelled',
      `Your ${planName} plan has been cancelled`,
      content,
    );
  }

  async sendPlanExpiringEmail(
    email: string,
    planName: string,
    daysRemaining: number,
  ) {
    const subject = 'Action Required: Plan Renewing Soon';
    const content = `<h2 style="color: #111827; margin-top: 0; font-size: 22px; font-weight: 700;">Plan Renewal Reminder</h2>
    <p style="color: #4b5563; line-height: 1.6;">Your subscription to the <strong>${planName}</strong> plan is renewing in <strong>${daysRemaining}</strong> days.</p>
    <p style="color: #4b5563; line-height: 1.6;">Please ensure your payment method is up to date to avoid any service interruptions.</p>
    ${generateButtonHtml('Manage Billing', 'https://qmova.yqbuddy.com/dashboard/settings/billing')}`;
    await this.sendEmail(
      email,
      subject,
      'Plan Renewing Soon',
      `Your ${planName} plan renews in ${daysRemaining} days`,
      content,
    );
  }

  async sendPlanExpiredEmail(email: string, planName: string) {
    const subject = 'Subscription Expired';
    const content = `<h2 style="color: #111827; margin-top: 0; font-size: 22px; font-weight: 700;">Subscription Expired</h2>
    <p style="color: #4b5563; line-height: 1.6;">Your subscription to the <strong>${planName}</strong> plan has officially expired.</p>
    <p style="color: #4b5563; line-height: 1.6;">To regain access to premium features, please renew your plan through your billing dashboard.</p>
    ${generateButtonHtml('Renew Plan', 'https://qmova.yqbuddy.com/dashboard/settings/billing')}`;
    await this.sendEmail(
      email,
      subject,
      'Subscription Expired',
      `Your ${planName} plan has expired`,
      content,
    );
  }

  async sendDemoRequestReceivedEmail(email: string) {
    this.logger.log(
      `Placeholder: Sent Demo Request Received email to ${email}`,
    );
  }

  async sendTrialStartedEmail(
    email: string,
    planName: string,
    trialDays: number,
  ) {
    const subject = 'Your Qmova Trial Has Started';
    const content = `<h2 style="color: #111827; margin-top: 0; font-size: 22px; font-weight: 700;">Welcome to Qmova!</h2>
    <p style="color: #4b5563; line-height: 1.6;">Your ${trialDays}-day free trial for the <strong>${planName}</strong> plan has officially started.</p>
    <p style="color: #4b5563; line-height: 1.6;">We are excited for you to explore all the premium features. If you have any questions, our support team is here to help.</p>
    ${generateButtonHtml('Go to Dashboard', 'https://qmova.yqbuddy.com/dashboard')}`;
    await this.sendEmail(
      email,
      subject,
      'Trial Started',
      `Enjoy your ${trialDays}-day free trial of Qmova.`,
      content,
    );
  }

  async sendTrialExpiringEmail(email: string, daysLeft: number) {
    const subject = 'Your Qmova Trial is Expiring Soon';
    const content = `<h2 style="color: #111827; margin-top: 0; font-size: 22px; font-weight: 700;">Trial Expiring Soon</h2>
    <p style="color: #4b5563; line-height: 1.6;">Your free trial is coming to an end in <strong>${daysLeft} days</strong>.</p>
    <p style="color: #4b5563; line-height: 1.6;">To continue using Qmova without interruption, please add a payment method to your billing settings.</p>
    ${generateButtonHtml('Update Billing', 'https://qmova.yqbuddy.com/dashboard/settings/billing')}`;
    await this.sendEmail(
      email,
      subject,
      'Trial Expiring Soon',
      `You have ${daysLeft} days left on your free trial.`,
      content,
    );
  }
  async sendMarketingEmail(
    toEmails: string[],
    subject: string,
    customHtml: string,
  ) {
    try {
      if (!this.apiKey) {
        this.logger.warn(
          `[MOCK EMAIL] Marketing Email to ${toEmails.length} recipients. Subject: ${subject}`,
        );
        return { success: true, mocked: true };
      }

      // We chunk the emails in case there are thousands, Brevo supports multiple `to` or `bcc`
      // For proper marketing without seeing each other's emails, we should send to `bcc` or use batch sending.
      // A simple way is to use `bcc` for up to 99 recipients per call.
      const batchSize = 90;
      let sentCount = 0;

      for (let i = 0; i < toEmails.length; i += batchSize) {
        const batch = toEmails.slice(i, i + batchSize);

        // Wrap the custom HTML in our brand layout for consistency, or just send raw
        const htmlContent = createBrandEmailLayout({
          title: subject,
          preheader: 'Qmova Update',
          content: customHtml,
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
              name: this.senderName,
              email: this.senderEmail,
            },
            to: [{ email: this.senderEmail, name: 'Qmova Subscribers' }],
            bcc: batch.map((e) => ({ email: e })),
            subject: subject,
            htmlContent,
          }),
          signal: AbortSignal.timeout(15000),
        });

        if (!res.ok) {
          const errorText = await res.text();
          this.logger.error(
            `Brevo API error in sendMarketingEmail batch: ${errorText}`,
          );
          continue; // keep trying other batches
        }
        sentCount += batch.length;
      }

      this.logger.log(`Sent marketing email to ${sentCount} recipients`);
      return { success: true, count: sentCount };
    } catch (error: any) {
      this.logger.error(`Failed to send marketing email`, error);
      return { success: false, error: error?.message };
    }
  }

  async sendPlanUpgradedEmail(email: string, fromPlan: string, toPlan: string) {
    const subject = 'Your Qmova Plan Has Been Upgraded';
    const content = `<h2 style="color: #111827; margin-top: 0; font-size: 22px; font-weight: 700;">Upgrade Successful</h2>
    <p style="color: #4b5563; line-height: 1.6;">You have successfully upgraded your subscription from <strong>${fromPlan}</strong> to the <strong>${toPlan}</strong> plan.</p>
    <p style="color: #4b5563; line-height: 1.6;">Any resources that were previously frozen due to quota limits have been automatically restored. Enjoy your new premium features!</p>
    ${generateButtonHtml('Go to Dashboard', 'https://qmova.yqbuddy.com/dashboard')}`;
    await this.sendEmail(
      email,
      subject,
      'Plan Upgraded',
      `Your subscription was upgraded to ${toPlan}.`,
      content,
    );
  }

  async sendPlanDowngradedEmail(
    email: string,
    fromPlan: string,
    toPlan: string,
    frozenSummary?: string,
  ) {
    const subject = 'Your Qmova Plan Has Been Downgraded';
    const content = `<h2 style="color: #111827; margin-top: 0; font-size: 22px; font-weight: 700;">Plan Downgraded</h2>
    <p style="color: #4b5563; line-height: 1.6;">Your subscription has been changed from <strong>${fromPlan}</strong> to the <strong>${toPlan}</strong> plan.</p>
    ${frozenSummary ? `<p style="color: #b91c1c; font-weight: 600; line-height: 1.6;">Important: ${frozenSummary}</p>` : ''}
    <p style="color: #4b5563; line-height: 1.6;">Frozen resources are not deleted, but they are inaccessible to your customers. Your oldest resources remain active. You can restore frozen resources at any time by upgrading your plan or deleting excess resources.</p>
    ${generateButtonHtml('Review Resources', 'https://qmova.yqbuddy.com/dashboard/settings/billing')}`;
    await this.sendEmail(
      email,
      subject,
      'Plan Downgraded',
      `Your subscription was changed to ${toPlan}.`,
      content,
    );
  }

  async sendQuotaExceededEmail(
    email: string,
    resourceType: string,
    current: number,
    limit: number,
  ) {
    const subject = 'Qmova Quota Limit Reached';
    const content = `<h2 style="color: #111827; margin-top: 0; font-size: 22px; font-weight: 700;">Action Required: Quota Exceeded</h2>
    <p style="color: #4b5563; line-height: 1.6;">You have reached the maximum limit for <strong>${resourceType}</strong> on your current plan.</p>
    <p style="color: #4b5563; line-height: 1.6;">Current usage: ${current} / Limit: ${limit}</p>
    <p style="color: #4b5563; line-height: 1.6;">To add more ${resourceType}, please upgrade your subscription or archive existing ones.</p>
    ${generateButtonHtml('Upgrade Plan', 'https://qmova.yqbuddy.com/dashboard/settings/billing')}`;
    await this.sendEmail(
      email,
      subject,
      'Quota Limit Reached',
      `You reached the limit for ${resourceType}.`,
      content,
    );
  }
}
