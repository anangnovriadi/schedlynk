# Scheduler-Lite API Documentation

## Overview

Scheduler-Lite provides a comprehensive REST API for managing multi-team scheduling operations. The API supports role-based access control with three levels: Super Admin, Admin, and Team Member. All endpoints return JSON responses and follow RESTful conventions.

**Base URL**: `https://sociolisten.com` (Production) | `http://localhost:5000` (Development)

## Authentication

### Authentication Methods

1. **JWT Bearer Token** (Primary method for authenticated endpoints)
2. **API Keys** (For external integrations)
3. **Public Access** (For customer booking endpoints)

### JWT Authentication
Include the JWT token in the Authorization header:
```
Authorization: Bearer YOUR_JWT_TOKEN
```

### API Key Authentication
Include the API key in the header:
```
X-API-Key: YOUR_API_KEY
```

### Team Context
For team-specific operations, include the team ID in the header:
```
X-Team-Id: TEAM_ID
```

## Rate Limits

- **Authentication endpoints**: 5 requests per 15 minutes
- **Public API**: 60 requests per hour
- **API Key endpoints**: 1000 requests per hour
- **Authenticated endpoints**: 100 requests per minute

## Response Format

### Success Response
```json
{
  "data": { ... },
  "message": "Success message"
}
```

### Error Response
```json
{
  "error": "error_code",
  "message": "Human-readable error message",
  "details": { ... }
}
```

## Authentication Endpoints

### Register Super Admin
Create the first super admin account for the system.

**Endpoint**: `POST /api/auth/register-super-admin`
**Authentication**: None (public, one-time use)

**Request Body**:
```json
{
  "email": "admin@example.com",
  "password": "securePassword123",
  "name": "Admin Name"
}
```

**Response**:
```json
{
  "user": {
    "id": 1,
    "email": "admin@example.com",
    "name": "Admin Name",
    "role": "SUPER_ADMIN"
  },
  "token": "jwt_token_here"
}
```

### Login
Authenticate user and receive JWT token.

**Endpoint**: `POST /api/auth/login`
**Authentication**: None

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response**:
```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "User Name"
  },
  "token": "jwt_token_here"
}
```

### Forgot Password
Request password reset email.

**Endpoint**: `POST /api/auth/forgot-password`
**Authentication**: None

**Request Body**:
```json
{
  "email": "user@example.com"
}
```

**Response**:
```json
{
  "message": "Password reset email sent"
}
```

### Reset Password
Reset password using token from email.

**Endpoint**: `POST /api/auth/reset-password`
**Authentication**: None

**Request Body**:
```json
{
  "token": "reset_token_from_email",
  "password": "newPassword123"
}
```

**Response**:
```json
{
  "message": "Password reset successful"
}
```

## User Management

### Get User Teams
Retrieve teams associated with the authenticated user.

**Endpoint**: `GET /api/user/teams`
**Authentication**: JWT Required

**Response**:
```json
[
  {
    "id": 1,
    "name": "Development Team",
    "slug": "dev-team",
    "role": "ADMIN",
    "memberCount": 5
  }
]
```

### Get User Bookings
Retrieve bookings for the authenticated user across all teams.

**Endpoint**: `GET /api/user/bookings`
**Authentication**: JWT Required

**Response**:
```json
[
  {
    "id": 1,
    "serviceId": 1,
    "service": {
      "name": "Consultation",
      "duration": 60
    },
    "start": "2025-07-18T10:00:00Z",
    "end": "2025-07-18T11:00:00Z",
    "status": "SCHEDULED",
    "guestName": "John Doe",
    "guestEmail": "john@example.com"
  }
]
```

## Team Management

### Create Team
Create a new team (Super Admin only).

**Endpoint**: `POST /api/teams`
**Authentication**: JWT Required (Super Admin)

**Request Body**:
```json
{
  "name": "New Team",
  "description": "Team description"
}
```

**Response**:
```json
{
  "id": 2,
  "name": "New Team",
  "slug": "new-team",
  "description": "Team description",
  "createdAt": "2025-07-18T10:00:00Z"
}
```

### Get Team Details
Retrieve detailed information about a specific team.

**Endpoint**: `GET /api/teams/:teamId`
**Authentication**: JWT Required
**Headers**: `X-Team-Id: TEAM_ID`

