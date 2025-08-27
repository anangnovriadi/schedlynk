# Environment Variables Setup

## The Issue
Your application wasn't reading the `.env` file because Node.js doesn't automatically load environment variables from `.env` files. You need the `dotenv` package.

## Quick Fix

1. **Install dotenv** (already done):
```bash
npm install dotenv
```

2. **Create your `.env` file**:
```bash
cp .env.example .env
```

3. **Edit your `.env` file** with your actual values:
```env
# Database Configuration
DATABASE_URL=postgresql://scheduler_user:password123@localhost:5432/scheduler_lite

# Authentication
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Email Configuration (Optional)
SENDGRID_API_KEY=your-sendgrid-api-key-here

# Application Configuration
NODE_ENV=development
PORT=5000
```

## Testing Environment Variables

Add this to any file to test if env vars are loading:
```javascript
console.log('Environment variables:');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'SET' : 'NOT SET');
console.log('NODE_ENV:', process.env.NODE_ENV);
```

## Common Issues

### 1. `.env` file not found
```bash
# Make sure .env file exists in project root
ls -la .env
```

### 2. Wrong file location
The `.env` file must be in the same directory as your `package.json` file.

### 3. Environment variables not loading
Make sure the import is at the very top of your entry file:
```javascript
import 'dotenv/config';
// ... other imports
```

### 4. Syntax in .env file
- No spaces around the `=` sign
- No quotes needed for simple values
- Use quotes for values with spaces

```env
# ✅ Correct
DATABASE_URL=postgresql://user:pass@localhost:5432/db
JWT_SECRET=my-secret-key

# ❌ Wrong
DATABASE_URL = postgresql://user:pass@localhost:5432/db
JWT_SECRET = "my-secret-key"
```

## For Local Development

Your `.env` should contain at minimum:
```env
DATABASE_URL=postgresql://scheduler_user:password123@localhost:5432/scheduler_lite
JWT_SECRET=development-secret-key-change-in-production
NODE_ENV=development
```

## Restart After Changes
After creating or modifying the `.env` file, restart your development server:
```bash
npm run dev
```