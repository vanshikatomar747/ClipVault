import mongoose, { Document, Schema } from 'mongoose';

export interface IAISummary extends Document {
  userId: mongoose.Types.ObjectId;
  notebookId: mongoose.Types.ObjectId;
  title: string;
  summaryType: 'quick' | 'detailed' | 'bullet' | 'action' | 'selection';
  dateRange: {
    type: 'today' | 'yesterday' | 'last7days' | 'last30days' | 'custom' | 'all' | 'selection';
    start?: Date;
    end?: Date;
  };
  originalCharCount: number;
  originalWordCount: number;
  summary: string;
  aiModel: string;
  createdAt: Date;
  updatedAt: Date;
}

const aiSummarySchema = new Schema<IAISummary>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    notebookId: { type: Schema.Types.ObjectId, ref: 'Notebook', required: true, index: true },
    title: { type: String, required: true },
    summaryType: { 
      type: String, 
      enum: ['quick', 'detailed', 'bullet', 'action', 'selection'], 
      required: true 
    },
    dateRange: {
      type: {
        type: String,
        enum: ['today', 'yesterday', 'last7days', 'last30days', 'custom', 'all', 'selection'],
        required: true
      },
      start: { type: Date },
      end: { type: Date }
    },
    originalCharCount: { type: Number, required: true },
    originalWordCount: { type: Number, required: true },
    summary: { type: String, required: true },
    aiModel: { type: String, default: 'llama3.2:3b' }
  },
  { timestamps: true }
);

export const AISummary = mongoose.model<IAISummary>('AISummary', aiSummarySchema);
