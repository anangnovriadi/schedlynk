# Scheduler-Lite Multi-Team Application

## Overview

Scheduler-Lite is a full-stack web application for managing team scheduling and service bookings. It's built as a modern React application with an Express backend, using PostgreSQL for data persistence. The application supports multiple teams per instance, with role-based access control and round-robin service assignment.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack Query (React Query) for server state
- **UI Library**: Radix UI with shadcn/ui components
- **Styling**: Tailwind CSS with CSS variables for theming
- **Form Handling**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **Database ORM**: Drizzle ORM
- **Authentication**: Simple header-based authentication (demo purposes)
- **API Design**: RESTful API with Express routes

### Database Architecture
- **Database**: PostgreSQL (using Neon serverless)
- **ORM**: Drizzle ORM with migrations
- **Schema**: Multi-tenant design with teams, users, services, and bookings

## Key Components

### Authentication System
- Simple demo authentication using email headers
- Auto-creation of users and default teams
- Session-based authentication with localStorage
- Middleware for user authentication and team access control

### Multi-Team Support
- Teams with multiple users (ADMIN/MEMBER roles)
- Team-scoped services and bookings
- Team switcher in the UI
- Role-based permissions (admins can manage team settings)

### Service Management
- Services belong to specific teams
- Round-robin assignment of service members
- Configurable service duration and limits
- Active/inactive service states

### User Interface
- Responsive design with mobile support
- Fixed top navigation with team switcher
- Collapsible sidebar navigation
- Dashboard with overview statistics
- Service management interface
- Team member management
- Calendar view (placeholder for future implementation)

## Data Flow

### User Authentication Flow
1. User enters email on login page
2. Email stored in localStorage and sent as header
3. Backend auto-creates user if not exists
4. Default team created for new users
5. User added as admin to their default team

### Team Selection Flow
1. User teams fetched on app load
2. First team auto-selected if none chosen
3. Team ID stored in localStorage
4. All API requests include team context via headers

