# Scheduler-Lite Source Code Export

## 📦 Package Contents

This source code package contains the complete Scheduler-Lite multi-team scheduling application.

### Core Application Files
- **client/** - React frontend with TypeScript
- **server/** - Express.js backend with authentication and APIs
- **shared/** - Shared database schema and types
- **utils/** - Utility functions and helpers
- **prisma/** - Database seeding scripts

### Configuration Files
- **package.json** - Node.js dependencies and scripts
- **tsconfig.json** - TypeScript configuration
- **vite.config.ts** - Vite build configuration
- **tailwind.config.ts** - Tailwind CSS styling
- **drizzle.config.ts** - Database ORM configuration
- **components.json** - UI component library settings

### Deployment Files
- **Dockerfile** - Container configuration
- **docker-compose.yml** - Local development setup
- **apprunner.yaml** - AWS App Runner configuration
- **terraform/** - Infrastructure as Code for AWS/Azure
- **.github/workflows/** - CI/CD automation

### Documentation
- **README.md** - Project overview and setup
- **DEPLOYMENT.md** - Complete deployment guide
- **API_DOCUMENTATION.md** - API endpoint reference
- **replit.md** - Technical architecture and changes

## 🚀 Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your database URL and secrets
   ```

3. **Set up database:**
   ```bash
   npm run db:push
   npm run db:seed
   ```

4. **Start development server:**
   ```bash
   npm run dev
   ```

## 🔑 Required Environment Variables

- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secure random string for JWT tokens
- `SENDGRID_API_KEY` - For email functionality (optional)

## 📚 Features Included

✅ **Multi-team support** with role-based access control  
✅ **Password-based authentication** with JWT tokens  
✅ **Forgot password flow** with email reset links  
✅ **Super admin capabilities** for cross-team management  
✅ **API key management** for external integrations  
✅ **Public booking API** for customer-facing integrations  
✅ **Comprehensive deployment configurations** for AWS and Azure  
✅ **Interactive API documentation** for developers  

## 🔧 Technology Stack

- **Frontend:** React 18, TypeScript, Tailwind CSS, Radix UI
- **Backend:** Node.js, Express.js, Drizzle ORM
- **Database:** PostgreSQL
- **Authentication:** bcrypt, JWT, SendGrid
- **Deployment:** Docker, AWS, Azure, Terraform

## 📖 Documentation

- Review `DEPLOYMENT.md` for step-by-step deployment instructions
- Check `API_DOCUMENTATION.md` for complete API reference
- See `replit.md` for technical architecture details

## 🏃‍♂️ Ready to Deploy

This application is production-ready with:
- Health check endpoints
- Docker containerization
- CI/CD workflows
- Infrastructure as Code
- Comprehensive error handling
- Security best practices

Choose your preferred deployment platform and follow the guides in `DEPLOYMENT.md`!