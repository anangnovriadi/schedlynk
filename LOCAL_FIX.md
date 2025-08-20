# Quick Fix for Local Development Issues

## Issue 1: Vite Configuration Error
The error `The "paths[0]" argument must be of type string. Received undefined` is caused by `import.meta.dirname` not being available in Node.js 18.

### Fix for Your Local Environment:
Since you can't edit `vite.config.ts`, upgrade to Node.js 20+ or use this workaround:

```bash
# Option 1: Upgrade Node.js (Recommended)
nvm install 20
nvm use 20

# Or install Node.js 20+ from nodejs.org
```

```bash
# Option 2: Use environment variable workaround
export __dirname_fallback=$(pwd)
npm run dev
```

## Issue 2: SendGrid API Key Warning
The "API key does not start with SG." warning is now fixed.

### For Your .env File:
```env
# Either provide a real SendGrid API key:
SENDGRID_API_KEY=SG.your_actual_sendgrid_key_here

# Or comment it out to disable email features:
# SENDGRID_API_KEY=your-sendgrid-api-key-here
```

## Complete .env Template for Local Development:
```env
# Database Configuration (Required)
DATABASE_URL=postgresql://scheduler_user:password123@localhost:5432/scheduler_lite

# Authentication (Required)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Email Configuration (Optional - comment out if not needed)
# SENDGRID_API_KEY=SG.your_actual_sendgrid_key_here

# Application Configuration
NODE_ENV=development
PORT=5000
```

## PostgreSQL Setup (If Not Done Yet):

### Using Docker (Easiest):
```bash
# Create docker-compose.yml:
cat > docker-compose.yml << EOF
version: '3.8'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: scheduler_lite
      POSTGRES_USER: scheduler_user
      POSTGRES_PASSWORD: password123
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
EOF

# Start PostgreSQL
docker-compose up -d
```

### Using Local PostgreSQL:
```bash
# Create database and user
createdb scheduler_lite
psql -c "CREATE USER scheduler_user WITH PASSWORD 'password123';"
psql -c "GRANT ALL PRIVILEGES ON DATABASE scheduler_lite TO scheduler_user;"
```

## Test Your Setup:
```bash
# 1. Start PostgreSQL (if using Docker)
docker-compose up -d

# 2. Set up database schema
npm run db:push

# 3. Start development server
npm run dev
```

You should see:
```
🔧 Environment Check:
DATABASE_URL: ✅ SET
JWT_SECRET: ✅ SET
NODE_ENV: development
PORT: 5000
---
ℹ️ SendGrid API key not provided - email features disabled
[express] serving on port 5000
```

## If Still Getting Vite Errors:
The simplest solution is upgrading to Node.js 20, as the current vite.config.ts uses modern Node.js features.