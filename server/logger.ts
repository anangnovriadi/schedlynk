import winston from 'winston';

// Create logger instance with structured logging
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      return JSON.stringify({
        timestamp,
        level,
        message,
        ...meta
      });
    })
  ),
  defaultMeta: {
    service: 'scheduler-lite',
    environment: process.env.NODE_ENV || 'development'
  },
  transports: [
    // Console transport for development
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          const metaString = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
          return `${timestamp} [${level}]: ${message} ${metaString}`;
        })
      )
    })
  ]
});

// Add file transport for production
if (process.env.NODE_ENV === 'production') {
  logger.add(new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
    maxsize: 5242880, // 5MB
    maxFiles: 5
  }));
  
  logger.add(new winston.transports.File({
    filename: 'logs/combined.log',
    maxsize: 5242880, // 5MB
    maxFiles: 5
  }));
}

// Create error monitoring functions
export function logError(error: Error, context?: Record<string, any>) {
  logger.error('Application error', {
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name
    },
    ...context
  });
}

export function logInfo(message: string, meta?: Record<string, any>) {
  logger.info(message, meta);
}

export function logWarning(message: string, meta?: Record<string, any>) {
  logger.warn(message, meta);
}

export function logDebug(message: string, meta?: Record<string, any>) {
  logger.debug(message, meta);
}

// Request logging middleware
export function createRequestLogger() {
  return winston.createLogger({
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.printf(({ timestamp, level, message, meta }) => {
            const { req, res } = meta;
            const responseTime = res.responseTime || 0;
            const statusColor = res.statusCode >= 400 ? '\x1b[31m' : '\x1b[32m';
            return `${timestamp} ${req.method} ${req.url} ${statusColor}${res.statusCode}\x1b[0m ${responseTime}ms`;
          })
        )
      })
    ]
  });
}

export default logger;