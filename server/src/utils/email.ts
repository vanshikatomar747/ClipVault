import nodemailer from 'nodemailer';

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
  if (!process.env.SMTP_USER) {
    console.log(`\n============================`);
    console.log(`[DEV] OTP for ${email} is: ${otp}`);
    console.log(`============================\n`);
    return;
  }

  const mailOptions = {
    from: process.env.SMTP_FROM || '"ClipVault" <noreply@clipvault.com>',
    to: email,
    subject: 'Your ClipVault OTP Code',
    text: `Your OTP code is ${otp}. It will expire in 5 minutes.`,
    html: `<p>Your OTP code is <b>${otp}</b>. It will expire in 5 minutes.</p>`,
  };

  try {
    await getTransporter().sendMail(mailOptions);
  } catch (error) {
    console.error('Error sending OTP email:', error);
    throw new Error('Could not send OTP email');
  }
};
