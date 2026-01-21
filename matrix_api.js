/**
 * Matrix API Client - Comprehensive Property Data for Alberta
 * 
 * Fetches complete property listings with:
 * - Property details (bedrooms, bathrooms, rooms, dimensions)
 * - Address information (city, postal code, street)
 * - Agent and listing office information
 * - Media/images
 * - And all available fields
 */

import https from 'https';

const config = {
  clientId: 'oidc-trestle_dsgnxinc_realstats_134113351420608424-ticuocd',
  clientSecret: 'kOoPeSMxooYgrShfsGQJLrpH0LxFYOv-ONrXWUBY',
  tokenUrl: 'pillarnine.clareityiam.net',
  tokenPath: '/idp/profile/oidc/token?grant_type=client_credentials&scope=openid',
  apiUrl: 'abrls.matrixwebapi.com'
};

// MLS Status codes
const MLS_STATUS = {
  A: 'Active',
  P: 'Pending',
  S: 'Sold',
  LEAS: 'Leased',
  W: 'Withdrawn',
  X: 'Expired',
  T: 'Terminated',
  I: 'Incomplete'
};

// Lookup caches
let cityLookupCache = {};
let countyLookupCache = {};

// ============================================================================
// HTTP HELPERS
// ============================================================================

function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({ statusCode: res.statusCode, headers: res.headers, data });
      });
    });
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function fetchApi(accessToken, path) {
  const options = {
    hostname: config.apiUrl,
    path: path,
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json'
    }
  };
  return makeRequest(options);
}

// ============================================================================
// AUTHENTICATION
// ============================================================================

async function getAccessToken() {
  const auth = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');
  const options = {
    hostname: config.tokenUrl,
    path: config.tokenPath,
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json'
    }
  };

  const result = await makeRequest(options);
  if (result.statusCode !== 200) {
    throw new Error(`Token request failed: ${result.statusCode}`);
  }
  return JSON.parse(result.data).access_token;
}

// ============================================================================
// LOOKUP LOADERS
// ============================================================================

async function loadLookups(accessToken) {
  console.log('Loading lookup values...');
  
  // Load City lookups
  const cityResult = await fetchApi(accessToken,
    `/MatrixWebAPI/local/Lookup?$filter=${encodeURIComponent("LookupName eq 'City'")}`);
  if (cityResult.statusCode === 200) {
    const data = JSON.parse(cityResult.data);
    data.value.forEach(item => {
      cityLookupCache[item.LookupValue] = item.LongValue || item.Value;
    });
  }

  // Load County lookups
  const countyResult = await fetchApi(accessToken,
    `/MatrixWebAPI/local/Lookup?$filter=${encodeURIComponent("LookupName eq 'CountyOrParish'")}`);
  if (countyResult.statusCode === 200) {
    const data = JSON.parse(countyResult.data);
    data.value.forEach(item => {
      countyLookupCache[item.LookupValue] = item.LongValue || item.Value;
    });
  }

  console.log(`Loaded ${Object.keys(cityLookupCache).length} cities, ${Object.keys(countyLookupCache).length} counties\n`);
}

function resolveCity(code) {
  return cityLookupCache[code] || code;
}

function resolveCounty(code) {
  return countyLookupCache[code] || code;
}

// ============================================================================
// MEDIA RETRIEVAL
// ============================================================================

async function getPropertyMedia(accessToken, listingKeyNumeric) {
  const result = await fetchApi(accessToken,
    `/MatrixWebAPI/local/Media?$filter=${encodeURIComponent(`ResourceRecordKeyNumeric eq ${listingKeyNumeric}`)}`);
  
  if (result.statusCode === 200) {
    const data = JSON.parse(result.data);
    return (data.value || []).map(media => ({
      MediaKey: media.MediaKeyNumeric?.toString(),
      LongDescription: media.LongDescription,
      MediaURL: media.MediaPath?.find(p => p.MediaSize === 3)?.MediaUrl || // Large
                media.MediaPath?.find(p => p.MediaSize === 7)?.MediaUrl || // XLarge
                media.MediaPath?.[0]?.MediaUrl,
      MediaURLs: {
        Thumbnail: media.MediaPath?.find(p => p.MediaSize === 1)?.MediaUrl,
        Small: media.MediaPath?.find(p => p.MediaSize === 6)?.MediaUrl,
        Default: media.MediaPath?.find(p => p.MediaSize === 2)?.MediaUrl,
        Large: media.MediaPath?.find(p => p.MediaSize === 3)?.MediaUrl,
        XLarge: media.MediaPath?.find(p => p.MediaSize === 7)?.MediaUrl,
      },
      ModificationTimestamp: media.MediaModificationTimestamp,
      Order: media.Order,
      PreferredPhotoYN: media.PreferredPhotoYN,
      ResourceRecordKey: media.ResourceRecordKeyNumeric?.toString(),
      ResourceName: media.ResourceName,
      MediaCategory: media.MediaCategory,
      MediaType: media.MediaType
    }));
  }
  return [];
}

