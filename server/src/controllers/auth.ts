import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { UserModel } from '../models/User';
import { OTPModel } from '../models/OTP';
import { NotebookModel } from '../models/Notebook';
import { ClipboardItemModel } from '../models/ClipboardItem';
import { TodoModel } from '../models/Todo';
import { AISummary } from '../models/AISummary';
import { AudioHistory } from '../models/AudioHistory';
import { VoiceProfile } from '../models/VoiceProfile';
import { sendOTP } from '../utils/email';

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

const generateToken = (id: string) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'fallback_secret_for_dev', {
    expiresIn: '30d',
  });
};

export const requestOTP = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ message: 'Email is required' });
      return;
    }

    if (process.env.SKIP_OTP_VERIFICATION === 'true') {
      console.log(`[AUTH] Skipping OTP generation for ${email} (SKIP_OTP_VERIFICATION is active)`);
      res.status(200).json({ message: 'OTP verification is skipped. Enter any 6-digit code to register.' });
      return;
    }

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    await OTPModel.deleteMany({ email }); // Clear previous OTPs
    await OTPModel.create({ email, otp, expiresAt });

    await sendOTP(email, otp);

    res.status(200).json({ message: 'OTP sent to email' });
  } catch (error) {
    next(error);
  }
};

export const verifyOTPAndRegister = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({ message: 'Please provide all fields' });
      return;
    }

    const userExists = await UserModel.findOne({ email });
    if (userExists) {
      res.status(400).json({ message: 'User already exists' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await UserModel.create({
      name,
      email,
      passwordHash,
    });

    // Create a default notebook for the new user
    const defaultNotebook = await NotebookModel.create({
      userId: user.id,
      name: 'Primary Vault',
      description: 'Your primary notebook for saved clips',
      color: '#A88B73', // cv-brown
      icon: '🗄️', // Default emoji icon
      isDefault: true,
    });

    user.defaultNotebookId = defaultNotebook._id.toString();
    await user.save();

    res.status(201).json({
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        themePreference: user.themePreference,
        clipboardTogglePreference: user.clipboardTogglePreference,
        defaultNotebookId: user.defaultNotebookId,
      },
      token: generateToken(user.id),
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = req.body;

    const user = await UserModel.findOne({ email });
    if (user && (await bcrypt.compare(password, user.passwordHash))) {
      res.json({
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          themePreference: user.themePreference,
          clipboardTogglePreference: user.clipboardTogglePreference,
          defaultNotebookId: user.defaultNotebookId,
        },
        token: generateToken(user.id),
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, otp, newPassword } = req.body;

    let otpRecord = null;
    if (process.env.SKIP_OTP_VERIFICATION !== 'true') {
      otpRecord = await OTPModel.findOne({ email, otp });
      if (!otpRecord) {
        res.status(400).json({ message: 'Invalid or expired OTP' });
        return;
      }
    }

    const user = await UserModel.findOne({ email });
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(newPassword, salt);
    await user.save();

    if (otpRecord) {
      await OTPModel.deleteOne({ _id: otpRecord._id });
    }

    res.status(200).json({ message: 'Password reset successful' });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = (req as any).user;
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      themePreference: user.themePreference,
      clipboardTogglePreference: user.clipboardTogglePreference,
      defaultNotebookId: user.defaultNotebookId,
    });
  } catch (error) {
    next(error);
  }
};

export const updatePreferences = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = (req as any).user;
    const { clipboardTogglePreference, themePreference } = req.body;

    if (clipboardTogglePreference !== undefined) {
      user.clipboardTogglePreference = clipboardTogglePreference;
    }
    if (themePreference !== undefined) {
      user.themePreference = themePreference;
    }

    await user.save();

    // Broadcast preference change to user's other connections
    const io = req.app.get('io');
    if (io) {
      io.to(user._id.toString()).emit('preferences_updated', {
        clipboardTogglePreference: user.clipboardTogglePreference,
        themePreference: user.themePreference,
      });
    }

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      themePreference: user.themePreference,
      clipboardTogglePreference: user.clipboardTogglePreference,
      defaultNotebookId: user.defaultNotebookId,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteAccount = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = (req as any).user?._id;
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    // Broadcast account deletion to all user's active socket connections (browser, electron, etc.)
    const io = req.app.get('io');
    if (io) {
      io.to(userId.toString()).emit('account_deleted');
    }

    // Cascade delete all user items
    await ClipboardItemModel.deleteMany({ userId });
    await NotebookModel.deleteMany({ userId });
    await TodoModel.deleteMany({ userId });
    await AISummary.deleteMany({ userId });
    await AudioHistory.deleteMany({ userId });
    await VoiceProfile.deleteMany({ userId });
    
    // Delete the user
    await UserModel.deleteOne({ _id: userId });

    res.json({ success: true, message: 'Account and all associated data deleted successfully' });
  } catch (error) {
    next(error);
  }
};
