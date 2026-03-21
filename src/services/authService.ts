import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';

import { AppError } from '../middlewares/errorHandler';
import User from '../models/User';
import config from '../config/index';

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

interface JWTPayload {
  userId: string;
  email: string;
  type: 'access' | 'refresh';
}

interface RegisterResult {
  tokens: TokenPair;
}

interface LoginResult {
  tokens: TokenPair;
}

class AuthService {
  /**
   * Register a new user.
   * @param name - User's full name
   * @param email - User's email address
   * @param password - User's password (will be hashed)
   * @returns Object containing access and refresh tokens
   * @throws {AppError} If email is already registered
   */
  async register(
    name: string,
    email: string,
    password: string
  ): Promise<RegisterResult> {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new AppError('Email already registered', 400);
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await User.create({
      name,
      email,
      passwordHash,
    });

    const user = await User.findOne({ email });
    const tokens = this.generateTokenPair(user!._id.toString(), user!.email);

    return { tokens };
  }

  /**
   * Authenticate user with email and password.
   * @param email - User's email address
   * @param password - User's password
   * @returns Object containing access and refresh tokens
   * @throws {AppError} If credentials are invalid
   */
  async login(
    email: string,
    password: string
  ): Promise<LoginResult> {
    const user = await User.findOne({ email }).select('+passwordHash');

    if (!user) {
      throw new AppError('Invalid email or password', 404);
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      throw new AppError('Invalid email or password', 404);
    }

    const tokens = this.generateTokenPair(user._id.toString(), user.email);

    return { tokens };
  }

  /**
   * Generate new access token using refresh token.
   * @param refreshToken - Valid refresh token
   * @returns New token pair
   * @throws {AppError} If refresh token is invalid or expired
   */
  async refreshToken(refreshToken: string): Promise<TokenPair> {
    try {
      const payload = jwt.verify(refreshToken, config.jwt.refreshSecret) as JWTPayload;

      if (payload.type !== 'refresh') {
        throw new AppError('Invalid token type', 401);
      }

      const user = await User.findById(payload.userId);

      if (!user) {
        throw new AppError('User not found', 404);
      }

      return this.generateTokenPair(user._id.toString(), user.email);
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) {
        throw new AppError('Invalid or expired refresh token', 401);
      }
      throw error;
    }
  }

  generateTokenPair(userId: string, email: string): TokenPair {
    const accessToken = this.generateToken(
      userId,
      email,
      'access',
      config.jwt.accessTokenExpiry,
      config.jwt.accessSecret
    );
    const refreshToken = this.generateToken(
      userId,
      email,
      'refresh',
      config.jwt.refreshTokenExpiry,
      config.jwt.refreshSecret
    );

    return { accessToken, refreshToken };
  }

  private generateToken(
    userId: string,
    email: string,
    type: 'access' | 'refresh',
    expiresIn: string,
    secret: string
  ): string {
    const payload: JWTPayload = { userId, email, type };

    return jwt.sign(payload, secret, { expiresIn } as SignOptions);
  }

  verifyAccessToken(token: string): JWTPayload {
    try {
      const payload = jwt.verify(token, config.jwt.accessSecret) as JWTPayload;

      if (payload.type !== 'access') {
        throw new AppError('Invalid token type', 401);
      }

      return payload;
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) {
        throw new AppError('Invalid or expired access token', 401);
      }
      throw error;
    }
  }
}

export default new AuthService();
