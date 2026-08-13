import 'dotenv/config';
import nodemailer from 'nodemailer';
import { Resend } from 'resend';

class EmailService {
  private resend: Resend | null = null;
  private nodemailerTransporter: nodemailer.Transporter | null = null;

  constructor() {
    this.initClients();
  }

  private initClients() {
    // 1. Check Nodemailer / SMTP config
    const smtpHost = process.env.SMTP_HOST;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (smtpHost && smtpUser && smtpPass) {
      const port = Number(process.env.SMTP_PORT) || 587;
      const secure = process.env.SMTP_SECURE === 'true' || port === 465;

      this.nodemailerTransporter = nodemailer.createTransport({
        host: smtpHost,
        port,
        secure,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });
      console.log(`📧 [EMAIL SERVICE] Configured Nodemailer SMTP client (${smtpHost}:${port})`);
    }

    // 2. Check Resend API config
    const resendApiKey = process.env.RESEND_API_KEY;
    if (resendApiKey) {
      this.resend = new Resend(resendApiKey);
      console.log(`📧 [EMAIL SERVICE] Configured Resend Email API client`);
    }
  }

  async sendEmail(to: string, subject: string, html: string) {
    const from = process.env.EMAIL_FROM || process.env.SMTP_FROM || 'Project Tracker <onboarding@resend.dev>';

    // 1. Try Nodemailer SMTP first if configured
    if (this.nodemailerTransporter) {
      try {
        const info = await this.nodemailerTransporter.sendMail({
          from,
          to,
          subject,
          html,
        });
        console.log(`\n✅ 📧 [LIVE SMTP EMAIL DISPATCHED VIA NODEMAILER]`);
        console.log(`   Message ID: ${info.messageId}`);
        console.log(`   To: ${to}`);
        console.log(`   Subject: ${subject}\n`);
        return info;
      } catch (smtpErr: any) {
        console.warn(`⚠️ [NODEMAILER SMTP NOTICE] Failed to deliver email (${smtpErr.message}). Trying fallback.`);
      }
    }

    // 2. Try Resend API if configured
    if (this.resend || process.env.RESEND_API_KEY) {
      if (!this.resend && process.env.RESEND_API_KEY) {
        this.resend = new Resend(process.env.RESEND_API_KEY);
      }
      if (this.resend) {
        try {
          const { data, error } = await this.resend.emails.send({
            from,
            to,
            subject,
            html,
          });
          if (!error) {
            console.log(`\n✅ 📧 [RESEND LIVE EMAIL DISPATCHED]`);
            console.log(`   Resend Email ID: ${data?.id}`);
            console.log(`   To: ${to}`);
            console.log(`   Subject: ${subject}\n`);
            return data;
          } else {
            console.warn(`⚠️ [RESEND NOTICE] Could not deliver via Resend (${error.message}).`);
          }
        } catch (resendErr: any) {
          console.warn(`⚠️ [RESEND EXCEPTION] ${resendErr.message}`);
        }
      }
    }

    // 3. Fallback console logger
    console.log(`\n📧 [EMAIL SERVICE DISPATCH LOG]`);
    console.log(`   From: ${from}`);
    console.log(`   To: ${to}`);
    console.log(`   Subject: ${subject}`);
    console.log(`   --------------------------------------------------`);
    console.log(`   ${html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()}`);
    console.log(`   --------------------------------------------------\n`);
  }