**Response**:
```json
{
  "id": 1,
  "name": "Development Team",
  "slug": "dev-team",
  "description": "Main development team",
  "memberCount": 5,
  "serviceCount": 3,
  "settings": {
    "timezone": "UTC",
    "workingHours": {
      "start": "09:00",
      "end": "17:00"
    }
  }
}
```

### Update Team
Update team information (Admin only).

**Endpoint**: `PUT /api/teams/:teamId`
**Authentication**: JWT Required (Admin)
**Headers**: `X-Team-Id: TEAM_ID`

**Request Body**:
```json
{
  "name": "Updated Team Name",
  "description": "Updated description"
}
```

### Get Team Statistics
Retrieve team statistics for dashboard.

**Endpoint**: `GET /api/teams/:teamId/stats`
**Authentication**: JWT Required
**Headers**: `X-Team-Id: TEAM_ID`

**Response**:
```json
{
  "todayBookings": 5,
  "activeServices": 3,
  "totalMembers": 8,
  "pendingBookings": 2,
  "completedBookings": 45,
  "revenue": 12500
}
```

## Team Member Management

### Get Team Members
Retrieve all members of a team.

**Endpoint**: `GET /api/teams/:teamId/members`
**Authentication**: JWT Required
**Headers**: `X-Team-Id: TEAM_ID`

**Response**:
```json
[
  {
    "id": 1,
    "userId": 1,
    "user": {
      "name": "John Doe",
      "email": "john@example.com"
    },
    "role": "ADMIN",
    "joinedAt": "2025-01-01T00:00:00Z"
  }
]
```

### Add Team Member
Add a new member to the team (Admin only).

**Endpoint**: `POST /api/teams/:teamId/members`
**Authentication**: JWT Required (Admin)
**Headers**: `X-Team-Id: TEAM_ID`

**Request Body**:
```json
{
  "email": "newmember@example.com",
  "name": "New Member",
  "password": "temporaryPassword123",
  "role": "MEMBER"
}
```

**Response**:
```json
{
  "id": 2,
  "userId": 2,
  "user": {
    "name": "New Member",
    "email": "newmember@example.com"
  },
  "role": "MEMBER",
  "joinedAt": "2025-07-18T10:00:00Z"
}
```

### Remove Team Member
Remove a member from the team (Admin only).

**Endpoint**: `DELETE /api/teams/:teamId/members/:userId`
**Authentication**: JWT Required (Admin)
**Headers**: `X-Team-Id: TEAM_ID`

**Response**:
```json
{
  "message": "Member removed successfully"
}
```

## Service Management

### Get Team Services
Retrieve all services for a team.

**Endpoint**: `GET /api/teams/:teamId/services`
**Authentication**: JWT Required
**Headers**: `X-Team-Id: TEAM_ID`

**Response**:
```json
[
  {
    "id": 1,
    "name": "Consultation",
    "slug": "consultation",
    "description": "1-on-1 consultation session",
    "duration": 60,
    "isActive": true,
    "members": [
      {
        "id": 1,
        "name": "John Doe",
        "email": "john@example.com"
      }
    ]
  }
]
```

### Create Service
Create a new service (Admin only).

**Endpoint**: `POST /api/teams/:teamId/services`
**Authentication**: JWT Required (Admin)
**Headers**: `X-Team-Id: TEAM_ID`

**Request Body**:
```json
{
  "name": "New Service",
  "description": "Service description",
  "duration": 30,
  "memberIds": [1, 2]
}
```

**Response**:
```json
{
  "id": 2,
  "name": "New Service",
  "slug": "new-service",
  "description": "Service description",
  "duration": 30,
  "isActive": true,
  "createdAt": "2025-07-18T10:00:00Z"
}
```

### Update Service
Update service information (Admin only).

**Endpoint**: `PUT /api/teams/:teamId/services/:serviceId`
**Authentication**: JWT Required (Admin)
**Headers**: `X-Team-Id: TEAM_ID`

**Request Body**:
```json
{
  "name": "Updated Service",
  "description": "Updated description",
  "duration": 45,
  "isActive": true,
  "memberIds": [1, 2, 3]
}
```

### Delete Service
Delete a service (Admin only).

**Endpoint**: `DELETE /api/teams/:teamId/services/:serviceId`
**Authentication**: JWT Required (Admin)
**Headers**: `X-Team-Id: TEAM_ID`

**Response**:
```json
{
  "message": "Service deleted successfully"
}
```

## Booking Management

### Get Team Bookings
Retrieve all bookings for a team.

