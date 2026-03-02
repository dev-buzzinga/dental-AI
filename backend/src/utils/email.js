import { config } from "../config/env.js";
import nodemailer from "nodemailer";

function createTransporter() {
    return nodemailer.createTransport({
        host: config.SMTP_HOST,
        port: config.SMTP_PORT,
        secure: false, // Use SSL
        auth: {
            user: config.EMAIL_USER,
            pass: config.EMAIL_PASSWORD
        }
    });
}
export async function sendEmail({ to, subject, text, html, inReplyTo }) {
    try {
        // Validate required fields
        if (!to || !subject || !text) {
            throw new Error('Missing required fields: to, subject, and text are required');
        }

        if (!config.EMAIL_USER || !config.EMAIL_PASSWORD) {
            throw new Error('Gmail credentials not configured. Please set EMAIL_USER and EMAIL_PASSWORD in .env file');
        }

        const transporter = createTransporter();

        const mailOptions = {
            from: config.EMAIL_USER,
            to,
            subject,
            text,
            ...(html != null && { html }),
            headers: {}
        };
        if (inReplyTo) {
            mailOptions.headers['In-Reply-To'] = inReplyTo;
            mailOptions.headers['References'] = inReplyTo;
        }
        console.log(`📧 Sending email to: ${to}`);
        const info = await transporter.sendMail(mailOptions);

        console.log(`✅ Email sent successfully! Message ID: ${info.messageId}`);

        return {
            success: true,
            messageId: info.messageId,
            message: 'Email sent successfully'
        };

    } catch (error) {
        console.error('❌ Error sending email:', error.message);

        return {
            success: false,
            error: error.message,
            message: 'Failed to send email'
        };
    }
}