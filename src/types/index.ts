export interface Media {
  _id: string;
  user_id: string;
  media_type: 'image' | 'video';
  file_url: string;
  is_favorite: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface User {
  _id: string;
  name: string;
  email: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: Array<{ field: string; message: string }>;
}

export interface PaginatedResponse<T = any> {
  data?: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}
