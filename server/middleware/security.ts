import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import cors from 'cors';
import { logWarning, logError } from '../logger';

// Rate limiting configuration
export const createRateLimit = (windowMs: number, max: number, message?: string) => {
  return rateLimit({
    windowMs,
    max,
    message: message || 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    trustProxy: true, // Trust X-Forwarded-For headers in proxy environments
    handler: (req: Request, res: Response) => {
      logWarning('Rate limit exceeded', {
        ip: req.ip,
        url: req.url,
        userAgent: req.get('User-Agent')
      });
      res.status(429).json({
        error: 'Too many requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }
  });
};

// General rate limit - 100 requests per 15 minutes (exclude dev assets)
export const generalRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  process.env.NODE_ENV === 'development' ? 500 : 100, // Higher limit in dev
  'Too many requests from this IP, please try again in 15 minutes.'
);

// Strict rate limit for auth endpoints - 5 requests per 15 minutes
export const authRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  5,
  'Too many authentication attempts, please try again in 15 minutes.'
);

// Public API rate limit - 60 requests per hour
export const publicApiRateLimit = createRateLimit(
  60 * 60 * 1000, // 1 hour
  60,
  'API rate limit exceeded. Please try again in an hour.'
);

// API key rate limit - 1000 requests per hour
export const apiKeyRateLimit = createRateLimit(
  60 * 60 * 1000, // 1 hour
  1000,
  'API key rate limit exceeded. Please try again in an hour.'
);

// CORS configuration
export const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.ALLOWED_ORIGINS?.split(',') || false
    : true, // Allow all origins in development
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'X-User-Email',
    'X-Team-ID'
  ]
};

// Helmet security configuration
export const helmetConfig = helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'", "'unsafe-eval'"],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"]
    }
  } : false, // Disable CSP in development for Vite
  crossOriginEmbedderPolicy: false, // Allow embedding in dev tools
  hsts: process.env.NODE_ENV === 'production' ? {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  } : false
});

// Request size limiting middleware
export const requestSizeLimit = (req: Request, res: Response, next: NextFunction) => {
  const contentLength = req.get('content-length');
  const maxSize = 10 * 1024 * 1024; // 10MB
  
  if (contentLength && parseInt(contentLength) > maxSize) {
    logWarning('Request size limit exceeded', {
      ip: req.ip,
      url: req.url,
      contentLength: contentLength
    });
    return res.status(413).json({
      error: 'Request too large',
      message: 'Request body exceeds maximum allowed size'
    });
  }
  
  next();
};

// Security headers middleware
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Remove server header
  res.removeHeader('X-Powered-By');
  
  // Add custom security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Add cache control for API responses
  if (req.path.startsWith('/api/')) {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  
  next();
};

// Error boundary middleware
export const errorBoundary = (error: any, req: Request, res: Response, next: NextFunction) => {
  // Log the error
  logError(error, {
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: (req as any).user?.id,
    teamId: (req as any).team?.id
  });

  // Don't expose error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation Error',
      message: error.message,
      ...(isDevelopment && { stack: error.stack })
    });
  }
  
  if (error.name === 'UnauthorizedError') {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication required'
    });
  }
  
  // Generic error response
  res.status(500).json({
    error: 'Internal Server Error',
    message: isDevelopment ? error.message : 'Something went wrong',
    ...(isDevelopment && { stack: error.stack })
  });
};