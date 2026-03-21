import mongoose, { Document, Schema } from 'mongoose';

export interface IMedia extends Document {
  user_id: mongoose.Types.ObjectId;
  media_type: 'image' | 'video';
  file_url: string;
  is_favorite: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const mediaSchema = new Schema<IMedia>(
  {
    user_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    media_type: {
      type: String,
      required: true,
      enum: ['image', 'video'],
    },
    file_url: {
      type: String,
      required: true,
    },
    is_favorite: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

mediaSchema.index({ createdAt: -1 });
mediaSchema.index({ user_id: 1, is_favorite: 1 });

const Media = mongoose.model<IMedia>('Media', mediaSchema);

export default Media;
