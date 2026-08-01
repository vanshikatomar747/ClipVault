import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { VoiceProfile } from '../models/VoiceProfile';
import { TTSService } from '../services/ttsService';
import fs from 'fs';

export const getVoiceProfile = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const profile = await VoiceProfile.findOne({ userId: req.user!.id });
    if (!profile) {
      res.json(null);
      return;
    }
    res.json(profile);
  } catch (error) {
    next(error);
  }
};

export const createVoiceProfile = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ message: 'Voice recording is required' });
      return;
    }

    const recordingPath = req.file.path;
    const { name } = req.body;

    // Delete existing profile if any
    await VoiceProfile.deleteMany({ userId: req.user!.id });

    // Clone voice to get embedding
    const embeddingPath = await TTSService.cloneVoice(recordingPath);

    const profile = await VoiceProfile.create({
      userId: req.user!.id,
      name: name || 'My Cloned Voice',
      recordingPath,
      embeddingPath,
    });

    res.status(201).json(profile);
  } catch (error) {
    next(error);
  }
};

export const deleteVoiceProfile = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const profile = await VoiceProfile.findOneAndDelete({ userId: req.user!.id });
    if (profile) {
      // Cleanup files
      if (fs.existsSync(profile.recordingPath)) fs.unlinkSync(profile.recordingPath);
      if (fs.existsSync(profile.embeddingPath)) fs.unlinkSync(profile.embeddingPath);
    }
    res.json({ message: 'Voice profile deleted' });
  } catch (error) {
    next(error);
  }
};
