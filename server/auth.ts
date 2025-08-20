import type { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { storage } from "./storage";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
    name: string | null;
  };
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export function generateToken(userId: number): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): { userId: number } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: number };
  } catch {
    return null;
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateResetToken(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

export async function authenticateUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  // Check for JWT token first
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  
  if (token) {
    const payload = verifyToken(token);
    if (payload) {
      const user = await storage.getUser(payload.userId);
      if (user && user.isActive) {
        req.user = user;
        return next();
      }
    }
  }

  // Fallback to demo email-based auth for backward compatibility
  const userEmail = req.headers['x-user-email'] as string;
  
  if (!userEmail && !token) {
    return res.status(401).json({ error: "Authentication required" });
  }

  if (userEmail) {
    try {
      let user = await storage.getUserByEmail(userEmail);
      
      if (!user) {
        // Auto-create user if they don't exist (demo mode)
        user = await storage.createUser({
          email: userEmail,
          name: userEmail.split('@')[0],
          isActive: true,
        });

        // Create a default team for new users
        const team = await storage.createTeam({
          name: `${user.name}'s Team`,
          slug: `user-${user.id}-team`,
        });

        // Make user super admin of their default team
        await storage.createTeamMember({
          userId: user.id,
          teamId: team.id,
          role: 'SUPER_ADMIN',
        });
      }

      if (!user.isActive) {
        return res.status(401).json({ error: "Account is inactive" });
      }

      req.user = user;
      next();
    } catch (error) {
      console.error('Authentication error:', error);
      res.status(500).json({ error: "Authentication failed" });
    }
  } else {
    res.status(401).json({ error: "Invalid authentication" });
  }
}
