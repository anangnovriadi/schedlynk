import { Request, Response } from 'express';
import { db } from '../db';
import { logInfo, logError } from '../logger';
import { sql } from 'drizzle-orm';

interface HealthCheck {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  checks: {
    database: {
      status: 'healthy' | 'unhealthy';
      responseTime?: number;
      error?: string;
    };
    memory: {
      status: 'healthy' | 'unhealthy';
      usage: {
        rss: number;
        heapTotal: number;
        heapUsed: number;
        external: number;
      };
      usagePercent: number;
    };
    disk?: {
      status: 'healthy' | 'unhealthy';
      available?: number;
      error?: string;
    };
  };
}

// Basic health check endpoint
export async function basicHealthCheck(req: Request, res: Response) {
  try {
    const health: HealthCheck = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      checks: {
        database: { status: 'healthy' },
        memory: { 
          status: 'healthy',
          usage: process.memoryUsage(),
          usagePercent: 0
        }
      }
    };

    // Check database connectivity
    const dbStart = Date.now();
    try {
      await db.execute(sql`SELECT 1`);
      health.checks.database = {
        status: 'healthy',
        responseTime: Date.now() - dbStart
      };
    } catch (error) {
      health.checks.database = {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Database connection failed'
      };
      health.status = 'unhealthy';
    }

    // Check memory usage
    const memUsage = process.memoryUsage();
    const memPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
    health.checks.memory = {
      status: memPercent > 90 ? 'unhealthy' : 'healthy',
      usage: memUsage,
      usagePercent: memPercent
    };

    if (memPercent > 90) {
      health.status = 'unhealthy';
    }

    // Set appropriate status code
    const statusCode = health.status === 'healthy' ? 200 : 503;
    
    logInfo('Health check performed', {
      status: health.status,
      dbResponseTime: health.checks.database.responseTime,
      memoryPercent: memPercent
    });

    res.status(statusCode).json(health);
  } catch (error) {
    logError(error as Error, { endpoint: 'health-check' });
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed'
    });
  }
}

// Detailed health check for monitoring systems
export async function detailedHealthCheck(req: Request, res: Response) {
  try {
    const health: HealthCheck = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      checks: {
        database: { status: 'healthy' },
        memory: { 
          status: 'healthy',
          usage: process.memoryUsage(),
          usagePercent: 0
        }
      }
    };

    // Database health check with more detailed queries
    const dbStart = Date.now();
    try {
      // Test basic connectivity
      await db.execute(sql`SELECT 1`);
      
      // Test a simple query on a real table
      await db.execute(sql`SELECT COUNT(*) FROM users LIMIT 1`);
      
      health.checks.database = {
        status: 'healthy',
        responseTime: Date.now() - dbStart
      };
    } catch (error) {
      health.checks.database = {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Database queries failed'
      };
      health.status = 'unhealthy';
    }

    // Memory check with thresholds
    const memUsage = process.memoryUsage();
    const memPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
    health.checks.memory = {
      status: memPercent > 85 ? 'unhealthy' : 'healthy',
      usage: memUsage,
      usagePercent: memPercent
    };

    if (memPercent > 85) {
      health.status = 'unhealthy';
    }

    // Check environment variables
    const requiredEnvVars = ['DATABASE_URL'];
    const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
    
    if (missingEnvVars.length > 0) {
      health.status = 'unhealthy';
      logError(new Error('Missing required environment variables'), {
        missingVars: missingEnvVars
      });
    }

    const statusCode = health.status === 'healthy' ? 200 : 503;
    
    logInfo('Detailed health check performed', {
      status: health.status,
      dbResponseTime: health.checks.database.responseTime,
      memoryPercent: memPercent,
      uptime: health.uptime
    });

    res.status(statusCode).json(health);
  } catch (error) {
    logError(error as Error, { endpoint: 'detailed-health-check' });
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Detailed health check failed'
    });
  }
}

// Simple readiness probe for container orchestration
export function readinessProbe(req: Request, res: Response) {
  // Basic readiness - just check if the process is up
  res.status(200).json({
    status: 'ready',
    timestamp: new Date().toISOString()
  });
}

// Simple liveness probe for container orchestration
export function livenessProbe(req: Request, res: Response) {
  // Basic liveness - just respond that we're alive
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
}