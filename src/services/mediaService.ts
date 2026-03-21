import { Types } from 'mongoose';

import Media, { IMedia } from '../models/Media';
import s3Service from './s3Service';
import { AppError } from '../middlewares/errorHandler';
import { PaginatedResponse } from '../types/index';

interface UploadMediaParams {
  buffer: Buffer;
  filename: string;
  mimeType: string;
  userId: string;
}

interface GetMediaParams {
  page: number;
  limit: number;
  userId: string;
}

class MediaService {
  /**
   * Uploads a media file to S3 and creates a database record.
   * File type validation is handled by multer middleware.
   */
  async uploadMedia({ buffer, filename, mimeType, userId }: UploadMediaParams): Promise<IMedia> {
    const mediaType: 'image' | 'video' = mimeType.startsWith('image/') ? 'image' : 'video';

    const { key, url } = await s3Service.uploadFile({
      buffer,
      filename,
      mimeType,
      folder: 'media',
    });

    const media = await Media.create({
      user_id: new Types.ObjectId(userId),
      media_type: mediaType,
      file_url: url,
      is_favorite: false,
    });

    return media;
  }

  /**
   * Gets paginated media files for a user.
   */
  async getMedia({ page, limit, userId }: GetMediaParams): Promise<PaginatedResponse<IMedia>> {
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Media.find({ user_id: new Types.ObjectId(userId) })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Media.countDocuments({ user_id: new Types.ObjectId(userId) }),
    ]);

    return {
      data: items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Gets paginated favorite media files for a user.
   */
  async getFavorites(params: GetMediaParams): Promise<PaginatedResponse<IMedia>> {
    const { page, limit, userId } = params;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Media.find({
        user_id: new Types.ObjectId(userId),
        is_favorite: true,
      })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Media.countDocuments({
        user_id: new Types.ObjectId(userId),
        is_favorite: true,
      }),
    ]);

    return {
      data: items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Toggles the favorite status of a media file.
   */
  async toggleFavorite(mediaId: string, userId: string): Promise<IMedia> {
    const media = await Media.findOne({
      _id: new Types.ObjectId(mediaId),
      user_id: new Types.ObjectId(userId),
    });

    if (!media) {
      throw new AppError('Media file not found', 404);
    }

    media.is_favorite = !media.is_favorite;
    await media.save();

    return media;
  }

  /**
   * Gets a single media file by ID, ensuring user ownership.
   */
  async getMediaById(mediaId: string, userId: string): Promise<IMedia> {
    const media = await Media.findOne({
      _id: new Types.ObjectId(mediaId),
      user_id: new Types.ObjectId(userId),
    });

    if (!media) {
      throw new AppError('Media file not found', 404);
    }

    return media;
  }

  /**
   * Deletes a media file from S3 and database.
   */
  async deleteMedia(mediaId: string, userId: string): Promise<void> {
    const media = await Media.findOne({
      _id: new Types.ObjectId(mediaId),
      user_id: new Types.ObjectId(userId),
    });

    if (!media) {
      throw new AppError('Media file not found', 404);
    }

    const key = media.file_url.split('/').slice(-2).join('/');
    await s3Service.deleteFile(key);
    await Media.deleteOne({ _id: media._id });
  }
}

export default new MediaService();
