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

  get isConfigured() {
    return this.transporter !== null;
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

  /** 6-digit code e-mail (account verification, new-device login, password reset). */
  async sendAuthCode(
    to: string,
    name: string | null,
    code: string,
    purpose: 'verify_email' | 'login' | 'reset_password',
    ttlMinutes: number,
  ): Promise<void> {
    const copy = {
      verify_email: {
        subject: `${code} é seu código de confirmação — DCash`,
        title: 'Confirme seu e-mail',
        text: 'Falta pouco para começar a usar o DCash. Digite este código na tela de cadastro:',
      },
      login: {
        subject: `${code} é seu código de acesso — DCash`,
        title: 'Confirme que é você',
        text: 'Detectamos um acesso a partir de um novo dispositivo. Digite este código para entrar:',
      },
      reset_password: {
        subject: `${code} é seu código para redefinir a senha — DCash`,
        title: 'Redefinição de senha',
        text: 'Recebemos um pedido para redefinir a sua senha. Digite este código para criar uma nova:',
      },
    }[purpose];
    if (!this.transporter) {
      // Dev without SMTP: keep the flow testable from the server log
      this.logger.warn(`[código ${purpose}] ${to}: ${code}`);
    }
    const hello = name ? `Olá, ${name.split(' ')[0]}!` : 'Olá!';
    await this.send(
      to,
      copy.subject,
      `<div style="font-family:Inter,Segoe UI,Arial,sans-serif;background:#f3f6f4;padding:32px 16px">
        <div style="max-width:460px;margin:0 auto;background:#ffffff;border:1px solid #e3e8e5;border-radius:16px;overflow:hidden">
          <div style="background:linear-gradient(135deg,#065f46,#10b981);padding:20px 24px;color:#fff;font-weight:700;font-size:18px">DCash</div>
          <div style="padding:24px">
            <h2 style="margin:0 0 6px;font-size:20px;color:#0f1a14">${copy.title}</h2>
            <p style="margin:0 0 4px;color:#3d4a43;font-size:14px">${hello}</p>
            <p style="margin:0 0 18px;color:#3d4a43;font-size:14px">${copy.text}</p>
            <div style="text-align:center;margin:0 0 18px">
              <span style="display:inline-block;letter-spacing:10px;font-size:32px;font-weight:700;color:#065f46;background:#ecfdf5;border:1px solid #a7f3d0;border-radius:12px;padding:14px 18px 14px 28px">${code}</span>
            </div>
            <p style="margin:0;color:#6b7a72;font-size:12px">O código vale por ${ttlMinutes} minutos e só pode ser usado uma vez. Se não foi você, ignore este e-mail — sua conta continua protegida.</p>
          </div>
        </div>
      </div>`,
    );
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
