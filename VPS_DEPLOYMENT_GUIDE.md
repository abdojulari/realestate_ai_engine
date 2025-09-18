# VPS Deployment Guide for Real Estate App

## 🚀 Hosting Provider Comparison

### 1. **Kamatera VPS** (Recommended for flexibility)
- **Pros**: Highly customizable, global data centers, hourly billing
- **Pricing**: $4/month for 1GB RAM, 1 CPU, 20GB SSD
- **Good for**: Custom configurations, scalability

### 2. **Hostinger VPS**
- **Pros**: Beginner-friendly, managed services, good support
- **Pricing**: $3.95/month for 1 CPU, 4GB RAM, 40GB SSD
- **Good for**: Easier management, less technical setup

### 3. **DigitalOcean Droplets** (Alternative)
- **Pros**: Developer-friendly, excellent documentation, marketplace apps
- **Pricing**: $4/month for 1GB RAM, 1 CPU, 25GB SSD
- **Good for**: Docker deployments, one-click applications

## 📋 What You'll Need

- ✅ Domain: `homesbyabdulojulari.ca` 
- ✅ Database: Supabase (already configured)
- 🔄 VPS Server (choose one above)
- 🔄 SSL Certificate (free with Let's Encrypt)
- 🔄 Email hosting for `info@homesbyabdulojulari.ca`

## 🛠 Step-by-Step VPS Setup

### Step 1: Get Your VPS

**For Kamatera:**
1. Go to [Kamatera](https://www.kamatera.com)
2. Sign up and verify account
3. Create new server:
   - **OS**: Ubuntu 22.04 LTS
   - **RAM**: 2GB (recommended for your app)
   - **CPU**: 1 vCore
   - **Storage**: 40GB SSD
   - **Location**: Choose closest to your users

**For Hostinger:**
1. Go to [Hostinger VPS](https://www.hostinger.com/vps-hosting)
2. Choose VPS plan (KVM 2 recommended)
3. Select Ubuntu 22.04 template

### Step 2: Initial Server Setup

```bash
# Connect to your server
ssh root@YOUR_SERVER_IP

# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
apt install docker-compose -y

# Create app user
adduser app
usermod -aG docker app
usermod -aG sudo app

# Setup firewall
ufw allow OpenSSH
ufw allow 80
ufw allow 443
ufw enable
```

### Step 3: Deploy Your Application

```bash
# Switch to app user
su - app

# Clone your repository
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
cd YOUR_REPO

# Create production environment file
cp .env.example .env.production
```

### Step 4: Environment Configuration

Edit `.env.production`:
```bash
# Database (using your Supabase)
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@db.dqkhgfutlnnqwbvtcauv.supabase.co:5432/postgres"

# App URLs
NUXT_PUBLIC_API_BASE="https://homesbyabdulojulari.ca/api"
NUXT_PUBLIC_SITE_URL="https://homesbyabdulojulari.ca"

# Security
JWT_SECRET="your-super-secret-jwt-key-here"

# Email settings (we'll configure this later)
SMTP_USERNAME=""
SMTP_PASSWORD=""
SMTP_HOSTNAME=""
SMTP_PORT=""
SMTP_SENDER="info@homesbyabdulojulari.ca"
AGENT_EMAIL="info@homesbyabdulojulari.ca"

# Optional services
OPENCAGE_API_KEY="your-geocoding-api-key"
```

### Step 5: Docker Production Setup

Update `docker-compose.prod.yml`:
```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    env_file:
      - .env.production
    restart: unless-stopped
    volumes:
      - ./uploads:/app/uploads
    networks:
      - app-network

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/ssl:/etc/nginx/ssl
      - /etc/letsencrypt:/etc/letsencrypt
    depends_on:
      - app
    restart: unless-stopped
    networks:
      - app-network

networks:
  app-network:
    driver: bridge
```

### Step 6: Nginx Configuration

Create `nginx/nginx.conf`:
```nginx
events {
    worker_connections 1024;
}

http {
    upstream app {
        server app:3000;
    }

    # Redirect HTTP to HTTPS
    server {
        listen 80;
        server_name homesbyabdulojulari.ca www.homesbyabdulojulari.ca;
        return 301 https://$server_name$request_uri;
    }

    # HTTPS server
    server {
        listen 443 ssl http2;
        server_name homesbyabdulojulari.ca www.homesbyabdulojulari.ca;

        # SSL Configuration
        ssl_certificate /etc/letsencrypt/live/homesbyabdulojulari.ca/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/homesbyabdulojulari.ca/privkey.pem;
        
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
        ssl_prefer_server_ciphers off;

        # Security headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header X-Content-Type-Options "nosniff" always;

        client_max_body_size 10M;

        location / {
            proxy_pass http://app;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }
    }
}
```

### Step 7: Domain & SSL Setup

1. **Point your domain to the VPS:**
   ```
   Type: A Record
   Name: @
   Value: YOUR_SERVER_IP
   
   Type: A Record  
   Name: www
   Value: YOUR_SERVER_IP
   ```

2. **Get SSL certificate:**
   ```bash
   # Install Certbot
   sudo apt install certbot python3-certbot-nginx -y
   
   # Get certificate
   sudo certbot certonly --standalone -d homesbyabdulojulari.ca -d www.homesbyabdulojulari.ca
   ```

### Step 8: Deploy Application

```bash
# Run database migrations
docker-compose -f docker-compose.prod.yml run --rm app npx prisma migrate deploy

# Start the application
docker-compose -f docker-compose.prod.yml up -d

# Check logs
docker-compose -f docker-compose.prod.yml logs -f
```

### Step 9: Email Setup

**Option 1: Gmail SMTP** (Easiest)
```bash
# Add to .env.production
SMTP_USERNAME="info@homesbyabdulojulari.ca"
SMTP_PASSWORD="your-app-password"
SMTP_HOSTNAME="smtp.gmail.com"
SMTP_PORT="587"
```

**Option 2: Hostinger Email** (If using Hostinger)
- They provide email hosting with domains
- Use their SMTP settings

**Option 3: External Email Service** (Recommended)
- Mailgun, SendGrid, or Postmark
- More reliable for transactional emails

## 🔧 Maintenance Commands

```bash
# Update application
git pull
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d

# Backup database
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# View logs
docker-compose -f docker-compose.prod.yml logs -f app

# Restart services
docker-compose -f docker-compose.prod.yml restart
```

## 💰 Monthly Costs Estimate

- **VPS**: $4-8/month
- **Domain**: $15/year (~$1.25/month)
- **Email**: $0-5/month (depending on provider)
- **Total**: ~$5-15/month

## 🎯 Next Steps

1. Choose your VPS provider
2. Purchase domain `homesbyabdulojulari.ca`
3. Set up VPS server
4. Deploy application
5. Configure email

This setup gives you:
✅ Full control over your server  
✅ Better performance for full-stack apps  
✅ No restrictions on API routes or database  
✅ Proper SSR support  
✅ Custom domain with SSL  
✅ Professional email address  

Would you like me to help you set up any specific part of this process?
