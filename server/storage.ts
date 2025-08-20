import { 
  users, teams, teamMembers, services, serviceMembers, serviceLimits, bookings, availability, holidays, apiKeys,
  calendarIntegrations, calendarSyncEvents,
  type User, type InsertUser, type Team, type InsertTeam, type TeamMember, type InsertTeamMember,
  type Service, type InsertService, type ServiceMember, type InsertServiceMember,
  type Booking, type InsertBooking, type ServiceLimit, type InsertServiceLimit,
  type Availability, type InsertAvailability, type Holiday, type InsertHoliday, type ApiKey, type InsertApiKey,
  type CalendarIntegration, type InsertCalendarIntegration, type CalendarSyncEvent, type InsertCalendarSyncEvent
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc, sql, gt } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User>;
  getUserByResetToken(resetToken: string): Promise<User | undefined>;

  // Teams
  getTeam(id: number): Promise<Team | undefined>;
  getTeamBySlug(slug: string): Promise<Team | undefined>;
  createTeam(team: InsertTeam): Promise<Team>;
  getUserTeams(userId: number): Promise<(TeamMember & { team: Team })[]>;

  // Team Members
  getTeamMember(userId: number, teamId: number): Promise<TeamMember | undefined>;
  createTeamMember(teamMember: InsertTeamMember): Promise<TeamMember>;
  getTeamMembers(teamId: number): Promise<(TeamMember & { user: User })[]>;
  removeTeamMember(userId: number, teamId: number): Promise<void>;
  updateTeam(id: number, team: Partial<InsertTeam>): Promise<Team>;

  // Services
  getService(id: number): Promise<Service | undefined>;
  getTeamServices(teamId: number): Promise<Service[]>;
  createService(service: InsertService): Promise<Service>;
  updateService(id: number, service: Partial<InsertService>): Promise<Service>;
  deleteService(id: number): Promise<void>;

  // Service Members
  getServiceMembers(serviceId: number): Promise<(ServiceMember & { user: User })[]>;
  addServiceMember(serviceMember: InsertServiceMember): Promise<ServiceMember>;
  removeServiceMember(serviceId: number, userId: number): Promise<void>;
  updateServiceMemberOrder(id: number, order: number): Promise<ServiceMember>;

  // Service Limits
  getServiceLimit(serviceId: number): Promise<ServiceLimit | undefined>;
  createServiceLimit(limit: InsertServiceLimit): Promise<ServiceLimit>;

  // Bookings
  getBooking(id: number): Promise<Booking | undefined>;
  createBooking(booking: InsertBooking): Promise<Booking>;
  getTeamBookings(teamId: number): Promise<(Booking & { service: Service; assignedUser: User })[]>;
  getUserBookings(userId: number): Promise<Booking[]>;

  // Availability
  getUserAvailability(userId: number, teamId: number): Promise<Availability[]>;
  createAvailability(availability: InsertAvailability): Promise<Availability>;
  updateAvailability(id: number, availability: Partial<InsertAvailability>): Promise<Availability>;
  deleteAvailability(id: number): Promise<void>;
  bulkCreateAvailability(availabilities: InsertAvailability[]): Promise<Availability[]>;

  // Holidays
  getUserHolidays(userId: number, teamId: number): Promise<Holiday[]>;
  createHoliday(holiday: InsertHoliday): Promise<Holiday>;
  updateHoliday(id: number, holiday: Partial<InsertHoliday>): Promise<Holiday>;
  deleteHoliday(id: number): Promise<void>;

  // Booking management by token
  getBookingByToken(manageToken: string): Promise<Booking | undefined>;
  updateBookingStatus(id: number, status: 'SCHEDULED' | 'CANCELLED' | 'COMPLETED'): Promise<Booking>;
  rescheduleBooking(id: number, start: Date, end: Date): Promise<Booking>;

  // API Keys
  getApiKeys(userId: number, teamId: number): Promise<ApiKey[]>;
  createApiKey(apiKey: InsertApiKey): Promise<ApiKey>;
  getApiKeyByHash(keyHash: string): Promise<ApiKey | undefined>;
  deleteApiKey(id: number): Promise<void>;
  updateApiKeyLastUsed(id: number): Promise<void>;

  // Super Admin endpoints
  getAllTeams(): Promise<Team[]>;
  getAllBookings(): Promise<(Booking & { service: Service; assignedUser: User; team: Team })[]>;

  // Calendar Integrations
  getCalendarIntegrations(teamId: number): Promise<CalendarIntegration[]>;
  createCalendarIntegration(integration: InsertCalendarIntegration): Promise<CalendarIntegration>;
  updateCalendarIntegration(id: number, teamId: number, integration: Partial<InsertCalendarIntegration>): Promise<CalendarIntegration | undefined>;
  deleteCalendarIntegration(id: number, teamId: number): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: number, updateUser: Partial<InsertUser>): Promise<User> {
    const [user] = await db.update(users).set(updateUser).where(eq(users.id, id)).returning();
    return user;
  }

  async getUserByResetToken(resetToken: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(
      and(
        eq(users.resetToken, resetToken),
        gt(users.resetTokenExpiry, new Date())
      )
    );
    return user || undefined;
  }

  async getTeam(id: number): Promise<Team | undefined> {
    const [team] = await db.select().from(teams).where(eq(teams.id, id));
    return team || undefined;
  }

  async getTeamBySlug(slug: string): Promise<Team | undefined> {
    const [team] = await db.select().from(teams).where(eq(teams.slug, slug));
    return team || undefined;
  }

  async createTeam(insertTeam: InsertTeam): Promise<Team> {
    const [team] = await db.insert(teams).values(insertTeam).returning();
    return team;
  }

  async getUserTeams(userId: number): Promise<(TeamMember & { team: Team })[]> {
    const result = await db
      .select()
      .from(teamMembers)
      .innerJoin(teams, eq(teamMembers.teamId, teams.id))
      .where(eq(teamMembers.userId, userId));
    
    return result.map(row => ({
      ...row.team_members,
      team: row.teams
    }));
  }

  async getTeamMember(userId: number, teamId: number): Promise<TeamMember | undefined> {
    const [member] = await db
      .select()
      .from(teamMembers)
      .where(and(eq(teamMembers.userId, userId), eq(teamMembers.teamId, teamId)));
    return member || undefined;
  }

  async createTeamMember(insertTeamMember: InsertTeamMember): Promise<TeamMember> {
    const [member] = await db.insert(teamMembers).values(insertTeamMember).returning();
    return member;
  }

  async getTeamMembers(teamId: number): Promise<(TeamMember & { user: User })[]> {
    const result = await db
      .select()
      .from(teamMembers)
      .innerJoin(users, eq(teamMembers.userId, users.id))
      .where(eq(teamMembers.teamId, teamId));
    
    return result.map(row => ({
      ...row.team_members,
      user: row.users
    }));
  }

  async removeTeamMember(userId: number, teamId: number): Promise<void> {
    await db.delete(teamMembers).where(
      and(eq(teamMembers.userId, userId), eq(teamMembers.teamId, teamId))
    );
  }

  async updateTeam(id: number, team: Partial<InsertTeam>): Promise<Team> {
    const [updatedTeam] = await db.update(teams).set(team).where(eq(teams.id, id)).returning();
    return updatedTeam;
  }

  async getService(id: number): Promise<Service | undefined> {
    const [service] = await db.select().from(services).where(eq(services.id, id));
    return service || undefined;
  }

  async getTeamServices(teamId: number): Promise<Service[]> {
    return await db.select().from(services).where(eq(services.teamId, teamId));
  }

  async createService(insertService: InsertService): Promise<Service> {
    const [service] = await db.insert(services).values(insertService).returning();
    return service;
  }

  async updateService(id: number, updateService: Partial<InsertService>): Promise<Service> {
    const [service] = await db.update(services).set(updateService).where(eq(services.id, id)).returning();
    return service;
  }

  async deleteService(id: number): Promise<void> {
    await db.delete(services).where(eq(services.id, id));
  }

  async getServiceMembers(serviceId: number): Promise<(ServiceMember & { user: User })[]> {
    const result = await db
      .select()
      .from(serviceMembers)
      .innerJoin(users, eq(serviceMembers.userId, users.id))
      .where(eq(serviceMembers.serviceId, serviceId))
      .orderBy(asc(serviceMembers.order));
    
    return result.map(row => ({
      ...row.service_members,
      user: row.users
    }));
  }

  async addServiceMember(insertServiceMember: InsertServiceMember): Promise<ServiceMember> {
    const [member] = await db.insert(serviceMembers).values(insertServiceMember).returning();
    return member;
  }

  async removeServiceMember(serviceId: number, userId: number): Promise<void> {
    await db.delete(serviceMembers).where(
      and(eq(serviceMembers.serviceId, serviceId), eq(serviceMembers.userId, userId))
    );
  }

  async updateServiceMemberOrder(id: number, order: number): Promise<ServiceMember> {
    const [member] = await db.update(serviceMembers).set({ order }).where(eq(serviceMembers.id, id)).returning();
    return member;
  }

  async getServiceLimit(serviceId: number): Promise<ServiceLimit | undefined> {
    const [limit] = await db.select().from(serviceLimits).where(eq(serviceLimits.serviceId, serviceId));
    return limit || undefined;
  }

  async createServiceLimit(insertLimit: InsertServiceLimit): Promise<ServiceLimit> {
    const [limit] = await db.insert(serviceLimits).values(insertLimit).returning();
    return limit;
  }

  async getBooking(id: number): Promise<Booking | undefined> {
    const [booking] = await db.select().from(bookings).where(eq(bookings.id, id));
    return booking || undefined;
  }

  async createBooking(insertBooking: InsertBooking): Promise<Booking> {
    // Generate a unique manage token for guest access
    const manageToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    
    const bookingData = {
      ...insertBooking,
      manageToken,
    };
    
    const [booking] = await db.insert(bookings).values(bookingData).returning();
    return booking;
  }

  async getTeamBookings(teamId: number): Promise<(Booking & { service: Service; assignedUser: User })[]> {
    const result = await db
      .select()
      .from(bookings)
      .innerJoin(services, eq(bookings.serviceId, services.id))
      .innerJoin(users, eq(bookings.assignedUserId, users.id))
      .where(eq(services.teamId, teamId))
      .orderBy(desc(bookings.start));
    
    return result.map(row => ({
      ...row.bookings,
      service: row.services,
      assignedUser: row.users
    }));
  }

  async getUserBookings(userId: number): Promise<Booking[]> {
    return await db.select().from(bookings).where(eq(bookings.userId, userId)).orderBy(desc(bookings.start));
  }

  async getBookingByToken(manageToken: string): Promise<Booking | undefined> {
    const [booking] = await db.select().from(bookings).where(eq(bookings.manageToken, manageToken));
    return booking || undefined;
  }

  async updateBookingStatus(id: number, status: 'SCHEDULED' | 'CANCELLED' | 'COMPLETED'): Promise<Booking> {
    const [booking] = await db.update(bookings).set({ status }).where(eq(bookings.id, id)).returning();
    return booking;
  }

  async rescheduleBooking(id: number, start: Date, end: Date): Promise<Booking> {
    const [booking] = await db.update(bookings)
      .set({ 
        start, 
        end, 
        status: 'SCHEDULED',
        rescheduleCount: sql`${bookings.rescheduleCount} + 1` 
      })
      .where(eq(bookings.id, id))
      .returning();
    return booking;
  }

  // Availability methods
  async getUserAvailability(userId: number, teamId: number): Promise<Availability[]> {
    return await db.select().from(availability).where(
      and(eq(availability.userId, userId), eq(availability.teamId, teamId))
    ).orderBy(asc(availability.dayOfWeek), asc(availability.startTime));
  }

  async createAvailability(insertAvailability: InsertAvailability): Promise<Availability> {
    const [newAvailability] = await db.insert(availability).values(insertAvailability).returning();
    return newAvailability;
  }

  async updateAvailability(id: number, updateAvailability: Partial<InsertAvailability>): Promise<Availability> {
    const [updated] = await db.update(availability).set(updateAvailability).where(eq(availability.id, id)).returning();
    return updated;
  }

  async deleteAvailability(id: number): Promise<void> {
    await db.delete(availability).where(eq(availability.id, id));
  }

  async bulkCreateAvailability(availabilities: InsertAvailability[]): Promise<Availability[]> {
    return await db.insert(availability).values(availabilities).returning();
  }

  // Holiday methods
  async getUserHolidays(userId: number, teamId: number): Promise<Holiday[]> {
    return await db.select().from(holidays).where(
      and(eq(holidays.userId, userId), eq(holidays.teamId, teamId))
    ).orderBy(asc(holidays.date));
  }

  async createHoliday(insertHoliday: InsertHoliday): Promise<Holiday> {
    const [newHoliday] = await db.insert(holidays).values(insertHoliday).returning();
    return newHoliday;
  }

  async updateHoliday(id: number, updateHoliday: Partial<InsertHoliday>): Promise<Holiday> {
    const [updated] = await db.update(holidays).set(updateHoliday).where(eq(holidays.id, id)).returning();
    return updated;
  }

  async deleteHoliday(id: number): Promise<void> {
    await db.delete(holidays).where(eq(holidays.id, id));
  }

  // API Keys
  async getApiKeys(userId: number, teamId: number): Promise<ApiKey[]> {
    return await db.select().from(apiKeys).where(
      and(eq(apiKeys.userId, userId), eq(apiKeys.teamId, teamId), eq(apiKeys.isActive, true))
    );
  }

  async createApiKey(insertApiKey: InsertApiKey): Promise<ApiKey> {
    const [apiKey] = await db.insert(apiKeys).values(insertApiKey).returning();
    return apiKey;
  }

  async getApiKeyByHash(keyHash: string): Promise<ApiKey | undefined> {
    const [apiKey] = await db.select().from(apiKeys).where(
      and(eq(apiKeys.keyHash, keyHash), eq(apiKeys.isActive, true))
    );
    return apiKey || undefined;
  }

  async deleteApiKey(id: number): Promise<void> {
    await db.update(apiKeys).set({ isActive: false }).where(eq(apiKeys.id, id));
  }

  async updateApiKeyLastUsed(id: number): Promise<void> {
    await db.update(apiKeys).set({ lastUsed: new Date() }).where(eq(apiKeys.id, id));
  }

  // Super Admin methods
  async getAllTeams(): Promise<Team[]> {
    return await db.select().from(teams).orderBy(asc(teams.name));
  }

  async getAllBookings(): Promise<(Booking & { service: Service; assignedUser: User; team: Team })[]> {
    return await db
      .select({
        id: bookings.id,
        serviceId: bookings.serviceId,
        assignedUserId: bookings.assignedUserId,
        start: bookings.start,
        end: bookings.end,
        status: bookings.status,
        guestEmail: bookings.guestEmail,
        guestName: bookings.guestName,
        manageToken: bookings.manageToken,
        createdAt: bookings.createdAt,
        service: {
          id: services.id,
          name: services.name,
          slug: services.slug,
          description: services.description,
          duration: services.duration,
          isActive: services.isActive,
          teamId: services.teamId,
          createdAt: services.createdAt,
        },
        assignedUser: {
          id: users.id,
          email: users.email,
          name: users.name,
          passwordHash: users.passwordHash,
          isActive: users.isActive,
          lastLogin: users.lastLogin,
          createdAt: users.createdAt,
        },
        team: {
          id: teams.id,
          name: teams.name,
          slug: teams.slug,
          createdAt: teams.createdAt,
        },
      })
      .from(bookings)
      .leftJoin(services, eq(bookings.serviceId, services.id))
      .leftJoin(users, eq(bookings.assignedUserId, users.id))
      .leftJoin(teams, eq(services.teamId, teams.id))
      .orderBy(desc(bookings.createdAt));
  }

  // Calendar Integration methods
  async getCalendarIntegrations(teamId: number): Promise<CalendarIntegration[]> {
    return await db
      .select()
      .from(calendarIntegrations)
      .where(eq(calendarIntegrations.teamId, teamId))
      .orderBy(desc(calendarIntegrations.createdAt));
  }

  async createCalendarIntegration(insertIntegration: InsertCalendarIntegration): Promise<CalendarIntegration> {
    const [integration] = await db
      .insert(calendarIntegrations)
      .values(insertIntegration)
      .returning();
    return integration;
  }

  async updateCalendarIntegration(id: number, teamId: number, updateData: Partial<InsertCalendarIntegration>): Promise<CalendarIntegration | undefined> {
    const [integration] = await db
      .update(calendarIntegrations)
      .set({ ...updateData, updatedAt: new Date() })
      .where(and(eq(calendarIntegrations.id, id), eq(calendarIntegrations.teamId, teamId)))
      .returning();
    return integration || undefined;
  }

  async deleteCalendarIntegration(id: number, teamId: number): Promise<boolean> {
    const result = await db
      .delete(calendarIntegrations)
      .where(and(eq(calendarIntegrations.id, id), eq(calendarIntegrations.teamId, teamId)));
    return result.rowCount > 0;
  }
}

export const storage = new DatabaseStorage();
