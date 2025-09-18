# Streamlined Netlify Deployment Guide

## Quick Setup (30 minutes)

### Step 1: Database Setup (Choose One)

#### Option A: Supabase (Recommended - Free tier)
1. Go to [supabase.com](https://supabase.com)
2. Create account and new project
3. Go to Settings → Database → Connection string
4. Copy the connection string

#### Option B: PlanetScale (MySQL alternative)
1. Go to [planetscale.com](https://planetscale.com)
2. Create account and database
3. Get connection string from dashboard

### Step 2: Project Configuration

Create `netlify.toml` in your project root:

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

### Step 3: Update Nuxt Config

Update your `nuxt.config.ts`:

```typescript
export default defineNuxtConfig({
  // ... existing config
  nitro: {
    preset: 'netlify',
  },
  // Keep SSR for better SEO
  ssr: true,
})
```

### Step 4: Environment Variables

In Netlify Dashboard → Site Settings → Environment Variables, add:

```
DATABASE_URL=your_supabase_connection_string
JWT_SECRET=your_jwt_secret_here
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
FACEBOOK_APP_ID=your_facebook_app_id
FACEBOOK_APP_SECRET=your_facebook_app_secret
NUXT_PUBLIC_API_BASE=https://your-site.netlify.app/api
NUXT_PUBLIC_SITE_URL=https://your-site.netlify.app
SMTP_USERNAME=your_smtp_username
SMTP_PASSWORD=your_smtp_password
SMTP_HOSTNAME=your_smtp_hostname
SMTP_PORT=587
SMTP_SENDER=your_sender_email
AGENT_EMAIL=real4ojulari@gmail.com
OPENCAGE_API_KEY=your_opencage_api_key
```

### Step 5: Deploy

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login and initialize
netlify login
netlify init

# Deploy
netlify deploy --prod
```

### Step 6: Database Migration

```bash
# Set your DATABASE_URL to the external database
export DATABASE_URL="your_supabase_connection_string"

# Run migrations
npx prisma migrate deploy
npx prisma generate

# Seed data (optional)
npx prisma db seed
```

## Cost Comparison

### Netlify Approach (Recommended)
- **Netlify**: Free tier (100GB bandwidth, 300 build minutes)
- **Supabase**: Free tier (500MB database, 2GB bandwidth)
- **Total**: $0/month for small to medium traffic
- **Scaling**: Pay-as-you-grow

### Kamatera VPS Approach
- **Server**: $4-12/month minimum
- **Database**: Included but you manage it
- **Maintenance**: Your responsibility
- **Scaling**: Manual server upgrades

## Why Netlify Wins for Your Project

1. **Zero DevOps** - Focus on features, not infrastructure
2. **Automatic Scaling** - Handles traffic spikes automatically
3. **Global CDN** - Fast loading worldwide
4. **Serverless Functions** - Perfect for your API routes
5. **Easy Rollbacks** - One-click deployment rollbacks
6. **Free SSL** - Automatic HTTPS certificates

## Handling Your Current Docker Setup

Since you prefer Netlify, you can keep your Docker setup for local development:

```bash
# Local development (keep using Docker)
docker-compose up

# Production deployment (use Netlify)
netlify deploy --prod
```

## Background Jobs Solution

For your alert scheduler and background sync jobs, use:

1. **Netlify Scheduled Functions** (limited but free)
2. **GitHub Actions** (free for public repos)
3. **Vercel Cron Jobs** (if you need more flexibility)

## Quick Migration Checklist

- [ ] Set up Supabase database
- [ ] Create `netlify.toml`
- [ ] Update `nuxt.config.ts`
- [ ] Configure environment variables in Netlify
- [ ] Run database migrations
- [ ] Deploy to Netlify
- [ ] Test all functionality
- [ ] Set up custom domain (if needed)

## Next Steps

1. **Set up monitoring** - Use Netlify Analytics
2. **Configure forms** - Use Netlify Forms for contact forms
3. **Add search** - Consider Algolia for property search
4. **Optimize images** - Use Netlify Image CDN

This approach gives you the best of both worlds: the simplicity you want with Netlify, plus the full-stack capabilities your app needs.
