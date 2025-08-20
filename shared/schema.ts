import { pgTable, text, serial, integer, boolean, timestamp, pgEnum, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const teamRoleEnum = pgEnum('team_role', ['SUPER_ADMIN', 'ADMIN', 'MEMBER']);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  passwordHash: text("password_hash"),
  isActive: boolean("is_active").default(true).notNull(),
  lastLogin: timestamp("last_login"),
  resetToken: text("reset_token"),
  resetTokenExpiry: timestamp("reset_token_expiry"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const apiKeys = pgTable("api_keys", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  keyHash: text("key_hash").notNull().unique(),
  keyPrefix: text("key_prefix").notNull(),
  userId: integer("user_id").notNull().references(() => users.id),
  teamId: integer("team_id").notNull().references(() => teams.id),
  permissions: text("permissions").array().default([]).notNull(), // ['read', 'write', 'admin']
  lastUsed: timestamp("last_used"),
  expiresAt: timestamp("expires_at"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const teams = pgTable("teams", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  timezone: text("timezone").default('UTC').notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const teamMembers = pgTable("team_members", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  teamId: integer("team_id").notNull().references(() => teams.id),
  role: teamRoleEnum("role").default('MEMBER').notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const services = pgTable("services", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").notNull().references(() => teams.id),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  description: text("description").notNull(),
  duration: integer("duration").default(15).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  // Working hours as JSON string
  workingHours: text("working_hours").default('{"mon": {"start": "09:00", "end": "17:00"}, "tue": {"start": "09:00", "end": "17:00"}, "wed": {"start": "09:00", "end": "17:00"}, "thu": {"start": "09:00", "end": "17:00"}, "fri": {"start": "09:00", "end": "17:00"}}'),
  cancellationBuffer: integer("cancellation_buffer").default(24).notNull(), // hours
  rescheduleBuffer: integer("reschedule_buffer").default(2).notNull(), // hours
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  teamSlugIdx: uniqueIndex("team_service_slug_idx").on(table.teamId, table.slug),
}));

export const serviceMembers = pgTable("service_members", {
  id: serial("id").primaryKey(),
  serviceId: integer("service_id").notNull().references(() => services.id),
  userId: integer("user_id").notNull().references(() => users.id),
  order: integer("order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const serviceLimits = pgTable("service_limits", {
  id: serial("id").primaryKey(),
  serviceId: integer("service_id").notNull().references(() => services.id).unique(),
  maxPerDay: integer("max_per_day").notNull(),
  rollingWindowHours: integer("rolling_window_hours").notNull(),
});

export const bookingStatusEnum = pgEnum('booking_status', ['SCHEDULED', 'CANCELLED', 'COMPLETED']);

export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  serviceId: integer("service_id").notNull().references(() => services.id),
  userId: integer("user_id").references(() => users.id), // nullable for guest bookings
  assignedUserId: integer("assigned_user_id").notNull().references(() => users.id),
  start: timestamp("start").notNull(),
  end: timestamp("end").notNull(),
  status: bookingStatusEnum("status").default('SCHEDULED').notNull(),
  guestEmail: text("guest_email").notNull(),
  guestName: text("guest_name"),
  manageToken: text("manage_token").notNull().unique(),
  rescheduleCount: integer("reschedule_count").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const availability = pgTable("availability", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  teamId: integer("team_id").notNull().references(() => teams.id),
  dayOfWeek: integer("day_of_week").notNull(), // 0 = Sunday, 1 = Monday, etc.
  startTime: text("start_time").notNull(), // HH:MM format
  endTime: text("end_time").notNull(), // HH:MM format
  timezone: text("timezone").default('UTC').notNull(), // IANA timezone identifier
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const holidays = pgTable("holidays", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  teamId: integer("team_id").notNull().references(() => teams.id),
  date: text("date").notNull(),
  title: text("title").notNull(),
  isRecurring: boolean("is_recurring").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const calendarIntegrationTypeEnum = pgEnum('calendar_integration_type', ['google', 'outlook', 'apple', 'caldav']);
export const calendarSyncStatusEnum = pgEnum('calendar_sync_status', ['active', 'paused', 'error', 'pending']);

export const calendarIntegrations = pgTable("calendar_integrations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  teamId: integer("team_id").notNull().references(() => teams.id),
  type: calendarIntegrationTypeEnum("type").notNull(),
  name: text("name").notNull(), // User-friendly name
  isActive: boolean("is_active").default(true).notNull(),
  syncStatus: calendarSyncStatusEnum("sync_status").default('pending').notNull(),
  
  // External calendar settings
  externalCalendarId: text("external_calendar_id"), // Google/Outlook calendar ID
  accessToken: text("access_token"), // Encrypted access token
  refreshToken: text("refresh_token"), // Encrypted refresh token
  tokenExpiresAt: timestamp("token_expires_at"),
  
  // CalDAV settings
  caldavUrl: text("caldav_url"), // CalDAV server URL
  caldavUsername: text("caldav_username"), // CalDAV username
  caldavPassword: text("caldav_password"), // Encrypted CalDAV password
  
  // Sync settings
  syncDirection: text("sync_direction").default('both').notNull(), // 'both', 'to_external', 'from_external'
  autoSync: boolean("auto_sync").default(true).notNull(),
  syncInterval: integer("sync_interval").default(15).notNull(), // minutes
  
  // Error handling
  lastSyncAt: timestamp("last_sync_at"),
  lastSyncError: text("last_sync_error"),
  retryCount: integer("retry_count").default(0).notNull(),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const calendarSyncEvents = pgTable("calendar_sync_events", {
  id: serial("id").primaryKey(),
  integrationId: integer("integration_id").notNull().references(() => calendarIntegrations.id),
  bookingId: integer("booking_id").references(() => bookings.id),
  externalEventId: text("external_event_id"), // ID in external calendar
  syncStatus: calendarSyncStatusEnum("sync_status").default('pending').notNull(),
  lastSyncAt: timestamp("last_sync_at"),
  syncError: text("sync_error"),
  eventData: text("event_data"), // JSON string of event data
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  teamMemberships: many(teamMembers),
  serviceAssignments: many(serviceMembers),
  bookings: many(bookings),
  assignedBookings: many(bookings, { relationName: "assigned_bookings" }),
  availability: many(availability),
  holidays: many(holidays),
  apiKeys: many(apiKeys),
  calendarIntegrations: many(calendarIntegrations),
}));

export const teamsRelations = relations(teams, ({ many }) => ({
  members: many(teamMembers),
  services: many(services),
  availability: many(availability),
  holidays: many(holidays),
  apiKeys: many(apiKeys),
  calendarIntegrations: many(calendarIntegrations),
}));

export const teamMembersRelations = relations(teamMembers, ({ one }) => ({
  user: one(users, {
    fields: [teamMembers.userId],
    references: [users.id],
  }),
  team: one(teams, {
    fields: [teamMembers.teamId],
    references: [teams.id],
  }),
}));

export const servicesRelations = relations(services, ({ one, many }) => ({
  team: one(teams, {
    fields: [services.teamId],
    references: [teams.id],
  }),
  members: many(serviceMembers),
  limits: one(serviceLimits),
  bookings: many(bookings),
}));

export const serviceMembersRelations = relations(serviceMembers, ({ one }) => ({
  service: one(services, {
    fields: [serviceMembers.serviceId],
    references: [services.id],
  }),
  user: one(users, {
    fields: [serviceMembers.userId],
    references: [users.id],
  }),
}));

export const serviceLimitsRelations = relations(serviceLimits, ({ one }) => ({
  service: one(services, {
    fields: [serviceLimits.serviceId],
    references: [services.id],
  }),
}));

export const bookingsRelations = relations(bookings, ({ one }) => ({
  service: one(services, {
    fields: [bookings.serviceId],
    references: [services.id],
  }),
  user: one(users, {
    fields: [bookings.userId],
    references: [users.id],
  }),
  assignedUser: one(users, {
    fields: [bookings.assignedUserId],
    references: [users.id],
    relationName: "assigned_bookings",
  }),
}));

export const availabilityRelations = relations(availability, ({ one }) => ({
  user: one(users, {
    fields: [availability.userId],
    references: [users.id],
  }),
  team: one(teams, {
    fields: [availability.teamId],
    references: [teams.id],
  }),
}));

export const holidaysRelations = relations(holidays, ({ one }) => ({
  user: one(users, {
    fields: [holidays.userId],
    references: [users.id],
  }),
  team: one(teams, {
    fields: [holidays.teamId],
    references: [teams.id],
  }),
}));

export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
  user: one(users, {
    fields: [apiKeys.userId],
    references: [users.id],
  }),
  team: one(teams, {
    fields: [apiKeys.teamId],
    references: [teams.id],
  }),
}));

export const calendarIntegrationsRelations = relations(calendarIntegrations, ({ one, many }) => ({
  user: one(users, {
    fields: [calendarIntegrations.userId],
    references: [users.id],
  }),
  team: one(teams, {
    fields: [calendarIntegrations.teamId],
    references: [teams.id],
  }),
  syncEvents: many(calendarSyncEvents),
}));

export const calendarSyncEventsRelations = relations(calendarSyncEvents, ({ one }) => ({
  integration: one(calendarIntegrations, {
    fields: [calendarSyncEvents.integrationId],
    references: [calendarIntegrations.id],
  }),
  booking: one(bookings, {
    fields: [calendarSyncEvents.bookingId],
    references: [bookings.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertTeamSchema = createInsertSchema(teams).omit({
  id: true,
  createdAt: true,
});

export const insertTeamMemberSchema = createInsertSchema(teamMembers).omit({
  id: true,
  createdAt: true,
});

export const insertServiceSchema = createInsertSchema(services).omit({
  id: true,
  createdAt: true,
});

export const insertServiceMemberSchema = createInsertSchema(serviceMembers).omit({
  id: true,
  createdAt: true,
});

export const insertServiceLimitSchema = createInsertSchema(serviceLimits).omit({
  id: true,
});

export const insertBookingSchema = createInsertSchema(bookings).omit({
  id: true,
  createdAt: true,
  manageToken: true, // auto-generated
});

export const insertAvailabilitySchema = createInsertSchema(availability).omit({
  id: true,
  createdAt: true,
});

export const insertHolidaySchema = createInsertSchema(holidays).omit({
  id: true,
  createdAt: true,
});

export const insertApiKeySchema = createInsertSchema(apiKeys).omit({
  id: true,
  createdAt: true,
  keyHash: true, // auto-generated
  keyPrefix: true, // auto-generated
});

export const insertCalendarIntegrationSchema = createInsertSchema(calendarIntegrations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCalendarSyncEventSchema = createInsertSchema(calendarSyncEvents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Team = typeof teams.$inferSelect;
export type InsertTeam = z.infer<typeof insertTeamSchema>;
export type TeamMember = typeof teamMembers.$inferSelect;
export type InsertTeamMember = z.infer<typeof insertTeamMemberSchema>;
export type Service = typeof services.$inferSelect;
export type InsertService = z.infer<typeof insertServiceSchema>;
export type ServiceMember = typeof serviceMembers.$inferSelect;
export type InsertServiceMember = z.infer<typeof insertServiceMemberSchema>;
export type ServiceLimit = typeof serviceLimits.$inferSelect;
export type InsertServiceLimit = z.infer<typeof insertServiceLimitSchema>;
export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Availability = typeof availability.$inferSelect;
export type InsertAvailability = z.infer<typeof insertAvailabilitySchema>;
export type Holiday = typeof holidays.$inferSelect;
export type InsertHoliday = z.infer<typeof insertHolidaySchema>;
export type ApiKey = typeof apiKeys.$inferSelect;
export type InsertApiKey = z.infer<typeof insertApiKeySchema>;
export type CalendarIntegration = typeof calendarIntegrations.$inferSelect;
export type InsertCalendarIntegration = z.infer<typeof insertCalendarIntegrationSchema>;
export type CalendarSyncEvent = typeof calendarSyncEvents.$inferSelect;
export type InsertCalendarSyncEvent = z.infer<typeof insertCalendarSyncEventSchema>;

export type TeamRole = 'SUPER_ADMIN' | 'ADMIN' | 'MEMBER';
export type CalendarIntegrationType = 'google' | 'outlook' | 'apple' | 'caldav';
export type CalendarSyncStatus = 'active' | 'paused' | 'error' | 'pending';
