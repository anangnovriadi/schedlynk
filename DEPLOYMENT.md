# Deployment Guide for Scheduler-Lite

This guide covers deploying the Scheduler-Lite application to AWS and Azure cloud platforms.

## Prerequisites

- Node.js 18+ 
- PostgreSQL database
- SendGrid API key (optional, for email functionality)
- Domain name (optional, for custom domains)

## AWS Deployment

### Option 1: AWS App Runner (Recommended for simplicity)

1. **Prepare your repository**
   ```bash
   # Ensure your package.json has the correct scripts
   npm run build
   ```

2. **Create apprunner.yaml** in your project root:
   ```yaml
   version: 1.0
   runtime: nodejs18
   build:
     commands:
       build:
         - npm install
         - npm run build
   run:
     runtime-version: 18
     command: npm start
     network:
       port: 5000
       env: PORT
     env:
       - name: NODE_ENV
         value: production
   ```

3. **Set up PostgreSQL on AWS RDS**
   - Create a PostgreSQL instance on AWS RDS
   - Note the connection string

4. **Deploy with App Runner**
   - Go to AWS App Runner console
   - Create a new service
   - Connect your GitHub repository
   - Set environment variables:
     - `DATABASE_URL`: Your PostgreSQL connection string
     - `SENDGRID_API_KEY`: Your SendGrid API key (optional)
     - `JWT_SECRET`: A secure random string
   - Deploy

### Option 2: AWS ECS with Fargate

1. **Create Dockerfile**:
   ```dockerfile
   FROM node:18-alpine
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci --only=production
   COPY . .
   RUN npm run build
   EXPOSE 5000
   CMD ["npm", "start"]
   ```

2. **Build and push to ECR**:
   ```bash
   # Create ECR repository
   aws ecr create-repository --repository-name scheduler-lite

   # Build and push image
   docker build -t scheduler-lite .
   docker tag scheduler-lite:latest <account-id>.dkr.ecr.<region>.amazonaws.com/scheduler-lite:latest
   docker push <account-id>.dkr.ecr.<region>.amazonaws.com/scheduler-lite:latest
   ```

3. **Create ECS Task Definition**:
   ```json
   {
     "family": "scheduler-lite",
     "networkMode": "awsvpc",
     "requiresCompatibilities": ["FARGATE"],
     "cpu": "256",
     "memory": "512",
     "executionRoleArn": "arn:aws:iam::<account>:role/ecsTaskExecutionRole",
     "containerDefinitions": [
       {
         "name": "scheduler-lite",
         "image": "<account-id>.dkr.ecr.<region>.amazonaws.com/scheduler-lite:latest",
         "portMappings": [
           {
             "containerPort": 5000,
             "protocol": "tcp"
           }
         ],
         "environment": [
           {
             "name": "NODE_ENV",
             "value": "production"
           },
           {
             "name": "DATABASE_URL",
             "value": "your-postgres-connection-string"
           }
         ],
         "logConfiguration": {
           "logDriver": "awslogs",
           "options": {
             "awslogs-group": "/ecs/scheduler-lite",
             "awslogs-region": "us-east-1",
             "awslogs-stream-prefix": "ecs"
           }
         }
       }
     ]
   }
   ```

4. **Create ECS Service and ALB**
   - Create ECS cluster
   - Create service with the task definition
   - Set up Application Load Balancer
   - Configure security groups

### Option 3: AWS Elastic Beanstalk

1. **Create .ebextensions/01-node-command.config**:
   ```yaml
   option_settings:
     aws:elasticbeanstalk:container:nodejs:
       NodeCommand: "npm start"
     aws:elasticbeanstalk:application:environment:
       NODE_ENV: production
   ```

2. **Deploy**:
   ```bash
   # Install EB CLI
   pip install awsebcli

   # Initialize and deploy
   eb init
   eb create production
   eb setenv DATABASE_URL=your-postgres-url SENDGRID_API_KEY=your-key
   eb deploy
   ```

## Azure Deployment

### Option 1: Azure Container Apps (Recommended)

1. **Create Dockerfile** (same as AWS ECS above)

