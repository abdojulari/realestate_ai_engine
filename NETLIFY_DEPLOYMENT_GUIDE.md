# Netlify Deployment Guide for Suhani Real Estate App

## ⚠️ Important Considerations

Your current setup uses:
- Full-stack Nuxt.js with server-side API routes
- PostgreSQL database with Prisma ORM
- Docker containerization
- Server middleware and plugins

**Netlify Limitations:**
- Netlify doesn't support Docker containers directly
- No persistent database hosting (PostgreSQL)
- Server-side API routes need to be converted to serverless functions
- No support for background jobs/schedulers

## Recommended Deployment Options

### Option 1: Netlify + External Database (Recommended)

This approach uses Netlify for the frontend and serverless functions, with an external database.

#### Step 1: Database Setup
Choose one of these database providers:
- **Supabase** (PostgreSQL, free tier available)
- **PlanetScale** (MySQL, free tier available)
- **Railway** (PostgreSQL, free tier available)
- **Neon** (PostgreSQL, free tier available)

#### Step 2: Project Configuration

1. **Update `nuxt.config.ts` for static generation:**
```typescript
export default defineNuxtConfig({
  // ... existing config
  nitro: {
    preset: 'netlify',
  },
  // For static generation (if possible)
  ssr: false, // or keep true if you need SSR
})
```

2. **Create `netlify.toml` in project root:**
```toml
[build]
  command = "npm run build"
  publish = ".output/public"

[build.environment]
  NODE_VERSION = "18"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/server/:splat"
  status = 200

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-XSS-Protection = "1; mode=block"
    X-Content-Type-Options = "nosniff"
```

3. **Environment Variables Setup:**
   - Go to Netlify Dashboard → Site Settings → Environment Variables
   - Add all your production environment variables:
     ```
     DATABASE_URL=your_external_database_url
     JWT_SECRET=your_jwt_secret
     GOOGLE_CLIENT_ID=your_google_client_id
     GOOGLE_CLIENT_SECRET=your_google_client_secret
     FACEBOOK_APP_ID=your_facebook_app_id
     FACEBOOK_APP_SECRET=your_facebook_app_secret
     NUXT_PUBLIC_API_BASE=https://your-site.netlify.app/api
     NUXT_PUBLIC_SITE_URL=https://your-site.netlify.app
     ```

#### Step 3: Code Modifications

1. **Update database connection for serverless:**
   - Modify Prisma configuration for connection pooling
   - Consider using Prisma Data Proxy for serverless environments

2. **Convert background jobs:**
   - Move scheduled tasks to external services (Vercel Cron, GitHub Actions, or external cron services)
   - Or use Netlify scheduled functions (limited)

#### Step 4: Deployment Steps

1. **Prepare the repository:**
   ```bash
   # Remove Docker-specific files from deployment
   echo "Dockerfile" >> .gitignore
   echo "docker-compose*.yml" >> .gitignore
   echo ".env*" >> .gitignore  # Don't commit env files
   ```

2. **Install Netlify CLI:**
   ```bash
   npm install -g netlify-cli
   ```

3. **Build and test locally:**
   ```bash
   npm run build
   netlify dev  # Test locally
   ```

4. **Deploy to Netlify:**
   ```bash
   # Login to Netlify
   netlify login
   
   # Initialize site
   netlify init
   
   # Deploy
   netlify deploy --prod
   ```

#### Step 5: Database Migration

1. **Run Prisma migrations on external database:**
   ```bash
   # Set DATABASE_URL to your external database
   npx prisma migrate deploy
   npx prisma generate
   ```

2. **Seed data (if needed):**
   ```bash
   npx prisma db seed
   ```

---

### Option 2: Alternative Platforms (Better for Full-Stack Apps)

If you want to keep your current Docker setup, consider these platforms instead:

#### Railway
- Supports Docker containers
- Built-in PostgreSQL
- Easy deployment from GitHub

**Deployment steps:**
1. Connect GitHub repository to Railway
2. Add environment variables
3. Railway auto-deploys from Docker

#### Render
- Supports Docker containers
- Built-in PostgreSQL
- Free tier available

**Deployment steps:**
1. Connect GitHub repository
2. Choose "Web Service" with Docker
3. Add environment variables
4. Deploy

#### DigitalOcean App Platform
- Supports Docker containers
- Managed databases available
- Affordable pricing

---

## Quick Start for Netlify Deployment

If you want to proceed with Netlify (Option 1):

### 1. Set up external database
Choose Supabase (easiest):
- Go to [supabase.com](https://supabase.com)
- Create new project
- Get connection string from Settings → Database

### 2. Update your code
```bash
# Install Netlify adapter
npm install --save-dev @nuxtjs/netlify-builder

# Update nuxt.config.ts
# Add nitro.preset: 'netlify'
```

### 3. Create netlify.toml (see above)

### 4. Deploy
```bash
# Connect to Netlify
netlify init

# Set environment variables in Netlify dashboard
# Deploy
git add .
git commit -m "Configure for Netlify"
git push origin main
```

### 5. Configure domain and SSL
- Custom domain in Netlify dashboard
- SSL is automatic

---

## Domain Configuration

### Free Netlify Domain
Your app will be available at: `your-app-name.netlify.app`

### Custom Domain Setup (.com/.ca)

#### Step 1: Purchase Domain
Buy from any registrar:
- **Namecheap**: ~$10-15/year (.com)
- **GoDaddy**: ~$12-20/year
- **Google Domains**: ~$12/year
- **Canadian registrars**: For .ca domains

#### Step 2: Connect to Netlify
1. Go to Netlify Dashboard → Domain Settings
2. Click "Add custom domain"
3. Enter your domain (e.g., `yourdomain.com`)
4. Follow DNS configuration instructions
5. SSL certificate will be automatically provisioned

#### Step 3: DNS Configuration
Add these records at your domain registrar:

```
Type: A
Name: @
Value: 75.2.60.5

Type: CNAME  
Name: www
Value: your-app-name.netlify.app
```

## Post-Deployment Checklist

- [ ] Database migrations completed
- [ ] Environment variables configured
- [ ] API endpoints working
- [ ] Authentication flows tested
- [ ] File uploads configured (if any)
- [ ] Email services working
- [ ] Custom domain configured (if needed)
- [ ] SSL certificate active
- [ ] Performance monitoring set up
- [ ] Error tracking configured (Sentry, etc.)

---

## Troubleshooting

### Common Issues:
1. **Serverless function timeouts** - Optimize database queries
2. **Cold starts** - Consider connection pooling
3. **File uploads** - Use external storage (Cloudinary, AWS S3)
4. **Background jobs** - Move to external services

### Performance Tips:
- Use database connection pooling
- Implement proper caching strategies
- Optimize images and assets
- Use CDN for static assets

---

## Recommendation

For your complex real estate application with database, authentication, and background jobs, I recommend **Railway** or **Render** over Netlify, as they better support your current architecture without major code changes.

Would you like me to create deployment guides for Railway or Render instead?
