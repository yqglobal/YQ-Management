import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  createBrandEmailLayout,
  generateOtpBoxHtml,
  generateButtonHtml,
} from '../../email/email-layout';

export interface TemplateVariables {
  [key: string]: string | number | undefined;
}

export interface Template {
  subject?: string;
  html: string;
  text?: string;
}

@Injectable()
export class TemplateService {
  private readonly logger = new Logger(TemplateService.name);

  constructor(private readonly prisma: PrismaService) {}

  private readonly emailTemplates: Record<string, Template> = {
    signup_otp: {
      subject: 'Verify your Qmova Account',
      html: createBrandEmailLayout({
        title: 'Account Verification',
        preheader: 'Your email verification code for Qmova.',
        content: `<h2 style="color: #111827; margin-top: 0; font-size: 22px; font-weight: 700;">Verify Your Email Address</h2>
        <p style="color: #4b5563; line-height: 1.6;">Thank you for registering with Qmova. Please use the verification code below to confirm your email address and activate your account:</p>
        ${generateOtpBoxHtml('{{otp}}')}
        <p style="color: #4b5563; line-height: 1.6; font-size: 14px;">This verification code will expire in <strong>10 minutes</strong>. For security purposes, never share this code with anyone. If you did not sign up for Qmova, please ignore this message.</p>`,
      }),
      text: 'Your Qmova verification code is: {{otp}}\n\nThis code will expire in 10 minutes.',
    },
    login_otp: {
      subject: 'Your Qmova Authentication Code',
      html: createBrandEmailLayout({
        title: 'Login Verification',
        preheader: 'Your secure authentication code for Qmova.',
        content: `<h2 style="color: #111827; margin-top: 0; font-size: 22px; font-weight: 700;">Login Authentication Code</h2>
        <p style="color: #4b5563; line-height: 1.6;">A sign-in attempt was detected for your Qmova account. Please enter the verification code below to authorize access:</p>
        ${generateOtpBoxHtml('{{otp}}')}
        <p style="color: #4b5563; line-height: 1.6; font-size: 14px;">This code expires in <strong>10 minutes</strong>. If you did not initiate this login request, please secure your account immediately or contact our support team.</p>`,
      }),
      text: 'Your Qmova authentication code is: {{otp}}\n\nThis code will expire in 10 minutes.',
    },
    password_reset: {
      subject: 'Reset Your Qmova Password',
      html: createBrandEmailLayout({
        title: 'Password Reset Verification',
        preheader: 'Your verification code to reset your Qmova password.',
        content: `<h2 style="color: #111827; margin-top: 0; font-size: 22px; font-weight: 700;">Password Reset Verification</h2>
        <p style="color: #4b5563; line-height: 1.6;">We received a request to reset the password associated with your Qmova account. Use the verification code below to authorize this password modification:</p>
        ${generateOtpBoxHtml('{{otp}}')}
        <p style="color: #4b5563; line-height: 1.6; font-size: 14px;">This verification code is valid for <strong>10 minutes</strong>. If you did not request a password reset, no action is necessary and your current password remains secure.</p>`,
      }),
      text: 'Your Qmova password reset code is: {{otp}}\n\nThis code will expire in 10 minutes.',
    },
    workspace_invite: {
      subject: 'You have been invited to join a Qmova Workspace',
      html: createBrandEmailLayout({
        title: 'Workspace Invitation',
        preheader: 'You have been invited to collaborate on Qmova.',
        content: `<h2 style="color: #111827; margin-top: 0; font-size: 22px; font-weight: 700;">Workspace Collaboration Invitation</h2>
        <p style="color: #4b5563; line-height: 1.6;">Hello, you have been invited by <strong>{{inviter_name}}</strong> to join the workspace <strong>"{{workspace}}"</strong> on Qmova.</p>
        <p style="color: #4b5563; line-height: 1.6;">Click the button below to access the workspace and collaborate with your team:</p>
        ${generateButtonHtml('Accept Invitation & View Workspace', '{{invite_url}}')}
        <p style="color: #4b5563; line-height: 1.6; font-size: 14px;">If you do not recognize this invitation or believe it was sent to you in error, simply disregard this notice.</p>`,
      }),
      text: 'You have been invited to join the workspace "{{workspace}}" on Qmova by {{inviter_name}}.\n\nVisit: {{invite_url}}',
    },
    login_notification: {
      subject: 'Security Alert: New login to your Qmova Account',
      html: createBrandEmailLayout({
        title: 'New Login Detected',
        preheader: 'A login was recorded on your Qmova account.',
        content: `<h2 style="color: #111827; margin-top: 0; font-size: 22px; font-weight: 700;">New Login Detected</h2>
        <p style="color: #4b5563; line-height: 1.6;">We recorded a new successful sign-in to your Qmova account on <strong>{{timestamp}}</strong>.</p>
        <p style="color: #4b5563; line-height: 1.6;">If this login was authorized by you, no action is required. If you do not recognize this activity, please review your active sessions and reset your account password immediately.</p>`,
      }),
      text: 'We detected a new sign-in to your Qmova account at {{timestamp}}.',
    },
    welcome: {
      subject: 'Welcome to Qmova - Account Established',
      html: createBrandEmailLayout({
        title: 'Welcome to Qmova',
        preheader: 'Your Qmova organization workspace is ready.',
        content: `<h2 style="color: #111827; margin-top: 0; font-size: 22px; font-weight: 700;">Welcome Aboard, {{name}}!</h2>
        <p style="color: #4b5563; line-height: 1.6;">We are pleased to welcome you to Qmova. Our platform empowers enterprise organizations to seamlessly orchestrate customer traffic, queue management, and high-conversion omnichannel communication.</p>
        <p style="color: #4b5563; line-height: 1.6;">Your workspace is fully provisioned and ready for operation. Access your dashboard below to configure your digital queues and connect your official communication channels:</p>
        ${generateButtonHtml('Launch Command Dashboard', '{{dashboard_url}}')}
        <p style="color: #4b5563; line-height: 1.6; font-size: 14px;">Should you require technical guidance or platform assistance, our support organization remains at your disposal.</p>`,
      }),
      text: 'Welcome to Qmova, {{name}}!\n\nYour workspace is ready. Access your dashboard at {{dashboard_url}}',
    },
    payment_success: {
      subject: 'Qmova Billing Notice: Payment Successful',
      html: createBrandEmailLayout({
        title: 'Payment Successful',
        preheader: 'Receipt for your Qmova subscription payment.',
        content: `<h2 style="color: #111827; margin-top: 0; font-size: 22px; font-weight: 700;">Payment Confirmation</h2>
        <p style="color: #4b5563; line-height: 1.6;">We are pleased to confirm that your payment of <strong>{{amount}} {{currency}}</strong> for workspace <strong>"{{workspace}}"</strong> has been processed successfully.</p>
        <p style="color: #4b5563; line-height: 1.6;">Your subscription entitlements are active and all platform utilities remain fully operational for your organization.</p>
        ${generateButtonHtml('View Billing & Invoices', '{{dashboard_url}}')}`,
      }),
      text: 'Your payment of {{amount}} {{currency}} for workspace "{{workspace}}" has been processed successfully.',
    },
    payment_failed: {
      subject: 'Qmova Billing Alert: Payment Attempt Unsuccessful',
      html: createBrandEmailLayout({
        title: 'Payment Action Required',
        preheader: 'Urgent notice regarding your Qmova subscription billing.',
        content: `<h2 style="color: #ef4444; margin-top: 0; font-size: 22px; font-weight: 700;">Billing Action Required</h2>
        <p style="color: #4b5563; line-height: 1.6;">We encountered an issue attempting to process your recent payment for workspace <strong>"{{workspace}}"</strong>. Your current billing method may require verification or updating.</p>
        <p style="color: #4b5563; line-height: 1.6;">To prevent any unexpected service interruptions to your digital queues and communication channels, please update your payment credentials:</p>
        ${generateButtonHtml('Update Payment Method', '{{dashboard_url}}')}`,
      }),
      text: 'Your payment for workspace "{{workspace}}" was unsuccessful. Please update your payment method in your dashboard.',
    },
    trial_ending: {
      subject: 'Qmova Notice: Free Trial Period Ending Soon',
      html: createBrandEmailLayout({
        title: 'Trial Expiration Reminder',
        preheader: 'Your Qmova trial concludes in {{days}} days.',
        content: `<h2 style="color: #111827; margin-top: 0; font-size: 22px; font-weight: 700;">Trial Expiration Reminder</h2>
        <p style="color: #4b5563; line-height: 1.6;">This notification serves as a courtesy reminder that your promotional trial for workspace <strong>"{{workspace}}"</strong> will conclude in <strong>{{days}}</strong> days.</p>
        <p style="color: #4b5563; line-height: 1.6;">To ensure uninterrupted access to real-time queue orchestration and customer messaging, please select a subscription tier that fits your operational growth:</p>
        ${generateButtonHtml('Select Subscription Plan', '{{dashboard_url}}')}`,
      }),
      text: 'Your trial for workspace "{{workspace}}" concludes in {{days}} days. Please select a plan to continue service.',
    },
    subscription_renewed: {
      subject: 'Qmova Confirmation: Subscription Renewed',
      html: createBrandEmailLayout({
        title: 'Subscription Renewed',
        preheader: 'Your Qmova subscription has been renewed automatically.',
        content: `<h2 style="color: #111827; margin-top: 0; font-size: 22px; font-weight: 700;">Subscription Renewed</h2>
        <p style="color: #4b5563; line-height: 1.6;">Your active subscription for workspace <strong>"{{workspace}}"</strong> has been successfully renewed for the upcoming service cycle.</p>
        <p style="color: #4b5563; line-height: 1.6;">Your next scheduled billing renewal is set for <strong>{{next_billing_date}}</strong>. All platform utilities remain active without interruption.</p>
        ${generateButtonHtml('Review Subscription Status', '{{dashboard_url}}')}`,
      }),
      text: 'Your subscription for workspace "{{workspace}}" has been renewed. Next billing date: {{next_billing_date}}.',
    },
    subscription_cancelled: {
      subject: 'Qmova Notice: Subscription Cancellation',
      html: createBrandEmailLayout({
        title: 'Subscription Cancelled',
        preheader: 'Acknowledgment of your Qmova subscription cancellation.',
        content: `<h2 style="color: #111827; margin-top: 0; font-size: 22px; font-weight: 700;">Subscription Cancellation</h2>
        <p style="color: #4b5563; line-height: 1.6;">We have processed your request to cancel the recurring subscription for workspace <strong>"{{workspace}}"</strong>.</p>
        <p style="color: #4b5563; line-height: 1.6;">Your organization retains full platform access until the conclusion of your current billing period. Should you choose to reactivate your subscription in the future, your existing configurations will remain preserved.</p>
        ${generateButtonHtml('Reactivate Subscription', '{{dashboard_url}}')}`,
      }),
      text: 'Your subscription for workspace "{{workspace}}" has been cancelled. Service will continue until the end of your current billing period.',
    },
    subscription_expired: {
      subject: 'Qmova Alert: Subscription Expired',
      html: createBrandEmailLayout({
        title: 'Subscription Expired',
        preheader:
          'Your subscription for Qmova has reached its expiration date.',
        content: `<h2 style="color: #ef4444; margin-top: 0; font-size: 22px; font-weight: 700;">Subscription Expired</h2>
        <p style="color: #4b5563; line-height: 1.6;">The active billing cycle for workspace <strong>"{{workspace}}"</strong> has expired, and premium service capabilities are temporarily suspended.</p>
        <p style="color: #4b5563; line-height: 1.6;">To immediately reactivate your workspace queues and customer messaging infrastructure, please renew your subscription:</p>
        ${generateButtonHtml('Renew Subscription Now', '{{dashboard_url}}')}`,
      }),
      text: 'Your subscription for workspace "{{workspace}}" has expired. Please renew in your dashboard to restore full service.',
    },
    payment_reminder: {
      subject: 'Qmova Courtesy Reminder: Upcoming Invoice Due',
      html: createBrandEmailLayout({
        title: 'Payment Reminder',
        preheader: 'An upcoming invoice is due for your Qmova account.',
        content: `<h2 style="color: #111827; margin-top: 0; font-size: 22px; font-weight: 700;">Upcoming Payment Reminder</h2>
        <p style="color: #4b5563; line-height: 1.6;">This notice serves as a courtesy reminder that your scheduled subscription invoice of <strong>{{amount}} {{currency}}</strong> for workspace <strong>"{{workspace}}"</strong> will become due shortly.</p>
        <p style="color: #4b5563; line-height: 1.6;">To verify your payment profile or process an immediate manual payment, please visit your account billing center:</p>
        ${generateButtonHtml('Manage Billing & Payments', '{{dashboard_url}}')}`,
      }),
      text: 'Reminder: Your payment of {{amount}} {{currency}} for workspace "{{workspace}}" is due soon.',
    },
  };

