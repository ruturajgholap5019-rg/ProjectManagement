import 'dotenv/config';
import { Resend } from 'resend';

class EmailService {
  private resend: Resend | null = null;

  constructor() {
    this.initResend();
  }

  private initResend() {
    const apiKey = process.env.RESEND_API_KEY;
    if (apiKey) {
      this.resend = new Resend(apiKey);
      console.log(`📧 [EMAIL SERVICE] Configured Resend Email API client`);
    } else {
      this.resend = null;
      console.log(`📧 [EMAIL SERVICE] Resend Mode: Set RESEND_API_KEY in backend/.env to deliver live emails.`);
    }
  }

  async sendEmail(to: string, subject: string, html: string) {
    const from = process.env.EMAIL_FROM || 'Project Tracker <onboarding@resend.dev>';

    // Dynamically check process.env.RESEND_API_KEY
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

        if (error) {
          console.warn(`⚠️ [RESEND NOTICE] Could not deliver via Resend API (${error.message}). Falling back to local logger.`);
        } else {
          console.log(`\n✅ 📧 [RESEND LIVE EMAIL DISPATCHED]`);
          console.log(`   Resend Email ID: ${data?.id}`);
          console.log(`   To: ${to}`);
          console.log(`   Subject: ${subject}\n`);
          return data;
        }
      } catch (err: any) {
        console.warn(`⚠️ [RESEND EXCEPTION] ${err.message}. Falling back to local logger.`);
      }
    }

    // Console logging fallback
    console.log(`\n📧 [EMAIL SERVICE LOCAL DISPATCH LOG]`);
    console.log(`   To: ${to}`);
    console.log(`   Subject: ${subject}`);
    console.log(`   --------------------------------------------------`);
    console.log(`   ${html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()}`);
    console.log(`   --------------------------------------------------\n`);
  }

  async sendWelcomeAccountEmail(toEmail: string, studentName: string, tempPassword: string, role: string) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
        <h2 style="color: #4f46e5; margin-top: 0;">🚀 Welcome to Digital Project Tracker Portal</h2>
        <p>Hello <strong>${studentName}</strong>,</p>
        <p>Your team member account has been registered by the Organization Admin. Below are your login credentials to access the Project Tracker platform:</p>
        
        <div style="background-color: #f8fafc; padding: 18px; border-radius: 8px; border-left: 4px solid #4f46e5; margin: 20px 0; font-size: 14px;">
          <p style="margin: 0 0 10px 0; color: #0f172a;"><strong>Registered Email:</strong> <span style="color: #4f46e5;">${toEmail}</span></p>
          <p style="margin: 0 0 10px 0; color: #0f172a;"><strong>Temporary Password:</strong> <code style="background-color: #e0e7ff; color: #3730a3; padding: 4px 8px; border-radius: 4px; font-weight: bold;">${tempPassword}</code></p>
          <p style="margin: 0; color: #0f172a;"><strong>Account Role:</strong> ${role}</p>
        </div>

        <p style="color: #475569; font-size: 13px;">
          ⚠️ <em>Security Notice: You will be required to change this temporary password upon your first login to secure your account.</em>
        </p>

        <div style="margin-top: 24px;">
          <a href="http://localhost:5173" style="display: inline-block; background-color: #4f46e5; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
            Login to Project Tracker
          </a>
        </div>
      </div>
    `;

    await this.sendEmail(toEmail, `Welcome to Project Tracker - Account Credentials`, html);
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
