import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserModel, IUserDocument } from '../models/User';

export interface AuthRequest extends Request {
  user?: IUserDocument;
}

export const requireAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    res.status(401).json({ message: 'Not authorized, no token provided' });
    return;
  }

  try {
    const jwtSecret = process.env.JWT_SECRET || 'fallback_secret_for_dev';
    const decoded = jwt.verify(token, jwtSecret) as { id: string };
    
    const user = await UserModel.findById(decoded.id).select('-passwordHash');
    if (!user) {
      res.status(401).json({ message: 'Not authorized, user not found' });
      return;
    }
    
    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ message: 'Not authorized, token failed' });
  }
};
