# Real Estate Portal

A modern real estate portal built with Nuxt 4, Vuetify 3, and PostgreSQL (Prisma).

## Documentation

| Document | Description |
|----------|-------------|
| [Production scripts runbook](docs/PRODUCTION-SCRIPTS.md) | Which `scripts/` to run in production (deploy, TLS, cron, backfill) and in what order |
| [DNS, TLS, nginx & custom domains](docs/PRODUCTION-DNS-TLS-AND-CUSTOM-DOMAINS.md) | DNS records, Let’s Encrypt, nginx paths, tenant custom domains, verification |
| [Multi-tenant setup](docs/MULTI-TENANT-SETUP.md) | Control plane, licensing, tenant routing, custom domains (API / data model) |
| [Delegation & VIP scoping](docs/delegation-vip-scoping.md) | Delegate admin permissions and VIP-related behavior |

## Features

- Interactive property search with map integration
- User authentication (Local, Google, Facebook)
- Property listing management
- Content management system
- Admin dashboard with analytics
- Responsive design for all devices

## Prerequisites

- Node.js 18 or higher
- Docker and Docker Compose
- PostgreSQL 16 (or compatible; see `prisma/schema.prisma`)
- SSL certificate (for production) — see [production DNS/TLS guide](docs/PRODUCTION-DNS-TLS-AND-CUSTOM-DOMAINS.md)

## Development Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd abdul
```

2. Install dependencies:
```bash
npm install
```

3. Create environment files:
```bash
# Copy environment templates
cp .env.example .env
cp .env.production.example .env.production

# Edit the files with your configuration
nano .env
nano .env.production
```

4. Start development environment:
```bash
# Start Postgres + Redis (same services as in docker-compose.yml / production base)
docker compose up -d db redis

# Run database migrations
npx prisma migrate dev

# Start development server
npm run dev
```

## Production Deployment

See **[Production scripts runbook](docs/PRODUCTION-SCRIPTS.md)** for deploy modes, migrations, cron jobs, and one-off tools. For DNS, certificates, and nginx for `deelbot.com` / `*.deelbot.ai` / custom tenant domains, see **[DNS, TLS & custom domains](docs/PRODUCTION-DNS-TLS-AND-CUSTOM-DOMAINS.md)**.

### Using Docker Compose (recommended)

1. Configure environment:
```bash
# Copy production environment template
cp .env.production.example .env.production

# Edit production environment variables
nano .env.production
```

2. TLS: use Let’s Encrypt (Certbot + nginx webroot) as described in the [DNS/TLS guide](docs/PRODUCTION-DNS-TLS-AND-CUSTOM-DOMAINS.md). For local smoke tests only, optional self-signed certs are documented in [`scripts/deploy.sh`](scripts/deploy.sh).

3. Deploy:
```bash
# From each repo root (no symlinks). Default nginx ports avoid clashes on one host:
#   Suhani → http://localhost:9080 , https://localhost:9443
#   Control plane → http://localhost:9081 , https://localhost:9444
./scripts/deploy.sh                       # suhani (default standalone)

cd ../saas-control-plane && ./scripts/deploy.sh
```

Use `NGINX_PUBLISH_HTTP_PORT=80` and `NGINX_PUBLISH_HTTPS_PORT=443` in `.env` when that stack should own standard ports. See [Production scripts](docs/PRODUCTION-SCRIPTS.md#0-two-repos-on-one-server-no-symlinks).

**Same stack as local:** `docker-compose.prod.yml` **includes** `docker-compose.yml`, so the app, **db** (Postgres), and **redis** services match what you run on your laptop. Production adds **nginx** and **certbot** only. Container names on the server remain `suhani-postgres` / `suhani-redis`; default DB name is **`real_estate`** (hostname **`db`** in `DATABASE_URL`). Host ports default to **5435** / **6381** so they do not clash with saas-control-plane. Override `DATABASE_URL` / `REDIS_URL` for external databases.

```bash
# Full combined stack (single compose under suhani/deploy/) — optional
./scripts/deploy.sh stack

# Or manually
docker compose -f docker-compose.prod.yml up -d --build
```

4. Optional one-off after deploy: tenant backfill — see **§2** in [PRODUCTION-SCRIPTS.md](docs/PRODUCTION-SCRIPTS.md).

### Manual Deployment

1. Build the application:
```bash
# Install dependencies
npm install

# Build for production
npm run build

# Generate Prisma client
npx prisma generate
```

2. Set up database:
```bash
# Run migrations
npx prisma migrate deploy

