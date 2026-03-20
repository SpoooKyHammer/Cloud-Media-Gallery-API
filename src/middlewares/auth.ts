import { Request, Response, NextFunction } from 'express';

import { AppError } from './errorHandler';
import authService from '../services/authService';
import User from '../models/User';

export interface AuthRequest extends Request {
  user?: ReturnType<typeof User.hydrate> | null;
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next(new AppError('Unauthorized - No token provided', 401));
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = authService.verifyAccessToken(token);
    const user = await User.findById(payload.userId);

    if (!user) {
      next(new AppError('User not found', 401));
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};
