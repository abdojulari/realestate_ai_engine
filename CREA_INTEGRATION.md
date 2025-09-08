# CREA MLS Integration

This document explains the CREA (Canadian Real Estate Association) MLS integration implemented in Suhani. This integration allows you to combine manually entered builder listings with real MLS data from the CREA DDF (Data Distribution Facility) API.

## 🎯 Overview

The integration seamlessly combines two data sources:
- **Manual Listings**: Properties manually entered by admins/agents (builder properties, exclusive listings, etc.)
- **MLS Listings**: Properties synced from the CREA DDF API (official MLS listings)

Users see a unified experience without knowing the difference between the two data sources.

## ✨ Features

- ✅ **Seamless Data Combination**: Both manual and MLS listings appear together in search results
- ✅ **Visual Indicators**: Properties show MLS/BUILDER badges to distinguish sources
- ✅ **Unified Search**: Filter, sort, and search across both data sources
- ✅ **Automatic Sync**: Admin can sync MLS data with customizable filters
- ✅ **Data Transformation**: CREA data is automatically mapped to Suhani's property schema
- ✅ **Conflict Prevention**: Unique constraints prevent duplicate listings
- ✅ **Backwards Compatible**: Existing functionality remains unchanged

## 🔧 Setup

### 1. Environment Variables

Add your CREA credentials to `.env`:

```env
# CREA DDF API Configuration
CREA_CLIENT_ID=your_client_id_here
CREA_CLIENT_SECRET=your_client_secret_here
CREA_BASE_URL=https://ddfapi.realtor.ca
```

### 2. Database Migration

Run the Prisma migration to add the new fields:

```bash
npx prisma db push
```

Or manually run the SQL migration:

```sql
-- Add new columns to Property table
ALTER TABLE "Property" 
ADD COLUMN "source" TEXT NOT NULL DEFAULT 'manual',
ADD COLUMN "externalId" TEXT,
ADD COLUMN "mlsNumber" TEXT,
ADD COLUMN "lastSyncAt" TIMESTAMP(3);

-- Add unique constraint for CREA properties
ALTER TABLE "Property" 
ADD CONSTRAINT "Property_source_externalId_key" 
UNIQUE ("source", "externalId");
```

### 3. Create System User

A system user is automatically created for MLS listings when you run your first sync.

## 📊 Admin Usage

### Accessing the CREA Sync Panel

1. Log in as an admin
2. Go to `/admin/crea-sync`
3. View statistics and sync controls

### Syncing MLS Data

1. **Open the sync panel**
2. **Set optional filters**:
   - City (e.g., "Toronto", "Vancouver")
   - Minimum price
3. **Click "Start Sync"**
4. **Monitor progress** and view results

### Sync Statistics

The admin panel shows:
- Number of MLS properties
- Number of manual listings  
- Last sync timestamp
- Sync results (created, updated, errors)

## 🔍 API Usage

### Property Search (Enhanced)

The existing `/api/properties` endpoint now supports additional parameters:

```javascript
// Get all properties (manual + MLS)
const allProperties = await propertyService.search()

// Get only manual properties
const manualOnly = await propertyService.search({ source: 'manual' })

// Get only MLS properties
const mlsOnly = await propertyService.search({ source: 'crea' })

// Traditional filtering still works
const filteredProperties = await propertyService.search({
  city: 'Toronto',
  minPrice: 500000,
  beds: 3,
  includeCrea: true,    // Include MLS listings
  includeManual: true   // Include manual listings
})
```

### Featured Properties (Enhanced)

```javascript
// Get featured properties from both sources
const featured = await propertyService.getFeaturedProperties()

// Get featured properties from specific source
const mlsFeatured = await propertyService.getFeaturedProperties({
  includeCrea: true,
  includeManual: false
})
```

## 🎨 UI Components

### Property Cards

Property cards automatically display source indicators:

- **Blue "MLS" badge**: Properties from CREA
- **Green "BUILDER" badge**: Manual properties

### Property Details

Property detail pages show additional information for MLS properties:
- MLS number
- Listing agent information
- CREA-specific features

## 🔄 Data Transformation

CREA properties are transformed to match Suhani's schema:

