# Cloud Media Gallery API

Backend API for managing media files with TypeScript, Express, MongoDB, and AWS S3/MinIO.

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Folder Structure](#folder-structure)
4. [State Management](#state-management)
5. [Token Handling](#token-handling)
6. [Offline Handling](#offline-handling)
7. [Setup Instructions](#setup-instructions)
8. [Deployment](#deployment)
9. [Performance Optimizations](#performance-optimizations)
10. [Known Limitations](#known-limitations)
11. [Future Improvements](#future-improvements)

---

## Project Overview

RESTful API providing:
- **User Authentication**: JWT-based auth with access/refresh tokens
- **Media Upload**: Multi-file upload (max 10 files, 50MB each)
- **Media Management**: CRUD operations with pagination
- **Favorites System**: Mark and retrieve favorite media
- **Presigned URLs**: Secure, time-limited S3 access (1hr expiry)

### Tech Stack

| Component | Technology |
|-----------|------------|
| Runtime | Node.js 20 |
| Framework | Express.js 5 |
| Language | TypeScript 5 |
| Database | MongoDB 7 + Mongoose 8 |
| Storage | AWS S3 / MinIO |
| Auth | JWT (jsonwebtoken) |
| Upload | Multer |

---

## Architecture

```
┌─────────────────────────────────────────────┐
│         API Server (Express)                │
│  Routes → Controllers → Services → Models   │
└─────────────────────────────────────────────┘
         │                    │
    ┌────▼────┐          ┌────▼────┐
    │ MongoDB │          │  S3/    │
    │ (State) │          │  MinIO  │
    │         │          │ (Files) │
    └─────────┘          └─────────┘
```

### Request Flow

```
Client → Routes → Controllers → Services → Models/S3
         ↓           ↓            ↓
      Middleware  (thin)    (business logic)
      - Auth               - DB queries
      - Validation         - S3 operations
```

### Layer Responsibilities

| Layer | Purpose |
|-------|---------|
| **Routes** | HTTP method + path mapping |
| **Controllers** | Request/response handling (thin) |
| **Services** | Business logic, validation, transactions |
| **Models** | Mongoose schemas, queries |

---

## Folder Structure

```
api/
├── src/
│   ├── config/
│   │   ├── index.ts           # Environment config
│   │   ├── database.ts        # MongoDB connection
│   │   ├── s3.ts              # S3 client
│   │   └── multer.ts          # Upload config
│   ├── controllers/
│   │   ├── authController.ts
│   │   └── mediaController.ts
│   ├── middlewares/
│   │   ├── auth.ts            # JWT authentication
│   │   ├── validation.ts      # express-validator wrapper
│   │   └── errorHandler.ts    # Global error handling
│   ├── models/
│   │   ├── User.ts
│   │   ├── Media.ts
│   │   └── ErrorLog.ts
│   ├── routes/
│   │   ├── index.ts
│   │   ├── authRoutes.ts
│   │   ├── mediaRoutes.ts
│   │   └── validators/
│   ├── services/
│   │   ├── authService.ts
│   │   ├── mediaService.ts
│   │   └── s3Service.ts
│   ├── types/
│   ├── utils/
│   ├── app.ts
│   └── server.ts
├── docker-compose.yml
├── Dockerfile
├── .env.example
└── package.json
```

---

## State Management

### Server-Side State

| State Type | Storage | Purpose |
|------------|---------|---------|
| **User Sessions** | JWT tokens (stateless) | Authentication |
| **Media Metadata** | MongoDB | Persistent data |
| **Error Logs** | MongoDB | Debugging/monitoring |
| **File Storage** | S3/MinIO | Media files |

### Database Collections

**Users:**
```typescript
{
  name: string,
  email: string (unique),
  passwordHash: string,
  createdAt: Date,
  updatedAt: Date
}
```

**Media:**
```typescript
{
  user_id: ObjectId (ref: User),
  media_type: 'image' | 'video',
  file_key: string (S3 key),
  is_favorite: boolean,
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**
- `user_id + createdAt` (pagination)
- `user_id + is_favorite` (favorites filter)
- `email` (unique lookup)

---

## Token Handling

### JWT Strategy

| Token | Expiry | Purpose |
|-------|--------|---------|
| **Access Token** | 15 min | API authentication |
| **Refresh Token** | 7 days | Get new access token |

### Token Flow

```
Login/Register
    ↓
Generate token pair
    ↓
Client stores tokens
    ↓
API requests: Bearer {accessToken}
    ↓
Access token expires (15m)
    ↓
401 → Client calls /refresh-token
    ↓
Validate refresh token → New pair
    ↓
Refresh token expires (7d) → Re-login required
```

### Implementation

```typescript
// Token generation
generateTokenPair(userId: string, email: string) {
  return {
    accessToken: jwt.sign({ userId, email, type: 'access' }, secret, { expiresIn: '15m' }),
    refreshToken: jwt.sign({ userId, email, type: 'refresh' }, secret, { expiresIn: '7d' })
  };
}

// Protected route middleware
export const authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  const payload = verifyAccessToken(token);
  req.user = await User.findById(payload.userId);
  next();
};
```

### Password Security

- Hashed with bcrypt (12 rounds)
- Never stored/returned in responses
- Excluded from queries: `.select('-passwordHash')`

---

## Offline Handling

**Note:** Backend is stateless. Offline support is handled entirely by the frontend client.

### Backend Responsibilities

| Responsibility | Implementation |
|----------------|----------------|
| **Stateless Auth** | JWT tokens validated per request |
| **Presigned URLs** | 1-hour expiry for security |
| **Pagination** | Efficient queries for partial sync |
| **Error Responses** | Standardized format for client handling |

### Client Offline Strategy (Frontend)

- React Query persists queries to AsyncStorage
- Media files cached locally via expo-file-system
- In-memory cache map for sync lookups
- Offline banner shown when network unavailable
- Upload disabled offline (no queue)

### API Behavior During Network Issues

```
Client offline → Request fails → Client shows cached data
Client reconnects → Auto-refetch → Cache updated
```

---

## Setup Instructions

### Prerequisites

- Node.js 18+
- Docker & Docker Compose (recommended)
- AWS account (production)

### Quick Start (Docker)

```bash
cd api/

# 1. Copy environment template
cp .env.example .env

# 2. Update .env with your values
# MONGODB_URI=mongodb://admin:admin@mongodb:27017/cloud-media-gallery?authSource=admin
# AWS_ACCESS_KEY_ID=minioadmin
# AWS_SECRET_ACCESS_KEY=minioadmin
# AWS_S3_BUCKET=media-gallery
# AWS_S3_ENDPOINT=http://minio:9000
# JWT_SECRET=your-secret-key

# 3. Start all services
docker compose up -d

# 4. View logs
docker compose logs -f

# 5. Create MinIO bucket
# Open http://localhost:9001 (minioadmin/minioadmin123)
# Create bucket: media-gallery
```

### Manual Setup (Without Docker)

```bash
# 1. Install dependencies
npm install

# 2. Start MongoDB (local or Atlas)
# 3. Start MinIO or configure AWS S3

# 4. Create .env
cp .env.example .env

# 5. Run development server
npm run dev

# Server runs on http://localhost:3000
```

### Test Endpoints

```bash
# Health check
curl http://localhost:3000/api/health

# Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@example.com","password":"password123"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

---

## Deployment

### Production Checklist

1. **Environment Variables**
   ```bash
   NODE_ENV=production
   MONGODB_URI=mongodb://admin:admin@mongodb:27017/cloud-media-gallery?authSource=admin
   AWS_ACCESS_KEY_ID=AKIAXXXXXXXXXXXXXXXX
   AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   AWS_S3_BUCKET=your-production-bucket
   AWS_S3_ENDPOINT=  # Empty for real AWS S3
   CORS_ORIGIN=https://your-domain.com
   JWT_SECRET=<32-char-random>
   JWT_REFRESH_SECRET=<32-char-random>
   ```

2. **AWS S3 Setup**
   ```bash
   aws s3 mb s3://your-bucket --region us-east-1
   aws s3api put-bucket-versioning --bucket your-bucket \
     --versioning-configuration Status=Enabled
   ```

3. **Deploy with Docker Compose**
   ```bash
   # SSH into server
   ssh user@server-ip

   # Clone repository
   git clone <repo-url>
   cd api

   # Create production .env
   nano .env

   # Build and start all services (MongoDB + API)
   docker compose up -d

   # View logs
   docker compose logs -f

   # Check running containers
   docker compose ps
   ```

4. **Update docker-compose.yml for Production**
   - Remove MinIO (use AWS S3 instead)
   - Configure proper network/security groups
   - Enable container restart policy

5. **Nginx Reverse Proxy**
   ```nginx
   server {
       listen 80;
       server_name api.your-domain.com;
       location / { proxy_pass http://localhost:3000; }
   }
   ```

---

## Performance Optimizations

### Database

```typescript
// Indexes
mediaSchema.index({ user_id: 1, createdAt: -1 });
mediaSchema.index({ user_id: 1, is_favorite: 1 });

// Parallel queries
const [items, total] = await Promise.all([
  Media.find().skip(skip).limit(limit),
  Media.countDocuments()
]);

// Lean queries (read-only)
Media.find().lean();
```

### S3 Operations

```typescript
// Batch uploads
const results = await Promise.all(
  files.map(file => s3Service.uploadFile(file))
);

// Presigned URLs (1hr expiry)
s3Service.getPresignedUrl(key, 3600);
```

### API

- **Multer limits**: 10 files, 50MB each
- **Pagination**: Default 20 items/page
- **Lean Mongoose**: `.lean()` for read-only
- **Projection**: `.select('-passwordHash')`

---

## Known Limitations

| Limitation | Value |
|------------|-------|
| Max file size | 50MB |
| Max files per upload | 10 |
| Access token expiry | 15 minutes |
| Refresh token expiry | 7 days |
| Presigned URL expiry | 1 hour |
| No image processing | Original quality only |
| No video transcoding | Original format |
| No CDN | Direct S3 access |
| No real-time sync | Polling required |
| No search | Pagination only |

---

## Future Improvements

- [ ] Album/folder organization
- [ ] Share media via public links
- [ ] Image optimization on upload
- [ ] Trash/recycle bin
- [ ] Rate limiting per user

---

## API Endpoints

| Method | Endpoint | Auth |
|--------|----------|------|
| POST | `/api/auth/register` | No |
| POST | `/api/auth/login` | No |
| POST | `/api/auth/refresh-token` | No |
| GET | `/api/auth/me` | Yes |
| POST | `/api/media/upload` | Yes |
| GET | `/api/media?page=1&limit=20` | Yes |
| GET | `/api/media/favorites` | Yes |
| PATCH | `/api/media/:id/favorite` | Yes |
| DELETE | `/api/media/:id` | Yes |

## Environment Variables

| Variable | Default | Required |
|----------|---------|----------|
| `NODE_ENV` | `development` | No |
| `PORT` | `3000` | No |
| `MONGODB_URI` | - | Yes |
| `AWS_REGION` | `us-east-1` | Yes |
| `AWS_ACCESS_KEY_ID` | - | Yes |
| `AWS_SECRET_ACCESS_KEY` | - | Yes |
| `AWS_S3_BUCKET` | `media-gallery` | Yes |
| `AWS_S3_ENDPOINT` | - | For MinIO |
| `JWT_SECRET` | - | Yes |
| `JWT_REFRESH_SECRET` | - | Yes |

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Development (auto-reload) |
| `npm run build` | Compile TypeScript |
| `npm start` | Production server |
| `npm run typecheck` | Type check only |
