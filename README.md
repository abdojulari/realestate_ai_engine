# Real Estate Portal

A modern real estate portal built with Nuxt 4, Vuetify 3, and MySQL.

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
- MySQL 8
- SSL certificate (for production)

## Development Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd suhani
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
# Start database
docker-compose up -d db

# Run database migrations
npx prisma migrate dev

# Start development server
npm run dev
```

## Production Deployment

### Using Docker Compose (Recommended)

1. Configure environment:
```bash
# Copy production environment template
cp .env.production.example .env.production

# Edit production environment variables
nano .env.production
```

2. Set up SSL:
```bash
# Create SSL directory
mkdir -p nginx/ssl

# Add your SSL certificates
cp /path/to/your/certificates/server.crt nginx/ssl/
cp /path/to/your/certificates/server.key nginx/ssl/
```

3. Deploy:
```bash
# Using deployment script
./scripts/deploy.sh

# Or manually
docker-compose -f docker-compose.prod.yml up -d
```

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
npm run dev         # Start development server
npm run build       # Build for production
npm run preview     # Preview production build
npm run lint        # Run ESLint
npm run test        # Run tests

# Database
npx prisma generate    # Generate Prisma client
npx prisma migrate dev # Create and apply migrations
npx prisma db seed    # Seed database

# Deployment
./scripts/deploy.sh    # Deploy to production
```

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
# Backup database
docker-compose exec db mysqldump -u root -p real_estate > backup.sql

# Restore database
docker-compose exec -T db mysql -u root -p real_estate < backup.sql
```

3. Updates:
```bash
# Update dependencies
npm update

# Update containers
docker-compose pull
docker-compose up -d
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.