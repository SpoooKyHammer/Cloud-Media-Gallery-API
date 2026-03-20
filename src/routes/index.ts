import { Router } from 'express';

import authRoutes from './authRoutes';
import mediaRoutes from './mediaRoutes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/media', mediaRoutes);

// Health check endpoint
router.get('/health', (_req, res) => {
  res.json({
    success: true,
    message: 'API is running',
    timestamp: new Date().toISOString(),
  });
});

export default router;
