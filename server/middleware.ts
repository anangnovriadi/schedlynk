import type { Request, Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "./auth";
import { storage } from "./storage";

export interface TeamRequest extends AuthenticatedRequest {
  team?: {
    id: number;
    name: string;
    slug: string;
  };
  teamMember?: {
    role: 'SUPER_ADMIN' | 'ADMIN' | 'MEMBER';
  };
}

export async function withTeam(req: TeamRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const teamId = parseInt(req.headers['x-team-id'] as string) || parseInt(req.params.teamId) || parseInt(req.query.teamId as string);
  
  if (!teamId) {
    return res.status(400).json({ error: "Team ID required" });
  }

  try {
    const team = await storage.getTeam(teamId);
    if (!team) {
      return res.status(404).json({ error: "Team not found" });
    }

    const teamMember = await storage.getTeamMember(req.user.id, teamId);
    if (!teamMember) {
      return res.status(403).json({ error: "Access denied: Not a member of this team" });
    }

    req.team = team;
    req.teamMember = teamMember;
    next();
  } catch (error) {
    console.error('Team middleware error:', error);
    res.status(500).json({ error: "Failed to verify team access" });
  }
}

export function requireAdmin(req: TeamRequest, res: Response, next: NextFunction) {
  if (!req.teamMember || (req.teamMember.role !== 'ADMIN' && req.teamMember.role !== 'SUPER_ADMIN')) {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
}

export function requireSuperAdmin(req: TeamRequest, res: Response, next: NextFunction) {
  if (!req.teamMember || req.teamMember.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: "Super admin access required" });
  }
  next();
}
