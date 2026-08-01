import mongoose, { Schema, Document } from 'mongoose';
import { User } from '../shared';

// We need a Mongoose Document interface that extends the shared User type
// But since _id is string in shared, we might need some overrides or let mongoose handle it.
export interface IUserDocument extends Omit<User, '_id' | 'createdAt' | 'updatedAt'>, Document {
  id: string;
  passwordHash: string; // Internal to backend
}

const userSchema = new Schema<IUserDocument>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    profilePicture: { type: String, default: '' },
    themePreference: { type: String, enum: ['light', 'dark'], default: 'light' },
    clipboardTogglePreference: { type: Boolean, default: true },
    defaultNotebookId: { type: String, default: null },
  },
  {
    timestamps: true,
  }
);

export const UserModel = mongoose.model<IUserDocument>('User', userSchema);