  async sendWelcomeAccountEmail(toEmail: string, studentName: string, tempPassword: string, role: string) {
    const siteUrl = process.env.WEBSITE_URL || process.env.FRONTEND_URL || 'http://localhost:5173';
    const displayRole = role === 'ADMIN' ? 'Administrator' : role === 'PROJECT_LEAD' ? 'Project Lead' : 'Team Member';
    const html = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 620px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
        <!-- Header Banner -->
        <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 36px 32px; text-align: center;">
          <div style="font-size: 40px; margin-bottom: 10px;">🚀</div>
          <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">Welcome to Project Tracker!</h1>
          <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0 0; font-size: 15px;">Your account has been created by the organization admin</p>
        </div>

        <!-- Body -->
        <div style="padding: 32px;">
          <p style="font-size: 16px; color: #1e293b; margin: 0 0 16px 0;">Hello, <strong>${studentName}</strong> 👋</p>
          <p style="font-size: 14px; color: #475569; line-height: 1.6; margin: 0 0 24px 0;">
            Your account has been registered on the <strong>VSS Digital Team Project Tracker</strong> platform. 
            You can use the credentials below to login and start collaborating on projects.
          </p>

          <!-- Credentials Box -->
          <div style="background: linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%); border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
            <h3 style="margin: 0 0 16px 0; color: #1e293b; font-size: 15px; font-weight: 700; border-bottom: 1px solid #e2e8f0; padding-bottom: 12px;">🔐 Your Login Credentials</h3>
            
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-size: 13px; width: 130px; font-weight: 600;">🌐 Portal URL</td>
                <td style="padding: 8px 0;">
                  <a href="${siteUrl}" style="color: #4f46e5; font-weight: 700; font-size: 14px; text-decoration: none;">${siteUrl}</a>
                </td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-size: 13px; font-weight: 600;">📧 Login Email</td>
                <td style="padding: 8px 0; color: #1e293b; font-weight: 700; font-size: 14px;">${toEmail}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-size: 13px; font-weight: 600;">🔑 Temp Password</td>
                <td style="padding: 8px 0;">
                  <code style="background: #e0e7ff; color: #3730a3; padding: 4px 12px; border-radius: 6px; font-size: 15px; font-weight: 800; letter-spacing: 1px;">${tempPassword}</code>
                </td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-size: 13px; font-weight: 600;">👤 Account Role</td>
                <td style="padding: 8px 0; color: #1e293b; font-weight: 600; font-size: 14px;">${displayRole}</td>
              </tr>
            </table>
          </div>

          <!-- Security Notice -->
          <div style="background: #fff7ed; border-left: 4px solid #f97316; border-radius: 8px; padding: 14px 16px; margin-bottom: 24px;">
            <p style="margin: 0; color: #9a3412; font-size: 13px; line-height: 1.5;">
              ⚠️ <strong>Security Notice:</strong> This is a temporary password. Please change it from 
              <em>My Account → Change Password</em> after your first login to keep your account secure.
            </p>
          </div>

          <!-- CTA Button -->
          <div style="text-align: center; margin-bottom: 24px;">
            <a href="${siteUrl}" style="display: inline-block; background: linear-gradient(135deg, #4f46e5, #7c3aed); color: #ffffff; padding: 14px 36px; text-decoration: none; border-radius: 10px; font-weight: 700; font-size: 16px; box-shadow: 0 4px 12px rgba(79,70,229,0.35);">
              Login to Project Tracker →
            </a>
          </div>

          <p style="font-size: 13px; color: #94a3b8; text-align: center; margin: 0;">
            If you have any issues logging in, please contact your organization admin.
          </p>
        </div>

        <!-- Footer -->
        <div style="background: #f8fafc; padding: 16px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
          <p style="margin: 0; color: #94a3b8; font-size: 12px;">VSS Digital Team — Project Tracker Portal · Automated notification — please do not reply</p>
        </div>
      </div>
    `;

    await this.sendEmail(toEmail, `🚀 Welcome to Project Tracker — Your Account Credentials`, html);
  }

  async sendPasswordResetEmail(toEmail: string, studentName: string, newTempPassword: string) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
        <h2 style="color: #4f46e5; margin-top: 0;">🔑 Password Reset Notification</h2>
        <p>Hello <strong>${studentName}</strong>,</p>
        <p>Your account password has been updated by the Organization Admin. Below are your new temporary login credentials:</p>
        
        <div style="background-color: #f8fafc; padding: 18px; border-radius: 8px; border-left: 4px solid #4f46e5; margin: 20px 0; font-size: 14px;">
          <p style="margin: 0 0 10px 0; color: #0f172a;"><strong>Registered Email:</strong> <span style="color: #4f46e5;">${toEmail}</span></p>
          <p style="margin: 0 0 10px 0; color: #0f172a;"><strong>New Password:</strong> <code style="background-color: #e0e7ff; color: #3730a3; padding: 4px 8px; border-radius: 4px; font-weight: bold;">${newTempPassword}</code></p>
        </div>

        <p style="color: #475569; font-size: 13px;">
          ⚠️ <em>Security Notice: Please login using this new temporary password and update it from your account settings.</em>
        </p>

        <div style="margin-top: 24px;">
          <a href="http://localhost:5173" style="display: inline-block; background-color: #4f46e5; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
            Login to Project Tracker
          </a>
        </div>
      </div>
    `;

    await this.sendEmail(toEmail, `Password Reset - Project Tracker Account Credentials`, html);
  }