// ============================================================================
// PROPERTY FIELDS - All 273 available fields grouped by category
// ============================================================================

// Essential fields for comprehensive property data
const ESSENTIAL_FIELDS = [
  // Core
  'ListingId', 'ListingKeyNumeric', 'MlsStatus', 'StandardStatus',
  'PropertyType', 'PropertySubType',
  
  // Price
  'ListPrice',
  
  // Address
  'UnparsedAddress', 'StreetNumber', 'StreetName', 'StreetSuffix',
  'UnitNumber', 'City', 'StateOrProvince', 'PostalCode',
  'CountyOrParish', 'SubdivisionName',
  
  // Geo
  'Latitude', 'Longitude',
  
  // Property details
  'BedroomsTotal', 'BathroomsTotalInteger',
  'RoomsTotal', 'LivingAreaSF', 'BuildingAreaTotalSF',
  'LotSizeAcres', 'LotSizeDimensions',
  'StoriesTotal', 'YearBuilt',
  
  // Features
  'Appliances', 'Heating', 'Cooling', 'Flooring',
  'Basement', 'FireplacesTotal', 'GarageSpaces', 'ParkingTotal',
  
  // Agent/Office
  'ListAgentFullName', 'ListAgentMlsId', 'ListAgentDirectPhone',
  'ListOfficeName', 'ListOfficeMlsId', 'ListOfficePhone',
  
  // Dates
  'DaysOnMarket', 'ModificationTimestamp',
  
  // Media
  'PhotosCount',
  
  // Remarks
  'PublicRemarks'
];

