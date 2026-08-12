import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import hpp from 'hpp';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import { sendSuccess } from './utils/apiResponse.js';
import apiRouter from './routes/index.js';
import { errorHandler } from './middlewares/error.middleware.js';

const app = express();

// Enable Trust Proxy for Cloudflare & Reverse Proxies
app.set('trust proxy', true);

// Extract Real Client IP from Cloudflare CF-Connecting-IP Header
app.use((req, _res, next) => {
  const cfIp = req.headers['cf-connecting-ip'];
  if (cfIp && typeof cfIp === 'string') {
    (req as any).realClientIp = cfIp;
  }
  next();
});

// Security Middlewares
app.use(
  helmet({
    contentSecurityPolicy: false, // Allow inline styles & fonts
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
  })
);
app.use(hpp());

// Performance Compression Middleware
app.use(compression());

// Body Parsing Middlewares
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Rate Limiting — Auth Endpoints
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 login attempts per window per IP
  message: { success: false, message: 'Too many login attempts. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { success: false, message: 'Too many token refresh requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/v1/auth/login', loginLimiter);
app.use('/api/v1/auth/refresh', refreshLimiter);

// Health Check Endpoint
app.get('/api/v1/health', (_req, res) => {
  return sendSuccess(
    res,
    {
      status: 'UP',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      environment: env.NODE_ENV,
    },
    'Digital Team API Service is healthy'
  );
});

// API V1 Routes
app.use('/api/v1', apiRouter);

// Centralized Error Handler
app.use(errorHandler);

export default app;