# Seed database (optional)
npx prisma db seed
```

3. Start the application:
```bash
# Start using Node.js
node .output/server/index.mjs
```

## Environment Variables

### Development (.env)
```env
# Database
DATABASE_URL=mysql://user:password@localhost:3306/real_estate

# Authentication
JWT_SECRET=your-jwt-secret-key
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret

# API
NUXT_PUBLIC_API_BASE=/api
NUXT_PUBLIC_SITE_URL=http://localhost:3000
```

### Production (.env.production)
```env
# Application
PORT=3000
NODE_ENV=production
NUXT_PUBLIC_API_BASE=/api
NUXT_PUBLIC_SITE_URL=https://example.com

# Database
DB_PORT=3306
MYSQL_ROOT_PASSWORD=your-root-password
MYSQL_DATABASE=real_estate
MYSQL_USER=real_estate_user
MYSQL_PASSWORD=your-db-password
DATABASE_URL=mysql://user:password@db:3306/real_estate

# Authentication
JWT_SECRET=your-secure-jwt-secret
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret

# Nginx
NGINX_PORT=80
NGINX_SSL_PORT=443
```

## Project Structure

```
├── components/       # Vue components
│   ├── admin/       # Admin panel components
│   ├── common/      # Shared components
│   ├── layout/      # Layout components
│   └── property/    # Property-related components
├── composables/     # Composable functions
├── layouts/         # Page layouts
├── pages/          # Application pages
├── prisma/         # Database schema and migrations
├── public/         # Static files
├── server/         # API routes and middleware
├── stores/         # Pinia stores
├── tests/          # Test files
├── types/          # TypeScript type definitions
└── utils/          # Utility functions
```

## Available Scripts

```bash
# Development
pnpm run dev          # Start development server (or npm run dev)
pnpm run build        # Build for production
pnpm run preview      # Preview production build
pnpm run lint         # Run ESLint
pnpm run test         # Run tests

# Database
npx prisma generate     # Generate Prisma client
npx prisma migrate dev  # Create and apply migrations (dev)
npx prisma migrate deploy  # Apply migrations (production)
npx prisma db seed      # Seed database

# Deployment & production utilities (details: docs/PRODUCTION-SCRIPTS.md)
./scripts/deploy.sh                    # Docker deploy + migrate (standalone | stack | control-plane)
./scripts/issue-custom-domain-cert.sh  # Let's Encrypt for a tenant custom domain
node scripts/backfill-tenant-admin-ids.mjs   # One-time tenant adminId backfill
node scripts/pillar9-sync.mjs         # Cron: Pillar9 sync (set env secrets)
node scripts/holistic-sync.mjs        # Cron: CREA holistic sync
node scripts/database-backup.mjs      # backup | restore | cleanup
```

Full production runbook: **[docs/PRODUCTION-SCRIPTS.md](docs/PRODUCTION-SCRIPTS.md)**.

## Security Considerations

1. SSL Configuration:
   - Use strong SSL certificates in production
   - Configure proper SSL settings in Nginx
   - Enable HTTP/2 for better performance

2. Environment Variables:
   - Never commit .env files
   - Use strong, unique secrets
   - Rotate secrets regularly

3. Authentication:
   - Use secure password hashing
   - Implement rate limiting
   - Enable two-factor authentication

4. Database:
   - Use strong passwords
   - Limit database access
   - Regular backups

## Monitoring and Maintenance

1. Logging:
   - Application logs: `docker-compose logs app`
   - Nginx logs: `docker-compose logs nginx`
   - Database logs: `docker-compose logs db`

2. Backups:
```bash
# Node backup utility (configure DATABASE_URL; see docs/PRODUCTION-SCRIPTS.md)
node scripts/database-backup.mjs backup

# Or use pg_dump / your host’s backup policy against the same DATABASE_URL
```

3. Updates:
```bash
# Update dependencies
npm update

# Update containers
docker-compose pull
docker-compose up -d
```

## Verdocs Configuration

1. Get Verdocs API credentials:
   - Go to https://app.verdocs.com/api-keys
   - Create a new API key
   - Copy the Client ID and Client Secret
   - Set the API Base to https://api.verdocs.com
   - Set the Token URL to https://api.verdocs.com/oauth/token
   - Set the API URL to https://api.verdocs.com/api/v1

2. run the following command to generate the verdocs.ts file:
```bash
npx prisma generate
```
```bash
pnpm run verdocs:smoke
```
## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.