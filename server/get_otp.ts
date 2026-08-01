import mongoose from 'mongoose';
import { OTPModel } from './src/models/OTP';

mongoose.connect('mongodb+srv://vanshikat747_db_user:fxuQDoTj9thvDu3n@clipvault.eoe7uy4.mongodb.net/clipvault').then(async () => {
  const otpRecord = await OTPModel.findOne({ email: 'edunova.test11@gmail.com' }).sort({ createdAt: -1 });
  console.log('OTP Record:', otpRecord);
  process.exit(0);
});