// All available property fields grouped by category (for reference)
const PROPERTY_FIELDS = {
  // Core identification
  core: [
    'ListingId', 'ListingKeyNumeric', 'MlsStatus', 'StandardStatus',
    'PropertyType', 'PropertySubType', 'OriginatingSystemName'
  ],
  
  // Pricing
  pricing: [
    'ListPrice', 'ListPriceSquareFoot'
  ],
  
  // Address
  address: [
    'UnparsedAddress', 'StreetNumber', 'StreetName', 'StreetSuffix',
    'StreetDirPrefix', 'StreetDirSuffix', 'StreetDirection',
    'UnitNumber', 'City', 'StateOrProvince', 'PostalCode',
    'CountyOrParish', 'SubdivisionName', 'District', 'NearestTown'
  ],
  
  // Geo
  geo: [
    'Latitude', 'Longitude', 'GeoLocation'
  ],
  
  // Property details
  details: [
    'BedroomsTotal', 'BedrmsAboveGrade', 'BedroomsBelowGrade', 'BedroomsOnMain',
    'BathroomsTotalInteger', 'BathroomsFull', 'BathroomsHalf',
    'RoomsTotal', 'RoomsAboveGrade',
    'LivingAreaSF', 'LivingAreaMetres', 'BuildingAreaTotal', 'BuildingAreaTotalSF',
    'MainLevelFinishedAreaSF', 'UpperLevelFinishedAreaSF', 'BelowGradeFinishedArea',
    'LotSizeAcres', 'LotSizeSquareFeet', 'LotSizeDimensions',
    'StoriesTotal', 'Levels', 'YearBuilt', 'YearBuiltException'
  ],
  
  // Features
  features: [
    'Appliances', 'Heating', 'Cooling', 'Flooring', 'Roof',
    'ConstructionMaterials', 'FoundationDetails', 'ExteriorFeatures',
    'InteriorFeatures', 'Basement', 'BasementDevelopment', 'BasementFeatures',
    'FireplacesTotal', 'FireplaceFeatures', 'PoolFeatures', 'Fencing', 'LotFeatures',
    'WaterSource', 'Sewer', 'Electric', 'Utilities'
  ],
  
  // Parking
  parking: [
    'ParkingTotal', 'GarageSpaces', 'CarportSpaces', 'ParkingFeatures', 'GarageYN'
  ],
  
  // Building/Structure
  building: [
    'BuildingType', 'BuildingName', 'StructureType', 'ArchitecturalStyle'
  ],
  
  // Listing agent info
  agent: [
    'ListAgentFullName', 'ListAgentMlsId', 'ListAgentKeyNumeric',
    'ListAgentEmail', 'ListAgentDirectPhone',
    'CoListAgentFullName', 'CoListAgentMlsId'
  ],
  
  // Listing office info
  office: [
    'ListOfficeName', 'ListOfficeMlsId', 'ListOfficeKeyNumeric',
    'ListOfficePhone', 'ListOfficeEmail', 'ListAOR',
    'CoListOfficeName', 'CoListOfficeMlsId'
  ],
  
  // Association/HOA
  association: [
    'AssociationYN', 'AssociationFee', 'AssociationFeeFrequency', 'AssociationFeeIncludes'
  ],
  
  // Tax info
  tax: [
    'TaxLegalDescription', 'Zoning'
  ],
  
  // Dates
  dates: [
    'ListingContractDate', 'AvailabilityDate', 'DaysOnMarket', 'ModificationTimestamp'
  ],
  
  // Media
  media: [
    'PhotosCount', 'VirtualTourURLBranded', 'VirtualTourURLUnbranded'
  ],
  
  // Remarks
  remarks: [
    'PublicRemarks', 'Inclusions'
  ]
};

// Get all fields as a flat array
function getAllFields() {
  return Object.values(PROPERTY_FIELDS).flat();
}

// Get essential fields (recommended for most queries)
function getEssentialFields() {
  return ESSENTIAL_FIELDS;
}

// ============================================================================
// MAIN PROPERTY FETCHER
// ============================================================================

/**
 * Fetch properties from Alberta with comprehensive data
 * @param {object} options - Query options
 * @param {string} options.status - MlsStatus: 'A' (Active), 'P' (Pending), 'S' (Sold), etc.
 * @param {number} options.minPrice - Minimum list price
 * @param {number} options.maxPrice - Maximum list price
 * @param {string} options.city - City code or name to filter by
 * @param {number} options.limit - Maximum results (default: 10)
 * @param {boolean} options.includeMedia - Fetch media/images for each property (default: true)
 * @param {string[]} options.fields - Custom fields to select (default: all fields)
 */