**Endpoint**: `GET /api/teams/:teamId/bookings`
**Authentication**: JWT Required
**Headers**: `X-Team-Id: TEAM_ID`

**Query Parameters**:
- `status`: Filter by status (SCHEDULED, COMPLETED, CANCELLED)
- `serviceId`: Filter by service ID
- `startDate`: Filter bookings from date (ISO 8601)
- `endDate`: Filter bookings to date (ISO 8601)

**Response**:
```json
[
  {
    "id": 1,
    "serviceId": 1,
    "service": {
      "name": "Consultation",
      "duration": 60
    },
    "assignedUserId": 1,
    "assignedUser": {
      "name": "John Doe",
      "email": "john@example.com"
    },
    "start": "2025-07-18T10:00:00Z",
    "end": "2025-07-18T11:00:00Z",
    "status": "SCHEDULED",
    "guestName": "Jane Smith",
    "guestEmail": "jane@example.com",
    "guestPhone": "+1234567890",
    "notes": "Initial consultation",
    "token": "booking_token_123",
    "createdAt": "2025-07-17T10:00:00Z"
  }
]
```

### Create Internal Booking
Create a booking internally (for team members).

**Endpoint**: `POST /api/teams/:teamId/bookings`
**Authentication**: JWT Required
**Headers**: `X-Team-Id: TEAM_ID`

**Request Body**:
```json
{
  "serviceId": 1,
  "start": "2025-07-18T10:00:00Z",
  "guestName": "Jane Smith",
  "guestEmail": "jane@example.com",
  "guestPhone": "+1234567890",
  "notes": "Internal booking"
}
```

### Reschedule Booking
Reschedule an existing booking (Admin only).

**Endpoint**: `PUT /api/teams/:teamId/bookings/:bookingId/reschedule`
**Authentication**: JWT Required (Admin)
**Headers**: `X-Team-Id: TEAM_ID`

**Request Body**:
```json
{
  "start": "2025-07-18T14:00:00Z",
  "reason": "Customer request"
}
```

### Cancel Booking
Cancel a booking (Admin only).

**Endpoint**: `PUT /api/teams/:teamId/bookings/:bookingId/cancel`
**Authentication**: JWT Required (Admin)
**Headers**: `X-Team-Id: TEAM_ID`

**Request Body**:
```json
{
  "reason": "Customer cancellation"
}
```

### Complete Booking
Mark a booking as completed (Admin only).

**Endpoint**: `PUT /api/teams/:teamId/bookings/:bookingId/complete`
**Authentication**: JWT Required (Admin)
**Headers**: `X-Team-Id: TEAM_ID`

**Request Body**:
```json
{
  "notes": "Session completed successfully"
}
```

### Sync Booking to Calendar
Manually sync a booking to external calendar.

**Endpoint**: `POST /api/teams/:teamId/bookings/:bookingId/sync-calendar`
**Authentication**: JWT Required (Admin)
**Headers**: `X-Team-Id: TEAM_ID`

**Response**:
```json
{
  "message": "Booking synced to calendar successfully",
  "calendarEventId": "google_calendar_event_id"
}
```

## Public Booking API

These endpoints are publicly accessible and don't require authentication.

### Get Public Team Information
Retrieve public information about a team.

**Endpoint**: `GET /api/public/teams/:teamSlug`
**Authentication**: None

**Response**:
```json
{
  "id": 1,
  "name": "Development Team",
  "slug": "dev-team",
  "description": "Professional development services",
  "timezone": "UTC"
}
```

### Get Public Services
Retrieve publicly bookable services for a team.

**Endpoint**: `GET /api/public/teams/:teamSlug/services`
**Authentication**: None

**Response**:
```json
[
  {
    "id": 1,
    "name": "Consultation",
    "slug": "consultation",
    "description": "1-on-1 consultation session",
    "duration": 60,
    "isActive": true
  }
]
```

### Get Service Availability
Get available time slots for a service.

**Endpoint**: `GET /api/public/teams/:teamSlug/services/:serviceSlug/availability`
**Authentication**: None

**Query Parameters**:
- `date`: Date to check availability (YYYY-MM-DD)
- `timezone`: Client timezone (optional)

**Response**:
```json
{
  "date": "2025-07-18",
  "availableSlots": [
    {
      "start": "2025-07-18T09:00:00Z",
      "end": "2025-07-18T10:00:00Z",
      "assignedUserId": 1,
      "assignedUserName": "John Doe"
    },
    {
      "start": "2025-07-18T11:00:00Z",
      "end": "2025-07-18T12:00:00Z",
      "assignedUserId": 2,
      "assignedUserName": "Jane Doe"
    }
  ]
}
```

