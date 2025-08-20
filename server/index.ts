// Load environment variables first
import 'dotenv/config';

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { logger, logInfo, logError } from "./logger";
import { 
  helmetConfig, 
  corsOptions, 
  generalRateLimit, 
  securityHeaders, 
  requestSizeLimit,
  errorBoundary 
} from "./middleware/security";
import { basicHealthCheck, detailedHealthCheck, readinessProbe, livenessProbe } from "./middleware/health";
import helmet from "helmet";
import cors from "cors";
import expressWinston from "express-winston";

// Set JWT_SECRET if not provided (for development)
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'dev-jwt-secret-key-scheduler-lite-2024';
  console.log('⚠️ JWT_SECRET not set, using development default');
}

// Debug environment variables on startup
console.log('🔧 Environment Check:');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? '✅ SET' : '❌ NOT SET');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? '✅ SET' : '❌ NOT SET');
console.log('NODE_ENV:', process.env.NODE_ENV || 'undefined');
console.log('PORT:', process.env.PORT || 'undefined');
console.log('GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? process.env.GOOGLE_CLIENT_ID.substring(0, 20) + '...' : '❌ NOT SET');
console.log('GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? '✅ SET' : '❌ NOT SET');
console.log('---');

const app = express();

// Trust proxy for rate limiting (required for Replit and production environments)
app.set('trust proxy', 1);

// Security middleware (conditional for development)
if (process.env.NODE_ENV === 'production') {
  app.use(helmet(helmetConfig));
}
app.use(cors(corsOptions));
app.use(securityHeaders);
app.use(requestSizeLimit);

// Rate limiting (skip for dev assets)
app.use((req, res, next) => {
  // Skip rate limiting for Vite dev assets and health checks
  if (req.url.startsWith('/@') || 
      req.url.startsWith('/node_modules') || 
      req.url.startsWith('/src/') ||
      req.url.startsWith('/health') ||
      req.url.includes('.js') ||
      req.url.includes('.css') ||
      req.url.includes('.svg') ||
      req.url.includes('.png')) {
    return next();
  }
  generalRateLimit(req, res, next);
});

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// Request logging
app.use(expressWinston.logger({
  winstonInstance: logger,
  meta: true,
  msg: "HTTP {{req.method}} {{req.url}}",
  expressFormat: true,
  colorize: false,
  ignoreRoute: function (req, res) {
    // Don't log health check requests
    return req.url.startsWith('/health') || req.url.startsWith('/api/health');
  }
}));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Add health check endpoints before other routes
  app.get('/health', basicHealthCheck);
  app.get('/health/detailed', detailedHealthCheck);
  app.get('/health/ready', readinessProbe);
  app.get('/health/live', livenessProbe);

  const server = await registerRoutes(app);

  // Enhanced error handling with logging
  app.use(errorBoundary);

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Use PORT from environment or default to 5000
  // this serves both the API and the client.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
