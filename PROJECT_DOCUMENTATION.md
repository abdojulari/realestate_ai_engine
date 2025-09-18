# 🏠 Alberta Real Estate Platform - Complete Documentation

## 📋 Table of Contents
1. [Project Overview](#project-overview)
2. [CREA Integration](#crea-integration)
3. [Neighborhood System](#neighborhood-system)
4. [Email System](#email-system)
5. [Setup & Configuration](#setup--configuration)
6. [API Endpoints](#api-endpoints)
7. [Database Management](#database-management)
8. [Troubleshooting](#troubleshooting)
9. [Deployment](#deployment)

---

## 🏢 Project Overview

This is a comprehensive Alberta real estate platform built with Nuxt 3, integrating with CREA MLS data and providing advanced search capabilities including neighborhood-based filtering.

### Key Features
- **CREA MLS Integration**: Direct sync with Alberta MLS data (~9,300 properties)
- **Neighborhood Search**: City and neighborhood-based property filtering
- **Market Overview**: Comprehensive market analytics across 432+ Alberta cities
- **Advanced Search**: AI-powered search, map search, and traditional filtering
- **Email System**: Automated notifications and inquiry management
- **Admin Panel**: Property management, user management, and system settings

### Technology Stack
- **Frontend**: Nuxt 3, Vue 3, Vuetify 3, TypeScript
- **Backend**: Nuxt Server API, Prisma ORM
- **Database**: PostgreSQL
- **External APIs**: CREA MLS, OpenCage Geocoding
- **Hosting**: Vercel/Netlify compatible

---

## 🔗 CREA Integration

### Overview
The platform integrates directly with the Canadian Real Estate Association (CREA) MLS system to sync property data from Alberta.

### Key Components

#### 1. Sync Endpoints
- **`/api/crea/sync-alberta`**: Bulk sync Alberta properties
- **Token Management**: Automatic CREA token refresh
- **Rate Limiting**: Respects CREA API limits
- **Duplicate Prevention**: Uses `source` + `externalId` unique constraints

#### 2. Data Transformation
Properties are transformed from CREA format to internal schema:
```javascript
{
  source: 'crea',
  externalId: creaProperty.ListingKey,
  mlsNumber: creaProperty.MlsNumber,
  title: creaProperty.PropertyName,
  price: creaProperty.ListPrice,
  // ... other fields
}
```

#### 3. Scripts
- **`sync-all-alberta.mjs`**: Bulk sync script for all Alberta properties
- **`test-crea-integration.mjs`**: Integration testing

### Configuration
Set environment variables:
```bash
CREA_USERNAME=your_crea_username
CREA_PASSWORD=your_crea_password
CREA_AGENT_ID=your_agent_id
```

### Current Status
- **✅ Active**: 9,265 properties synced from CREA
- **✅ Cities**: 432 Alberta cities covered
- **✅ Updates**: Regular sync capability
- **✅ Images**: Property images downloaded and cached

---

## 🏘️ Neighborhood System

### Overview
Advanced neighborhood-based property filtering using OpenCage geocoding to map properties to specific neighborhoods and communities.

### Database Schema

#### Neighborhood Table
```sql
model Neighborhood {
  id              Int    @id @default(autoincrement())
  name            String // e.g., "Downtown", "Beltline"
  city            String // e.g., "Calgary"
  province        String // e.g., "Alberta"
  country         String @default("Canada")
  
  centerLatitude  Float?
  centerLongitude Float?
  propertyCount   Int    @default(0)
  averagePrice    Float?
  
  properties      PropertyNeighborhood[]
  
  @@unique([name, city, province])
}
```

#### Property-Neighborhood Relationship
```sql
model PropertyNeighborhood {
  id             Int @id @default(autoincrement())
  propertyId     Int @unique
  neighborhoodId Int
  
  property       Property      @relation(fields: [propertyId], references: [id])
  neighborhood   Neighborhood  @relation(fields: [neighborhoodId], references: [id])
  
  confidence     Int?
  lastLookup     DateTime @default(now())
}
```

### Components

#### 1. NeighborhoodDropdown
Autocomplete dropdown for neighborhood selection:
- Real-time search
- Property counts per neighborhood
- City filtering
- Mobile responsive

#### 2. CityNeighborhoodDropdown
Combined search for both cities and neighborhoods:
- Unified search interface
- Type differentiation (city vs neighborhood)
- Smart sorting by property count

#### 3. Market Overview
Comprehensive market analytics:
- City-level statistics (432 cities)
- Neighborhood-level details (sample data)
- Interactive tables and charts
- Export capabilities

### API Endpoints
- **`GET /api/neighborhoods`**: List neighborhoods with filtering
- **`GET /api/neighborhoods/{id}/properties`**: Properties in neighborhood
- **`GET /api/properties/city-stats`**: City-level statistics

### Geocoding Integration
Uses OpenCage API to map coordinates to neighborhoods:
```bash
# Set API key
export OPENCAGE_API_KEY=your_key_here

# Sync neighborhoods for properties
node scripts/sync-neighborhoods.mjs --limit=100
```

### Current Status
- **✅ Schema**: Database tables created and migrated
- **✅ Components**: Dropdown and search components ready
- **✅ API**: All endpoints functional
- **📊 Sample Data**: 44 neighborhoods across 9 cities
- **🔄 Expansion**: Ready for full geocoding rollout

---

## 📧 Email System

### Overview
Comprehensive email system for notifications, inquiries, and marketing communications.

### Features
- **SMTP Integration**: Gmail/custom SMTP support
- **Template System**: Dynamic email templates
- **Queue Management**: Background job processing
- **Tracking**: Email delivery and open tracking
- **Templates**: Welcome, inquiry, alert emails

### Configuration
Environment variables:
```bash
SMTP_HOSTNAME=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your_email@gmail.com
SMTP_PASSWORD=your_app_password
SMTP_SENDER=info@yourdomain.com
```

### Database Settings
Settings are stored in database for runtime configuration:
```javascript
// Email settings migrated to database
await prisma.setting.createMany({
  data: [
    { key: 'email.provider', value: 'smtp' },
    { key: 'email.fromEmail', value: process.env.SMTP_USERNAME },
    { key: 'email.smtp.hostname', value: process.env.SMTP_HOSTNAME },
    // ... other settings
  ]
})
```

### Email Templates
Stored in database with dynamic placeholders:
```javascript
{
  name: 'Property Inquiry',
  subject: 'New Inquiry for {{propertyTitle}}',
  content: 'Hello {{agentName}}, you have a new inquiry...',
  type: 'inquiry'
}
```

### Scripts
- **`seed-email-templates.mjs`**: Populate email templates
- **`test-email-integration.mjs`**: Test email functionality
- **`migrate-env-to-database.mjs`**: Migrate email settings

---

## ⚙️ Setup & Configuration

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- CREA MLS API access
- OpenCage API key (optional, for geocoding)

### Installation
```bash
# Clone and install dependencies
npm install

# Setup database
npx prisma migrate dev
npx prisma generate

# Setup environment variables
cp .env.example .env
# Edit .env with your configuration

# Migrate settings to database
node scripts/consolidated-tools.mjs migrate-env

# Seed initial data
node scripts/consolidated-tools.mjs seed-emails
node scripts/consolidated-tools.mjs seed-neighborhoods

# Start development server
npm run dev
```

### Environment Variables
```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/database"

# CREA Integration
CREA_USERNAME=your_username
CREA_PASSWORD=your_password
CREA_AGENT_ID=your_agent_id

# Email
SMTP_HOSTNAME=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your_email@gmail.com
SMTP_PASSWORD=your_app_password

# APIs
OPENCAGE_API_KEY=your_opencage_key
GOOGLE_MAPS_API_KEY=your_google_maps_key

# Application
NUXT_SECRET_KEY=your_secret_key
AGENT_EMAIL=agent@domain.com
SITE_URL=https://yourdomain.com
```

---

## 🔌 API Endpoints

### Properties
- **`GET /api/properties`**: List properties with filtering
  - Query params: `city`, `neighborhoodId`, `minPrice`, `maxPrice`, `beds`, `baths`, etc.
  - Pagination: `page`, `limit`
  - Response: Paginated property list

- **`GET /api/properties/{id}`**: Get single property
- **`POST /api/properties`**: Create property (auth required)
- **`PUT /api/properties/{id}`**: Update property (auth required)
- **`DELETE /api/properties/{id}`**: Delete property (auth required)

### Cities & Neighborhoods
- **`GET /api/properties/city-stats`**: City-level statistics
- **`GET /api/neighborhoods`**: List neighborhoods
- **`GET /api/neighborhoods/{id}/properties`**: Properties in neighborhood

### CREA Integration
- **`POST /api/crea/sync-alberta`**: Sync Alberta properties
- **`GET /api/crea/token`**: Get CREA authentication token

### Search
- **`POST /api/ai/parse-property-query`**: AI-powered query parsing
- **`GET /api/search/suggestions`**: Search suggestions

### Users & Auth
- **`POST /api/auth/login`**: User authentication
- **`POST /api/auth/register`**: User registration
- **`GET /api/users/profile`**: User profile (auth required)

---

## 💾 Database Management

### Backup System
Automated backup creation with comprehensive data export:

```bash
# Create backup
node scripts/consolidated-tools.mjs backup-database

# Backup includes:
# - All properties
# - Neighborhoods and relationships
# - Users (excluding passwords)
# - Settings and email templates
# - Metadata and statistics
```

### Schema Management
```bash
# Create migration
npx prisma migrate dev --name migration_name

# Reset database (development only)
npx prisma migrate reset

# Generate client
npx prisma generate

# View database
npx prisma studio
```

### Data Verification
```bash
# Verify data integrity
node scripts/consolidated-tools.mjs verify-data

# Analyze market data
node scripts/consolidated-tools.mjs analyze-market
```

---

## 🔧 Troubleshooting

### Common Issues

#### 1. CREA Integration Errors
```bash
# Test integration
node scripts/consolidated-tools.mjs test-integration

# Common fixes:
# - Verify CREA credentials
# - Check API rate limits
# - Ensure server is running
```

#### 2. Database Connection Issues
```bash
# Verify database connection
npx prisma db pull

# Common fixes:
# - Check DATABASE_URL
# - Ensure PostgreSQL is running
# - Verify credentials
```

#### 3. Email System Issues
```bash
# Test email configuration
node scripts/test-email-integration.mjs

# Common fixes:
# - Check SMTP credentials
# - Verify app passwords for Gmail
# - Test with different SMTP provider
```

#### 4. Neighborhood System Issues
```bash
# Test neighborhood system
node scripts/consolidated-tools.mjs test-neighborhoods

# Common fixes:
# - Ensure OpenCage API key is set
# - Check geocoding service connectivity
# - Verify neighborhood data exists
```

### Performance Optimization
- **Database Indexing**: Added indexes on frequently queried fields
- **API Rate Limiting**: Implemented for external API calls
- **Image Optimization**: Automatic image resizing and caching
- **Query Optimization**: Optimized database queries with proper joins

---

## 🚀 Deployment

### Pre-deployment Checklist
```bash
# 1. Run tests
node scripts/consolidated-tools.mjs test-integration

# 2. Create backup
node scripts/consolidated-tools.mjs backup-database

# 3. Build application
npm run build

# 4. Verify environment variables
# 5. Test production build locally
npm run preview
```

### Vercel Deployment
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard
# Add PostgreSQL database (Vercel Postgres or external)
```

### Environment Setup
1. **Database**: Set up PostgreSQL (Vercel Postgres, Railway, etc.)
2. **Environment Variables**: Configure all required variables in hosting platform
3. **Domain**: Configure custom domain and SSL
4. **CDN**: Set up image CDN for property photos

### Post-deployment
1. Run database migrations
2. Seed initial data
3. Test all integrations
4. Monitor error logs
5. Set up monitoring and alerts

---

## 🛠️ Maintenance Scripts

### Consolidated Tools
Use the main management script:
```bash
# Show all available commands
node scripts/consolidated-tools.mjs help

# Common maintenance tasks
node scripts/consolidated-tools.mjs verify-data
node scripts/consolidated-tools.mjs backup-database
node scripts/consolidated-tools.mjs analyze-market
```

### Individual Scripts (Legacy)
- **`sync-all-alberta.mjs`**: CREA property sync
- **`verify-neighborhood-math.mjs`**: Data verification
- **`migrate-env-to-database.mjs`**: Environment migration

---

## 📊 Current Statistics

### Database
- **Properties**: 9,265 active listings
- **Cities**: 432 Alberta cities/areas
- **Neighborhoods**: 44 sample neighborhoods (expandable)
- **Users**: User management system active

### Features
- **✅ CREA Integration**: Fully operational
- **✅ Search System**: Multi-modal search (text, AI, map)
- **✅ Neighborhood Filtering**: City + neighborhood dropdown
- **✅ Market Overview**: Comprehensive analytics
- **✅ Email System**: Notifications and inquiries
- **✅ Admin Panel**: Property and user management

### Performance
- **API Response**: < 500ms average
- **Search Results**: Sub-second response times
- **Image Loading**: CDN optimized
- **Database**: Indexed and optimized queries

---

## 🔮 Future Enhancements

### Planned Features
1. **Full Neighborhood Coverage**: Geocode all 9,265 properties
2. **Price Predictions**: ML-based price estimation
3. **Market Trends**: Historical price analysis
4. **Mobile App**: React Native mobile application
5. **Advanced Analytics**: Market insights and reporting

### Technical Improvements
1. **Caching Layer**: Redis for improved performance
2. **Real-time Updates**: WebSocket property updates
3. **API Rate Limiting**: Enhanced rate limiting
4. **Monitoring**: Advanced error tracking and monitoring
5. **Testing**: Comprehensive test suite

---

## 📞 Support & Contact

For technical issues or questions:
1. Check troubleshooting section above
2. Review API documentation
3. Test with consolidated tools script
4. Check error logs and console output

This documentation covers the complete Alberta Real Estate Platform. Keep this updated as new features are added or configurations change.
