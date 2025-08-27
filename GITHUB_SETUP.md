# GitHub Repository Setup for Scheduler-Lite

## Step 1: Create GitHub Repository

1. Go to [GitHub.com](https://github.com) and sign in
2. Click the "New" button or go to [github.com/new](https://github.com/new)
3. Repository details:
   - **Repository name**: `scheduler-lite`
   - **Description**: "Multi-team scheduling and management platform with role-based access control, Google Calendar integration, and comprehensive API"
   - **Visibility**: Choose Public or Private
   - **Initialize**: Don't add README, .gitignore, or license (we already have them)

## Step 2: Connect Local Repository to GitHub

```bash
# Add your GitHub repository as remote origin
git remote add origin https://github.com/YOUR_USERNAME/scheduler-lite.git

# Verify remote was added
git remote -v
```

## Step 3: Prepare and Push Code

```bash
# Check current status
git status

# Add all files to staging
git add .

# Create initial commit
git commit -m "Initial commit: Complete Scheduler-Lite application with multi-team support, authentication, and Google Calendar integration"

# Push to GitHub
git push -u origin main
```

## Step 4: Repository Structure

Your repository will include:

```
scheduler-lite/
├── client/                    # React frontend application
├── server/                    # Express.js backend
├── shared/                    # Shared TypeScript schemas
├── logs/                      # Application logs
├── AWS_EC2_DEPLOYMENT.md      # AWS deployment guide
├── deploy-to-aws.sh           # Automated deployment script
├── nginx-config.conf          # Nginx configuration
├── GITHUB_SETUP.md            # This file
├── README.md                  # Project documentation
├── package.json               # Dependencies and scripts
├── .gitignore                 # Git ignore rules
└── ... (other config files)
```

## Step 5: Update README.md

Create a comprehensive README for your repository:

```markdown
# 📅 Scheduler-Lite

A comprehensive multi-team scheduling and management platform with role-based access control, Google Calendar integration, and a complete API for external integrations.

## 🚀 Features

- **Multi-Team Support**: Manage multiple teams with role-based permissions
- **Authentication**: Secure JWT-based authentication with password reset
- **Google Calendar Integration**: Bi-directional sync with Google Calendar
- **Comprehensive API**: Public booking API and admin endpoints
- **Dark Mode**: Beautiful dark theme by default
- **Mobile Responsive**: Works perfectly on all devices
- **Production Ready**: Enterprise-grade security and monitoring

## 🛠️ Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS, Radix UI
- **Backend**: Node.js, Express.js, Drizzle ORM
- **Database**: PostgreSQL
- **Authentication**: JWT with bcrypt
- **Deployment**: AWS EC2, Nginx, PM2

## 📖 Documentation

- [Local Setup Guide](ENV_SETUP.md)
- [AWS EC2 Deployment](AWS_EC2_DEPLOYMENT.md)
- [API Documentation](API_DOCUMENTATION.md)

## 🔧 Quick Start

### Prerequisites
- Node.js 20+
- PostgreSQL database
- SendGrid account (for emails)
- Google OAuth credentials

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/YOUR_USERNAME/scheduler-lite.git
   cd scheduler-lite
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. Set up the database:
   ```bash
   npm run db:push
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

## 🚀 Deployment

### AWS EC2 (Recommended)
Use our automated deployment script:

```bash
chmod +x deploy-to-aws.sh
./deploy-to-aws.sh
```

See [AWS_EC2_DEPLOYMENT.md](AWS_EC2_DEPLOYMENT.md) for detailed instructions.

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📞 Support

For questions or support, please create an issue on GitHub.
```

## Step 6: Environment Template

Update your `.env.example` file:

```env
# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/scheduler_lite

# Authentication
JWT_SECRET=your-super-secure-jwt-secret-key-min-32-characters

# Email Service (SendGrid)
SENDGRID_API_KEY=your-sendgrid-api-key

# Google Calendar Integration
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Server Configuration
NODE_ENV=production
PORT=3000
```

## Step 7: GitHub Repository Settings

### Recommended Settings:
1. **Branch Protection**: Protect main branch
2. **Secrets**: Add deployment secrets for CI/CD
3. **Topics**: Add relevant tags like `typescript`, `react`, `express`, `scheduling`
4. **Description**: "Multi-team scheduling platform with role-based access control"
5. **Website**: Add your deployed application URL

### GitHub Secrets (for CI/CD):
If you plan to set up GitHub Actions for deployment:
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `DATABASE_URL`
- `JWT_SECRET`
- `SENDGRID_API_KEY`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

## Step 8: Optional - GitHub Actions CI/CD

Create `.github/workflows/deploy.yml` for automated deployment:

```yaml
name: Deploy to AWS EC2

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v2
    
    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '20'
        
    - name: Install dependencies
      run: npm install
      
    - name: Build application
      run: npm run build
      
    - name: Deploy to EC2
      # Add your deployment script here
```

## Complete Git Commands Summary

```bash
# Initial setup (run once)
git remote add origin https://github.com/YOUR_USERNAME/scheduler-lite.git

# Regular workflow
git add .
git commit -m "Your commit message"
git push origin main

# Update from remote
git pull origin main
```

Your Scheduler-Lite application is now ready for GitHub! The repository will showcase a professional, production-ready scheduling platform.