2. **Deploy with Azure CLI**:
   ```bash
   # Login to Azure
   az login

   # Create resource group
   az group create --name scheduler-lite-rg --location eastus

   # Create container registry
   az acr create --resource-group scheduler-lite-rg --name schedulerliteacr --sku Basic

   # Build and push image
   az acr build --registry schedulerliteacr --image scheduler-lite:latest .

   # Create container app environment
   az containerapp env create \
     --name scheduler-lite-env \
     --resource-group scheduler-lite-rg \
     --location eastus

   # Deploy container app
   az containerapp create \
     --name scheduler-lite-app \
     --resource-group scheduler-lite-rg \
     --environment scheduler-lite-env \
     --image schedulerliteacr.azurecr.io/scheduler-lite:latest \
     --target-port 5000 \
     --ingress external \
     --env-vars NODE_ENV=production DATABASE_URL=your-postgres-url
   ```

### Option 2: Azure App Service

1. **Create package.json deployment script**:
   ```json
   {
     "scripts": {
       "build": "npm run build",
       "start": "node server/index.js"
     }
   }
   ```

2. **Deploy with Azure CLI**:
   ```bash
   # Create App Service plan
   az appservice plan create \
     --name scheduler-lite-plan \
     --resource-group scheduler-lite-rg \
     --sku B1 \
     --is-linux

   # Create web app
   az webapp create \
     --resource-group scheduler-lite-rg \
     --plan scheduler-lite-plan \
     --name scheduler-lite-app \
     --runtime "NODE|18-lts"

   # Set environment variables
   az webapp config appsettings set \
     --resource-group scheduler-lite-rg \
     --name scheduler-lite-app \
     --settings NODE_ENV=production DATABASE_URL=your-postgres-url

   # Deploy from local git
   az webapp deployment source config-local-git \
     --name scheduler-lite-app \
     --resource-group scheduler-lite-rg

   # Add Azure remote and push
   git remote add azure <deployment-url>
   git push azure main
   ```

### Option 3: Azure Functions (for serverless)

1. **Install Azure Functions Core Tools**:
   ```bash
   npm install -g azure-functions-core-tools@4 --unsafe-perm true
   ```

2. **Initialize Functions project**:
   ```bash
   func init --typescript
   func new --name scheduler-lite --template "HTTP trigger"
   ```

3. **Adapt your Express app to Azure Functions**
4. **Deploy**:
   ```bash
   func azure functionapp publish scheduler-lite-functions
   ```

## Database Setup

### AWS RDS PostgreSQL
```bash
# Create RDS instance
aws rds create-db-instance \
  --db-instance-identifier scheduler-lite-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --master-username admin \
  --master-user-password yourpassword \
  --allocated-storage 20
```

### Azure Database for PostgreSQL
```bash
# Create PostgreSQL server
az postgres server create \
  --resource-group scheduler-lite-rg \
  --name scheduler-lite-db \
  --location eastus \
  --admin-user admin \
  --admin-password yourpassword \
  --sku-name B_Gen5_1
```

## Environment Variables

Set these environment variables in your deployment:

```bash
NODE_ENV=production
DATABASE_URL=postgresql://username:password@host:port/database
SENDGRID_API_KEY=your-sendgrid-api-key
JWT_SECRET=your-secure-random-string
PORT=5000
```

## SSL/TLS and Custom Domains

### AWS
- Use AWS Certificate Manager for SSL certificates
- Configure custom domain through Route 53 or your DNS provider
- Set up CloudFront for CDN (optional)

### Azure
- Use Azure-managed certificates for SSL
- Configure custom domain in App Service or Container Apps
- Set up Azure CDN (optional)

## Monitoring and Logging

### AWS
- CloudWatch for logs and metrics
- AWS X-Ray for distributed tracing
- Set up CloudWatch alarms

### Azure
- Application Insights for monitoring
- Azure Monitor for logs and metrics
- Set up alerts and dashboards

## Cost Optimization

### AWS
- Use App Runner for automatic scaling
- Consider Reserved Instances for predictable workloads
- Use Aurora Serverless for database if applicable

### Azure
- Use Container Apps for automatic scaling
- Consider Azure Reserved VM Instances
- Use Azure Database for PostgreSQL flexible server

## Security Best Practices

1. **Use managed identity/service principal** for database connections
2. **Store secrets in key vault** (AWS Secrets Manager / Azure Key Vault)
3. **Enable WAF** for web application firewall
4. **Use private networking** where possible
5. **Enable audit logging**
6. **Regular security updates**

## CI/CD Pipeline

### GitHub Actions for AWS
```yaml
name: Deploy to AWS
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm ci
      - run: npm run build
      - uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
      # Add deployment steps
```

### GitHub Actions for Azure
```yaml
name: Deploy to Azure
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: azure/login@v1
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}
      # Add deployment steps
```

Choose the deployment option that best fits your needs in terms of complexity, cost, and scalability requirements.