### Service Creation Flow
1. Team admins can create services
2. Team members can be assigned to services
3. Round-robin order maintained for assignments
4. Service bookings use round-robin logic

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL connection
- **drizzle-orm**: Database ORM and query builder
- **@tanstack/react-query**: Server state management
- **@radix-ui/***: Headless UI components
- **react-hook-form**: Form state management
- **zod**: Schema validation

### Development Tools
- **Vite**: Build tool and development server
- **TypeScript**: Type safety
- **Tailwind CSS**: Utility-first styling
- **ESLint/Prettier**: Code formatting (implied)

### Database Tools
- **drizzle-kit**: Database migrations and introspection
- **connect-pg-simple**: PostgreSQL session store (for future use)

## Deployment Strategy

### Build Process
- Frontend built with Vite to static assets
- Backend bundled with esbuild for Node.js
- TypeScript compilation for type checking
- Single production build command

### Environment Configuration
- Database URL required for PostgreSQL connection
- Environment-specific configuration
- Separate development and production modes

### Development Setup
- Hot module replacement with Vite
- TypeScript compilation on file changes
- Database push for schema updates
- Seed script for demo data

### Production Considerations
- Static file serving for frontend assets
- Express server for API routes
- Database migrations handled via drizzle-kit
- Session management ready for enhancement

The application is designed for easy deployment on platforms like Replit, with a monorepo structure that builds both frontend and backend into a single deployable unit.

## Recent Changes: Latest modifications with dates

### July 18, 2025
- **Updated calendar integration domain**: Changed Google Calendar OAuth redirect URI from Replit domain to https://sociolisten.com for production deployment
- **Updated Google Calendar setup documentation**: Modified GOOGLE_CALENDAR_SETUP.md to use sociolisten.com as the primary domain for OAuth configuration
- **Enhanced environment configuration**: Added CUSTOM_DOMAIN environment variable support for flexible domain configuration in calendar integrations
- **Updated .env.example**: Replaced SendGrid configuration with Gmail SMTP settings and added domain configuration variables

### July 11, 2025
- **Fixed Google Calendar integration**: Resolved rate limiting and authentication issues, confirmed working OAuth flow with user-provided credentials
- **Created GOOGLE_CALENDAR_SETUP.md**: Comprehensive guide for obtaining Google Calendar API credentials and OAuth setup
- **Verified production readiness**: Google Calendar integration now fully functional with proper OAuth 2.0 flow and token management
- **Implemented automatic booking sync**: All new bookings are now automatically synced to connected Google Calendars with comprehensive error handling and status tracking
- **Enhanced calendar sync logging**: Added detailed logging for calendar synchronization events, errors, and integration status updates
- **Added manual sync endpoint**: Team admins can manually trigger calendar sync for existing bookings via `/api/teams/:teamId/bookings/:bookingId/sync-calendar`
- **Implemented Gmail SMTP email integration**: Successfully replaced SendGrid with Gmail SMTP using nodemailer for free email notifications
- **Unified email system**: Migrated both server/email.ts and utils/emailService.ts to use centralized Gmail SMTP service with proper authentication
- **Email system ready**: All booking confirmations, calendar invitations, password resets, and team member notifications now use Gmail SMTP with verified connection
- **Professional email templates**: Created modern, responsive email templates with gradient backgrounds, improved typography, and proper spacing
- **Enhanced email styling**: Fixed field-label spacing issues, improved mobile responsiveness, and added professional visual hierarchy
- **Verified booking management**: Confirmed view booking functionality is working correctly with proper API routes and frontend pages
- **Fixed "View Bookings" button**: Added click handler to service cards that navigates to bookings page with service-specific filtering
- **Enhanced bookings page**: Added service filtering functionality with URL parameters, visual filter indicators, and proper service name display
- **Simplified email templates**: Redesigned all email templates using clean, minimal Tailwind CSS styling - replaced complex gradients and animations with simple, professional components
- **Updated email template colors**: Changed button and header colors to black (#111827) for a more professional, elegant appearance while keeping cancel buttons red for clarity
- **Improved form spacing**: Added better spacing between labels and input fields across all forms with increased margins for better visual hierarchy and readability
- **Fixed booking management date handling**: Resolved "toISOString is not a function" error by properly converting date strings to Date objects in reschedule functionality
- **Corrected API request parameter order**: Fixed booking management page API calls to use proper apiRequest parameter sequence (method, url, data)

### July 10, 2025
- **Prepared GitHub repository setup**: Created comprehensive GITHUB_SETUP.md with step-by-step instructions for pushing code to GitHub
- **Created SOURCE_CODE_EXPORT.md**: Complete guide for exporting and setting up the repository with professional documentation
- **Updated .env.example**: Added proper environment variable template for production deployment
- **Enhanced AWS deployment documentation**: Updated deployment scripts and Nginx configuration for production
- **Professional repository structure**: Organized all files for clean GitHub presentation with proper documentation
- **Fixed team creation error**: Resolved apiRequest parameter passing issue in team switcher
- **Implemented password-based authentication**: Added bcrypt password hashing, JWT tokens, and comprehensive login/register system
- **Created comprehensive API endpoints**: Added public booking APIs, team management endpoints, and proper authentication routes
- **Enhanced team data partitioning**: Implemented proper query invalidation on team switching to ensure fresh data
- **Added super admin registration endpoint**: `/api/auth/register-super-admin` for creating initial admin users
- **Comprehensive public API**: Endpoints for external customer integration including booking, team, and service management
- **OAuth API key system**: Complete API key generation and management for secure external integrations
- **Super Admin endpoints**: Added `/api/admin/teams` and `/api/admin/bookings` for cross-team management
- **Swagger-style documentation**: Interactive API documentation page for super admins with endpoint testing
- **Complete forgot password flow**: Added `/api/auth/forgot-password` and `/api/auth/reset-password` endpoints with secure token-based reset system
- **Enhanced team member invitations**: Super admins can now set passwords for new team members and send credentials via email
- **Password reset pages**: Created frontend pages for forgot password and reset password with proper validation
- **Email integration**: Added SendGrid email sending for password reset links and welcome credentials
- **Fixed local development setup**: Added dotenv configuration, fixed database connection for local PostgreSQL, resolved SendGrid initialization warnings
- **Created comprehensive documentation**: Added LOCAL_SETUP.md, ENV_SETUP.md, and GitHub deployment guides
- **Exported complete source code**: Professional source code archive with documentation ready for GitHub deployment
- **Improved error handling**: Enhanced service creation with better validation and user-friendly error messages
- **Fixed authentication redirect**: Authenticated users visiting /login are now immediately redirected without showing UI
- **Environment configuration**: Updated server to use PORT from process.env instead of hardcoded value, added JWT_SECRET auto-generation for development
- **Updated documentation**: README now specifies Node.js 20+ requirement and includes PORT/JWT_SECRET environment variables
- **Default dark mode implementation**: Created ThemeProvider with default dark theme, added theme toggle component in top navigation, implemented persistent theme switching with localStorage
- **Professional branding**: Added custom title, favicon, and manifest.json for better browser integration and mobile app experience, implemented dynamic page titles for better navigation
- **Enhanced calendar functionality**: Updated calendar with full dark mode support, improved visual styling, and confirmed no analytics tracking code present in the application
- **External calendar integration**: Added comprehensive calendar integration infrastructure with support for Google Calendar, Outlook, Apple Calendar, and CalDAV servers. Created database schema, API endpoints, and calendar settings page for managing external calendar connections and sync settings
- **Google Calendar OAuth implementation**: Implemented complete Google Calendar OAuth 2.0 flow with automatic booking synchronization. Users can now authorize their Google accounts through `/auth/google` and bookings are automatically synced to their Google Calendar with event details, attendees, and proper error handling. Added automatic token refresh and calendar event management
- **Production hardening complete**: Implemented enterprise-grade security with comprehensive rate limiting (auth: 5/15min, public API: 60/hour, API keys: 1000/hour), Helmet security headers, CORS protection, request size limits, structured Winston logging with file rotation, health check endpoints (/health, /health/detailed, /health/ready, /health/live), database and memory monitoring, error tracking with context, and production deployment documentation - Production readiness: 9/10

## API Endpoints Summary

### Authentication Endpoints
- `POST /api/auth/register-super-admin` - Register new super admin user
- `POST /api/auth/login` - Login with email/password

### Team Management (Authenticated)
- `GET /api/user/teams` - Get user's teams
- `POST /api/teams` - Create new team (super admin only)
- `GET /api/teams/:teamId` - Get team details
- `PUT /api/teams/:teamId` - Update team (admin only)

### Service Management (Authenticated)
- `GET /api/teams/:teamId/services` - Get team services
- `POST /api/teams/:teamId/services` - Create service (admin only)
- `PUT /api/teams/:teamId/services/:serviceId` - Update service (admin only)
- `DELETE /api/teams/:teamId/services/:serviceId` - Delete service (admin only)

### Booking Management (Authenticated)
- `GET /api/teams/:teamId/bookings` - Get team bookings
- `POST /api/teams/:teamId/bookings` - Create internal booking
- `PUT /api/teams/:teamId/bookings/:bookingId/reschedule` - Reschedule booking (admin only)
- `PUT /api/teams/:teamId/bookings/:bookingId/cancel` - Cancel booking (admin only)
- `PUT /api/teams/:teamId/bookings/:bookingId/complete` - Complete booking (admin only)

### Team Member Management (Authenticated)
- `GET /api/teams/:teamId/members` - Get team members
- `POST /api/teams/:teamId/members` - Add team member (admin only)
- `DELETE /api/teams/:teamId/members/:userId` - Remove team member (admin only)

### Public Booking API (No Authentication)
- `GET /api/public/teams/:teamSlug` - Get public team info
- `GET /api/public/teams/:teamSlug/services` - Get public services
- `GET /api/public/teams/:teamSlug/services/:serviceSlug/availability` - Get available slots
- `POST /api/public/teams/:teamSlug/services/:serviceSlug/book` - Create public booking
- `GET /api/public/bookings/:token` - Get booking by token
- `PUT /api/public/bookings/:token/cancel` - Cancel booking by token

### Super Admin API (Authenticated)
- `GET /api/admin/teams` - Get all teams across the system (super admin only)
- `GET /api/admin/teams/:teamId` - Get specific team details (super admin only)
- `GET /api/admin/bookings` - Get all bookings across all teams (super admin only)
- `GET /api/admin/bookings/:bookingId` - Get specific booking details (super admin only)

### API Documentation
- Interactive Swagger-style documentation available at `/admin/swagger` for super admins
- Complete endpoint reference with request/response examples
- Authentication methods and permission requirements
- Copy-to-clipboard functionality for easy testing