import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config({ path: '/Users/vanshikatomar/Desktop/clipvault/server/.env' });

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function main() {
  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: 'edunova.test11@gmail.com',
      subject: 'Test',
      text: 'Test email',
    });
    console.log('Success:', info.messageId);
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