### Create Public Booking
Book a service publicly (for customers).

**Endpoint**: `POST /api/public/teams/:teamSlug/services/:serviceSlug/book`
**Authentication**: None

**Request Body**:
```json
{
  "start": "2025-07-18T10:00:00Z",
  "guestName": "Customer Name",
  "guestEmail": "customer@example.com",
  "guestPhone": "+1234567890",
  "notes": "Looking forward to the session"
}
```

**Response**:
```json
{
  "id": 1,
  "token": "booking_token_abc123",
  "start": "2025-07-18T10:00:00Z",
  "end": "2025-07-18T11:00:00Z",
  "status": "SCHEDULED",
  "guestName": "Customer Name",
  "guestEmail": "customer@example.com",
  "service": {
    "name": "Consultation",
    "duration": 60
  },
  "assignedUser": {
    "name": "John Doe"
  },
  "message": "Booking confirmed successfully"
}
```

### Get Booking by Token
Retrieve booking details using public token.

**Endpoint**: `GET /api/public/bookings/:token`
**Authentication**: None

**Response**:
```json
{
  "id": 1,
  "start": "2025-07-18T10:00:00Z",
  "end": "2025-07-18T11:00:00Z",
  "status": "SCHEDULED",
  "guestName": "Customer Name",
  "guestEmail": "customer@example.com",
  "service": {
    "name": "Consultation",
    "duration": 60
  },
  "assignedUser": {
    "name": "John Doe"
  },
  "team": {
    "name": "Development Team"
  }
}
```

### Cancel Public Booking
Cancel a booking using public token.

**Endpoint**: `PUT /api/public/bookings/:token/cancel`
**Authentication**: None

**Request Body**:
```json
{
  "reason": "Schedule conflict"
}
```

**Response**:
```json
{
  "message": "Booking cancelled successfully",
  "booking": {
    "id": 1,
    "status": "CANCELLED",
    "cancelledAt": "2025-07-18T10:00:00Z"
  }
}
```

## API Key Management

### Get Team API Keys
Retrieve API keys for a team (Admin only).

**Endpoint**: `GET /api/teams/:teamId/api-keys`
**Authentication**: JWT Required (Admin)
**Headers**: `X-Team-Id: TEAM_ID`

**Response**:
```json
[
  {
    "id": 1,
    "name": "External Integration",
    "keyHash": "ak_*********************",
    "lastUsedAt": "2025-07-18T10:00:00Z",
    "createdAt": "2025-07-01T00:00:00Z"
  }
]
```

### Create API Key
Generate a new API key (Admin only).

**Endpoint**: `POST /api/teams/:teamId/api-keys`
**Authentication**: JWT Required (Admin)
**Headers**: `X-Team-Id: TEAM_ID`

**Request Body**:
```json
{
  "name": "Integration Name"
}
```

**Response**:
```json
{
  "id": 2,
  "name": "Integration Name",
  "key": "ak_live_1234567890abcdef",
  "keyHash": "ak_*********************",
  "createdAt": "2025-07-18T10:00:00Z",
  "message": "API key created successfully. Store this key securely - it won't be shown again."
}
```

### Delete API Key
Delete an API key (Admin only).

**Endpoint**: `DELETE /api/teams/:teamId/api-keys/:keyId`
**Authentication**: JWT Required (Admin)
**Headers**: `X-Team-Id: TEAM_ID`

**Response**:
```json
{
  "message": "API key deleted successfully"
}
```

## Super Admin Endpoints

These endpoints are only accessible to Super Admin users.

### Get All Teams
Retrieve all teams in the system.

**Endpoint**: `GET /api/admin/teams`
**Authentication**: JWT Required (Super Admin)

**Response**:
```json
[
  {
    "id": 1,
    "name": "Development Team",
    "slug": "dev-team",
    "memberCount": 5,
    "serviceCount": 3,
    "bookingCount": 25,
    "createdAt": "2025-01-01T00:00:00Z"
  }
]
```

### Get All Bookings
Retrieve all bookings across all teams.

**Endpoint**: `GET /api/admin/bookings`
**Authentication**: JWT Required (Super Admin)

