import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import config from './config/index';
import routes from './routes/index';
import { notFound, errorHandler } from './middlewares/errorHandler';

const app = express();

// Security middleware
app.use(helmet());

// CORS middleware
app.use(
  cors({
    origin: config.cors.origin,
    credentials: true,
  })
);

// Logging middleware
if (config.env === 'development') {
  app.use(morgan('dev'));
}

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API routes
app.use('/api', routes);

// Root endpoint
app.get('/', (_req, res) => {
  res.json({
    name: 'Cloud Media Gallery API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
    },
  });
});

// Error handling
app.use(notFound);
app.use(errorHandler);

export default app;
