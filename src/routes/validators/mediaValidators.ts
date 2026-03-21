import { body, param, query } from 'express-validator';

export const validateUpload = [
  body('file')
    .custom((_, { req }) => {
      if (!req.file) {
        throw new Error('File is required');
      }
      return true;
    }),
];

export const validateGetMedia = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
];

export const validateGetFavorites = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
];

export const validateToggleFavorite = [
  param('id')
    .isMongoId()
    .withMessage('Invalid media ID'),
];

export const validateDeleteMedia = [
  param('id')
    .isMongoId()
    .withMessage('Invalid media ID'),
];
