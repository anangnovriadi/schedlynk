# AWS EC2 Deployment Guide for Scheduler-Lite

## Prerequisites

1. **AWS Account** with EC2 access
2. **Domain name** (optional but recommended)
3. **Database**: PostgreSQL (RDS recommended) or use existing database
4. **Email Service**: SendGrid account for email functionality
5. **Google Calendar**: OAuth credentials for calendar integration

## Step 1: Launch EC2 Instance

### 1.1 Create EC2 Instance
```bash
# Recommended specifications:
- Instance Type: t3.medium (2 vCPU, 4 GB RAM) or larger
- Operating System: Ubuntu 22.04 LTS
- Storage: 20 GB gp3 SSD minimum
- Security Group: Allow HTTP (80), HTTPS (443), SSH (22)
```

### 1.2 Configure Security Group
```bash
# Inbound Rules:
- SSH (22): Your IP address
- HTTP (80): 0.0.0.0/0
- HTTPS (443): 0.0.0.0/0
- PostgreSQL (5432): Security group ID (if using RDS)
```

## Step 2: Server Setup

### 2.1 Connect to EC2 Instance
```bash
ssh -i your-key.pem ubuntu@your-ec2-public-ip
```

### 2.2 Update System
```bash
sudo apt update && sudo apt upgrade -y
```

### 2.3 Install Node.js 20+
```bash
# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version  # Should be 20.x.x
npm --version
```

### 2.4 Install PM2 Process Manager
```bash
sudo npm install -g pm2
```

### 2.5 Install Nginx
```bash
sudo apt install nginx -y
sudo systemctl start nginx
sudo systemctl enable nginx
```

## Step 3: Application Deployment

### 3.1 Clone/Upload Application
```bash
# Option 1: Clone from GitHub (if you have a repo)
git clone https://github.com/yourusername/scheduler-lite.git
cd scheduler-lite

# Option 2: Upload via SCP
# scp -i your-key.pem -r ./scheduler-lite ubuntu@your-ec2-ip:/home/ubuntu/
```

### 3.2 Install Dependencies
```bash
cd scheduler-lite
npm install
```

### 3.3 Deploy Application (Automated)
```bash
# Make deployment script executable
chmod +x deploy-to-aws.sh

# Run automated deployment
./deploy-to-aws.sh
```

Or manually:
```bash
# Install dependencies
npm install

# Build application
npm run build

# The build creates dist/index.js and dist/public/ directory
```

### 3.4 Set Environment Variables
```bash
# Create environment file
nano .env

# Add these variables:
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://username:password@your-db-host:5432/scheduler_lite
JWT_SECRET=your-super-secure-jwt-secret-key-min-32-characters
SENDGRID_API_KEY=your-sendgrid-api-key
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

## Step 4: Database Setup

### 4.1 Option A: AWS RDS PostgreSQL
```bash
# Create RDS PostgreSQL instance:
- Engine: PostgreSQL 15+
- Instance: db.t3.micro (free tier) or db.t3.small
- Storage: 20 GB gp3
- Multi-AZ: No (for cost savings)
- Public Access: No
- VPC Security Group: Allow port 5432 from EC2 security group
```

### 4.2 Option B: Local PostgreSQL (not recommended for production)
```bash
sudo apt install postgresql postgresql-contrib -y
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres psql
CREATE DATABASE scheduler_lite;
CREATE USER scheduler_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE scheduler_lite TO scheduler_user;
\q
```

### 4.3 Run Database Migrations
```bash
npm run db:push
```

## Step 5: Configure Nginx Reverse Proxy

### 5.1 Create Nginx Configuration
```bash
sudo nano /etc/nginx/sites-available/scheduler-lite
```

Add this configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;  # Replace with your domain

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }
}
```

### 5.2 Enable Site
```bash
sudo ln -s /etc/nginx/sites-available/scheduler-lite /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Step 6: SSL Certificate (Let's Encrypt)

### 6.1 Install Certbot
```bash
sudo apt install certbot python3-certbot-nginx -y
```

### 6.2 Obtain SSL Certificate
```bash
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

## Step 7: Start Application with PM2

