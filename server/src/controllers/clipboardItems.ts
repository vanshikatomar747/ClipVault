import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { ClipboardItemModel } from '../models/ClipboardItem';
import { NotebookModel } from '../models/Notebook';

const escapeRegex = (text: string): string => {
  return text.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
};

export const getClipboardItems = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { notebookId, limit = 50, skip = 0, searchQuery, isFavorite, isPinned } = req.query;
    const query: any = { userId: req.user!.id };
    
    if (notebookId) {
      query.notebookId = notebookId;
    }

    if (searchQuery) {
      const escapedQuery = escapeRegex(searchQuery as string);
      // \b matches word boundaries, and lookahead (?=[^<>]*(?:<|$)) ensures we are outside of HTML tags
      query.text = { $regex: `\\b${escapedQuery}(?=[^<>]*(?:<|$))`, $options: 'i' };
    }

    if (isFavorite !== undefined) {
      query.isFavorite = isFavorite === 'true';
    }

    if (isPinned !== undefined) {
      query.isPinned = isPinned === 'true';
    }

    const items = await ClipboardItemModel.find(query)
      .sort({ createdAt: -1 })
      .skip(Number(skip))
      .limit(Number(limit));

    res.json(items);
  } catch (error) {
    next(error);
  }
};

export const createClipboardItem = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    let { notebookId, text, source, createdAt } = req.body;

    if (text === undefined || text === null) {
      res.status(400).json({ message: 'Text is required' });
      return;
    }

    // Auto-assign default notebook if notebookId is missing
    if (!notebookId) {
      const defaultNotebook = await NotebookModel.findOne({ userId: req.user!.id, isDefault: true });
      if (defaultNotebook) {
        notebookId = defaultNotebook._id;
      } else {
        // Create one if it doesn't exist
        const newDefault = await NotebookModel.create({
          userId: req.user!.id,
          name: 'Default Notebook',
          isDefault: true,
        });
        notebookId = newDefault._id;
      }
    }

    // Prevent duplicate entries (check against the user's absolute last saved item only, except empty notes)
    if (text.trim() !== '' && text.trim() !== '<p></p>') {
      const lastItem = await ClipboardItemModel.findOne({
        userId: req.user!.id,
      }).sort({ createdAt: -1 });

      if (lastItem && lastItem.text === text) {
        res.status(200).json(lastItem);
        return;
      }
    }

    const payload: any = {
      userId: req.user!.id,
      notebookId,
      text,
      source,
      characterCount: text.length,
      wordCount: text.split(/\s+/).filter((w: string) => w.length > 0).length,
    };
    
    if (createdAt) {
      payload.createdAt = new Date(createdAt);
    }

    const item = await ClipboardItemModel.create(payload);

    await NotebookModel.findByIdAndUpdate(notebookId, { $inc: { itemCount: 1 } });

    // Emit event to sockets
    const io = req.app.get('io');
    if (io) {
      io.to(req.user!.id.toString()).emit('new_clipboard_item', item);
    }

    res.status(201).json(item);
  } catch (error) {
    next(error);
  }
};

export const updateClipboardItem = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const existingItem = await ClipboardItemModel.findOne({ _id: id, userId: req.user!.id });
    
    if (!existingItem) {
      res.status(404).json({ message: 'Clipboard item not found' });
      return;
    }

    // If moving to a new notebook, update both notebook counts
    if (updates.notebookId && updates.notebookId !== existingItem.notebookId.toString()) {
      await NotebookModel.findByIdAndUpdate(existingItem.notebookId, { $inc: { itemCount: -1 } });
      await NotebookModel.findByIdAndUpdate(updates.notebookId, { $inc: { itemCount: 1 } });
    }

    const item = await ClipboardItemModel.findOneAndUpdate(
      { _id: id, userId: req.user!.id },
      updates,
      { returnDocument: 'after' }
    );

    // Emit event
    const io = req.app.get('io');
    if (io) {
      io.to(req.user!.id.toString()).emit('update_clipboard_item', item);
    }

    res.json(item);
  } catch (error) {
    next(error);
  }
};

export const deleteClipboardItem = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    const item = await ClipboardItemModel.findOneAndDelete({ _id: id, userId: req.user!.id });

    if (!item) {
      res.status(404).json({ message: 'Clipboard item not found' });
      return;
    }

    await NotebookModel.findByIdAndUpdate(item.notebookId, { $inc: { itemCount: -1 } });

    const io = req.app.get('io');
    if (io) {
      io.to(req.user!.id.toString()).emit('delete_clipboard_item', { id: item._id });
    }

    res.json({ message: 'Clipboard item deleted' });
  } catch (error) {
    next(error);
  }
};
