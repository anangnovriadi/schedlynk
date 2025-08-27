import { google } from 'googleapis';
import { storage } from './storage';
import { logError, logInfo } from './logger';

if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  throw new Error("GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set for Google Calendar integration");
}

const REDIRECT_URI = process.env.CUSTOM_DOMAIN 
  ? `https://${process.env.CUSTOM_DOMAIN}/auth/google/callback`
  : 'https://sociolisten.com/auth/google/callback';

export class GoogleCalendarService {
  private oauth2Client;

  constructor() {
    this.initializeOAuth2Client();
  }

  private initializeOAuth2Client() {
    // Force fresh credentials check
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    
    logInfo('Initializing OAuth2 Client with credentials', {
      clientIdPresent: !!clientId,
      clientIdPrefix: clientId ? clientId.substring(0, 20) + '...' : 'MISSING',
      clientSecretPresent: !!clientSecret,
      redirectUri: REDIRECT_URI
    });
    
    this.oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      REDIRECT_URI
    );
  }

  private ensureOAuth2Client() {
    // Reinitialize if credentials have changed
    this.initializeOAuth2Client();
  }

  generateAuthUrl(teamId: number, userId: number): string {
    this.ensureOAuth2Client(); // Refresh credentials
    
    const scopes = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events'
    ];

    const state = JSON.stringify({ teamId, userId });

    logInfo('Generating Google OAuth URL', {
      teamId,
      userId,
      redirectUri: REDIRECT_URI,
      scopes,
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecretPresent: !!process.env.GOOGLE_CLIENT_SECRET
    });

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      state: state,
      prompt: 'consent' // Forces consent screen to get refresh token
    });
  }

  async handleAuthCallback(code: string, state: string) {
    try {
      this.ensureOAuth2Client(); // Refresh credentials
      
      const { teamId, userId } = JSON.parse(state);
      
      logInfo('Processing Google OAuth callback', {
        hasCode: !!code,
        hasState: !!state,
        teamId,
        userId
      });
      
      // Exchange authorization code for tokens
      const { tokens } = await this.oauth2Client.getToken(code);
      
      logInfo('Tokens received from Google', {
        hasAccessToken: !!tokens.access_token,
        hasRefreshToken: !!tokens.refresh_token,
        expiryDate: tokens.expiry_date
      });
      
      if (!tokens.access_token) {
        throw new Error('No access token received from Google');
      }

      // Get user's calendar info
      this.oauth2Client.setCredentials(tokens);
      const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
      
      const calendarList = await calendar.calendarList.list();
      const primaryCalendar = calendarList.data.items?.find(cal => cal.primary);

      if (!primaryCalendar) {
        throw new Error('No primary calendar found');
      }

      // Store the integration
      const integration = await storage.createCalendarIntegration({
        userId,
        teamId,
        type: 'google',
        name: primaryCalendar.summary || 'Google Calendar',
        externalCalendarId: primaryCalendar.id || 'primary',
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || null,
        tokenExpiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        syncDirection: 'both',
        autoSync: true,
        syncInterval: 15,
        syncStatus: 'active'
      });

      logInfo('Google Calendar integration created', { 
        integrationId: integration.id, 
        userId, 
        teamId 
      });

      return {
        teamId,
        userId,
        integrationId: integration.id,
        integration
      };
    } catch (error) {
      logError(error as Error, { context: 'GoogleCalendarService.handleAuthCallback' });
      throw error;
    }
  }

  async refreshAccessToken(integration: any) {
    try {
      if (!integration.refreshToken) {
        throw new Error('No refresh token available');
      }

      this.oauth2Client.setCredentials({
        refresh_token: integration.refreshToken
      });

      const { credentials } = await this.oauth2Client.refreshAccessToken();
      
      if (!credentials.access_token) {
        throw new Error('Failed to refresh access token');
      }

      // Update the integration with new tokens
      await storage.updateCalendarIntegration(
        integration.id,
        integration.teamId,
        {
          accessToken: credentials.access_token,
          tokenExpiresAt: credentials.expiry_date ? new Date(credentials.expiry_date) : null,
          syncStatus: 'active',
          lastSyncError: null
        }
      );

      return credentials.access_token;
    } catch (error) {
      logError(error as Error, { 
        context: 'GoogleCalendarService.refreshAccessToken',
        integrationId: integration.id 
      });
      
      // Mark integration as having an error
      await storage.updateCalendarIntegration(
        integration.id,
        integration.teamId,
        {
          syncStatus: 'error',
          lastSyncError: (error as Error).message
        }
      );
      
      throw error;
    }
  }

  async syncBookingToCalendar(booking: any, integration: any) {
    try {
      let accessToken = integration.accessToken;

      if (integration.tokenExpiresAt && new Date() >= new Date(integration.tokenExpiresAt)) {
        accessToken = await this.refreshAccessToken(integration);
      }

      this.oauth2Client.setCredentials({
        access_token: accessToken
      });

      const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

      const event = {
        summary: `${booking.service?.name || 'Booking'} - ${booking.customerName}`,
        description: `Booking ID: ${booking.id}\nCustomer: ${booking.customerName}\nEmail: ${booking.customerEmail}\nPhone: ${booking.customerPhone || 'N/A'}`,
        start: {
          dateTime: booking.start.toISOString(),
        },
        end: {
          dateTime: booking.end.toISOString(),
        },
        attendees: [
          { email: booking.customerEmail },
          { email: booking.assignedUser?.email }
        ].filter(attendee => attendee.email),
        conferenceData: {
          createRequest: {
            requestId: `booking-${booking.id}-${Date.now()}`, // Unique ID for Google Meet link creation
            conferenceSolutionKey: {
              type: 'hangoutsMeet'
            }
          }
        }
      };

      const response = await calendar.events.insert({
        calendarId: integration.externalCalendarId || 'primary',
        requestBody: event,
        conferenceDataVersion: 1, // This enables Google Meet link creation
      });

      logInfo('Booking synced to Google Calendar with Meet link', {
        bookingId: booking.id,
        eventId: response.data.id,
        integrationId: integration.id,
        customerName: booking.customerName,
        serviceName: booking.service?.name,
        calendarId: integration.externalCalendarId || 'primary',
        meetLink: response.data.hangoutLink
      });

      await storage.updateCalendarIntegration(
        integration.id,
        integration.teamId,
        {
          syncStatus: 'active',
          lastSyncError: null
        }
      );

      return response.data.id;
    } catch (error) {
      logError(error as Error, {
        context: 'GoogleCalendarService.syncBookingToCalendar',
        bookingId: booking.id,
        integrationId: integration.id,
        customerName: booking.customerName,
        serviceName: booking.service?.name,
        errorMessage: (error as Error).message
      });

      await storage.updateCalendarIntegration(
        integration.id,
        integration.teamId,
        {
          syncStatus: 'error',
          lastSyncError: (error as Error).message
        }
      );

      throw error;
    }
  }

  async deleteCalendarEvent(eventId: string, integration: any) {
    try {
      // Get valid access token
      let accessToken = integration.accessToken;
      
      // Check if token needs refresh
      if (integration.tokenExpiresAt && new Date() >= new Date(integration.tokenExpiresAt)) {
        accessToken = await this.refreshAccessToken(integration);
      }

      this.oauth2Client.setCredentials({
        access_token: accessToken
      });

      const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

      await calendar.events.delete({
        calendarId: integration.externalCalendarId || 'primary',
        eventId: eventId,
      });

      logInfo('Calendar event deleted', {
        eventId,
        integrationId: integration.id
      });
    } catch (error) {
      logError(error as Error, {
        context: 'GoogleCalendarService.deleteCalendarEvent',
        eventId,
        integrationId: integration.id
      });
      throw error;
    }
  }
}

export const googleCalendarService = new GoogleCalendarService();