  private readonly whatsappTemplates: Record<string, string> = {
    otp: 'Your Qmova verification code is {{otp}}. It expires in 5 minutes.',
    queue_joined:
      'Hello {{name}}! You have successfully joined the queue. You are #{{position}} in line. Track your status here: {{link}}',
    position_update:
      'Hello {{name}}, you are now #{{position}} in the queue for {{queue_name}}. Estimated wait: {{wait_time}} mins.',
    near_turn: 'Hi {{name}}, you are next in line! Get ready. {{queue_name}}',
    now_serving:
      'Hi {{name}}, it is your turn now! Please proceed to the counter. {{queue_name}}',
    delay:
      'Hi {{name}}, there is a slight delay in {{queue_name}}. We will notify you when it is your turn. Estimated wait: {{wait_time}} mins.',
    queue_closed:
      'Hello {{name}}, the queue {{queue_name}} is now closed. Thank you for your patience.',
    queue_cancelled:
      'Hello {{name}}, your position in {{queue_name}} has been cancelled. You can rejoin the queue if needed.',
    feedback:
      'Thanks for visiting {{queue_name}}! Please reply with a number from 1 to 5 to rate your experience (5 being excellent).',
    thank_you:
      'Thank you for visiting {{queue_name}}, {{name}}! We hope to see you again soon.',
    appointment_created:
      'Hello {{name}}! Your appointment is scheduled for {{date}}. Your token is {{token}}. Track your status here: {{link}}',
    appointment_reminder:
      'Reminder: Hi {{name}}, your appointment is scheduled for tomorrow at {{date}}. Track your status here: {{link}}',
    checked_in:
      'Hello {{name}}! You have been checked in and are now waiting in the live line. Track your status here: {{link}}',
    transferred:
      'You have been transferred to {{queue_name}}. You are now waiting in the new queue.',
  };

