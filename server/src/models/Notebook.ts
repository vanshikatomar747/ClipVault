import mongoose, { Schema, Document } from 'mongoose';
import { Notebook } from '../shared';

export interface INotebookDocument extends Omit<Notebook, '_id' | 'createdAt' | 'updatedAt'>, Document {}

const notebookSchema = new Schema<INotebookDocument>(
  {
    userId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    color: { type: String, default: '#A8C3A0' }, // Default to Soft Sage Green
    icon: { type: String, default: '📓' },
    isDefault: { type: Boolean, default: false },
    isArchived: { type: Boolean, default: false },
    isPinned: { type: Boolean, default: false },
    isFavorite: { type: Boolean, default: false },
    itemCount: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

export const NotebookModel = mongoose.model<INotebookDocument>('Notebook', notebookSchema);
