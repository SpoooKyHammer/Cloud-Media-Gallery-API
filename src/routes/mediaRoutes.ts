import { Router } from 'express';

import upload from '../config/multer';
import mediaController from '../controllers/mediaController';
import { authenticate } from '../middlewares/auth';
import { validate } from '../middlewares/validation';
import {
  validateGetMedia,
  validateGetFavorites,
  validateToggleFavorite,
  validateDeleteMedia,
} from './validators/mediaValidators';

const router = Router();

// All routes are protected (require authentication)
router.use(authenticate);

// POST /media/upload - Upload one or multiple media files (max 10)
router.post('/upload', upload.array('files', 10), mediaController.uploadMedia);

// GET /media - Get paginated media files
router.get('/', validate(validateGetMedia), mediaController.getMedia);

// GET /media/favorites - Get paginated favorite media files
router.get('/favorites', validate(validateGetFavorites), mediaController.getFavorites);

// PATCH /media/:id/favorite - Toggle favorite status
router.patch('/:id/favorite', validate(validateToggleFavorite), mediaController.toggleFavorite);

// DELETE /media/:id - Delete a media file
router.delete('/:id', validate(validateDeleteMedia), mediaController.deleteMedia);

export default router;
