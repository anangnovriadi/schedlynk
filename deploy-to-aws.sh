#!/bin/bash

# AWS EC2 Deployment Script for Scheduler-Lite
# This script automates the deployment process on your EC2 instance

set -e  # Exit on any error

echo "🚀 Starting Scheduler-Lite deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're on the correct server
if [ ! -f "/etc/os-release" ]; then
    print_error "This script is designed for Linux systems"
    exit 1
fi

print_status "Checking system requirements..."

# Check Node.js version
NODE_VERSION=$(node --version 2>/dev/null || echo "not installed")
if [[ $NODE_VERSION == "not installed" ]]; then
    print_error "Node.js is not installed. Please install Node.js 20+ first."
    exit 1
fi

# Check if it's Node 20+
NODE_MAJOR=$(echo $NODE_VERSION | cut -d'.' -f1 | cut -d'v' -f2)
if [ "$NODE_MAJOR" -lt 20 ]; then
    print_error "Node.js version 20+ is required. Current version: $NODE_VERSION"
    exit 1
fi

print_status "Node.js version check passed: $NODE_VERSION"

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    print_status "Installing PM2..."
    npm install -g pm2
fi

# Check if application directory exists
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from the application root directory."
    exit 1
fi

print_status "Installing dependencies..."
npm install

print_status "Building application..."
npm run build

# Check if build was successful
if [ ! -f "dist/index.js" ]; then
    print_error "Build failed. dist/index.js not found."
    exit 1
fi

print_status "Build completed successfully"

# Check if .env file exists
if [ ! -f ".env" ]; then
    print_warning ".env file not found. Creating template..."
    cat > .env << EOF
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://username:password@localhost:5432/scheduler_lite
JWT_SECRET=your-super-secure-jwt-secret-key-min-32-characters
SENDGRID_API_KEY=your-sendgrid-api-key
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
EOF
    print_warning "Please update the .env file with your actual configuration before starting the application."
fi

# Create logs directory
mkdir -p logs

# Create PM2 ecosystem file
print_status "Creating PM2 configuration..."
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'scheduler-lite',
    script: 'dist/index.js',
    cwd: '$(pwd)',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    log_file: '$(pwd)/logs/combined.log',
    out_file: '$(pwd)/logs/out.log',
    error_file: '$(pwd)/logs/error.log',
    time: true,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024'
  }]
};
EOF

# Database migration
print_status "Running database migrations..."
if npm run db:push; then
    print_status "Database migrations completed"
else
    print_warning "Database migrations failed. Please check your DATABASE_URL and database connectivity."
fi

# Stop existing PM2 processes
print_status "Stopping existing application..."
pm2 stop scheduler-lite 2>/dev/null || echo "No existing process found"

# Start application with PM2
print_status "Starting application with PM2..."
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 startup script
print_status "Setting up PM2 startup script..."
pm2 startup | grep -E '^sudo' | bash 2>/dev/null || echo "PM2 startup already configured"

print_status "Deployment completed successfully!"
print_status "Application is running on port 3000"
print_status ""
print_status "Useful commands:"
print_status "  pm2 status           - Check application status"
print_status "  pm2 logs             - View application logs"
print_status "  pm2 monit            - Monitor application resources"
print_status "  pm2 restart scheduler-lite - Restart application"
print_status "  pm2 stop scheduler-lite    - Stop application"
print_status ""
print_status "Next steps:"
print_status "1. Configure Nginx reverse proxy"
print_status "2. Setup SSL certificate with Let's Encrypt"
print_status "3. Configure your domain DNS"
print_status "4. Update Google OAuth credentials"
print_status ""
print_status "For detailed instructions, see AWS_EC2_DEPLOYMENT.md"