import { Request, Response, NextFunction } from 'express';

import { AuthRequest } from '../middlewares/auth';
import mediaService from '../services/mediaService';
import { ApiResponse } from '../types/index';
import { AppError } from '../middlewares/errorHandler';

class MediaController {
  /**
   * POST /media/upload
   * Upload one or multiple media files (images/videos).
   */
  async uploadMedia(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const files = req.files as Express.Multer.File[];
      
      if (!files || files.length === 0) {
        next(new AppError('File is required', 400));
        return;
      }

      const userId = req.user!._id.toString();

      // Upload all files and get media items with presigned URLs
      const mediaItems = await mediaService.uploadMultipleMedia(files, userId);

      const response: ApiResponse = {
        success: true,
        message: `${mediaItems.length} file(s) uploaded successfully`,
        data: mediaItems,
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /media
   * Get paginated media files for the authenticated user.
   */
  async getMedia(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 10;
      const userId = req.user!._id.toString();

      const result = await mediaService.getMedia({ page, limit, userId });

      const response: ApiResponse = {
        success: true,
        data: result,
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /media/favorites
   * Get paginated favorite media files for the authenticated user.
   */
  async getFavorites(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 10;
      const userId = req.user!._id.toString();

      const result = await mediaService.getFavorites({ page, limit, userId });

      const response: ApiResponse = {
        success: true,
        data: result,
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /media/:id/favorite
   * Toggle favorite status of a media file.
   */
  async toggleFavorite(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!._id.toString();

      const media = await mediaService.toggleFavorite(Array.isArray(id) ? id[0] : id, userId);

      const response: ApiResponse = {
        success: true,
        message: media.is_favorite ? 'Added to favorites' : 'Removed from favorites',
        data: media,
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /media/:id
   * Delete a media file.
   */
  async deleteMedia(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!._id.toString();

      await mediaService.deleteMedia(Array.isArray(id) ? id[0] : id, userId);

      const response: ApiResponse = {
        success: true,
        message: 'File deleted successfully',
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
}

export default new MediaController();