**Query Parameters**:
- `status`: Filter by status
- `teamId`: Filter by team
- `startDate`: Filter from date
- `endDate`: Filter to date

**Response**:
```json
[
  {
    "id": 1,
    "start": "2025-07-18T10:00:00Z",
    "end": "2025-07-18T11:00:00Z",
    "status": "SCHEDULED",
    "guestName": "Customer Name",
    "service": {
      "name": "Consultation"
    },
    "team": {
      "name": "Development Team"
    },
    "assignedUser": {
      "name": "John Doe"
    }
  }
]
```

## Calendar Integration

### Get Calendar Integrations
Retrieve calendar integrations for a team.

**Endpoint**: `GET /api/teams/:teamId/calendar-integrations`
**Authentication**: JWT Required
**Headers**: `X-Team-Id: TEAM_ID`

**Response**:
```json
[
  {
    "id": 1,
    "type": "google",
    "name": "Google Calendar",
    "externalCalendarId": "primary",
    "syncDirection": "both",
    "autoSync": true,
    "syncStatus": "active",
    "lastSyncAt": "2025-07-18T10:00:00Z"
  }
]
```

### Create Calendar Integration
Start calendar integration flow.

**Endpoint**: `POST /api/teams/:teamId/calendar-integrations`
**Authentication**: JWT Required
**Headers**: `X-Team-Id: TEAM_ID`

**Request Body**:
```json
{
  "type": "google",
  "name": "My Google Calendar"
}
```

**Response**:
```json
{
  "authUrl": "https://accounts.google.com/oauth/authorize?...",
  "message": "Redirect to authUrl to complete integration"
}
```

### Update Calendar Integration
Update integration settings.

**Endpoint**: `PUT /api/teams/:teamId/calendar-integrations/:integrationId`
**Authentication**: JWT Required
**Headers**: `X-Team-Id: TEAM_ID`

**Request Body**:
```json
{
  "name": "Updated Calendar Name",
  "syncDirection": "incoming",
  "autoSync": false,
  "syncInterval": 30
}
```

### Delete Calendar Integration
Remove a calendar integration.

**Endpoint**: `DELETE /api/teams/:teamId/calendar-integrations/:integrationId`
**Authentication**: JWT Required
**Headers**: `X-Team-Id: TEAM_ID`

**Response**:
```json
{
  "message": "Calendar integration deleted successfully"
}
```

## Google Calendar OAuth

### Initiate Google OAuth
Start Google Calendar authorization flow.

**Endpoint**: `GET /api/auth/google/initiate`
**Authentication**: JWT Required

**Query Parameters**:
- `team_id`: Team ID for the integration

**Response**:
```json
{
  "authUrl": "https://accounts.google.com/oauth/authorize?..."
}
```

### Google OAuth Callback
Handle Google OAuth callback (called by Google).

**Endpoint**: `GET /auth/google/callback`
**Authentication**: None (callback from Google)

**Query Parameters**:
- `code`: Authorization code from Google
- `state`: State parameter containing team and user info
- `error`: Error from Google (if any)

**Response**: Redirects to `/calendar-settings` with success or error parameters.

## Health Check Endpoints

### Basic Health Check
Simple health check for load balancers.

**Endpoint**: `GET /health`
**Authentication**: None

**Response**:
```json
{
  "status": "ok",
  "timestamp": "2025-07-18T10:00:00Z"
}
```

### Detailed Health Check
Comprehensive health check including database.

**Endpoint**: `GET /health/detailed`
**Authentication**: None

**Response**:
```json
{
  "status": "ok",
  "timestamp": "2025-07-18T10:00:00Z",
  "database": "connected",
  "uptime": 3600,
  "version": "1.0.0",
  "environment": "production"
}
```

### Readiness Check
Check if application is ready to receive traffic.

**Endpoint**: `GET /health/ready`
**Authentication**: None

**Response**:
```json
{
  "ready": true,
  "services": {
    "database": "ready",
    "email": "ready",
    "calendar": "ready"
  }
}
```

### Liveness Check
Check if application is alive (for Kubernetes).

**Endpoint**: `GET /health/live`
**Authentication**: None

**Response**:
```json
{
  "alive": true,
  "timestamp": "2025-07-18T10:00:00Z"
}
```

## Error Codes

### Authentication Errors
- `invalid_token`: JWT token is invalid or expired
- `insufficient_permissions`: User lacks required permissions
- `invalid_credentials`: Login credentials are incorrect
- `user_not_found`: User account doesn't exist
- `account_locked`: Account has been temporarily locked

