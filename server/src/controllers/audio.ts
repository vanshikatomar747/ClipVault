import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { AudioHistory } from '../models/AudioHistory';
import fs from 'fs';

export const getAudioHistory = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const history = await AudioHistory.find({ userId: req.user!.id })
      .populate('notebookId', 'name color icon')
      .sort({ createdAt: -1 });
    res.json(history);
  } catch (error) {
    next(error);
  }
};

export const deleteAudioHistory = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const history = await AudioHistory.findOneAndDelete({ _id: id, userId: req.user!.id });
    if (history && fs.existsSync(history.audioPath)) {
      fs.unlinkSync(history.audioPath);
    }
    res.json({ message: 'Audio deleted' });
  } catch (error) {
    next(error);
  }
};
