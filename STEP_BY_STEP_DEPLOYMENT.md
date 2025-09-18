# Complete Step-by-Step Deployment Guide
## For homesbyabdulojulari.ca

---

## ✅ STEP 1: Set Up Supabase Database (FREE)

### What is Supabase?
- **Free PostgreSQL database** in the cloud (up to 500MB free)
- **No credit card required** for free tier
- **Same as PostgreSQL** - your existing code works without changes
- **Automatic backups** and scaling

### 1.1 Create Supabase Account
1. Go to [supabase.com](https://supabase.com)
2. Click "Start your project"
3. Sign up with GitHub or email
4. **No credit card needed**

### 1.2 Create New Project
1. Click "New Project"
2. **Organization**: Choose your personal org
3. **Project Name**: `suhani-real-estate`
4. **Database Password**: Create a strong password (SAVE THIS!)
5. **Region**: Choose closest to you (Canada Central)
6. Click "Create new project"
7. **Wait 2-3 minutes** for setup to complete

### 1.3 Get Database Connection String
1. In your Supabase project dashboard
2. Go to **Settings** → **Database**
3. Scroll down to **Connection string**
4. Copy the **URI** format connection string
5. It looks like: `postgresql://postgres:[YOUR-PASSWORD]@db.xxx.supabase.co:5432/postgres`
6. **SAVE THIS** - you'll need it later

---

## ✅ STEP 2: Update Your Code for Supabase

### 2.1 No Code Changes Needed!
Your existing Prisma code works exactly the same because:
- Supabase **IS** PostgreSQL
- Same connection format
- Same SQL syntax
- Only the connection string changes

### 2.2 Test Connection Locally (Optional)
```bash
# In your terminal, test the connection
export DATABASE_URL="your_supabase_connection_string_here"
npx prisma db push
```

---

## ✅ STEP 3: Create Netlify Configuration

### 3.1 Create netlify.toml file
```bash
# In your project root (/Users/abdul.ojulari/Frontends/suhani/)
touch netlify.toml
```

### 3.2 Add Configuration
Copy this into `netlify.toml`:

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

### 3.3 Update nuxt.config.ts
Add this to your `nuxt.config.ts`:

```typescript
export default defineNuxtConfig({
  // ... your existing config
  nitro: {
    preset: 'netlify',
  },
  // Keep the rest of your config unchanged
})
```

---

## ✅ STEP 4: Deploy to Netlify

### 4.1 Install Netlify CLI
```bash
npm install -g netlify-cli
```

### 4.2 Login to Netlify
```bash
netlify login
# This opens browser - sign up/login with GitHub or email
```

### 4.3 Initialize Your Site
```bash
# In your project directory
netlify init

# Choose:
# - "Create & configure a new site"
# - Choose your team
# - Site name: "suhani-real-estate" (or leave default)
```

### 4.4 Set Environment Variables
**IMPORTANT**: Don't put .env files in your code. Set them in Netlify dashboard:

1. Go to [netlify.com](https://netlify.com) → Your Sites
2. Click on your site
3. Go to **Site settings** → **Environment variables**
4. Click **Add variable** for each:

```
DATABASE_URL = your_supabase_connection_string_here
JWT_SECRET = your_jwt_secret_here
GOOGLE_CLIENT_ID = your_google_client_id
GOOGLE_CLIENT_SECRET = your_google_client_secret
FACEBOOK_APP_ID = your_facebook_app_id
FACEBOOK_APP_SECRET = your_facebook_app_secret
NUXT_PUBLIC_API_BASE = https://your-site-name.netlify.app/api
NUXT_PUBLIC_SITE_URL = https://your-site-name.netlify.app
SMTP_USERNAME = your_smtp_username
SMTP_PASSWORD = your_smtp_password
SMTP_HOSTNAME = your_smtp_hostname
SMTP_PORT = 587
SMTP_SENDER = info@homesbyabdulojulari.ca
AGENT_EMAIL = info@homesbyabdulojulari.ca
OPENCAGE_API_KEY = your_opencage_api_key
```

### 4.5 Deploy
```bash
# Build and deploy
netlify deploy --prod
```

### 4.6 Run Database Migrations
```bash
# Set your DATABASE_URL temporarily for migration
export DATABASE_URL="your_supabase_connection_string"
npx prisma migrate deploy
npx prisma generate
```

---

## ✅ STEP 5: Purchase Domain (homesbyabdulojulari.ca)

### 5.1 Buy the Domain
**Canadian .ca domains** must be purchased from Canadian registrars:

**Recommended Canadian Registrars:**
- **Namecheap.com** (~$15-20/year for .ca)
- **GoDaddy.ca** (~$15-25/year)
- **Web.com** (~$20/year)

### 5.2 Purchase Steps
1. Go to your chosen registrar
2. Search for `homesbyabdulojulari.ca`
3. Add to cart
4. **Important for .ca domains**: You need Canadian presence
   - Use your Canadian address
   - Select "Canadian citizen" or "Canadian business"
5. Complete purchase

---

## ✅ STEP 6: Connect Domain to Netlify

### 6.1 Add Domain in Netlify
1. Go to Netlify Dashboard → Your Site
2. Click **Domain settings**
3. Click **Add custom domain**
4. Enter: `homesbyabdulojulari.ca`
5. Click **Verify**
6. Netlify will show you DNS records to add

### 6.2 Configure DNS at Your Registrar
In your domain registrar's DNS settings, add these records:

```
Type: A
Name: @
Value: 75.2.60.5

Type: CNAME
Name: www
Value: your-site-name.netlify.app
```

### 6.3 Wait for SSL
- SSL certificate will be automatically created (takes 5-10 minutes)
- Your site will be available at `https://homesbyabdulojulari.ca`

---

## ✅ STEP 7: Set Up Email (info@homesbyabdulojulari.ca)

### 7.1 Email Hosting Options

**Option A: Google Workspace (Recommended)**
- Cost: $6 CAD/month per user
- Professional email with Gmail interface
- 30GB storage

**Option B: Microsoft 365**
- Cost: $6 CAD/month per user
- Outlook interface
- 50GB storage

**Option C: Zoho Mail**
- Cost: $1 USD/month per user
- Basic but functional

### 7.2 Set Up Google Workspace (Recommended)
1. Go to [workspace.google.com](https://workspace.google.com)
2. Click "Get started"
3. Enter your domain: `homesbyabdulojulari.ca`
4. Create admin account: `info@homesbyabdulojulari.ca`
5. Follow verification steps
6. Add MX records to your domain DNS:

```
Type: MX
Name: @
Value: ASPMX.L.GOOGLE.COM
Priority: 1

Type: MX
Name: @
Value: ALT1.ASPMX.L.GOOGLE.COM
Priority: 5

Type: MX
Name: @
Value: ALT2.ASPMX.L.GOOGLE.COM
Priority: 5
```

---

## ✅ STEP 8: Update Environment Variables

### 8.1 Update Netlify Environment Variables
Go back to Netlify → Site settings → Environment variables and update:

```
NUXT_PUBLIC_SITE_URL = https://homesbyabdulojulari.ca
SMTP_SENDER = info@homesbyabdulojulari.ca
AGENT_EMAIL = info@homesbyabdulojulari.ca
```

### 8.2 Redeploy
```bash
netlify deploy --prod
```

---

## ✅ STEP 9: Final Testing

### 9.1 Test Your Site
1. Visit `https://homesbyabdulojulari.ca`
2. Test user registration
3. Test property listings
4. Test contact forms
5. Test email functionality

### 9.2 Test Email
1. Send test email from contact form
2. Check if it arrives at `info@homesbyabdulojulari.ca`

---

## 🎉 CONGRATULATIONS!

Your site is now live at:
- **Website**: https://homesbyabdulojulari.ca
- **Email**: info@homesbyabdulojulari.ca
- **Database**: Supabase (PostgreSQL)
- **Hosting**: Netlify

## 💰 Total Monthly Costs

- **Netlify**: $0 (free tier)
- **Supabase**: $0 (free tier)
- **Domain**: ~$15-20/year (~$1.50/month)
- **Email**: $6 CAD/month (Google Workspace)
- **Total**: ~$7.50 CAD/month

---

## 🚨 Important Notes

### Environment Variables Security
- **NEVER** commit `.env` files to Git
- **ALWAYS** use Netlify dashboard for environment variables
- **NEVER** share your database connection string

### Backup Strategy
- Supabase automatically backs up your database
- Export important data regularly
- Keep a local copy of your environment variables

### Monitoring
- Check Netlify deploy logs regularly
- Monitor Supabase database usage
- Set up error tracking (Sentry recommended)

---

## 🆘 If Something Goes Wrong

### Common Issues & Solutions

**1. Build Fails**
```bash
# Check build logs in Netlify dashboard
# Usually missing environment variables
```

**2. Database Connection Fails**
```bash
# Verify DATABASE_URL in Netlify environment variables
# Test connection locally first
```

**3. Domain Not Working**
- Wait 24-48 hours for DNS propagation
- Check DNS records are correct
- Verify domain ownership

**4. Email Not Working**
- Verify MX records in DNS
- Check spam folder
- Verify SMTP settings

### Getting Help
- **Netlify**: Check deploy logs in dashboard
- **Supabase**: Check project logs in dashboard
- **Domain**: Contact your registrar support
- **Email**: Contact Google Workspace support

---

## 📋 Quick Reference

### Important URLs
- **Netlify Dashboard**: https://app.netlify.com
- **Supabase Dashboard**: https://app.supabase.com
- **Your Site**: https://homesbyabdulojulari.ca
- **Email**: https://mail.google.com

### Important Commands
```bash
# Deploy to Netlify
netlify deploy --prod

# Run database migrations
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate

# Check site status
netlify status
```

Ready to start? Let's begin with Step 1!
