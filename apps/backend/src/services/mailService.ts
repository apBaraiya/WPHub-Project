import nodemailer from 'nodemailer';
import { logger } from '@wphub/utils';

const smtpHost = process.env.SMTP_HOST;
const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
const smtpFrom = process.env.SMTP_FROM || 'WPHub SaaS <noreply@wphub.cloud>';

// Initialize Nodemailer transporter
let transporter: nodemailer.Transporter | null = null;

if (smtpHost && smtpUser && smtpPass) {
  transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });
} else {
  logger.warn(
    'SMTP configurations are incomplete. MailService will fall back to logging emails to the console.',
  );
}

const BRAND_COLOR = '#4f46e5'; // Indigo-600
const DARK_BG = '#0b0f19'; // Slate-950

// Base HTML template wrapper for brand consistency
const getBaseTemplate = (title: string, contentHtml: string): string => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #f3f4f6;
      color: #1f2937;
      margin: 0;
      padding: 0;
    }
    .wrapper {
      width: 100%;
      background-color: #f3f4f6;
      padding: 40px 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    }
    .header {
      background-color: ${DARK_BG};
      padding: 32px 24px;
      text-align: center;
    }
    .logo {
      display: inline-block;
      width: 40px;
      height: 40px;
      line-height: 40px;
      border-radius: 8px;
      background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
      color: #ffffff;
      font-weight: bold;
      font-size: 20px;
      margin-bottom: 12px;
    }
    .logo-text {
      color: #ffffff;
      font-size: 20px;
      font-weight: 600;
      letter-spacing: -0.025em;
    }
    .content {
      padding: 40px 32px;
      line-height: 1.6;
    }
    .btn-container {
      margin: 32px 0;
      text-align: center;
    }
    .btn {
      display: inline-block;
      background-color: ${BRAND_COLOR};
      color: #ffffff !important;
      padding: 14px 28px;
      font-weight: 600;
      text-decoration: none;
      border-radius: 8px;
      box-shadow: 0 4px 10px rgba(79, 70, 229, 0.3);
    }
    .footer {
      background-color: #f9fafb;
      padding: 24px 32px;
      text-align: center;
      font-size: 12px;
      color: #6b7280;
      border-top: 1px solid #f3f4f6;
    }
    .link-alt {
      word-break: break-all;
      color: ${BRAND_COLOR};
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <div class="logo">W</div>
        <div class="logo-text">WPHub SaaS</div>
      </div>
      <div class="content">
        ${contentHtml}
      </div>
      <div class="footer">
        <p>This email was sent by WPHub SaaS Cloud Provisioning Engine.</p>
        <p>&copy; 2026 WPHub. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>
`;

export const mailService = {
  async sendEmail(to: string, subject: string, html: string, text: string) {
    if (transporter) {
      try {
        await transporter.sendMail({
          from: smtpFrom,
          to,
          subject,
          text,
          html,
        });
        logger.info(`Email successfully sent to ${to}: ${subject}`);
      } catch (err: any) {
        logger.error(`Failed to send email to ${to}: ${err.message}`);
      }
    } else {
      logger.info(`
============================================================
[MAIL DISPATCH MOCK]
To: ${to}
Subject: ${subject}
Text Content: ${text}
============================================================
      `);
    }
  },

  async sendVerificationEmail(to: string, token: string) {
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${token}`;

    const contentHtml = `
      <h2 style="margin-top: 0; font-size: 20px; font-weight: 700; color: #111827;">Confirm your email address</h2>
      <p>Thank you for signing up for WPHub SaaS! To get started provisioning high-performance WordPress hosting instances, please confirm your email address by clicking the button below:</p>
      <div class="btn-container">
        <a href="${verificationUrl}" class="btn" target="_blank">Verify Email Address</a>
      </div>
      <p style="font-size: 14px; color: #4b5563;">This link will expire in 24 hours. If you did not register for a WPHub account, you can safely ignore this email.</p>
      <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 32px 0;" />
      <p style="font-size: 12px; color: #6b7280;">If the button above does not work, copy and paste this URL into your browser:</p>
      <p class="link-alt" style="font-size: 12px; margin-bottom: 0;"><a href="${verificationUrl}">${verificationUrl}</a></p>
    `;

    const text = `Verify Email Address: Confirm your email for WPHub by clicking this link: ${verificationUrl}`;
    await this.sendEmail(
      to,
      'Verify your email address - WPHub SaaS',
      getBaseTemplate('Verify Email', contentHtml),
      text,
    );
  },

  async sendPasswordResetEmail(to: string, token: string) {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${token}`;

    const contentHtml = `
      <h2 style="margin-top: 0; font-size: 20px; font-weight: 700; color: #111827;">Reset your password</h2>
      <p>We received a request to reset the password for your WPHub SaaS account. Click the button below to choose a new password:</p>
      <div class="btn-container">
        <a href="${resetUrl}" class="btn" target="_blank">Reset Password</a>
      </div>
      <p style="font-size: 14px; color: #4b5563;">This link is secure, valid for one-time use, and will expire in 1 hour. If you did not make this request, your account is secure and you can ignore this email.</p>
      <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 32px 0;" />
      <p style="font-size: 12px; color: #6b7280;">If the button above does not work, copy and paste this URL into your browser:</p>
      <p class="link-alt" style="font-size: 12px; margin-bottom: 0;"><a href="${resetUrl}">${resetUrl}</a></p>
    `;

    const text = `Reset Password: Reset your WPHub password by clicking this link: ${resetUrl}`;
    await this.sendEmail(
      to,
      'Reset your password - WPHub SaaS',
      getBaseTemplate('Reset Password', contentHtml),
      text,
    );
  },
};