### 7.1 Create PM2 Configuration
```bash
nano ecosystem.config.js
```

Add this configuration:
```javascript
module.exports = {
  apps: [{
    name: 'scheduler-lite',
    script: 'npm',
    args: 'start',
    cwd: '/home/ubuntu/scheduler-lite',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    log_file: '/home/ubuntu/scheduler-lite/logs/combined.log',
    out_file: '/home/ubuntu/scheduler-lite/logs/out.log',
    error_file: '/home/ubuntu/scheduler-lite/logs/error.log',
    time: true
  }]
};
```

### 7.2 Start Application
```bash
# Create logs directory
mkdir -p logs

# Start with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Follow the command output instructions
```

## Step 8: Domain Configuration

### 8.1 DNS Settings
Point your domain to your EC2 instance:
```bash
# A Record
Type: A
Name: @
Value: your-ec2-public-ip

# CNAME Record (for www)
Type: CNAME
Name: www
Value: your-domain.com
```

### 8.2 Update Google OAuth
Update your Google OAuth credentials:
- Authorized JavaScript origins: `https://your-domain.com`
- Authorized redirect URIs: `https://your-domain.com/auth/google/callback`

## Step 9: Monitoring and Maintenance

### 9.1 Monitor Application
```bash
# Check application status
pm2 status

# View logs
pm2 logs

# Monitor resources
pm2 monit
```

### 9.2 Setup Log Rotation
```bash
sudo nano /etc/logrotate.d/scheduler-lite
```

Add:
```
/home/ubuntu/scheduler-lite/logs/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}
```

## Step 10: Backup Strategy

### 10.1 Database Backup Script
```bash
nano backup-db.sh
```

Add:
```bash
#!/bin/bash
BACKUP_DIR="/home/ubuntu/backups"
DATE=$(date +"%Y-%m-%d-%H-%M-%S")
BACKUP_FILE="$BACKUP_DIR/scheduler-lite-$DATE.sql"

mkdir -p $BACKUP_DIR
pg_dump $DATABASE_URL > $BACKUP_FILE
gzip $BACKUP_FILE

# Keep only last 7 days
find $BACKUP_DIR -name "scheduler-lite-*.sql.gz" -mtime +7 -delete
```

### 10.2 Setup Cron Job
```bash
chmod +x backup-db.sh
crontab -e

# Add daily backup at 2 AM
0 2 * * * /home/ubuntu/scheduler-lite/backup-db.sh
```

## Step 11: Security Hardening

### 11.1 Update Package Script
```bash
nano update-app.sh
```

Add:
```bash
#!/bin/bash
cd /home/ubuntu/scheduler-lite
git pull origin main
npm install
npm run build
pm2 restart scheduler-lite
```

### 11.2 Firewall Configuration
```bash
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw status
```

## Cost Optimization

### Monthly Costs (estimated):
- **t3.medium EC2**: ~$30-40/month
- **RDS db.t3.micro**: ~$15-20/month
- **Data Transfer**: ~$5-10/month
- **Total**: ~$50-70/month

### Cost Savings:
- Use Reserved Instances for 1-year commitment (30-40% savings)
- Use Spot Instances for development environments
- Configure auto-scaling based on traffic
- Use CloudWatch for monitoring and alerts

## Troubleshooting

### Common Issues:
1. **App won't start**: Check logs with `pm2 logs`
2. **Database connection**: Verify security groups and connection string
3. **SSL issues**: Check domain DNS and certbot logs
4. **Performance**: Monitor with `pm2 monit` and CloudWatch

### Useful Commands:
```bash
# Restart application
pm2 restart scheduler-lite

# Check system resources
htop
df -h

# Check nginx status
sudo systemctl status nginx

# Check application logs
tail -f logs/combined.log
```

## Next Steps

1. **Monitoring**: Set up CloudWatch alarms
2. **Scaling**: Configure Auto Scaling Groups
3. **CDN**: Add CloudFront for static assets
4. **Backup**: Implement automated RDS backups
5. **CI/CD**: Set up GitHub Actions for deployment

Your Scheduler-Lite application is now deployed on AWS EC2 with production-grade configuration!