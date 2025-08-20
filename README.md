# Scheduler-Lite

A comprehensive multi-team scheduling application with role-based access control, built with modern web technologies.

## 🚀 Features

- **Multi-team Support**: Manage multiple teams with separate services and bookings
- **Role-based Access Control**: Super Admin, Admin, and Member roles with different permissions
- **Service Management**: Create and manage bookable services with duration and member assignments
- **Public Booking API**: External integration for customer bookings
- **Responsive Design**: Mobile-first design that works on all devices
- **Dark Mode**: Full dark mode support throughout the application
- **Authentication**: Secure JWT-based authentication with password reset
- **Email Integration**: Gmail SMTP integration for notifications and password resets

## 🛠️ Technology Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for build tooling and development
- **Tailwind CSS** for styling
- **Radix UI** components (shadcn/ui)
- **TanStack Query** for state management
- **React Hook Form** with Zod validation
- **Wouter** for client-side routing

### Backend
- **Express.js** with TypeScript
- **Drizzle ORM** for database operations
- **PostgreSQL** (Neon serverless)
- **JWT** for authentication
- **bcrypt** for password hashing
- **Gmail SMTP** for email functionality

## 🏗️ Architecture

```
├── client/           # React frontend application
├── server/           # Express.js backend API
├── shared/           # Shared types and database schema
├── package.json      # Project dependencies
└── README.md         # This file
```

## 🚦 Getting Started

### Prerequisites
- **Node.js 20+** (Required for optimal performance)
- PostgreSQL database  
- Gmail account with App Password (optional, for email features)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/anangnov99/scheduler-lite.git
   cd scheduler-lite
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Configure your `.env` file:
   ```env
   DATABASE_URL=your_postgresql_connection_string
   
   # Gmail SMTP Configuration (Optional - for email features)
   GMAIL_USER=your-email@gmail.com
   GMAIL_APP_PASSWORD=your-gmail-app-password
   
   # Google Calendar Integration (Optional)
   GOOGLE_CLIENT_ID=your-google-oauth-client-id
   GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret
   
   # Server Configuration (Optional)
   PORT=5000  # Server port (defaults to 5000)
   JWT_SECRET=your_jwt_secret_key  # JWT signing key (auto-generated in dev)
   ```

4. **Set up the database**
   ```bash
   npm run db:push
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

The application will be available at `http://localhost:5000` (or your configured PORT)

## 📧 Email Configuration (Gmail SMTP)

To enable email notifications (booking confirmations, password resets, team invitations), set up Gmail SMTP:

### 1. Enable 2-Factor Authentication
- Go to your Google Account settings
- Navigate to "Security" → "2-Step Verification"
- Enable 2-factor authentication if not already enabled

### 2. Generate App Password
- In Google Account settings, go to "Security" → "App passwords"
- Select "Mail" and generate a new app password
- Copy the 16-character password (remove spaces)

### 3. Configure Environment Variables
```env
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-16-character-app-password
```

### 4. Test Email Configuration
- Use the "Test Email" feature in the application settings
- Check that emails are being sent successfully
- Verify emails arrive in recipient inboxes (check spam folder)

**Note**: Gmail SMTP is free and works immediately. The application will function without email configuration, but users won't receive notifications.

## 📱 Usage

### Super Admin Setup
1. Register the first super admin account at `/register-super-admin`
2. Log in with your credentials
3. Create teams and manage the entire system

### Team Management
- **Super Admins**: Can create teams, manage all teams and bookings
- **Team Admins**: Can manage their team's services, members, and bookings
- **Team Members**: Can view team information and manage their availability

### Public Booking
- External customers can book services via the public API
- No authentication required for public booking endpoints
- Booking management through secure tokens

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/register-super-admin` - Register super admin
- `POST /api/auth/login` - User login
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password

### Team Management
- `GET /api/user/teams` - Get user teams
- `POST /api/teams` - Create team (super admin only)
- `GET /api/teams/:teamId/members` - Get team members

### Service Management
- `GET /api/teams/:teamId/services` - Get team services
- `POST /api/teams/:teamId/services` - Create service
- `PUT /api/teams/:teamId/services/:serviceId` - Update service

### Public Booking API
- `GET /api/public/teams/:teamSlug` - Get public team info
- `POST /api/public/teams/:teamSlug/services/:serviceSlug/book` - Create booking
- `GET /api/public/bookings/:token` - Get booking details

## 🚀 Deployment

### Build for Production
```bash
npm run build
npm start
```

### Deploy to Platforms
- **Replit**: Connect your GitHub repo and deploy
- **Vercel**: Deploy frontend, connect backend separately
- **Railway/Heroku**: Deploy as Node.js application

### Environment Variables for Production
```env
NODE_ENV=production
DATABASE_URL=your_production_database_url
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-gmail-app-password
```

## 📁 Project Structure

```
scheduler-lite/
├── client/src/
│   ├── components/
│   │   ├── ui/              # Reusable UI components
│   │   ├── layout/          # Layout components
│   │   ├── services/        # Service management
│   │   └── team/            # Team management
│   ├── pages/               # Page components
│   ├── hooks/               # Custom React hooks
│   └── lib/                 # Utility functions
├── server/
│   ├── auth.ts              # Authentication utilities
│   ├── db.ts                # Database connection
│   ├── routes.ts            # API routes
│   └── storage.ts           # Data access layer
├── shared/
│   └── schema.ts            # Database schema and types
└── docs/                    # Additional documentation
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is proprietary software. All rights reserved.

## 🆘 Support

For support and questions:
- Create an issue in this repository
- Check the documentation in the `/docs` folder

## 🎯 Roadmap

- [ ] Calendar view for bookings
- [ ] Advanced analytics and reporting
- [ ] Mobile app development
- [ ] Advanced notification system
- [ ] Integration with popular calendar services
- [ ] Multi-language support

---

Built with ❤️ using modern web technologies.