```javascript
// CREA Property → Suhani Property
{
  // Core mapping
  title: `${creaProperty.UnparsedAddress}, ${creaProperty.City}`,
  description: creaProperty.PublicRemarks,
  price: creaProperty.ListPrice,
  beds: creaProperty.BedroomsTotal,
  baths: creaProperty.BathroomsTotalInteger,
  sqft: creaProperty.LivingArea,
  
  // Address mapping
  address: creaProperty.UnparsedAddress,
  city: creaProperty.City,
  province: creaProperty.StateOrProvince,
  postalCode: creaProperty.PostalCode,
  latitude: creaProperty.Latitude,
  longitude: creaProperty.Longitude,
  
  // Images (sorted by order)
  images: creaProperty.Media.map(m => m.MediaURL),
  
  // Features consolidation
  features: {
    heating: creaProperty.Heating,
    cooling: creaProperty.Cooling,
    appliances: creaProperty.Appliances,
    // ... more features
  },
  
  // Integration fields
  source: 'crea',
  externalId: creaProperty.ListingKey,
  mlsNumber: creaProperty.ListingId,
  lastSyncAt: new Date()
}
```

## 🔧 Technical Implementation

### Key Files

- `server/utils/crea.service.ts` - CREA API client and data transformer
- `server/api/admin/crea/sync.post.ts` - Sync endpoint
- `server/api/properties/index.get.ts` - Enhanced property search
- `server/api/properties/featured.get.ts` - Enhanced featured properties
- `app/pages/admin/crea-sync.vue` - Admin sync interface

### Database Schema

```prisma
model Property {
  // ... existing fields ...
  
  // CREA Integration fields
  source        String    @default("manual")  // "manual" or "crea"
  externalId    String?   // CREA ListingKey for MLS properties
  mlsNumber     String?   // MLS listing number
  lastSyncAt    DateTime? // Last time synced from CREA

  @@unique([source, externalId])
}
```

### Error Handling

- **Token refresh**: Automatically handles CREA token expiration
- **Rate limiting**: Respects CREA API limits
- **Data validation**: Validates and transforms all incoming data
- **Conflict resolution**: Prevents duplicate properties
- **Graceful failures**: Continues syncing even if individual properties fail

## 🧪 Testing

Run the integration test suite:

```bash
# Set up environment
export API_BASE=http://localhost:3000
export TEST_ADMIN_TOKEN=your-admin-token

# Run tests
node scripts/test-crea-integration.mjs
```

The test suite verifies:
- Property endpoint functionality
- Source filtering
- Data structure integrity
- Search combinations

## 📈 Performance Considerations

- **Indexed queries**: Database indexes on `source` and `lastSyncAt`
- **Batch processing**: Syncs process properties in batches
- **Stale data handling**: Automatically marks old listings as sold
- **Token caching**: Reuses CREA tokens until expiration
- **Image optimization**: Uses CREA's CDN for property images

## 🚨 Important Notes

### Data Ownership
- MLS properties are read-only (cannot be edited)
- Manual properties can be edited as usual
- MLS properties are automatically updated during syncs

### Compliance
- All CREA data usage complies with DDF terms of service
- Property images are served directly from CREA's CDN
- MLS branding is preserved on property cards

### Limitations
- CREA API access requires valid credentials
- Some property fields may not have direct mappings
- Sync frequency should respect CREA rate limits

## 🔍 Troubleshooting

### Common Issues

**"Token expired" errors**
- Tokens auto-refresh, but check credentials in `.env`

**"No properties found" in sync**  
- Verify your CREA credentials have access to the market
- Try broader search filters

**Duplicate properties**
- The unique constraint prevents duplicates
- Check logs for specific conflict details

**Missing property images**
- CREA images are served from their CDN
- Fallback images are used if CREA images fail

### Debug Mode

Enable debug logging by setting:
```env
DEBUG=crea:*
```

## 📞 Support

For issues related to:
- **CREA API access**: Contact CREA support
- **Integration bugs**: Check application logs
- **Data mapping**: Review transformation logic in `crea.service.ts`

---

This integration provides a powerful foundation for combining builder listings with comprehensive MLS data, creating a rich property search experience for your users.
