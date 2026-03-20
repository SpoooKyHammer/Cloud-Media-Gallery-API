import { Request, Response, NextFunction } from 'express';

import ErrorLog from '../models/ErrorLog';
import { AuthRequest } from './auth';

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

const logError = async (
  err: Error | AppError,
  req: Request,
  statusCode: number
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    const metadata: Record<string, any> = {
      ip: req.ip || req.socket.remoteAddress,
      userAgent: req.get('user-agent'),
      body: req.body && Object.keys(req.body).length > 0 ? req.body : undefined,
      query: req.query && Object.keys(req.query).length > 0 ? req.query : undefined,
    };

    await ErrorLog.create({
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
      statusCode,
      name: err.name,
      path: req.path,
      method: req.method,
      userId: authReq.user?._id,
      metadata,
    });
  } catch (logError) {
    console.error('Failed to log error to database:', logError);
  }
};

export const errorHandler = async (
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> => {
  const statusCode = (err as AppError).statusCode || 500;

  // Log error to database (non-blocking)
  logError(err, req, statusCode).catch(console.error);

  res.status(statusCode).json({
    success: false,
    error: {
      message: err.message || 'Internal Server Error',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  });
};

export const notFound = (req: Request, res: Response, next: NextFunction): void => {
  const error = new AppError(`Not Found - ${req.originalUrl}`, 404);
  errorHandler(error, req, res, next);
};
