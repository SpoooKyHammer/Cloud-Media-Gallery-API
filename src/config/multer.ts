import multer, { FileFilterCallback } from 'multer';
import { Request } from 'express';

import { AppError } from '../middlewares/errorHandler';

const storage = multer.memoryStorage();

const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
): void => {
  const allowedMimeTypes = ['image/', 'video/'];
  const isAllowed = allowedMimeTypes.some((type) => file.mimetype.startsWith(type));

  if (isAllowed) {
    cb(null, true);
  } else {
    cb(new AppError('Invalid file type. Only images and videos files are allowed.', 400));
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter,
});

export default upload;
