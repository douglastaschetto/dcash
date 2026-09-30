import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

/**
 * Same "degrade gracefully if unconfigured" pattern already used for
 * WhatsApp/Z-API and SerpAPI in this codebase: if SMTP_* env vars are
 * missing, log a warning and skip sending instead of throwing — so local
 * dev without SMTP creds doesn't break the forgot-password flow, it just
 * doesn't deliver the email (the link is still logged for manual testing).
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
    if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
      this.transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: Number(SMTP_PORT) || 587,
        secure: Number(SMTP_PORT) === 465,
        auth: { user: SMTP_USER, pass: SMTP_PASS },
      });
    } else {
      this.logger.warn(
        'SMTP não configurado — e-mails serão apenas logados, não enviados.',
      );
    }
  }

  async send(to: string, subject: string, html: string): Promise<void> {
    if (!this.transporter) {
      this.logger.warn(
        `[e-mail não enviado — SMTP ausente] Para: ${to} | Assunto: ${subject}`,
      );
      return;
    }
    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM || 'Dcash <no-reply@dcash.dtasc.com.br>',
        to,
        subject,
        html,
      });
    } catch (err) {
      this.logger.error(
        `Falha ao enviar e-mail para ${to}`,
        err instanceof Error ? err.stack : String(err),
      );
    }
  }

  async sendPasswordReset(to: string, resetUrl: string): Promise<void> {
    await this.send(
      to,
      'Redefinição de senha — Dcash',
      `<div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2 style="color:#10b981">Dcash</h2>
        <p>Recebemos um pedido para redefinir a senha da sua conta.</p>
        <p><a href="${resetUrl}" style="background:#10b981;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:bold">Redefinir senha</a></p>
        <p>Se você não solicitou isso, ignore este e-mail. O link expira em 1 hora.</p>
      </div>`,
    );
  }
}