  async sendTaskAssignmentEmail(
    studentEmail: string,
    studentName: string,
    taskTitle: string,
    projectName: string,
    priority: string,
    dueDate?: string | Date | null,
    description?: string
  ) {
    const dueDateStr = dueDate ? new Date(dueDate).toLocaleDateString() : 'No deadline set';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
        <h2 style="color: #0284c7; margin-top: 0;">📌 New Task Assigned to You</h2>
        <p>Hello <strong>${studentName}</strong>,</p>
        <p>A new deliverable task has been assigned to you by your Project Lead / Admin.</p>
        
        <div style="background-color: #f0f9ff; padding: 18px; border-radius: 8px; border-left: 4px solid #0284c7; margin: 20px 0;">
          <h3 style="margin: 0 0 10px 0; color: #0369a1; font-size: 18px;">${taskTitle}</h3>
          <p style="margin: 0 0 8px 0; color: #334155;"><strong>Project:</strong> ${projectName}</p>
          <p style="margin: 0 0 8px 0; color: #334155;"><strong>Priority:</strong> <span style="background-color: #e0f2fe; color: #0369a1; padding: 2px 8px; border-radius: 4px; font-weight: bold; font-size: 12px;">${priority}</span></p>
          <p style="margin: 0 0 8px 0; color: #334155;"><strong>Due Date:</strong> ${dueDateStr}</p>
          ${description ? `<p style="margin: 8px 0 0 0; color: #475569;"><strong>Description:</strong> ${description}</p>` : ''}
        </div>

        <p style="color: #475569;">Please review the deliverable details and update the status on your workspace dashboard.</p>
        
        <div style="margin-top: 24px;">
          <a href="http://localhost:5173/#tasks" style="display: inline-block; background-color: #0284c7; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
            View My Deliverables
          </a>
        </div>
      </div>
    `;

    await this.sendEmail(studentEmail, `📌 Task Assigned: ${taskTitle}`, html);
  }

  async sendProjectAssignmentEmail(studentEmail: string, studentName: string, projectName: string, projectScope?: string, dueDate?: Date | null) {
    const dueDateStr = dueDate ? new Date(dueDate).toLocaleDateString() : 'Not specified';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px; background-color: #ffffff;">
        <h2 style="color: #4f46e5; margin-top: 0;">🎉 New Project Assignment</h2>
        <p>Hello <strong>${studentName}</strong>,</p>
        <p>You have been assigned to a new digital project by the Organization Admin.</p>
        
        <div style="background-color: #f8fafc; padding: 16px; border-radius: 8px; border-left: 4px solid #4f46e5; margin: 20px 0;">
          <h3 style="margin: 0 0 8px 0; color: #0f172a;">${projectName}</h3>
          <p style="margin: 0 0 6px 0; color: #475569;"><strong>Expected Completion Date:</strong> ${dueDateStr}</p>
          ${projectScope ? `<p style="margin: 0; color: #475569;"><strong>Project Scope:</strong> ${projectScope}</p>` : ''}
        </div>

        <p>Please log in to your <strong>Project Tracker Portal</strong> to review project deliverables, log work activities, and update status.</p>
        
        <a href="http://localhost:5173" style="display: inline-block; background-color: #4f46e5; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 10px;">
          Open Project Tracker
        </a>
      </div>
    `;

    await this.sendEmail(studentEmail, `Assigned to New Project: ${projectName}`, html);
  }
}

export const emailService = new EmailService();
