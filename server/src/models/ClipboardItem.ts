import mongoose, { Schema, Document } from 'mongoose';
import { ClipboardItem } from '../shared';

export interface IClipboardItemDocument extends Omit<ClipboardItem, '_id' | 'createdAt' | 'updatedAt'>, Document {}

const clipboardItemSchema = new Schema<IClipboardItemDocument>(
  {
    userId: { type: String, required: true, index: true },
    notebookId: { type: String, required: true, index: true },
    text: { type: String, required: true },
    source: { type: String, default: 'Unknown' },
    characterCount: { type: Number, default: 0 },
    wordCount: { type: Number, default: 0 },
    isFavorite: { type: Boolean, default: false },
    isPinned: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

// Index to help with queries on calendar dates (createdAt)
clipboardItemSchema.index({ userId: 1, createdAt: -1 });
clipboardItemSchema.index({ notebookId: 1, createdAt: -1 });
// Index for fast duplicate text detection per user
clipboardItemSchema.index({ userId: 1, text: 1 });

export const ClipboardItemModel = mongoose.model<IClipboardItemDocument>('ClipboardItem', clipboardItemSchema);
