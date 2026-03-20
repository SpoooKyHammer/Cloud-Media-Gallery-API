import { Request, Response, NextFunction } from 'express';

import authService from '../services/authService';
import { AppError } from '../middlewares/errorHandler';
import { ApiResponse, AuthResponse, AuthTokens } from '../types/index';
import User from '../models/User';

class AuthController {
  /**
   * Register a new user.
   */
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, email, password } = req.body;

      const { tokens } = await authService.register(name, email, password);

      const user = await User.findOne({ email });

      if (!user) {
        next(new AppError('Failed to retrieve created user', 500));
        return;
      }

      const response: ApiResponse<AuthResponse> = {
        success: true,
        message: 'User registered successfully',
        data: {
          user: {
            _id: user._id.toString(),
            name: user.name,
            email: user.email,
          },
          tokens,
        },
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Login user with email and password.
   */
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body;

      const { tokens } = await authService.login(email, password);

      const user = await User.findOne({ email });

      if (!user) {
        next(new AppError('User not found', 404));
        return;
      }

      const response: ApiResponse<AuthResponse> = {
        success: true,
        message: 'Login successful',
        data: {
          user: {
            _id: user._id.toString(),
            name: user.name,
            email: user.email,
          },
          tokens,
        },
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Refresh access token using refresh token.
   */
  async refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = req.body;

      const tokens = await authService.refreshToken(refreshToken);

      const response: ApiResponse<{ tokens: AuthTokens }> = {
        success: true,
        message: 'Token refreshed successfully',
        data: { tokens },
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
}

export default new AuthController();
