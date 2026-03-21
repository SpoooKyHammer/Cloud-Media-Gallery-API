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

interface MediaWithUrl {
  _id: string;
  user_id: string;
  media_type: 'image' | 'video';
  file_url: string;
  is_favorite: boolean;
  createdAt: Date;
  updatedAt: Date;
}

class MediaService {
  /**
   * Uploads a media file to S3/MinIO and creates a database record.
   * Stores the file key for presigned URL generation on retrieval.
   */
  async uploadMedia({ buffer, filename, mimeType, userId }: UploadMediaParams): Promise<IMedia> {
    const mediaType: 'image' | 'video' = mimeType.startsWith('image/') ? 'image' : 'video';

    const { key } = await s3Service.uploadFile({
      buffer,
      filename,
      mimeType,
      folder: 'media',
    });

    const media = await Media.create({
      user_id: new Types.ObjectId(userId),
      media_type: mediaType,
      file_key: key,
      is_favorite: false,
    });

    return media;
  }

  /**
   * Uploads multiple media files to S3/MinIO and creates database records.
   * Returns media items enriched with presigned URLs.
   */
  async uploadMultipleMedia(files: Express.Multer.File[], userId: string): Promise<MediaWithUrl[]> {
    const uploadPromises = files.map(async (file) => {
      const mediaType: 'image' | 'video' = file.mimetype.startsWith('image/') ? 'image' : 'video';

      const { key } = await s3Service.uploadFile({
        buffer: file.buffer,
        filename: file.originalname,
        mimeType: file.mimetype,
        folder: 'media',
      });

      return Media.create({
        user_id: new Types.ObjectId(userId),
        media_type: mediaType,
        file_key: key,
        is_favorite: false,
      });
    });

    const mediaItems = await Promise.all(uploadPromises);

    // Enrich with presigned URLs
    return this.enrichWithPresignedUrls(mediaItems);
  }

  /**
   * Gets paginated media files for a user.
   * Enriches each media item with a presigned URL for file access.
   */
  async getMedia({ page, limit, userId }: GetMediaParams): Promise<PaginatedResponse<MediaWithUrl>> {
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Media.find({ user_id: new Types.ObjectId(userId) })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Media.countDocuments({ user_id: new Types.ObjectId(userId) }),
    ]);

    // Enrich with presigned URLs
    const itemsWithUrls = await this.enrichWithPresignedUrls(items);

    return {
      data: itemsWithUrls,
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
   * Enriches each media item with a presigned URL for file access.
   */
  async getFavorites(params: GetMediaParams): Promise<PaginatedResponse<MediaWithUrl>> {
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

    // Enrich with presigned URLs
    const itemsWithUrls = await this.enrichWithPresignedUrls(items);

    return {
      data: itemsWithUrls,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Enriches media items with presigned URLs.
   */
  private async enrichWithPresignedUrls(items: IMedia[]): Promise<MediaWithUrl[]> {
    const urls = await Promise.all(
      items.map((item) => s3Service.getPresignedUrl(item.file_key, 3600))
    );

    return items.map((item, index) => ({
      _id: item._id.toString(),
      user_id: item.user_id.toString(),
      media_type: item.media_type,
      file_url: urls[index],
      is_favorite: item.is_favorite,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }));
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
   * Deletes a media file from S3/MinIO and database.
   */
  async deleteMedia(mediaId: string, userId: string): Promise<void> {
    const media = await Media.findOne({
      _id: new Types.ObjectId(mediaId),
      user_id: new Types.ObjectId(userId),
    });

    if (!media) {
      throw new AppError('Media file not found', 404);
    }

    await s3Service.deleteFile(media.file_key);
    await Media.deleteOne({ _id: media._id });
  }
}

export default new MediaService();
