import { Injectable, Logger } from '@nestjs/common';
import { createTransport, type Transporter } from 'nodemailer';
import { Resend } from 'resend';
import { AppConfigService } from '../../config/app.config';

export interface EmailMessage {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
}

/**
 * Provider-agnostic email sender.
 *
 * Three backends: Mailpit (dev), generic SMTP, and Resend (prod). The
 * choice is driven by `EMAIL_PROVIDER`. Templates are rendered by
 * `@futurenostics/email` (React Email) and passed in as HTML; this
 * service only does transport.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly transporter: Transporter | null;
  private readonly resend: Resend | null;
  private readonly defaultFrom: string;

  constructor(private readonly config: AppConfigService) {
    const env = config.env;
    this.defaultFrom = env.SMTP_FROM;

    if (env.EMAIL_PROVIDER === 'resend') {
      if (!env.RESEND_API_KEY) {
        throw new Error('RESEND_API_KEY is required when EMAIL_PROVIDER=resend');
      }
      this.resend = new Resend(env.RESEND_API_KEY);
      this.transporter = null;
    } else {
      this.resend = null;
      this.transporter = createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_PORT === 465,
        auth:
          env.SMTP_USER && env.SMTP_PASSWORD
            ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD }
            : undefined,
      });
    }
  }

  async send(message: EmailMessage): Promise<void> {
    const from = message.from ?? this.defaultFrom;
    if (this.resend) {
      await this.resend.emails.send({
        from,
        to: message.to,
        subject: message.subject,
        html: message.html,
        ...(message.text ? { text: message.text } : {}),
        ...(message.replyTo ? { replyTo: message.replyTo } : {}),
      });
      this.logger.log(`email sent via resend: ${message.subject}`);
      return;
    }

    if (!this.transporter) {
      throw new Error('Email transporter is not configured');
    }
    await this.transporter.sendMail({
      from,
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
      replyTo: message.replyTo,
    });
    this.logger.log(`email sent via smtp: ${message.subject}`);
  }
}
