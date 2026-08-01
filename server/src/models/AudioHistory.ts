import mongoose, { Document, Schema } from 'mongoose';

export interface IAudioHistory extends Document {
  userId: mongoose.Types.ObjectId;
  notebookId?: mongoose.Types.ObjectId;
  title: string;
  voiceUsed: string;
  dateRange: {
    type: 'today' | 'yesterday' | 'last7days' | 'last30days' | 'custom' | 'all' | 'selection';
    start?: Date;
    end?: Date;
  };
  audioPath: string;
  duration: number; // in seconds
  createdAt: Date;
  updatedAt: Date;
}

const audioHistorySchema = new Schema<IAudioHistory>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    notebookId: { type: Schema.Types.ObjectId, ref: 'Notebook', index: true },
    title: { type: String, required: true },
    voiceUsed: { type: String, required: true },
    dateRange: {
      type: {
        type: String,
        enum: ['today', 'yesterday', 'last7days', 'last30days', 'custom', 'all', 'selection'],
        required: true
      },
      start: { type: Date },
      end: { type: Date }
    },
    audioPath: { type: String, required: true },
    duration: { type: Number, required: true }
  },
  { timestamps: true }
);

export const AudioHistory = mongoose.model<IAudioHistory>('AudioHistory', audioHistorySchema);
