import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { NotebookModel } from '../models/Notebook';
import { ClipboardItemModel } from '../models/ClipboardItem';

export const getNotebooks = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const notebooks = await NotebookModel.find({ userId: req.user!.id }).lean();
    
    // Dynamically calculate accurate counts
    const notebooksWithCounts = await Promise.all(
      notebooks.map(async (nb) => {
        const count = await ClipboardItemModel.countDocuments({ notebookId: nb._id.toString(), userId: req.user!.id });
        return { ...nb, itemCount: count };
      })
    );

    res.json(notebooksWithCounts);
  } catch (error) {
    next(error);
  }
};

export const createNotebook = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, description, color, icon, isDefault } = req.body;
    
    // If isDefault is true, unset other defaults for this user
    if (isDefault) {
      await NotebookModel.updateMany({ userId: req.user!.id }, { isDefault: false });
    }

    const notebook = await NotebookModel.create({
      userId: req.user!.id,
      name,
      description,
      color,
      icon,
      isDefault: isDefault || false,
    });

    res.status(201).json(notebook);
  } catch (error) {
    next(error);
  }
};

export const updateNotebook = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (updates.isDefault) {
      await NotebookModel.updateMany({ userId: req.user!.id }, { isDefault: false });
    }

    const notebook = await NotebookModel.findOneAndUpdate(
      { _id: id, userId: req.user!.id },
      updates,
      { returnDocument: 'after' }
    );

    if (!notebook) {
      res.status(404).json({ message: 'Notebook not found' });
      return;
    }

    res.json(notebook);
  } catch (error) {
    next(error);
  }
};

export const deleteNotebook = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    const notebook = await NotebookModel.findOne({ _id: id, userId: req.user!.id });
    if (!notebook) {
      res.status(404).json({ message: 'Notebook not found' });
      return;
    }

    if (notebook.isDefault) {
      res.status(400).json({ message: 'Cannot delete the default notebook' });
      return;
    }

    await NotebookModel.deleteOne({ _id: id });
    await ClipboardItemModel.deleteMany({ notebookId: id, userId: req.user!.id });

    res.json({ message: 'Notebook and associated items deleted' });
  } catch (error) {
    next(error);
  }
};
