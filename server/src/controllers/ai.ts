import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { AISummary } from '../models/AISummary';
import { ClipboardItemModel } from '../models/ClipboardItem';
import { generateSummaryText, checkOllamaStatus, SummaryType } from '../services/ollamaService';

// Custom date helpers to avoid date-fns dependency
const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const endOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
const subDays = (date: Date, days: number) => new Date(date.getTime() - days * 24 * 60 * 60 * 1000);

export const checkStatus = async (req: AuthRequest, res: Response) => {
  const isAvailable = await checkOllamaStatus();
  res.json({ available: isAvailable });
};

export const generateSummary = async (req: AuthRequest, res: Response): Promise<void> => {
  const abortController = new AbortController();
  req.on('close', () => {
    console.log('Client closed request. Aborting AI summary generation...');
    abortController.abort();
  });

  try {
    const { notebookId, type, dateRangeType, startDate, endDate, title } = req.body;
    const userId = req.user?._id;

    if (!notebookId || !type || !dateRangeType) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    // Determine date range for query
    let query: any = { notebookId, userId };
    const now = new Date();
    
    if (dateRangeType === 'today') {
      query.createdAt = { $gte: startOfDay(now), $lte: endOfDay(now) };
    } else if (dateRangeType === 'yesterday') {
      const yesterday = subDays(now, 1);
      query.createdAt = { $gte: startOfDay(yesterday), $lte: endOfDay(yesterday) };
    } else if (dateRangeType === 'last7days') {
      query.createdAt = { $gte: subDays(now, 7), $lte: now };
    } else if (dateRangeType === 'last30days') {
      query.createdAt = { $gte: subDays(now, 30), $lte: now };
    } else if (dateRangeType === 'custom' && startDate && endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query.createdAt = { $gte: new Date(startDate), $lte: end };
    }

    const items = await ClipboardItemModel.find(query).sort({ createdAt: 1 });
    
    if (items.length === 0) {
      res.status(404).json({ error: 'No clipboard items found in this date range to summarize.' });
      return;
    }

    // Combine text
    // Strip HTML if necessary, for now we will just use the text field as is.
    // Tiptap saves HTML, so we might want to strip tags. A simple regex can do for LLM:
    const combinedText = items.map((item: any) => item.text.replace(/<[^>]*>?/gm, ' ')).join('\n\n');
    
    const originalCharCount = combinedText.length;
    const originalWordCount = combinedText.split(/\s+/).length;

    // Call Ollama
    const generatedSummary = await generateSummaryText(type as SummaryType, combinedText, abortController.signal);

    const summaryDoc = new AISummary({
      userId,
      notebookId,
      title: title || `Summary - ${new Date().toLocaleDateString()}`,
      summaryType: type,
      dateRange: {
        type: dateRangeType,
        start: startDate ? new Date(startDate) : undefined,
        end: endDate ? new Date(endDate) : undefined,
      },
      originalCharCount,
      originalWordCount,
      summary: generatedSummary
    });

    await summaryDoc.save();
    res.status(201).json(summaryDoc);
  } catch (error: any) {
    console.error('Error generating summary:', error);
    res.status(500).json({ error: error.message || 'Failed to generate summary' });
  }
};

export const generateSelectionSummary = async (req: AuthRequest, res: Response): Promise<void> => {
  const abortController = new AbortController();
  req.on('close', () => {
    console.log('Client closed request. Aborting selection AI summary generation...');
    abortController.abort();
  });

  try {
    const { notebookId, text, type } = req.body;
    const userId = req.user?._id;

    if (!notebookId || !text || !type) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const originalCharCount = text.length;
    const originalWordCount = text.split(/\s+/).length;

    const generatedSummary = await generateSummaryText(type as SummaryType, text, abortController.signal);

    const summaryDoc = new AISummary({
      userId,
      notebookId,
      title: `Selection Summary - ${new Date().toLocaleDateString()}`,
      summaryType: type,
      dateRange: { type: 'selection' },
      originalCharCount,
      originalWordCount,
      summary: generatedSummary
    });

    await summaryDoc.save();
    res.status(201).json(summaryDoc);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to generate selection summary' });
  }
};

export const getSummaries = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { notebookId } = req.query;
    const query: any = { userId: req.user?._id };
    if (notebookId) {
      query.notebookId = notebookId;
    }
    
    const summaries = await AISummary.find(query).sort({ createdAt: -1 });
    res.json(summaries);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch summaries' });
  }
};

export const deleteSummary = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const summary = await AISummary.findOneAndDelete({ _id: req.params.id, userId: req.user?._id });
    if (!summary) {
      res.status(404).json({ error: 'Summary not found' });
      return;
    }
    res.json({ message: 'Summary deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete summary' });
  }
};
