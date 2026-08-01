import mongoose, { Schema, Document } from 'mongoose';

export interface ITodoDocument extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  isCompleted: boolean;
  priority: 'low' | 'medium' | 'high';
  date: Date;
  createdAt: Date;
  updatedAt: Date;
}

const todoSchema = new Schema<ITodoDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    isCompleted: { type: Boolean, default: false },
    priority: { 
      type: String, 
      enum: ['low', 'medium', 'high'], 
      default: 'medium' 
    },
    date: { type: Date, required: true },
  },
  { timestamps: true }
);

export const TodoModel = mongoose.model<ITodoDocument>('Todo', todoSchema);
