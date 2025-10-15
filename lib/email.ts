// lib/email.ts
// Email sending utility using Resend
// This function sends emails to students when they're removed from sessions

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendRemovalEmail(params: {
  studentEmail: string;
  studentName: string;
  sessionTitle: string;
  teacherName: string;
  room: string;
  flexDate: string;
  deadline: string;
}) {
  try {
    await resend.emails.send({
      from: 'Flex Time System <onboarding@resend.dev>', // Change this when you have your own domain
      to: params.studentEmail,
      subject: `Flex Time Session Update - ${new Date(params.flexDate).toLocaleDateString()}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #3B82F6; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .session-details { background-color: white; padding: 20px; border-left: 4px solid #EF4444; margin: 20px 0; }
            .button { background-color: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 20px; }
            .warning { color: #D97706; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">Flex Time Session Update</h1>
            </div>
            <div class="content">
              <p>Hi ${params.studentName},</p>
              
              <p>You have been <strong>removed</strong> from the following flex time session:</p>
              
              <div class="session-details">
                <p><strong>Session:</strong> ${params.sessionTitle}</p>
                <p><strong>Teacher:</strong> ${params.teacherName}</p>
                <p><strong>Room:</strong> ${params.room}</p>
                <p><strong>Date:</strong> ${new Date(params.flexDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
              </div>
              
              <p class="warning">⚠️ Please log into the Flex Time system and select a new session for this date as soon as possible.</p>
              
              <p><strong>Selection Deadline:</strong> ${new Date(params.deadline).toLocaleString('en-US', { month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</p>
              
              <p>If you don't select a session by the deadline, you will be automatically assigned to your homeroom.</p>
              
              <a href="${process.env.NEXT_PUBLIC_APP_URL}" class="button">Select New Session</a>
              
              <p style="margin-top: 30px; font-size: 14px; color: #6B7280;">
                If you have questions about this change, please contact ${params.teacherName}.
              </p>
            </div>
          </div>
        </body>
        </html>
      `
    });
    return { success: true };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error };
  }
}