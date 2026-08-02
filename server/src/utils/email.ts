import nodemailer from 'nodemailer';
import axios from 'axios';

let transporter: nodemailer.Transporter | null = null;

const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.ethereal.email',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return transporter;
};

export const sendOTP = async (email: string, otp: string) => {
  // 1. Use Resend HTTP API if key is provided (Bypasses Render's SMTP block)
  if (process.env.RESEND_API_KEY) {
    try {
      console.log(`[EMAIL] Sending OTP to ${email} via Resend API...`);
      await axios.post('https://api.resend.com/emails', {
        from: process.env.SMTP_FROM || 'ClipVault <onboarding@resend.dev>',
        to: [email],
        subject: 'Your ClipVault OTP Code',
        html: `<p>Your OTP code is <b>${otp}</b>. It will expire in 5 minutes.</p>`,
      }, {
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      console.log(`[EMAIL] OTP successfully sent to ${email}`);
      return;
    } catch (error: any) {
      console.error('[EMAIL] Resend API error:', error.response?.data || error.message);
      throw new Error('Could not send OTP email via Resend API');
    }
  }

  // 2. Fallback to SMTP if user has SMTP_USER configured
  if (process.env.SMTP_USER) {
    const mailOptions = {
      from: process.env.SMTP_FROM || '"ClipVault" <noreply@clipvault.com>',
      to: email,
      subject: 'Your ClipVault OTP Code',
      text: `Your OTP code is ${otp}. It will expire in 5 minutes.`,
      html: `<p>Your OTP code is <b>${otp}</b>. It will expire in 5 minutes.</p>`,
    };

    try {
      await getTransporter().sendMail(mailOptions);
      console.log(`[EMAIL] OTP successfully sent to ${email} via SMTP`);
      return;
    } catch (error) {
      console.error('Error sending OTP email via SMTP:', error);
      throw new Error('Could not send OTP email');
    }
  }

  // 3. Fallback to console logs for local dev mode
  console.log(`\n============================`);
  console.log(`[DEV] OTP for ${email} is: ${otp}`);
  console.log(`============================\n`);
};