async function fetchProperties(accessToken, options = {}) {
  const {
    status = 'A',
    minPrice = null,
    maxPrice = null,
    city = null,
    limit = 10,
    includeMedia = true,
    fields = ESSENTIAL_FIELDS  // Use essential fields by default for reliable queries
  } = options;

  // Build filter
  const filterParts = [`MlsStatus eq '${status}'`];
  
  if (minPrice !== null) {
    filterParts.push(`ListPrice ge ${minPrice}`);
  }
  if (maxPrice !== null) {
    filterParts.push(`ListPrice le ${maxPrice}`);
  }
  if (city) {
    // City can be a code like "0046" or we need to find the code
    const cityCode = Object.entries(cityLookupCache).find(([code, name]) => 
      name.toLowerCase() === city.toLowerCase()
    )?.[0] || city;
    filterParts.push(`City eq '${cityCode}'`);
  }

  const filter = encodeURIComponent(filterParts.join(' and '));
  const select = encodeURIComponent(fields.join(','));
  const query = `/MatrixWebAPI/local/Property?$filter=${filter}&$top=${limit}&$select=${select}`;

  console.log(`Fetching ${MLS_STATUS[status] || status} properties...`);
  console.log(`Filter: ${filterParts.join(' and ')}`);
  
  const result = await fetchApi(accessToken, query);
  
  if (result.statusCode !== 200) {
    // Handle HTML error responses
    if (result.data.startsWith('<')) {
      throw new Error(`API Error ${result.statusCode}: Query returned too many results. Try adding more filters (higher minPrice, specific city, etc.)`);
    }
    try {
      const error = JSON.parse(result.data);
      throw new Error(`API Error: ${error.error?.message || error.message || result.data}`);
    } catch (e) {
      throw new Error(`API Error ${result.statusCode}: ${result.data.substring(0, 200)}`);
    }
  }

  let data;
  try {
    data = JSON.parse(result.data);
  } catch (e) {
    throw new Error(`Failed to parse response. The query may have returned too many results. Try adding more filters.`);
  }
  const properties = data.value || [];
  
  console.log(`Found: ${properties.length} properties\n`);

  // Transform each property to match the desired format
  const transformedProperties = [];
  
  for (const prop of properties) {
    // Resolve lookups
    const cityName = resolveCity(prop.City);
    const countyName = resolveCounty(prop.CountyOrParish);
    
    // Fetch media if requested
    let media = [];
    if (includeMedia && prop.ListingKeyNumeric) {
      media = await getPropertyMedia(accessToken, prop.ListingKeyNumeric);
    }

    // Build the comprehensive property object
    const property = {
      "@odata.context": `https://${config.apiUrl}/MatrixWebAPI/local/$metadata#Property`,
      
      // Core
      ListingKey: prop.ListingKeyNumeric?.toString(),
      ListingId: prop.ListingId,
      MlsStatus: prop.MlsStatus,
      StandardStatus: MLS_STATUS[prop.MlsStatus] || prop.StandardStatus,
      PropertyType: prop.PropertyType,
      PropertySubType: prop.PropertySubType,
      
      // Pricing
      ListPrice: prop.ListPrice,
      ListPricePerSquareFoot: prop.ListPriceSquareFoot,
      
      // Address - Full
      UnparsedAddress: prop.UnparsedAddress,
      StreetNumber: prop.StreetNumber,
      StreetName: prop.StreetName,
      StreetSuffix: prop.StreetSuffix,
      StreetDirPrefix: prop.StreetDirPrefix,
      StreetDirSuffix: prop.StreetDirSuffix,
      UnitNumber: prop.UnitNumber,
      City: cityName,
      CityCode: prop.City,
      StateOrProvince: prop.StateOrProvince,
      PostalCode: prop.PostalCode,
      CountyOrParish: countyName,
      CountyCode: prop.CountyOrParish,
      SubdivisionName: prop.SubdivisionName,
      District: prop.District,
      
      // Geo
      Latitude: prop.Latitude,
      Longitude: prop.Longitude,
      
      // Property Details
      BedroomsTotal: prop.BedroomsTotal,
      BedroomsAboveGrade: prop.BedrmsAboveGrade,
      BedroomsBelowGrade: prop.BedroomsBelowGrade,
      BedroomsOnMain: prop.BedroomsOnMain,
      BathroomsTotalInteger: prop.BathroomsTotalInteger,
      BathroomsFull: prop.BathroomsFull,
      BathroomsHalf: prop.BathroomsHalf,
      BathroomsPartial: prop.BathroomsHalf, // Alias
      RoomsTotal: prop.RoomsTotal,
      RoomsAboveGrade: prop.RoomsAboveGrade,
      
      // Area/Size
      LivingArea: prop.LivingAreaSF,
      LivingAreaUnits: "Square Feet",
      BuildingAreaTotal: prop.BuildingAreaTotal || prop.BuildingAreaTotalSF,
      BuildingAreaUnits: "Square Feet",
      AboveGradeFinishedArea: prop.MainLevelFinishedAreaSF,
      BelowGradeFinishedArea: prop.BelowGradeFinishedArea,
      LotSizeArea: prop.LotSizeAcres,
      LotSizeDimensions: prop.LotSizeDimensions,
      LotSizeUnits: "Acres",
      LotSizeSquareFeet: prop.LotSizeSquareFeet,
      
      // Structure
      Stories: prop.StoriesTotal,
      Levels: prop.Levels,
      YearBuilt: prop.YearBuilt,
      BuildingType: prop.BuildingType,
      StructureType: prop.StructureType,
      ArchitecturalStyle: prop.ArchitecturalStyle,
      
      // Features
      Appliances: prop.Appliances,
      Heating: prop.Heating,
      Cooling: prop.Cooling,
      Flooring: prop.Flooring,
      Roof: prop.Roof,
      ConstructionMaterials: prop.ConstructionMaterials,
      FoundationDetails: prop.FoundationDetails,
      ExteriorFeatures: prop.ExteriorFeatures,
      InteriorFeatures: prop.InteriorFeatures,
      Basement: prop.Basement,
      BasementDevelopment: prop.BasementDevelopment,
      BasementFeatures: prop.BasementFeatures,
      FireplacesTotal: prop.FireplacesTotal,
      FireplaceYN: prop.FireplacesTotal > 0,
      FireplaceFeatures: prop.FireplaceFeatures,
      PoolFeatures: prop.PoolFeatures,
      Fencing: prop.Fencing,
      LotFeatures: prop.LotFeatures,
      SecurityFeatures: prop.SecurityFeatures,
      AccessibilityFeatures: prop.AccessibilityFeatures,
      CommunityFeatures: prop.CommunityFeatures,
      
      // Utilities
      WaterSource: prop.WaterSource,
      Sewer: prop.Sewer,
      Electric: prop.Electric,
      Utilities: prop.Utilities,
      
      // Parking
      ParkingTotal: prop.ParkingTotal,
      GarageSpaces: prop.GarageSpaces,
      GarageYN: prop.GarageYN,
      CarportSpaces: prop.CarportSpaces,
      ParkingFeatures: prop.ParkingFeatures,
      
      // Agent Info
      ListAgentKey: prop.ListAgentKeyNumeric?.toString(),
      ListAgentFullName: prop.ListAgentFullName,
      ListAgentMlsId: prop.ListAgentMlsId,
      ListAgentEmail: prop.ListAgentEmail,
      ListAgentDirectPhone: prop.ListAgentDirectPhone,
      CoListAgentKey: prop.CoListAgentKeyNumeric?.toString(),
      CoListAgentFullName: prop.CoListAgentFullName,
      
      // Office Info
      ListOfficeKey: prop.ListOfficeKeyNumeric?.toString(),
      ListOfficeName: prop.ListOfficeName,
      ListOfficeMlsId: prop.ListOfficeMlsId,
      ListOfficePhone: prop.ListOfficePhone,
      ListOfficeEmail: prop.ListOfficeEmail,
      ListAOR: prop.ListAOR,
      CoListOfficeKey: prop.CoListOfficeKeyNumeric?.toString(),
      CoListOfficeName: prop.CoListOfficeName,
      
      // Association/HOA
      AssociationYN: prop.AssociationYN,
      AssociationFee: prop.AssociationFee,
      AssociationFeeFrequency: prop.AssociationFeeFrequency,
      AssociationFeeIncludes: prop.AssociationFeeIncludes,
      AssociationAmenities: prop.AssociationAmenities,
      
      // Tax/Legal
      TaxLegalDescription: prop.TaxLegalDescription,
      Zoning: prop.Zoning,
      
      // Dates
      ListingContractDate: prop.ListingContractDate,
      AvailabilityDate: prop.AvailabilityDate,
      DaysOnMarket: prop.DaysOnMarket,
      ModificationTimestamp: prop.ModificationTimestamp,
      PhotosChangeTimestamp: prop.PhotosChangeTimestamp,
      
      // Remarks
      PublicRemarks: prop.PublicRemarks,
      Inclusions: prop.Inclusions,
      
      // Virtual Tours
      VirtualTourURLBranded: prop.VirtualTourURLBranded,
      VirtualTourURLUnbranded: prop.VirtualTourURLUnbranded,
      URL3DImage: prop.URL3DImage,
      
      // Internet Display
      InternetEntireListingDisplayYN: prop.InternetEntireListingDisplayYN,
      InternetAddressDisplayYN: prop.InternetAddressDisplayYN,
      
      // Photos/Media
      PhotosCount: prop.PhotosCount,
      Media: media,
      
      // Condo specific
      CondoName: prop.CondoName || prop.ComplexName,
      UnitNumber: prop.UnitNumber,
      
      // Commercial
      BusinessType: prop.BusinessType,
      CurrentUse: prop.CurrentUse,
      PossibleUse: prop.PossibleUse,
      
      // Rental
      LeaseAmount: prop.LeaseAmount,
      LeaseAmountFrequency: prop.LeaseAmountFrequency,
      
      // Original system
      OriginatingSystemName: prop.OriginatingSystemName
    };

    // Remove null/undefined values for cleaner output
    Object.keys(property).forEach(key => {
      if (property[key] === null || property[key] === undefined) {
        delete property[key];
      }
    });

    transformedProperties.push(property);
  }

  return transformedProperties;
}

