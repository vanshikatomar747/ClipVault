import mongoose, { Document, Schema } from 'mongoose';

export interface IVoiceProfile extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  embeddingPath: string;
  recordingPath: string;
  modelName: string;
  createdAt: Date;
  updatedAt: Date;
}

const voiceProfileSchema = new Schema<IVoiceProfile>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true },
    embeddingPath: { type: String, required: true },
    recordingPath: { type: String, required: true },
    modelName: { type: String, required: true, default: 'mlx-community/Qwen3-TTS-12Hz-0.6B-Base-8bit' }
  },
  { timestamps: true }
);

export const VoiceProfile = mongoose.model<IVoiceProfile>('VoiceProfile', voiceProfileSchema);