  renderEmail(templateKey: string, variables: TemplateVariables): Template {
    const template = this.emailTemplates[templateKey];
    if (!template) {
      this.logger.warn(
        `Email template "${templateKey}" not found, falling back to generic`,
      );
      return {
        subject: 'Qmova Notification',
        html: `<p>{{message}}</p>`,
        text: '{{message}}',
      };
    }

    let html = template.html;
    let text = template.text || '';
    let subject = template.subject || 'Qmova Notification';

    for (const [key, value] of Object.entries(variables)) {
      const placeholder = new RegExp(`{{${key}}}`, 'g');
      html = html.replace(placeholder, String(value ?? ''));
      text = text.replace(placeholder, String(value ?? ''));
      subject = subject.replace(placeholder, String(value ?? ''));
    }

    return { subject, html, text };
  }

  renderWhatsApp(templateKey: string, variables: TemplateVariables): string {
    const template = this.whatsappTemplates[templateKey];
    if (!template) {
      this.logger.warn(`WhatsApp template "${templateKey}" not found`);
      return '';
    }

    let result = template;
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(placeholder, String(value ?? ''));
    }
    return result;
  }

  async renderWhatsAppForWorkspace(
    workspaceId: string | null,
    templateKey: string,
    variables: TemplateVariables,
  ): Promise<string> {
    let templateContent = this.whatsappTemplates[templateKey];
    if (!templateContent) {
      this.logger.warn(`WhatsApp template "${templateKey}" not found`);
      return '';
    }

    if (workspaceId) {
      const customTemplate = await this.prisma.whatsAppTemplate.findFirst({
        where: { workspaceId, key: templateKey, active: true },
      });
      if (customTemplate && customTemplate.content) {
        templateContent = customTemplate.content;
      }
    }

    let result = templateContent;
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(placeholder, String(value ?? ''));
    }
    return result;
  }

  getEmailTemplateKeys(): string[] {
    return Object.keys(this.emailTemplates);
  }

  getWhatsAppTemplateKeys(): string[] {
    return Object.keys(this.whatsappTemplates);
  }
}
