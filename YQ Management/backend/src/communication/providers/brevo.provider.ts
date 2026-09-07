import { Injectable, Logger } from '@nestjs/common';
import {
  EmailProvider,
  EmailMessage,
  EmailResult,
} from '../interfaces/email.provider';

@Injectable()
export class BrevoProvider implements EmailProvider {
  private readonly logger = new Logger(BrevoProvider.name);
  private readonly apiKey: string;

  constructor() {
    this.apiKey = process.env.BREVO_API_KEY || '';
  }

  async send(message: EmailMessage): Promise<EmailResult> {
    try {
      if (!this.apiKey) {
        this.logger.warn(
          `BREVO_API_KEY missing. Mock sent email to ${message.to}: ${message.subject}`,
        );
        return { success: true, providerId: 'mock' };
      }

      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'api-key': this.apiKey,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          sender: message.from || {
            name: process.env.BREVO_SENDER_NAME || 'Qmova',
            email: process.env.BREVO_SENDER_EMAIL || 'yqbuddysa@gmail.com',
          },
          to: [{ email: message.to }],
          subject: message.subject,
          htmlContent: message.htmlContent,
          textContent: message.textContent,
          replyTo: message.replyTo ? { email: message.replyTo } : undefined,
          tags: message.tags
            ? message.tags.map(t => `${t.name}:${t.value}`)
            : undefined,
        }),
      });

      if (!res.ok) {
        const error = await res.text();
        this.logger.error(`Brevo API error: ${error}`);
        return { success: false, error: `Brevo API error: ${error}` };
      }

      const data = await res.json();
      this.logger.log(`Sent email to ${message.to}: ${message.subject}`);
      return { success: true, providerId: data.messageId?.toString() };
    } catch (error) {
      this.logger.error(`Failed to send email to ${message.to}`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async testConnection(): Promise<boolean> {
    if (!this.apiKey) return false;
    try {
      const res = await fetch('https://api.brevo.com/v3/account', {
        headers: {
          accept: 'application/json',
          'api-key': this.apiKey,
        },
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}