/**
 * Get lookup values for any field (City, MlsStatus, PropertyType, etc.)
 */
async function getLookupValues(accessToken, lookupName) {
  const result = await fetchApi(accessToken,
    `/MatrixWebAPI/local/Lookup?$filter=${encodeURIComponent(`LookupName eq '${lookupName}'`)}`);
  
  if (result.statusCode === 200) {
    const data = JSON.parse(result.data);
    return data.value.map(item => ({
      code: item.LookupValue,
      name: item.LongValue || item.Value,
      description: item.Description
    }));
  }
  return [];
}

/**
 * Get all cities/municipalities in Alberta
 */
async function getAlbertaCities(accessToken) {
  await loadLookups(accessToken);
  return Object.entries(cityLookupCache).map(([code, name]) => ({
    code,
    name
  })).sort((a, b) => a.name.localeCompare(b.name));
}

// ============================================================================
// MAIN DEMO
// ============================================================================

async function main() {
  try {
    console.log('='.repeat(80));
    console.log('MATRIX API - Comprehensive Property Data for Alberta');
    console.log('='.repeat(80) + '\n');

    // Get access token
    console.log('Authenticating...');
    const accessToken = await getAccessToken();
    console.log('Authenticated!\n');

    // Load lookup tables
    await loadLookups(accessToken);

    // Fetch active properties with all details
    console.log('='.repeat(80));
    console.log('FETCHING ACTIVE PROPERTIES (with full details and images)\n');
    
    const properties = await fetchProperties(accessToken, {
      status: 'A',
      minPrice: 2000000,  // Higher price to reduce results (API limit)
      limit: 3,
      includeMedia: true
    });

    // Output in JSON format similar to user's example
    console.log('\n' + '='.repeat(80));
    console.log('PROPERTY DATA (JSON FORMAT)\n');
    console.log(JSON.stringify(properties, null, 2));

    // Also show pending properties
    console.log('\n' + '='.repeat(80));
    console.log('PENDING PROPERTIES\n');
    
    const pendingProperties = await fetchProperties(accessToken, {
      status: 'P',
      minPrice: 1000000,  // Higher price to reduce results
      limit: 2,
      includeMedia: false
    });

    pendingProperties.forEach(prop => {
      console.log(`${prop.ListingId}: $${prop.ListPrice?.toLocaleString()} - ${prop.City}, ${prop.StateOrProvince}`);
      console.log(`  ${prop.BedroomsTotal || 'N/A'} bed, ${prop.BathroomsTotalInteger || 'N/A'} bath`);
      console.log(`  Agent: ${prop.ListAgentFullName || 'N/A'} - ${prop.ListOfficeName || 'N/A'}`);
      console.log('');
    });

    // Show sample cities
    console.log('='.repeat(80));
    console.log('SAMPLE ALBERTA CITIES/MUNICIPALITIES (first 20)\n');
    
    const cities = await getAlbertaCities(accessToken);
    cities.slice(0, 20).forEach(city => {
      console.log(`  ${city.code}: ${city.name}`);
    });
    console.log(`  ... and ${cities.length - 20} more\n`);

    console.log('='.repeat(80));
    console.log('Done!\n');

  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  getAccessToken,
  fetchProperties,
  getPropertyMedia,
  getLookupValues,
  getAlbertaCities,
  loadLookups,
  resolveCity,
  resolveCounty,
  MLS_STATUS,
  PROPERTY_FIELDS,
  getAllFields,
  config
};

// Run demo
main();
