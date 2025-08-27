import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { sendEmail, isEmailConfigured } from "./email";
import { authenticateUser, hashPassword, verifyPassword, generateToken, generateResetToken, type AuthenticatedRequest } from "./auth";
import { withTeam, requireAdmin, requireSuperAdmin, type TeamRequest } from "./middleware";
import { insertServiceSchema, insertTeamMemberSchema, insertBookingSchema } from "@shared/schema";
import { nextAssignee } from "../utils/roundRobin";
import { authRateLimit, publicApiRateLimit, apiKeyRateLimit } from "./middleware/security";
import { logInfo, logWarning, logError } from "./logger";
import { googleCalendarService } from "./google-calendar";
import crypto from "crypto";

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check endpoint for deployments
  app.get("/api/health", (req, res) => {
    res.status(200).json({ 
      status: "healthy", 
      timestamp: new Date().toISOString(),
      version: "1.0.0" 
    });
  });

  // Authentication routes with rate limiting
  app.post("/api/auth/register-super-admin", authRateLimit, async (req, res) => {
    try {
      const { email, name, password } = req.body;
      
      if (!email || !name || !password) {
        return res.status(400).json({ 
          error: "Email, name, and password are required",
          details: "Please fill in all required fields"
        });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ 
          error: "Invalid email format",
          details: "Please enter a valid email address"
        });
      }

      // Validate password strength
      if (password.length < 6) {
        return res.status(400).json({ 
          error: "Password too weak",
          details: "Password must be at least 6 characters long"
        });
      }

      // Validate name
      if (name.trim().length < 2) {
        return res.status(400).json({ 
          error: "Invalid name",
          details: "Name must be at least 2 characters long"
        });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(409).json({ 
          error: "User already exists",
          details: "An account with this email address already exists"
        });
      }

      // Hash password
      const passwordHash = await hashPassword(password);

      // Create user
      const user = await storage.createUser({
        email,
        name,
        passwordHash,
        isActive: true,
      });

      // Create default team
      const team = await storage.createTeam({
        name: `${user.name}'s Team`,
        slug: `user-${user.id}-team`,
      });

      // Make user super admin of their team
      await storage.createTeamMember({
        userId: user.id,
        teamId: team.id,
        role: 'SUPER_ADMIN',
      });

      // Generate token
      const token = generateToken(user.id);

      res.status(201).json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
        token,
      });
    } catch (error) {
      console.error('Register super admin error:', error);
      res.status(500).json({ error: "Failed to register super admin" });
    }
  });

  app.post("/api/auth/login", authRateLimit, async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ 
          error: "Email and password are required",
          details: "Please provide both email and password to log in"
        });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ 
          error: "Invalid email format",
          details: "Please enter a valid email address"
        });
      }

      // Get user
      const user = await storage.getUserByEmail(email);
      if (!user || !user.passwordHash) {
        return res.status(401).json({ 
          error: "Invalid credentials",
          details: "The email or password you entered is incorrect"
        });
      }

      // Verify password
      const isValidPassword = await verifyPassword(password, user.passwordHash);
      if (!isValidPassword) {
        return res.status(401).json({ 
          error: "Invalid credentials",
          details: "The email or password you entered is incorrect"
        });
      }

      if (!user.isActive) {
        return res.status(401).json({ 
          error: "Account is inactive",
          details: "Your account has been deactivated. Please contact your administrator"
        });
      }

      // Update last login
      await storage.updateUser(user.id, { lastLogin: new Date() });

      // Generate token
      const token = generateToken(user.id);

      res.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
        token,
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  // Forgot password route
  app.post("/api/auth/forgot-password", authRateLimit, async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        // Don't reveal if user exists or not for security
        return res.json({ message: "If the email exists, a reset link has been sent" });
      }

      // Generate reset token
      const resetToken = generateResetToken();
      const resetTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Save reset token
      await storage.updateUser(user.id, {
        resetToken,
        resetTokenExpiry,
      });

      // Send reset email if configured
      if (isEmailConfigured()) {
        const resetUrl = `${req.protocol}://${req.get('host')}/reset-password?token=${resetToken}`;
        await sendEmail({
          to: email,
          from: 'noreply@scheduler-lite.com',
          subject: 'Password Reset Request',
          html: `
            <h2>Password Reset Request</h2>
            <p>You requested a password reset. Click the link below to reset your password:</p>
            <a href="${resetUrl}">Reset Password</a>
            <p>This link will expire in 24 hours.</p>
            <p>If you didn't request this, please ignore this email.</p>
          `,
          text: `You requested a password reset. Visit this link to reset your password: ${resetUrl}. This link will expire in 24 hours.`
        });
      }

      res.json({ message: "If the email exists, a reset link has been sent" });
    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(500).json({ error: "Failed to process request" });
    }
  });

  // Reset password route
  app.post("/api/auth/reset-password", authRateLimit, async (req, res) => {
    try {
      const { token, password } = req.body;
      
      if (!token || !password) {
        return res.status(400).json({ error: "Token and password are required" });
      }

      if (password.length < 8) {
        return res.status(400).json({ error: "Password must be at least 8 characters long" });
      }

      // Find user by valid reset token
      const user = await storage.getUserByResetToken(token);
      if (!user) {
        return res.status(400).json({ error: "Invalid or expired reset token" });
      }

      // Hash new password
      const passwordHash = await hashPassword(password);

      // Update password and clear reset token
      await storage.updateUser(user.id, {
        passwordHash,
        resetToken: null,
        resetTokenExpiry: null,
      });

      res.json({ message: "Password reset successful" });
    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({ error: "Failed to reset password" });
    }
  });

  // User routes
  app.get("/api/user", authenticateUser, async (req: AuthenticatedRequest, res) => {
    res.json(req.user);
  });

  app.get("/api/user/teams", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const teams = await storage.getUserTeams(req.user!.id);
      res.json(teams);
    } catch (error) {
      console.error('Get user teams error:', error);
      res.status(500).json({ error: "Failed to fetch teams" });
    }
  });

  // Super Admin routes
  app.get("/api/admin/teams", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      // Check if user is super admin of any team
      const userTeams = await storage.getUserTeams(req.user!.id);
      const isSuperAdmin = userTeams.some(tm => tm.role === 'SUPER_ADMIN');
      
      if (!isSuperAdmin) {
        return res.status(403).json({ error: "Super admin access required" });
      }

      // Get all teams with their details
      const teams = await storage.getAllTeams();
      res.json(teams);
    } catch (error) {
      console.error("Error fetching teams:", error);
      res.status(500).json({ error: "Failed to fetch teams" });
    }
  });

  app.get("/api/admin/teams/:teamId", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const userTeams = await storage.getUserTeams(req.user!.id);
      const isSuperAdmin = userTeams.some(tm => tm.role === 'SUPER_ADMIN');
      
      if (!isSuperAdmin) {
        return res.status(403).json({ error: "Super admin access required" });
      }

      const teamId = parseInt(req.params.teamId);
      const team = await storage.getTeam(teamId);
      
      if (!team) {
        return res.status(404).json({ error: "Team not found" });
      }

      res.json(team);
    } catch (error) {
      console.error("Error fetching team:", error);
      res.status(500).json({ error: "Failed to fetch team" });
    }
  });

  app.get("/api/admin/bookings", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const userTeams = await storage.getUserTeams(req.user!.id);
      const isSuperAdmin = userTeams.some(tm => tm.role === 'SUPER_ADMIN');
      
      if (!isSuperAdmin) {
        return res.status(403).json({ error: "Super admin access required" });
      }

      // Get all bookings across all teams
      const bookings = await storage.getAllBookings();
      res.json(bookings);
    } catch (error) {
      console.error("Error fetching bookings:", error);
      res.status(500).json({ error: "Failed to fetch bookings" });
    }
  });

  app.get("/api/admin/bookings/:bookingId", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const userTeams = await storage.getUserTeams(req.user!.id);
      const isSuperAdmin = userTeams.some(tm => tm.role === 'SUPER_ADMIN');
      
      if (!isSuperAdmin) {
        return res.status(403).json({ error: "Super admin access required" });
      }

      const bookingId = parseInt(req.params.bookingId);
      const booking = await storage.getBooking(bookingId);
      
      if (!booking) {
        return res.status(404).json({ error: "Booking not found" });
      }

      res.json(booking);
    } catch (error) {
      console.error("Error fetching booking:", error);
      res.status(500).json({ error: "Failed to fetch booking" });
    }
  });

  // Team routes
  app.get("/api/teams/:teamId", authenticateUser, withTeam, async (req: TeamRequest, res) => {
    res.json(req.team);
  });

  app.get("/api/teams/:teamId/members", authenticateUser, withTeam, async (req: TeamRequest, res) => {
    try {
      const members = await storage.getTeamMembers(req.team!.id);
      res.json(members);
    } catch (error) {
      console.error('Get team members error:', error);
      res.status(500).json({ error: "Failed to fetch team members" });
    }
  });

  app.post("/api/teams/:teamId/members", authenticateUser, withTeam, requireAdmin, async (req: TeamRequest, res) => {
    try {
      const { email, name, role, password, sendCredentials = false } = req.body;
      
      if (!email || !name || !role) {
        return res.status(400).json({ error: "Email, name, and role are required" });
      }

      // Check if user is super admin to allow password creation
      const isSuperAdmin = req.teamMember?.role === 'SUPER_ADMIN';

      // Check if user already exists
      let user = await storage.getUserByEmail(email);
      let createdPassword = null;
      
      if (!user) {
        // Create user if they don't exist
        const userData: any = {
          email,
          name,
        };

        // Super admins can set passwords for new users
        if (isSuperAdmin && password) {
          if (password.length < 8) {
            return res.status(400).json({ error: "Password must be at least 8 characters long" });
          }
          userData.passwordHash = await hashPassword(password);
          createdPassword = password;
        }

        user = await storage.createUser(userData);
      }

      // Check if user is already a member of this team
      const existingMember = await storage.getTeamMember(user.id, req.team!.id);
      if (existingMember) {
        return res.status(400).json({ error: "User is already a member of this team" });
      }

      // Create team membership
      const member = await storage.createTeamMember({
        userId: user.id,
        teamId: req.team!.id,
        role: role as 'SUPER_ADMIN' | 'ADMIN' | 'MEMBER',
      });

      // Send welcome email with credentials if requested and configured
      if (isSuperAdmin && sendCredentials && createdPassword && isEmailConfigured()) {
        const loginUrl = `${req.protocol}://${req.get('host')}/login`;
        await sendEmail({
          to: email,
          from: 'noreply@scheduler-lite.com',
          subject: `Welcome to ${req.team!.name} - Your Account Details`,
          html: `
            <h2>Welcome to ${req.team!.name}!</h2>
            <p>You have been invited to join the ${req.team!.name} team on Scheduler-Lite.</p>
            <p><strong>Your login credentials:</strong></p>
            <ul>
              <li>Email: ${email}</li>
              <li>Password: ${createdPassword}</li>
            </ul>
            <p>Please log in at: <a href="${loginUrl}">${loginUrl}</a></p>
            <p>For security, we recommend changing your password after your first login.</p>
            <p>Role: ${role}</p>
          `,
          text: `Welcome to ${req.team!.name}! You have been invited to join the team. Login credentials: Email: ${email}, Password: ${createdPassword}. Login at: ${loginUrl}`
        });
      }

      res.json({ 
        ...member, 
        passwordCreated: isSuperAdmin && !!createdPassword,
        emailSent: isSuperAdmin && sendCredentials && !!createdPassword && isEmailConfigured()
      });
    } catch (error) {
      console.error('Create team member error:', error);
      res.status(500).json({ error: "Failed to add team member" });
    }
  });

  // Remove team member
  app.delete("/api/teams/:teamId/members/:userId", authenticateUser, withTeam, requireAdmin, async (req: TeamRequest, res) => {
    try {
      const teamId = parseInt(req.params.teamId);
      const userId = parseInt(req.params.userId);
      
      await storage.removeTeamMember(userId, teamId);
      res.json({ success: true });
    } catch (error) {
      console.error('Failed to remove team member:', error);
      res.status(500).json({ error: "Failed to remove team member" });
    }
  });

  // Update team settings
  app.put("/api/teams/:teamId", authenticateUser, withTeam, requireAdmin, async (req: TeamRequest, res) => {
    try {
      const teamId = parseInt(req.params.teamId);
      const { name, timezone } = req.body;
      
      const updatedTeam = await storage.updateTeam(teamId, { name, timezone });
      res.json(updatedTeam);
    } catch (error) {
      console.error('Failed to update team:', error);
      res.status(500).json({ error: "Failed to update team" });
    }
  });

  // Create new team (super admin only)
  app.post("/api/teams", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const { name, timezone = 'UTC' } = req.body;
      
      if (!name) {
        return res.status(400).json({ error: "Team name is required" });
      }

      // Check if user is super admin in any team
      const userTeams = await storage.getUserTeams(req.user!.id);
      const isSuperAdmin = userTeams.some(team => team.role === 'SUPER_ADMIN');
      
      if (!isSuperAdmin) {
        return res.status(403).json({ error: "Only super admins can create teams" });
      }

      // Generate slug from name
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      
      // Check if slug already exists
      const existingTeam = await storage.getTeamBySlug(slug);
      if (existingTeam) {
        return res.status(400).json({ error: "Team with this name already exists" });
      }

      const team = await storage.createTeam({ name, slug, timezone });
      
      // Add creator as super admin of the new team
      await storage.createTeamMember({
        userId: req.user!.id,
        teamId: team.id,
        role: 'SUPER_ADMIN'
      });

      res.status(201).json(team);
    } catch (error) {
      console.error('Create team error:', error);
      res.status(500).json({ error: "Failed to create team" });
    }
  });

  // Service routes
  app.get("/api/teams/:teamId/services", authenticateUser, withTeam, async (req: TeamRequest, res) => {
    try {
      const services = await storage.getTeamServices(req.team!.id);
      const servicesWithMembers = await Promise.all(
        services.map(async (service) => {
          const members = await storage.getServiceMembers(service.id);
          return { ...service, members };
        })
      );
      res.json(servicesWithMembers);
    } catch (error) {
      console.error('Get team services error:', error);
      res.status(500).json({ error: "Failed to fetch services" });
    }
  });

  app.post("/api/teams/:teamId/services", authenticateUser, withTeam, requireAdmin, async (req: TeamRequest, res) => {
    try {
      const { name, description, duration, memberIds } = req.body;
      
      if (!name || !description) {
        return res.status(400).json({ 
          error: "Name and description are required",
          details: "Please provide both a service name and description"
        });
      }

      if (name.trim().length < 2) {
        return res.status(400).json({ 
          error: "Service name too short",
          details: "Service name must be at least 2 characters long"
        });
      }

      if (description.trim().length < 5) {
        return res.status(400).json({ 
          error: "Description too short",
          details: "Service description must be at least 5 characters long"
        });
      }

      const serviceDuration = duration || 30;
      if (serviceDuration < 5 || serviceDuration > 480) {
        return res.status(400).json({ 
          error: "Invalid duration",
          details: "Duration must be between 5 minutes and 8 hours"
        });
      }

      // Generate slug from name
      const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

      // Create service with explicit teamId and generated slug
      const service = await storage.createService({
        name: name.trim(),
        slug,
        description: description.trim(),
        duration: serviceDuration,
        teamId: req.team!.id,
        isActive: true,
      });

      // Add service members if provided
      if (memberIds && Array.isArray(memberIds) && memberIds.length > 0) {
        for (let i = 0; i < memberIds.length; i++) {
          try {
            await storage.addServiceMember({
              serviceId: service.id,
              userId: memberIds[i],
              order: i,
            });
          } catch (memberError) {
            console.error(`Failed to add member ${memberIds[i]} to service:`, memberError);
            // Continue with other members if one fails
          }
        }
      }

      res.json(service);
    } catch (error) {
      console.error('Create service error:', error);
      
      // Handle specific database errors
      if (error.message?.includes('duplicate key') || error.message?.includes('unique constraint')) {
        return res.status(409).json({ 
          error: "Service name already exists",
          details: "A service with this name already exists in your team"
        });
      }
      
      if (error.message?.includes('Control plane request failed') || error.message?.includes('endpoint is disabled')) {
        return res.status(503).json({ 
          error: "Database temporarily unavailable",
          details: "Please try again in a moment"
        });
      }

      res.status(500).json({ 
        error: "Failed to create service",
        details: "An unexpected error occurred while creating the service"
      });
    }
  });

  app.put("/api/teams/:teamId/services/:serviceId", authenticateUser, withTeam, requireAdmin, async (req: TeamRequest, res) => {
    try {
      const serviceId = parseInt(req.params.serviceId);
      const { name, description, duration, isActive, memberIds, workingHours, cancellationBuffer, rescheduleBuffer } = req.body;
      
      // Generate new slug if name changed
      const slug = name ? name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') : undefined;

      // Update service
      const updateData: any = {};
      if (name) updateData.name = name;
      if (slug) updateData.slug = slug;
      if (description) updateData.description = description;
      if (duration) updateData.duration = duration;
      if (typeof isActive === 'boolean') updateData.isActive = isActive;
      if (workingHours) updateData.workingHours = workingHours;
      if (cancellationBuffer) updateData.cancellationBuffer = cancellationBuffer;
      if (rescheduleBuffer) updateData.rescheduleBuffer = rescheduleBuffer;

      const service = await storage.updateService(serviceId, updateData);

      // Update service members if provided
      if (memberIds && Array.isArray(memberIds)) {
        // Remove all existing members first
        const existingMembers = await storage.getServiceMembers(serviceId);
        for (const member of existingMembers) {
          await storage.removeServiceMember(serviceId, member.user.id);
        }

        // Add new members
        for (let i = 0; i < memberIds.length; i++) {
          await storage.addServiceMember({
            serviceId: serviceId,
            userId: memberIds[i],
            order: i,
          });
        }
      }

      res.json(service);
    } catch (error) {
      console.error('Update service error:', error);
      res.status(500).json({ error: "Failed to update service" });
    }
  });

  app.delete("/api/teams/:teamId/services/:serviceId", authenticateUser, withTeam, requireAdmin, async (req: TeamRequest, res) => {
    try {
      const serviceId = parseInt(req.params.serviceId);
      
      // Remove all service members first
      const existingMembers = await storage.getServiceMembers(serviceId);
      for (const member of existingMembers) {
        await storage.removeServiceMember(serviceId, member.user.id);
      }

      // Delete the service (this would need to be implemented in storage)
      await storage.deleteService(serviceId);

      res.json({ success: true });
    } catch (error) {
      console.error('Delete service error:', error);
      res.status(500).json({ error: "Failed to delete service" });
    }
  });

  app.get("/api/services/:serviceId/members", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const serviceId = parseInt(req.params.serviceId);
      const members = await storage.getServiceMembers(serviceId);
      res.json(members);
    } catch (error) {
      console.error('Get service members error:', error);
      res.status(500).json({ error: "Failed to fetch service members" });
    }
  });

  // Booking routes
  app.get("/api/teams/:teamId/bookings", authenticateUser, withTeam, async (req: TeamRequest, res) => {
    try {
      const bookings = await storage.getTeamBookings(req.team!.id);
      res.json(bookings);
    } catch (error) {
      console.error('Get team bookings error:', error);
      res.status(500).json({ error: "Failed to fetch bookings" });
    }
  });

  // Admin booking management - reschedule
  app.put("/api/teams/:teamId/bookings/:bookingId/reschedule", authenticateUser, withTeam, requireAdmin, async (req: TeamRequest, res) => {
    try {
      const bookingId = parseInt(req.params.bookingId);
      const { start, end } = req.body;
      
      if (!start || !end) {
        return res.status(400).json({ error: "Start and end times are required" });
      }
      
      const booking = await storage.rescheduleBooking(bookingId, new Date(start), new Date(end));
      
      // Send reschedule email if configured
      if (isEmailConfigured()) {
        await sendEmail({
          to: booking.guestEmail,
          from: 'noreply@scheduler-lite.com',
          subject: 'Booking Rescheduled',
          html: `
            <h2>Booking Rescheduled</h2>
            <p>Your booking has been rescheduled to a new time.</p>
            <p><strong>New Time:</strong> ${new Date(booking.start).toLocaleString()} - ${new Date(booking.end).toLocaleString()}</p>
          `,
        });
      }
      
      res.json(booking);
    } catch (error) {
      console.error('Reschedule booking error:', error);
      res.status(500).json({ error: "Failed to reschedule booking" });
    }
  });

  // Admin booking management - cancel
  app.put("/api/teams/:teamId/bookings/:bookingId/cancel", authenticateUser, withTeam, requireAdmin, async (req: TeamRequest, res) => {
    try {
      const bookingId = parseInt(req.params.bookingId);
      
      const booking = await storage.updateBookingStatus(bookingId, 'CANCELLED');
      
      // Send cancellation email if configured
      if (isEmailConfigured()) {
        await sendEmail({
          to: booking.guestEmail,
          from: 'noreply@scheduler-lite.com',
          subject: 'Booking Cancelled',
          html: `
            <h2>Booking Cancelled</h2>
            <p>Your booking has been cancelled by the team.</p>
            <p><strong>Original Time:</strong> ${new Date(booking.start).toLocaleString()}</p>
          `,
        });
      }
      
      res.json(booking);
    } catch (error) {
      console.error('Cancel booking error:', error);
      res.status(500).json({ error: "Failed to cancel booking" });
    }
  });

  // Admin booking management - complete
  app.put("/api/teams/:teamId/bookings/:bookingId/complete", authenticateUser, withTeam, requireAdmin, async (req: TeamRequest, res) => {
    try {
      const bookingId = parseInt(req.params.bookingId);
      
      const booking = await storage.updateBookingStatus(bookingId, 'COMPLETED');
      res.json(booking);
    } catch (error) {
      console.error('Complete booking error:', error);
      res.status(500).json({ error: "Failed to complete booking" });
    }
  });

  app.post("/api/teams/:teamId/bookings", authenticateUser, withTeam, async (req: TeamRequest, res) => {
    try {
      const bookingData = insertBookingSchema.parse(req.body);
      
      // Get next assignee using round-robin
      const assignedUserId = await nextAssignee(storage, bookingData.serviceId);
      
      const booking = await storage.createBooking({
        ...bookingData,
        userId: req.user!.id,
        assignedUserId,
      });

      // Sync to Google Calendar asynchronously
      syncBookingToCalendars(booking, req.team!.id).catch(error => {
        logError(error as Error, { 
          context: 'Internal booking calendar sync',
          bookingId: booking.id 
        });
      });

      res.json(booking);
    } catch (error) {
      console.error('Create booking error:', error);
      res.status(500).json({ error: "Failed to create booking" });
    }
  });

  app.get("/api/user/bookings", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const bookings = await storage.getUserBookings(req.user!.id);
      res.json(bookings);
    } catch (error) {
      console.error('Get user bookings error:', error);
      res.status(500).json({ error: "Failed to fetch user bookings" });
    }
  });

  // Dashboard stats
  app.get("/api/teams/:teamId/stats", authenticateUser, withTeam, async (req: TeamRequest, res) => {
    try {
      const services = await storage.getTeamServices(req.team!.id);
      const bookings = await storage.getTeamBookings(req.team!.id);
      const members = await storage.getTeamMembers(req.team!.id);

      const today = new Date();
      const todayStart = new Date(today.setHours(0, 0, 0, 0));
      const todayEnd = new Date(today.setHours(23, 59, 59, 999));

      const todayBookings = bookings.filter(booking => {
        const bookingDate = new Date(booking.start);
        return bookingDate >= todayStart && bookingDate <= todayEnd;
      });

      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());
      weekStart.setHours(0, 0, 0, 0);

      const weekBookings = bookings.filter(booking => {
        const bookingDate = new Date(booking.start);
        return bookingDate >= weekStart;
      });

      const weeklyHours = weekBookings.reduce((total, booking) => {
        const duration = (new Date(booking.end).getTime() - new Date(booking.start).getTime()) / (1000 * 60);
        return total + duration;
      }, 0) / 60; // Convert to hours

      res.json({
        todayBookings: todayBookings.length,
        activeServices: services.filter(s => s.isActive).length,
        teamMembers: members.length,
        weeklyHours: Math.round(weeklyHours),
      });
    } catch (error) {
      console.error('Get team stats error:', error);
      res.status(500).json({ error: "Failed to fetch team stats" });
    }
  });

  // Availability routes
  app.get("/api/teams/:teamId/users/:userId/availability", authenticateUser, withTeam, async (req: TeamRequest, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const availability = await storage.getUserAvailability(userId, req.team!.id);
      res.json(availability);
    } catch (error) {
      console.error('Get user availability error:', error);
      res.status(500).json({ error: "Failed to fetch availability" });
    }
  });

  app.post("/api/teams/:teamId/users/:userId/availability", authenticateUser, withTeam, async (req: TeamRequest, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const { dayOfWeek, startTime, endTime } = req.body;
      
      const availability = await storage.createAvailability({
        userId,
        teamId: req.team!.id,
        dayOfWeek,
        startTime,
        endTime,
        isActive: true,
      });
      
      res.json(availability);
    } catch (error) {
      console.error('Create availability error:', error);
      res.status(500).json({ error: "Failed to create availability" });
    }
  });

  app.post("/api/teams/:teamId/users/:userId/availability/bulk", authenticateUser, withTeam, async (req: TeamRequest, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const { availabilities } = req.body;
      
      const availabilityData = availabilities.map((av: any) => ({
        userId,
        teamId: req.team!.id,
        dayOfWeek: av.dayOfWeek,
        startTime: av.startTime,
        endTime: av.endTime,
        isActive: true,
      }));
      
      const created = await storage.bulkCreateAvailability(availabilityData);
      res.json(created);
    } catch (error) {
      console.error('Bulk create availability error:', error);
      res.status(500).json({ error: "Failed to create availability" });
    }
  });

  app.put("/api/teams/:teamId/availability/:availabilityId", authenticateUser, withTeam, async (req: TeamRequest, res) => {
    try {
      const availabilityId = parseInt(req.params.availabilityId);
      const { dayOfWeek, startTime, endTime, isActive } = req.body;
      
      const availability = await storage.updateAvailability(availabilityId, {
        dayOfWeek,
        startTime,
        endTime,
        isActive,
      });
      
      res.json(availability);
    } catch (error) {
      console.error('Update availability error:', error);
      res.status(500).json({ error: "Failed to update availability" });
    }
  });

  app.delete("/api/teams/:teamId/availability/:availabilityId", authenticateUser, withTeam, async (req: TeamRequest, res) => {
    try {
      const availabilityId = parseInt(req.params.availabilityId);
      await storage.deleteAvailability(availabilityId);
      res.json({ success: true });
    } catch (error) {
      console.error('Delete availability error:', error);
      res.status(500).json({ error: "Failed to delete availability" });
    }
  });

  // Holiday routes
  app.get("/api/teams/:teamId/users/:userId/holidays", authenticateUser, withTeam, async (req: TeamRequest, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const holidays = await storage.getUserHolidays(userId, req.team!.id);
      res.json(holidays);
    } catch (error) {
      console.error('Get user holidays error:', error);
      res.status(500).json({ error: "Failed to fetch holidays" });
    }
  });

  app.post("/api/teams/:teamId/users/:userId/holidays", authenticateUser, withTeam, async (req: TeamRequest, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const { date, title, isRecurring } = req.body;
      
      const holiday = await storage.createHoliday({
        userId,
        teamId: req.team!.id,
        date: date,
        title,
        isRecurring: isRecurring || false,
      });
      
      res.json(holiday);
    } catch (error) {
      console.error('Create holiday error:', error);
      res.status(500).json({ error: "Failed to create holiday" });
    }
  });

  app.put("/api/teams/:teamId/holidays/:holidayId", authenticateUser, withTeam, async (req: TeamRequest, res) => {
    try {
      const holidayId = parseInt(req.params.holidayId);
      const { date, title, isRecurring } = req.body;
      
      const holiday = await storage.updateHoliday(holidayId, {
        date: date,
        title,
        isRecurring,
      });
      
      res.json(holiday);
    } catch (error) {
      console.error('Update holiday error:', error);
      res.status(500).json({ error: "Failed to update holiday" });
    }
  });

  app.delete("/api/teams/:teamId/holidays/:holidayId", authenticateUser, withTeam, async (req: TeamRequest, res) => {
    try {
      const holidayId = parseInt(req.params.holidayId);
      await storage.deleteHoliday(holidayId);
      res.json({ success: true });
    } catch (error) {
      console.error('Delete holiday error:', error);
      res.status(500).json({ error: "Failed to delete holiday" });
    }
  });

  // Public booking routes (no authentication required) with rate limiting
  
  // Get public team and service info for booking page
  app.get("/api/public/book/:teamSlug/:serviceSlug", publicApiRateLimit, async (req, res) => {
    try {
      const { teamSlug, serviceSlug } = req.params;
      
      const team = await storage.getTeamBySlug(teamSlug);
      if (!team) {
        return res.status(404).json({ error: "Team not found" });
      }
      
      const services = await storage.getTeamServices(team.id);
      const service = services.find(s => s.slug === serviceSlug);
      if (!service || !service.isActive) {
        return res.status(404).json({ error: "Service not found or inactive" });
      }
      
      const serviceMembers = await storage.getServiceMembers(service.id);
      
      res.json({
        team,
        service,
        serviceMembers: serviceMembers.map(sm => ({
          id: sm.id,
          order: sm.order,
          user: {
            id: sm.user.id,
            name: sm.user.name,
            email: sm.user.email
          }
        }))
      });
    } catch (error) {
      console.error('Get public booking info error:', error);
      res.status(500).json({ error: "Failed to fetch booking information" });
    }
  });
  
  // Get available time slots for a service
  app.get("/api/public/book/:teamSlug/:serviceSlug/slots", publicApiRateLimit, async (req, res) => {
    try {
      const { teamSlug, serviceSlug } = req.params;
      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ error: "Start and end dates are required" });
      }
      
      const team = await storage.getTeamBySlug(teamSlug);
      if (!team) {
        return res.status(404).json({ error: "Team not found" });
      }
      
      const services = await storage.getTeamServices(team.id);
      const service = services.find(s => s.slug === serviceSlug);
      if (!service || !service.isActive) {
        return res.status(404).json({ error: "Service not found or inactive" });
      }
      
      const serviceMembers = await storage.getServiceMembers(service.id);
      const memberIds = serviceMembers.map(sm => sm.userId);
      
      if (memberIds.length === 0) {
        return res.json({ slots: [] });
      }
      
      // Get member availabilities
      const memberAvailabilities = new Map();
      for (const memberId of memberIds) {
        const availability = await storage.getUserAvailability(memberId, team.id);
        memberAvailabilities.set(memberId, availability);
      }
      
      // Get team holidays
      const teamHolidays = await storage.getUserHolidays(memberIds[0], team.id); // Use first member for team holidays
      
      // Get existing bookings
      const existingBookings = await storage.getTeamBookings(team.id);
      
      // Generate available slots
      const { generateSlots } = await import('../utils/generateSlots');
      const slots = generateSlots({
        service,
        dateRange: {
          start: new Date(startDate as string),
          end: new Date(endDate as string)
        },
        teamHolidays,
        memberAvailabilities,
        existingBookings,
        memberIds
      });
      
      res.json({ slots });
    } catch (error) {
      console.error('Get available slots error:', error);
      res.status(500).json({ error: "Failed to fetch available slots" });
    }
  });
  
  // Create a new booking (public)
  app.post("/api/public/book/:teamSlug/:serviceSlug", async (req, res) => {
    try {
      const { teamSlug, serviceSlug } = req.params;
      const { start, end, guestEmail, guestName } = req.body;
      
      if (!start || !end || !guestEmail) {
        return res.status(400).json({ error: "Start time, end time, and guest email are required" });
      }
      
      const team = await storage.getTeamBySlug(teamSlug);
      if (!team) {
        return res.status(404).json({ error: "Team not found" });
      }
      
      const services = await storage.getTeamServices(team.id);
      const service = services.find(s => s.slug === serviceSlug);
      if (!service || !service.isActive) {
        return res.status(404).json({ error: "Service not found or inactive" });
      }
      
      const serviceMembers = await storage.getServiceMembers(service.id);
      if (serviceMembers.length === 0) {
        return res.status(400).json({ error: "No available staff for this service" });
      }
      
      // Use round-robin assignment
      const { nextAssignee } = await import('../utils/roundRobin');
      const assignedUserId = await nextAssignee(storage, service.id);
      
      // Create the booking
      const booking = await storage.createBooking({
        serviceId: service.id,
        userId: null, // Guest booking
        assignedUserId,
        start: new Date(start),
        end: new Date(end),
        guestEmail,
        guestName,
        status: 'SCHEDULED'
      });

      // Sync to Google Calendar asynchronously
      syncBookingToCalendars(booking, team.id).catch(error => {
        logError(error as Error, { 
          context: 'Public booking calendar sync',
          bookingId: booking.id 
        });
      });
      
      // Send confirmation email
      const assignedUser = await storage.getUser(assignedUserId);
      if (assignedUser) {
        const { generateBookingConfirmationEmail } = await import('../utils/emailNotifications');
        const { sendEmail, getDefaultFromEmail } = await import('../utils/emailService');
        
        const emailTemplate = generateBookingConfirmationEmail({
          booking,
          service,
          assignedUser,
          team,
          baseUrl: `${req.protocol}://${req.get('host')}`
        });
        
        await sendEmail({
          to: guestEmail,
          from: getDefaultFromEmail(),
          template: emailTemplate
        });
      }
      
      res.json({ 
        success: true, 
        booking: {
          id: booking.id,
          start: booking.start,
          end: booking.end,
          manageToken: booking.manageToken
        }
      });
    } catch (error) {
      console.error('Create public booking error:', error);
      res.status(500).json({ error: "Failed to create booking" });
    }
  });
  
  // Get booking details by manage token
  app.get("/api/public/booking/:manageToken", publicApiRateLimit, async (req, res) => {
    try {
      const { manageToken } = req.params;
      
      const booking = await storage.getBookingByToken(manageToken);
      if (!booking) {
        return res.status(404).json({ error: "Booking not found" });
      }
      
      const service = await storage.getService(booking.serviceId);
      const assignedUser = await storage.getUser(booking.assignedUserId);
      const team = service ? await storage.getTeam(service.teamId) : null;
      
      res.json({
        booking: {
          id: booking.id,
          start: booking.start,
          end: booking.end,
          status: booking.status,
          guestName: booking.guestName,
          guestEmail: booking.guestEmail,
          rescheduleCount: booking.rescheduleCount
        },
        service,
        assignedUser: assignedUser ? {
          id: assignedUser.id,
          name: assignedUser.name,
          email: assignedUser.email
        } : null,
        team
      });
    } catch (error) {
      console.error('Get booking by token error:', error);
      res.status(500).json({ error: "Failed to fetch booking" });
    }
  });
  
  // Cancel booking by manage token
  app.post("/api/public/booking/:manageToken/cancel", publicApiRateLimit, async (req, res) => {
    try {
      const { manageToken } = req.params;
      
      const booking = await storage.getBookingByToken(manageToken);
      if (!booking) {
        return res.status(404).json({ error: "Booking not found" });
      }
      
      if (booking.status !== 'SCHEDULED') {
        return res.status(400).json({ 
          error: `This booking cannot be cancelled because it is already ${booking.status.toLowerCase()}` 
        });
      }
      
      // Check cancellation buffer
      const service = await storage.getService(booking.serviceId);
      if (service) {
        const now = new Date();
        const bookingStart = new Date(booking.start);
        const bufferMs = service.cancellationBuffer * 60 * 60 * 1000;
        
        if (bookingStart.getTime() - now.getTime() < bufferMs) {
          const hoursLeft = Math.ceil((bookingStart.getTime() - now.getTime()) / (1000 * 60 * 60));
          return res.status(400).json({ 
            error: `Cancellation deadline has passed. This booking can only be cancelled at least ${service.cancellationBuffer} hours in advance. Your appointment is in ${hoursLeft} hour${hoursLeft !== 1 ? 's' : ''}.` 
          });
        }
      }
      
      const updatedBooking = await storage.updateBookingStatus(booking.id, 'CANCELLED');
      
      // Send cancellation email
      if (service) {
        const assignedUser = await storage.getUser(booking.assignedUserId);
        const team = await storage.getTeam(service.teamId);
        
        if (assignedUser && team) {
          const { generateBookingCancellationEmail } = await import('../utils/emailNotifications');
          const { sendEmail, getDefaultFromEmail } = await import('../utils/emailService');
          
          const emailTemplate = generateBookingCancellationEmail({
            booking: updatedBooking,
            service,
            assignedUser,
            team,
            baseUrl: `${req.protocol}://${req.get('host')}`
          });
          
          await sendEmail({
            to: booking.guestEmail,
            from: getDefaultFromEmail(),
            template: emailTemplate
          });
        }
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error('Cancel booking error:', error);
      res.status(500).json({ error: "Failed to cancel booking" });
    }
  });
  
  // Reschedule booking by manage token
  app.post("/api/public/booking/:manageToken/reschedule", publicApiRateLimit, async (req, res) => {
    try {
      const { manageToken } = req.params;
      const { start, end } = req.body;
      
      if (!start || !end) {
        return res.status(400).json({ error: "Start and end times are required" });
      }
      
      const booking = await storage.getBookingByToken(manageToken);
      if (!booking) {
        return res.status(404).json({ error: "Booking not found" });
      }
      
      if (booking.status !== 'SCHEDULED') {
        return res.status(400).json({ 
          error: `This booking cannot be rescheduled because it is already ${booking.status.toLowerCase()}` 
        });
      }
      
      // Check reschedule buffer
      const service = await storage.getService(booking.serviceId);
      if (service) {
        const now = new Date();
        const bookingStart = new Date(booking.start);
        const bufferMs = service.rescheduleBuffer * 60 * 60 * 1000;
        
        console.log('Reschedule buffer check:', {
          now: now.toISOString(),
          bookingStart: bookingStart.toISOString(),
          bufferHours: service.rescheduleBuffer,
          bufferMs,
          timeDiff: bookingStart.getTime() - now.getTime()
        });
        
        if (bookingStart.getTime() - now.getTime() < bufferMs) {
          const hoursLeft = Math.ceil((bookingStart.getTime() - now.getTime()) / (1000 * 60 * 60));
          return res.status(400).json({ 
            error: `Reschedule deadline has passed. This booking can only be rescheduled at least ${service.rescheduleBuffer} hours in advance. Your appointment is in ${hoursLeft} hour${hoursLeft !== 1 ? 's' : ''}.` 
          });
        }
      }
      
      const updatedBooking = await storage.rescheduleBooking(
        booking.id, 
        new Date(start), 
        new Date(end)
      );
      
      // Send reschedule confirmation email
      if (service) {
        const assignedUser = await storage.getUser(booking.assignedUserId);
        const team = await storage.getTeam(service.teamId);
        
        if (assignedUser && team) {
          const { generateBookingRescheduleEmail } = await import('../utils/emailNotifications');
          const { sendEmail, getDefaultFromEmail } = await import('../utils/emailService');
          
          const emailTemplate = generateBookingRescheduleEmail({
            booking: updatedBooking,
            service,
            assignedUser,
            team,
            baseUrl: `${req.protocol}://${req.get('host')}`
          });
          
          await sendEmail({
            to: booking.guestEmail,
            from: getDefaultFromEmail(),
            template: emailTemplate
          });
        }
      }
      
      res.json({ success: true, booking: updatedBooking });
    } catch (error) {
      console.error('Reschedule booking error:', error);
      res.status(500).json({ error: "Failed to reschedule booking" });
    }
  });
  
  // Generate ICS calendar file for booking
  app.get("/api/public/booking/:manageToken/calendar.ics", publicApiRateLimit, async (req, res) => {
    try {
      const { manageToken } = req.params;
      
      const booking = await storage.getBookingByToken(manageToken);
      if (!booking) {
        return res.status(404).json({ error: "Booking not found" });
      }
      
      const service = await storage.getService(booking.serviceId);
      const assignedUser = await storage.getUser(booking.assignedUserId);
      const team = service ? await storage.getTeam(service.teamId) : null;
      
      if (!service || !assignedUser || !team) {
        return res.status(404).json({ error: "Booking details not found" });
      }
      
      const { generateICSCalendar, generateICSFilename } = await import('../utils/icsCalendar');
      
      const rescheduleUrl = `${req.protocol}://${req.get('host')}/booking/${manageToken}/reschedule`;
      const cancelUrl = `${req.protocol}://${req.get('host')}/booking/${manageToken}/cancel`;
      
      const icsContent = generateICSCalendar({
        booking,
        service,
        assignedUser,
        team,
        rescheduleUrl,
        cancelUrl
      });
      
      const filename = generateICSFilename(booking, service);
      
      res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(icsContent);
    } catch (error) {
      console.error('Generate ICS calendar error:', error);
      res.status(500).json({ error: "Failed to generate calendar file" });
    }
  });

  // API Key management routes
  app.get("/api/teams/:teamId/api-keys", authenticateUser, withTeam, requireAdmin, async (req: TeamRequest, res) => {
    try {
      const apiKeys = await storage.getApiKeys(req.user!.id, req.team!.id);
      res.json(apiKeys);
    } catch (error) {
      console.error('Failed to fetch API keys:', error);
      res.status(500).json({ error: "Failed to fetch API keys" });
    }
  });

  app.post("/api/teams/:teamId/api-keys", authenticateUser, withTeam, requireAdmin, async (req: TeamRequest, res) => {
    try {
      const { name, permissions, expiresAt } = req.body;
      
      // Generate API key
      const keyId = crypto.randomUUID();
      const plainKey = `sk_${keyId.replace(/-/g, '')}`;
      const keyHash = await hashPassword(plainKey);
      const keyPrefix = plainKey.substring(0, 12);

      const apiKey = await storage.createApiKey({
        name,
        keyHash,
        keyPrefix,
        userId: req.user!.id,
        teamId: req.team!.id,
        permissions: permissions || ['read'],
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      });

      res.status(201).json({
        ...apiKey,
        plainKey, // Only shown once
      });
    } catch (error) {
      console.error('Failed to create API key:', error);
      res.status(500).json({ error: "Failed to create API key" });
    }
  });

  app.delete("/api/teams/:teamId/api-keys/:keyId", authenticateUser, withTeam, requireAdmin, async (req: TeamRequest, res) => {
    try {
      const keyId = parseInt(req.params.keyId);
      await storage.deleteApiKey(keyId);
      res.json({ success: true });
    } catch (error) {
      console.error('Failed to delete API key:', error);
      res.status(500).json({ error: "Failed to delete API key" });
    }
  });

  // Calendar integration endpoints
  app.get("/api/teams/:teamId/calendar-integrations", authenticateUser, withTeam, async (req: TeamRequest, res) => {
    try {
      const integrations = await storage.getCalendarIntegrations(req.team!.id);
      res.json(integrations);
    } catch (error) {
      console.error('Get calendar integrations error:', error);
      res.status(500).json({ error: "Failed to fetch calendar integrations" });
    }
  });

  app.post("/api/teams/:teamId/calendar-integrations", authenticateUser, withTeam, requireAdmin, async (req: TeamRequest, res) => {
    try {
      const { type, name, syncDirection, autoSync, syncInterval, caldavUrl, caldavUsername, caldavPassword } = req.body;
      
      if (!type || !name) {
        return res.status(400).json({ error: "Type and name are required" });
      }

      // Validate CalDAV fields if type is caldav
      if (type === 'caldav' && (!caldavUrl || !caldavUsername || !caldavPassword)) {
        return res.status(400).json({ error: "CalDAV URL, username, and password are required for CalDAV integration" });
      }

      const integration = await storage.createCalendarIntegration({
        userId: req.user!.id,
        teamId: req.team!.id,
        type,
        name,
        syncDirection: syncDirection || 'both',
        autoSync: autoSync ?? true,
        syncInterval: syncInterval || 15,
        caldavUrl: type === 'caldav' ? caldavUrl : null,
        caldavUsername: type === 'caldav' ? caldavUsername : null,
        caldavPassword: type === 'caldav' ? caldavPassword : null, // In production, this should be encrypted
      });

      res.status(201).json(integration);
    } catch (error) {
      console.error('Create calendar integration error:', error);
      res.status(500).json({ error: "Failed to create calendar integration" });
    }
  });

  app.put("/api/teams/:teamId/calendar-integrations/:integrationId", authenticateUser, withTeam, requireAdmin, async (req: TeamRequest, res) => {
    try {
      const { integrationId } = req.params;
      const integrationIdNum = parseInt(integrationId);
      
      if (isNaN(integrationIdNum)) {
        return res.status(400).json({ error: "Invalid integration ID" });
      }

      const updated = await storage.updateCalendarIntegration(integrationIdNum, req.team!.id, req.body);
      
      if (!updated) {
        return res.status(404).json({ error: "Calendar integration not found" });
      }

      res.json(updated);
    } catch (error) {
      console.error('Update calendar integration error:', error);
      res.status(500).json({ error: "Failed to update calendar integration" });
    }
  });

  app.delete("/api/teams/:teamId/calendar-integrations/:integrationId", authenticateUser, withTeam, requireAdmin, async (req: TeamRequest, res) => {
    try {
      const { integrationId } = req.params;
      const integrationIdNum = parseInt(integrationId);
      
      if (isNaN(integrationIdNum)) {
        return res.status(400).json({ error: "Invalid integration ID" });
      }

      const deleted = await storage.deleteCalendarIntegration(integrationIdNum, req.team!.id);
      
      if (!deleted) {
        return res.status(404).json({ error: "Calendar integration not found" });
      }

      res.json({ message: "Calendar integration deleted successfully" });
    } catch (error) {
      console.error('Delete calendar integration error:', error);
      res.status(500).json({ error: "Failed to delete calendar integration" });
    }
  });

  // Google Calendar OAuth initiation endpoint (authenticated API call)
  app.get("/api/auth/google/initiate", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const teamId = parseInt(req.query.team_id as string);
      
      logInfo('Google OAuth initiation request received', { 
        userId: req.user?.id,
        userEmail: req.user?.email,
        teamId,
        queryParams: Object.keys(req.query)
      });
      
      if (!teamId) {
        logError(new Error('Team ID missing in OAuth flow'), { query: req.query });
        return res.status(400).json({ error: 'missing_team_id' });
      }

      // User is already authenticated via middleware
      const user = req.user!;
      
      logInfo('User authenticated for OAuth initiation', { 
        userId: user.id, 
        userEmail: user.email,
        teamId
      });

      // Check if user is team member
      const teamMember = await storage.getTeamMember(user.id, teamId);
      if (!teamMember) {
        logError(new Error('User not a team member'), {
          userId: user.id,
          teamId
        });
        return res.status(403).json({ error: 'access_denied' });
      }

      const authUrl = googleCalendarService.generateAuthUrl(teamId, user.id);
      logInfo('Google OAuth URL generated', { 
        teamId, 
        userId: user.id, 
        authUrl: authUrl.substring(0, 100) + '...' 
      });
      
      res.json({ authUrl });
    } catch (error) {
      logError(error as Error, { context: 'Google OAuth initiation' });
      res.status(500).json({ error: 'oauth_initiation_failed' });
    }
  });

  // Google Calendar OAuth callback (public endpoint)
  app.get("/auth/google/callback", async (req, res) => {
    try {
      const { code, state, error } = req.query;
      
      logInfo('Google OAuth callback received', { 
        hasCode: !!code,
        hasState: !!state,
        hasError: !!error,
        queryParams: Object.keys(req.query)
      });

      if (error) {
        logError(new Error('OAuth error from Google'), { error });
        return res.redirect('/calendar-settings?error=oauth_denied');
      }

      if (!code) {
        logError(new Error('No authorization code received'));
        return res.redirect('/calendar-settings?error=missing_code');
      }

      if (!state) {
        logError(new Error('No state parameter received'));
        return res.redirect('/calendar-settings?error=missing_state');
      }

      // Handle the OAuth callback
      const result = await googleCalendarService.handleAuthCallback(code as string, state as string);
      
      logInfo('Google OAuth callback processed successfully', { 
        teamId: result.teamId,
        userId: result.userId,
        integrationId: result.integrationId
      });
      
      res.redirect('/calendar-settings?success=google_connected');
    } catch (error) {
      logError(error as Error, { context: 'Google OAuth callback' });
      res.redirect('/calendar-settings?error=oauth_failed');
    }
  });

  // Legacy redirect endpoint for backward compatibility
  app.get("/auth/google", async (req, res) => {
    try {
      const teamId = parseInt(req.query.team_id as string);
      
      logInfo('Legacy Google OAuth request received', { 
        teamId,
        queryParams: Object.keys(req.query)
      });

      // Check if user is team member
      const teamMember = await storage.getTeamMember(user.id, teamId);
      if (!teamMember) {
        logError(new Error('User not a team member'), {
          userId: user.id,
          teamId
        });
        return res.redirect('/calendar-settings?error=access_denied');
      }

      const authUrl = googleCalendarService.generateAuthUrl(teamId, user.id);
      logInfo('Google OAuth URL generated', { 
        teamId, 
        userId: user.id, 
        authUrl: authUrl.substring(0, 100) + '...' 
      });
      res.redirect(authUrl);
    } catch (error) {
      logError(error as Error, { context: 'Google OAuth initiation' });
      res.redirect('/calendar-settings?error=oauth_failed');
    }
  });

  app.get("/auth/google/callback", async (req, res) => {
    try {
      const { code, state, error } = req.query;

      logInfo('Google OAuth callback received', {
        hasCode: !!code,
        hasState: !!state,
        error: error || 'none',
        queryParams: Object.keys(req.query)
      });

      if (error) {
        logWarning('Google OAuth error', { error });
        return res.redirect('/calendar-settings?error=oauth_denied');
      }

      if (!code || !state) {
        logError(new Error('Missing code or state in OAuth callback'), {
          code: !!code,
          state: !!state
        });
        return res.redirect('/calendar-settings?error=missing_code');
      }

      const integration = await googleCalendarService.handleAuthCallback(
        code as string, 
        state as string
      );

      logInfo('Google Calendar integration completed', { 
        integrationId: integration.id,
        teamId: integration.teamId,
        userId: integration.userId
      });

      res.redirect('/calendar-settings?success=google_connected');
    } catch (error) {
      logError(error as Error, { context: 'Google OAuth callback' });
      res.redirect('/calendar-settings?error=oauth_failed');
    }
  });

  // Test endpoint to send a test email (for testing)
  app.post("/api/test-email", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const success = await sendEmail({
        to: req.user!.email,
        from: 'noreply@scheduler-lite.com',
        subject: 'Test Email - Scheduler Lite',
        text: 'This is a test email to verify Gmail SMTP configuration is working correctly.',
        html: `
          <h2>Email Test Successful!</h2>
          <p>Hello ${req.user!.name || req.user!.email},</p>
          <p>This email confirms that the Gmail SMTP integration is working properly.</p>
          <p>You will now receive:</p>
          <ul>
            <li>Booking confirmation emails</li>
            <li>Calendar invitation links</li>
            <li>Password reset notifications</li>
          </ul>
          <p>Best regards,<br>Scheduler Lite Team</p>
        `
      });

      if (success) {
        res.json({ 
          success: true, 
          message: "Test email sent successfully",
          to: req.user!.email
        });
      } else {
        res.status(500).json({ error: "Failed to send test email" });
      }
    } catch (error) {
      logError(error as Error, { context: 'Test email', userId: req.user!.id });
      res.status(500).json({ error: "Failed to send test email" });
    }
  });

  // Test endpoint to manually sync a booking to calendars (for testing)
  app.post("/api/teams/:teamId/bookings/:bookingId/sync-calendar", authenticateUser, withTeam, requireAdmin, async (req: TeamRequest, res) => {
    try {
      const bookingId = parseInt(req.params.bookingId);
      const booking = await storage.getBooking(bookingId);
      
      if (!booking) {
        return res.status(404).json({ error: "Booking not found" });
      }

      if (booking.serviceId) {
        const service = await storage.getService(booking.serviceId);
        if (!service || service.teamId !== req.team!.id) {
          return res.status(403).json({ error: "Access denied" });
        }
      }

      // Trigger calendar sync
      await syncBookingToCalendars(booking, req.team!.id);
      
      res.json({ 
        success: true, 
        message: "Calendar sync triggered",
        bookingId: booking.id
      });
    } catch (error) {
      logError(error as Error, { 
        context: 'Manual calendar sync',
        bookingId: req.params.bookingId,
        teamId: req.team!.id
      });
      res.status(500).json({ error: "Failed to sync booking to calendar" });
    }
  });

  // Helper function to sync bookings to all active Google Calendar integrations
  async function syncBookingToCalendars(booking: any, teamId: number) {
    try {
      // Get all active Google Calendar integrations for the team
      const integrations = await storage.getCalendarIntegrations(teamId);
      const googleIntegrations = integrations.filter(
        i => i.type === 'google' && i.isActive && i.syncStatus === 'active'
      );

      if (googleIntegrations.length === 0) {
        return; // No active Google Calendar integrations
      }

      // Get full booking details with related data
      const fullBooking = await storage.getBooking(booking.id);
      if (!fullBooking) {
        logError(new Error('Booking not found for calendar sync'), { bookingId: booking.id });
        return;
      }

      // Get service and assigned user details
      const service = await storage.getService(fullBooking.serviceId);
      const assignedUser = fullBooking.assignedUserId 
        ? await storage.getUser(fullBooking.assignedUserId) 
        : null;

      const enrichedBooking = {
        ...fullBooking,
        service,
        assignedUser,
        customerName: fullBooking.guestName || 'Internal Booking',
        customerEmail: fullBooking.guestEmail || assignedUser?.email || '',
        customerPhone: null
      };

      // Sync to each Google Calendar integration
      for (const integration of googleIntegrations) {
        try {
          await googleCalendarService.syncBookingToCalendar(enrichedBooking, integration);
          logInfo('Booking synced to Google Calendar', {
            bookingId: booking.id,
            integrationId: integration.id
          });
        } catch (error) {
          logError(error as Error, {
            context: 'Individual calendar sync',
            bookingId: booking.id,
            integrationId: integration.id
          });
        }
      }
    } catch (error) {
      logError(error as Error, {
        context: 'syncBookingToCalendars',
        bookingId: booking.id,
        teamId
      });
    }
  }

  const httpServer = createServer(app);
  return httpServer;
}
