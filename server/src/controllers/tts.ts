import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { TTSService } from '../services/ttsService';
import { VoiceProfile } from '../models/VoiceProfile';
import { AudioHistory } from '../models/AudioHistory';
import { ClipboardItemModel } from '../models/ClipboardItem';
import { NotebookModel } from '../models/Notebook';
import path from 'path';

export const generateNotebookTTS = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const abortController = new AbortController();
  req.on('close', () => {
    console.log('Client closed request. Aborting Notebook TTS generation...');
    abortController.abort();
  });

  try {
    const { notebookId, dateRange, voice, accent, isClone } = req.body;

    // Fetch notebook
    const notebook = await NotebookModel.findOne({ _id: notebookId, userId: req.user!.id });
    if (!notebook) {
      res.status(404).json({ message: 'Notebook not found' });
      return;
    }

    // Determine date query
    let dateQuery: any = {};
    const now = new Date();
    
    switch (dateRange.type) {
      case 'today':
        dateQuery = { $gte: new Date(now.setHours(0, 0, 0, 0)) };
        break;
      case 'yesterday':
        const startOfYesterday = new Date(now);
        startOfYesterday.setDate(now.getDate() - 1);
        startOfYesterday.setHours(0, 0, 0, 0);
        const endOfYesterday = new Date(startOfYesterday);
        endOfYesterday.setHours(23, 59, 59, 999);
        dateQuery = { $gte: startOfYesterday, $lte: endOfYesterday };
        break;
      case 'last7days':
        const last7Days = new Date(now);
        last7Days.setDate(now.getDate() - 7);
        dateQuery = { $gte: last7Days };
        break;
      case 'last30days':
        const last30Days = new Date(now);
        last30Days.setDate(now.getDate() - 30);
        dateQuery = { $gte: last30Days };
        break;
      case 'custom':
        if (dateRange.start && dateRange.end) {
          const end = new Date(dateRange.end);
          end.setHours(23, 59, 59, 999);
          dateQuery = { $gte: new Date(dateRange.start), $lte: end };
        }
        break;
    }

    const query: any = { notebookId, userId: req.user!.id };
    if (dateRange.type !== 'all') {
      query.createdAt = dateQuery;
    }

    const items = await ClipboardItemModel.find(query).sort({ createdAt: 1 });

    if (items.length === 0) {
      res.status(400).json({ message: 'No content to read for this date range' });
      return;
    }

    const fullText = items.map(item => item.text).join('\n\n');
    let audioPath = '';

    if (isClone) {
      const profile = await VoiceProfile.findOne({ userId: req.user!.id });
      if (!profile) {
        res.status(400).json({ message: 'Voice profile not found. Please create one in settings.' });
        return;
      }
      audioPath = await TTSService.generateClonedTTS(fullText, profile.embeddingPath, abortController.signal);
    } else {
      audioPath = await TTSService.generateStandardTTS(fullText, voice, accent, abortController.signal);
    }

    // Save to history
    const history = await AudioHistory.create({
      userId: req.user!.id,
      notebookId,
      title: `${notebook.name} - ${dateRange.type.charAt(0).toUpperCase() + dateRange.type.slice(1)}`,
      voiceUsed: isClone ? 'Cloned Voice' : `${voice} (${accent})`,
      dateRange,
      audioPath,
      duration: 0 // Mock duration, ideally extract from wav
    });

    res.json(history);
  } catch (error) {
    next(error);
  }
};

export const generateSelectionTTS = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const abortController = new AbortController();
  req.on('close', () => {
    console.log('Client closed request. Aborting selection TTS generation...');
    abortController.abort();
  });

  try {
    const { text, voice, accent, isClone } = req.body;

    if (!text) {
      res.status(400).json({ message: 'Text is required' });
      return;
    }

    let audioPath = '';
    if (isClone) {
      const profile = await VoiceProfile.findOne({ userId: req.user!.id });
      if (!profile) {
        res.status(400).json({ message: 'Voice profile not found. Please create one in settings.' });
        return;
      }
      audioPath = await TTSService.generateClonedTTS(text, profile.embeddingPath, abortController.signal);
    } else {
      audioPath = await TTSService.generateStandardTTS(text, voice, accent, abortController.signal);
    }

    res.json({ audioPath });
  } catch (error) {
    next(error);
  }
};