### Validation Errors
- `validation_failed`: Request data validation failed
- `required_field_missing`: Required field is missing
- `invalid_format`: Data format is incorrect
- `duplicate_entry`: Attempting to create duplicate resource

### Business Logic Errors
- `team_not_found`: Specified team doesn't exist
- `service_not_found`: Specified service doesn't exist
- `booking_not_found`: Specified booking doesn't exist
- `slot_unavailable`: Requested time slot is not available
- `booking_conflict`: Booking conflicts with existing appointment

### System Errors
- `database_error`: Database operation failed
- `email_service_error`: Email sending failed
- `calendar_sync_error`: Calendar synchronization failed
- `rate_limit_exceeded`: Too many requests from client

## SDKs and Integration Examples

### JavaScript/Node.js Example
```javascript
const API_BASE = 'https://sociolisten.com';
const API_KEY = 'your_api_key';

// Create a booking
async function createBooking(teamSlug, serviceSlug, bookingData) {
  const response = await fetch(`${API_BASE}/api/public/teams/${teamSlug}/services/${serviceSlug}/book`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY
    },
    body: JSON.stringify(bookingData)
  });
  
  return response.json();
}

// Get availability
async function getAvailability(teamSlug, serviceSlug, date) {
  const response = await fetch(`${API_BASE}/api/public/teams/${teamSlug}/services/${serviceSlug}/availability?date=${date}`, {
    headers: {
      'X-API-Key': API_KEY
    }
  });
  
  return response.json();
}
```

### Python Example
```python
import requests

API_BASE = 'https://sociolisten.com'
API_KEY = 'your_api_key'

class SchedulerLiteAPI:
    def __init__(self, api_key):
        self.api_key = api_key
        self.base_url = API_BASE
        
    def create_booking(self, team_slug, service_slug, booking_data):
        url = f"{self.base_url}/api/public/teams/{team_slug}/services/{service_slug}/book"
        headers = {
            'Content-Type': 'application/json',
            'X-API-Key': self.api_key
        }
        response = requests.post(url, json=booking_data, headers=headers)
        return response.json()
        
    def get_availability(self, team_slug, service_slug, date):
        url = f"{self.base_url}/api/public/teams/{team_slug}/services/{service_slug}/availability"
        params = {'date': date}
        headers = {'X-API-Key': self.api_key}
        response = requests.get(url, params=params, headers=headers)
        return response.json()
```

### cURL Examples
```bash
# Create a public booking
curl -X POST "https://sociolisten.com/api/public/teams/dev-team/services/consultation/book" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_api_key" \
  -d '{
    "start": "2025-07-18T10:00:00Z",
    "guestName": "John Doe",
    "guestEmail": "john@example.com",
    "guestPhone": "+1234567890",
    "notes": "Initial consultation"
  }'

# Get service availability
curl -X GET "https://sociolisten.com/api/public/teams/dev-team/services/consultation/availability?date=2025-07-18" \
  -H "X-API-Key: your_api_key"

# Get booking details
curl -X GET "https://sociolisten.com/api/public/bookings/booking_token_123" \
  -H "X-API-Key: your_api_key"
```

## Webhooks

Scheduler-Lite can send webhook notifications for important events.

### Webhook Events
- `booking.created`: New booking created
- `booking.updated`: Booking rescheduled or modified
- `booking.cancelled`: Booking cancelled
- `booking.completed`: Booking marked as completed
- `service.created`: New service created
- `service.updated`: Service modified
- `team.member.added`: New team member added

### Webhook Payload Example
```json
{
  "event": "booking.created",
  "timestamp": "2025-07-18T10:00:00Z",
  "data": {
    "booking": {
      "id": 1,
      "start": "2025-07-18T14:00:00Z",
      "end": "2025-07-18T15:00:00Z",
      "status": "SCHEDULED",
      "guestName": "John Doe",
      "guestEmail": "john@example.com",
      "service": {
        "name": "Consultation",
        "duration": 60
      },
      "team": {
        "name": "Development Team",
        "slug": "dev-team"
      }
    }
  }
}
```

## Support and Resources

- **Documentation**: This document
- **Support Email**: [Contact through the application]
- **Status Page**: Check application health endpoints
- **API Testing**: Use the interactive API documentation at `/admin/swagger` (Super Admin access required)

---

*Last updated: July 18, 2025*
*API Version: 1.0*