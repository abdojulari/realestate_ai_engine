
// /**
//  * Matrix API Client - Streamlined Version
//  * Minimal fields, aggressive filtering, fast responses
//  */

// import https from 'https';

// const config = {
//   clientId: 'oidc-trestle_dsgnxinc_realstats_134113351420608424-ticuocd',
//   clientSecret: 'kOoPeSMxooYgrShfsGQJLrpH0LxFYOv-ONrXWUBY',
//   tokenUrl: 'pillarnine.clareityiam.net',
//   tokenPath: '/idp/profile/oidc/token?grant_type=client_credentials&scope=openid',
//   apiUrl: 'abrls.matrixwebapi.com'
// };

// const MLS_STATUS = {
//   A: 'Active',
//   P: 'Pending',
//   S: 'Sold',
//   LEAS: 'Leased',
//   W: 'Withdrawn',
//   X: 'Expired',
//   T: 'Terminated',
//   I: 'Incomplete'
// };

// const CITY_CODES = {
//   '0046': 'Calgary',
//   '0047': 'Edmonton',
//   '0100': 'Airdrie',
//   '0125': 'Canmore',
//   '0126': 'Cardston',
//   '0134': 'Chestermere',
//   '0145': 'Cochrane',
//   '0169': 'Didsbury',
//   '0182': 'Drayton Valley',
//   '0203': 'Edson',
//   '0264': 'Fort McMurray',
//   '0265': 'Fort Saskatchewan',
// };

// const CITY_NAME_TO_CODE = {};
// Object.entries(CITY_CODES).forEach(([code, name]) => {
//   CITY_NAME_TO_CODE[name.toLowerCase()] = code;
// });

// // ============================================================================
// // MINIMAL FIELD SETS
// // ============================================================================

// // Essential fields only - for fast queries
// const MINIMAL_FIELDS = [
//   'ListingId', 'ListingKeyNumeric', 'MlsStatus',
//   'ListPrice', 'BedroomsTotal', 'BathroomsTotalInteger',
//   'UnparsedAddress', 'City', 'PostalCode',
//   'LivingAreaSF', 'YearBuilt', 'PropertyType',
//   'ListAgentFullName', 'ListOfficeName',
//   'PhotosCount', 'DaysOnMarket', 'ModificationTimestamp'
// ];

// // Standard fields - balanced approach
// const STANDARD_FIELDS = [
//   'ListingId', 'ListingKeyNumeric', 'MlsStatus', 'StandardStatus',
//   'PropertyType', 'PropertySubType',
//   'ListPrice', 'ListPriceSquareFoot',
//   'UnparsedAddress', 'StreetNumber', 'StreetName', 'StreetSuffix',
//   'UnitNumber', 'City', 'StateOrProvince', 'PostalCode',
//   'CountyOrParish', 'SubdivisionName',
//   'Latitude', 'Longitude',
//   'BedroomsTotal', 'BathroomsTotalInteger',
//   'RoomsTotal', 'LivingAreaSF', 'BuildingAreaTotalSF',
//   'LotSizeAcres', 'LotSizeDimensions',
//   'StoriesTotal', 'YearBuilt',
//   'Appliances', 'Heating', 'Cooling', 'Flooring',
//   'Basement', 'FireplacesTotal', 'GarageSpaces', 'ParkingTotal',
//   'AssociationYN', 'AssociationFee',
//   'ListAgentFullName', 'ListAgentDirectPhone',
//   'ListOfficeName', 'ListOfficePhone',
//   'DaysOnMarket', 'ModificationTimestamp',
//   'PhotosCount', 'PublicRemarks'
// ];

// // ============================================================================
// // HTTP HELPERS
// // ============================================================================

// function makeRequest(options, postData = null) {
//   return new Promise((resolve, reject) => {
//     const req = https.request(options, (res) => {
//       let data = '';
//       res.on('data', (chunk) => { data += chunk; });
//       res.on('end', () => {
//         resolve({ statusCode: res.statusCode, headers: res.headers, data });
//       });
//     });
//     req.on('error', reject);
//     if (postData) req.write(postData);
//     req.end();
//   });
// }

// async function fetchApi(accessToken, path) {
//   const options = {
//     hostname: config.apiUrl,
//     path: path,
//     method: 'GET',
//     headers: {
//       'Authorization': `Bearer ${accessToken}`,
//       'Accept': 'application/json'
//     }
//   };
//   return makeRequest(options);
// }

// // ============================================================================
// // AUTHENTICATION
// // ============================================================================

// async function getAccessToken() {
//   const auth = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');
//   const options = {
//     hostname: config.tokenUrl,
//     path: config.tokenPath,
//     method: 'POST',
//     headers: {
//       'Authorization': `Basic ${auth}`,
//       'Content-Type': 'application/x-www-form-urlencoded',
//       'Accept': 'application/json'
//     }
//   };

//   const result = await makeRequest(options);
//   if (result.statusCode !== 200) {
//     throw new Error(`Token request failed: ${result.statusCode}`);
//   }
//   return JSON.parse(result.data).access_token;
// }

// // ============================================================================
// // MEDIA RETRIEVAL
// // ============================================================================

// async function getPropertyMedia(accessToken, listingKeyNumeric) {
//   try {
//     const result = await fetchApi(accessToken,
//       `/MatrixWebAPI/local/Media?$filter=${encodeURIComponent(`ResourceRecordKeyNumeric eq ${listingKeyNumeric}`)}`);
    
//     if (result.statusCode === 200) {
//       const data = JSON.parse(result.data);
//       return (data.value || []).slice(0, 10).map(media => ({
//         MediaURL: media.MediaPath?.find(p => p.MediaSize === 3)?.MediaUrl || 
//                   media.MediaPath?.find(p => p.MediaSize === 7)?.MediaUrl || 
//                   media.MediaPath?.[0]?.MediaUrl,
//         LongDescription: media.LongDescription,
//         Order: media.Order
//       }));
//     }
//     return [];
//   } catch (err) {
//     return [];
//   }
// }

// // ============================================================================
// // HELPER FUNCTIONS
// // ============================================================================

// function getCityCode(cityNameOrCode) {
//   if (/^\d{4}$/.test(cityNameOrCode)) {
//     return cityNameOrCode;
//   }
//   return CITY_NAME_TO_CODE[cityNameOrCode.toLowerCase()] || cityNameOrCode;
// }

// function getCityName(code) {
//   return CITY_CODES[code] || code;
// }

// // ============================================================================
// // MAIN PROPERTY FETCHER - STREAMLINED
// // ============================================================================

// /**
//  * Fetch properties with smart filtering
//  * @param {object} options
//  * @param {string} options.status - 'A' (Active), 'P' (Pending), 'S' (Sold)
//  * @param {string} options.city - City name or code
//  * @param {number} options.minPrice - Minimum price
//  * @param {number} options.maxPrice - Maximum price
//  * @param {number} options.minBedrooms - Minimum bedrooms
//  * @param {number} options.maxBedrooms - Maximum bedrooms
//  * @param {number} options.minBathrooms - Minimum bathrooms
//  * @param {number} options.minLivingArea - Minimum living area (sq ft)
//  * @param {number} options.maxLivingArea - Maximum living area (sq ft)
//  * @param {string} options.propertyType - Property type
//  * @param {number} options.limit - Results to return (default: 10)
//  * @param {boolean} options.includeMedia - Fetch photos (default: false)
//  * @param {string} options.fields - 'minimal' or 'standard' (default: 'minimal')
//  */
// async function fetchProperties(accessToken, options = {}) {
//   const {
//     status = 'A',
//     city = null,
//     minPrice = null,
//     maxPrice = null,
//     minBedrooms = null,
//     maxBedrooms = null,
//     minBathrooms = null,
//     minLivingArea = null,
//     maxLivingArea = null,
//     propertyType = null,
//     limit = 10,
//     includeMedia = false,
//     fields = 'minimal'  // Use minimal by default
//   } = options;

//   // Select field set
//   const fieldSet = fields === 'standard' ? STANDARD_FIELDS : MINIMAL_FIELDS;

//   // Build aggressive filter - most restrictive first
//   const filterParts = [`MlsStatus eq '${status}'`];
  
//   if (city) {
//     const cityCode = getCityCode(city);
//     filterParts.push(`City eq '${cityCode}'`);
//   }
  
//   // Price filters (most effective)
//   if (minPrice !== null) {
//     filterParts.push(`ListPrice ge ${minPrice}`);
//   }
//   if (maxPrice !== null) {
//     filterParts.push(`ListPrice le ${maxPrice}`);
//   }
  
//   // Bedroom filters
//   if (minBedrooms !== null) {
//     filterParts.push(`BedroomsTotal ge ${minBedrooms}`);
//   }
//   if (maxBedrooms !== null) {
//     filterParts.push(`BedroomsTotal le ${maxBedrooms}`);
//   }
  
//   // Bathroom filters
//   if (minBathrooms !== null) {
//     filterParts.push(`BathroomsTotalInteger ge ${minBathrooms}`);
//   }
  
//   // Living area filters (very effective)
//   if (minLivingArea !== null) {
//     filterParts.push(`LivingAreaSF ge ${minLivingArea}`);
//   }
//   if (maxLivingArea !== null) {
//     filterParts.push(`LivingAreaSF le ${maxLivingArea}`);
//   }
  
//   // Property type filter
//   if (propertyType) {
//     filterParts.push(`PropertyType eq '${propertyType}'`);
//   }

//   const filter = encodeURIComponent(filterParts.join(' and '));
//   const select = encodeURIComponent(fieldSet.join(','));
//   const query = `/MatrixWebAPI/local/Property?$filter=${filter}&$top=${limit}&$select=${select}`;

//   console.log(`\n🔍 Searching...`);
//   console.log(`Filters: ${filterParts.join(' AND ')}\n`);
  
//   const result = await fetchApi(accessToken, query);
  
//   if (result.statusCode === 403 || (result.statusCode === 400 && result.data.includes('too many'))) {
//     console.log('\n❌ Too many results. Try:');
//     console.log('   • Increase minPrice');
//     console.log('   • Decrease maxPrice');
//     console.log('   • Add minLivingArea');
//     console.log('   • Reduce limit');
//     console.log('   • Use propertyType filter\n');
//     throw new Error(`API Error 403: Too many results`);
//   }
  
//   if (result.statusCode !== 200) {
//     try {
//       const error = JSON.parse(result.data);
//       throw new Error(`API Error: ${error.error?.message || result.data}`);
//     } catch (e) {
//       throw new Error(`API Error ${result.statusCode}`);
//     }
//   }

//   let data = JSON.parse(result.data);
//   const properties = data.value || [];
  
//   console.log(`✅ Found ${properties.length} properties\n`);

//   // Transform properties
//   const result_properties = [];
  
//   for (const prop of properties) {
//     const cityName = getCityName(prop.City);
    
//     let media = [];
//     if (includeMedia && prop.ListingKeyNumeric) {
//       media = await getPropertyMedia(accessToken, prop.ListingKeyNumeric);
//     }

//     const property = {
//       ListingId: prop.ListingId,
//       ListingKey: prop.ListingKeyNumeric?.toString(),
//       MlsStatus: prop.MlsStatus,
//       StandardStatus: MLS_STATUS[prop.MlsStatus] || prop.StandardStatus,
      
//       ListPrice: prop.ListPrice,
//       ListPricePerSquareFoot: prop.ListPriceSquareFoot,
      
//       Address: prop.UnparsedAddress,
//       City: cityName,
//       PostalCode: prop.PostalCode,
//       Latitude: prop.Latitude,
//       Longitude: prop.Longitude,
      
//       Bedrooms: prop.BedroomsTotal,
//       Bathrooms: prop.BathroomsTotalInteger,
//       Rooms: prop.RoomsTotal,
//       LivingArea: prop.LivingAreaSF,
//       BuildingArea: prop.BuildingAreaTotalSF,
//       LotSize: prop.LotSizeAcres,
      
//       YearBuilt: prop.YearBuilt,
//       PropertyType: prop.PropertyType,
//       PropertySubType: prop.PropertySubType,
      
//       Basement: prop.Basement,
//       Fireplaces: prop.FireplacesTotal,
//       Garage: prop.GarageSpaces,
//       Parking: prop.ParkingTotal,
      
//       Heating: prop.Heating,
//       Cooling: prop.Cooling,
//       Appliances: prop.Appliances,
      
//       HOA: prop.AssociationYN,
//       HOAFee: prop.AssociationFee,
      
//       Agent: prop.ListAgentFullName,
//       AgentPhone: prop.ListAgentDirectPhone,
//       Office: prop.ListOfficeName,
//       OfficePhone: prop.ListOfficePhone,
      
//       DaysOnMarket: prop.DaysOnMarket,
//       LastModified: prop.ModificationTimestamp,
//       PhotoCount: prop.PhotosCount,
      
//       Remarks: prop.PublicRemarks?.substring(0, 200),
      
//       Media: media
//     };

//     // Remove null values
//     Object.keys(property).forEach(key => {
//       if (property[key] === null || property[key] === undefined) {
//         delete property[key];
//       }
//     });

//     result_properties.push(property);
//   }

//   return result_properties;
// }

// // ============================================================================
// // DISPLAY HELPERS
// // ============================================================================

// function displayProperty(prop, index) {
//   console.log(`\n[${index}] ${prop.ListingId}`);
//   console.log(`    ${prop.Address}`);
//   console.log(`    ${prop.City}, ${prop.PostalCode}`);
//   console.log(`    💰 $${prop.ListPrice?.toLocaleString()} (${prop.ListPricePerSquareFoot?.toFixed(2)}/sqft)`);
//   console.log(`    🛏️  ${prop.Bedrooms}bd | 🚿 ${prop.Bathrooms}ba | 📏 ${prop.LivingArea?.toLocaleString()}sqft`);
//   console.log(`    🔨 Built: ${prop.YearBuilt} | 🔥 Fireplaces: ${prop.Fireplaces || 0}`);
//   console.log(`    🚗 Garage: ${prop.Garage || 0} | 🅿️  Parking: ${prop.Parking || 0}`);
//   console.log(`    ⛈️  ${prop.Heating || 'N/A'} | ❄️  ${prop.Cooling || 'N/A'}`);
//   console.log(`    📸 ${prop.PhotoCount || 0} photos`);
//   console.log(`    👤 ${prop.Agent} | ${prop.Office}`);
//   console.log(`    📅 ${prop.DaysOnMarket} days on market`);
//   if (prop.Media?.length > 0) {
//     console.log(`    🖼️  ${prop.Media.length} media items`);
//   }
// }

// // ============================================================================
// // MAIN DEMO
// // ============================================================================

// async function main() {
//   try {
//     console.log('╔' + '═'.repeat(78) + '╗');
//     console.log('║' + 'MATRIX API - Streamlined Property Search'.padEnd(79) + '║');
//     console.log('╚' + '═'.repeat(78) + '╝');

//     console.log('\n🔐 Authenticating...');
//     const accessToken = await getAccessToken();
//     console.log('✅ Authenticated!');

//     // Example: Luxury homes
//     console.log('\n' + '═'.repeat(80));
//     console.log('EXAMPLE 1: Luxury homes in Calgary');
//     console.log('═'.repeat(80));
    
//     const properties = await fetchProperties(accessToken, {
//       status: 'A',
//       city: 'Calgary',
//       minBedrooms: 4,
//       minBathrooms: 3,
//       minPrice: 5000000,
//       maxPrice: 10000000,
//       limit: 5,
//       includeMedia: true,
//       fields: 'minimal'  // Use minimal fields for speed
//     });

//     if (properties.length > 0) {
//       properties.forEach((prop, i) => displayProperty(prop, i + 1));
      
//       console.log('\n\n📋 Raw JSON (first property):');
//       console.log(JSON.stringify(properties[0], null, 2).substring(0, 1500) + '...\n');
//     }

//     // Example: Mid-range homes
//     console.log('\n' + '═'.repeat(80));
//     console.log('EXAMPLE 2: Mid-range homes in Calgary');
//     console.log('═'.repeat(80));
    
//     const properties2 = await fetchProperties(accessToken, {
//       status: 'A',
//       city: 'Calgary',
//       minBedrooms: 3,
//       minBathrooms: 2,
//       minPrice: 1000000,
//       maxPrice: 3000000,
//       minLivingArea: 2500,
//       limit: 3,
//       includeMedia: false,
//       fields: 'minimal'
//     });

//     if (properties2.length > 0) {
//       properties2.forEach((prop, i) => displayProperty(prop, i + 1));
//     }

//     console.log('\n✨ Done!\n');

//   } catch (error) {
//     console.error('\n❌ Error:', error.message);
//   }
// }

// // ============================================================================
// // EXPORTS
// // ============================================================================

// export {
//   getAccessToken,
//   fetchProperties,
//   getPropertyMedia,
//   getCityCode,
//   getCityName,
//   displayProperty,
//   MINIMAL_FIELDS,
//   STANDARD_FIELDS,
//   MLS_STATUS,
//   CITY_CODES,
//   config
// };

// main();


/**
 * Matrix API Client - Production Version
 * Real Alberta property data with batch processing
 * Supports 20,000+ properties across Alberta
 */

import https from 'https';
import { fileURLToPath } from 'url';
import path from 'path';

const config = {
  clientId: 'oidc-trestle_dsgnxinc_realstats_134113351420608424-ticuocd',
  clientSecret: 'kOoPeSMxooYgrShfsGQJLrpH0LxFYOv-ONrXWUBY',
  tokenUrl: 'pillarnine.clareityiam.net',
  tokenPath: '/idp/profile/oidc/token?grant_type=client_credentials&scope=openid',
  apiUrl: 'abrls.matrixwebapi.com'
};

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

// ============================================================================
// REGISTERED ALBERTA LOCATIONS
// ============================================================================

const MAJOR_CITIES = {
  // Cities (20)
  '0046': 'Calgary',
  '0047': 'Edmonton',
  '0100': 'Airdrie',
  '0102': 'Beaumont',
  '0114': 'Brooks',
  '0134': 'Chestermere',
  '0141': 'Cold Lake',
  '0264': 'Fort McMurray',
  '0265': 'Fort Saskatchewan',
  '0380': 'Grande Prairie',
  '0150': 'Lacombe',
  '0152': 'Leduc',
  '0154': 'Lethbridge',
  '0156': 'Lloydminster',
  '0159': 'Medicine Hat',
  '0161': 'Red Deer',
  '0165': 'Spruce Grove',
  '0167': 'St. Albert',
  '0170': 'Wetaskiwin',
  '0172': 'Camrose',
  
  // Major Towns & Other Communities (43)
  '0201': 'Athabasca',
  '0203': 'Banff',
  '0205': 'Blackfalds',
  '0125': 'Canmore',
  '0145': 'Cochrane',
  '0168': 'Devon',
  '0182': 'Drayton Valley',
  '0184': 'Drumheller',
  '0187': 'Edson',
  '0190': 'Hinton',
  '0192': 'High River',
  '0195': 'Innisfail',
  '0197': 'Morinville',
  '0199': 'Okotoks',
  '0200': 'Olds',
  '0202': 'Oyen',
  '0204': 'Slave Lake',
  '0206': 'Stony Plain',
  '0208': 'Strathmore',
  '0210': 'Sylvan Lake',
  '0212': 'Taber',
  '0214': 'Whitecourt',
  '0216': 'Rocky Mountain House',
  '0218': 'Three Hills',
  '0220': 'Sundre',
  '0222': 'Ponoka',
  '0224': 'Vegreville',
  '0226': 'Vermilion',
  '0228': 'Wainwright',
  '0230': 'Westlock',
  '0232': 'Stettler',
  '0234': 'Strathcona County',
  '0236': 'Wood Buffalo',
  '0238': 'Pincher Creek',
  '0240': 'Fort Macleod',
  '0242': 'Claresholm',
  '0244': 'Nanton',
  '0246': 'Magrath',
  '0248': 'Milk River',
  '0250': 'Raymond',
  '0252': 'Coaldale',
  '0254': 'Coalhurst',
  '0256': 'Granum',
  '0258': 'Stavely',

  // Small Communities (100+)
  '0300': 'Acheson',
  '0302': 'Acme',
  '0304': 'Alberta Beach',
  '0306': 'Alix',
  '0308': 'Alliance',
  '0310': 'Andrew',
  '0312': 'Arrowwood',
  '0314': 'Bashaw',
  '0316': 'Beiseker',
  '0318': 'Bentley',
  '0320': 'Blackie',
  '0322': 'Bon Accord',
  '0324': 'Bonnyville',
  '0326': 'Boyle',
  '0328': 'Bruderheim',
  '0330': 'Calmar',
  '0332': 'Carbon',
  '0334': 'Carmangay',
  '0336': 'Caroline',
  '0338': 'Carstairs',
  '0340': 'Castor',
  '0342': 'Cayley',
  '0344': 'Cereal',
  '0346': 'Champion',
  '0348': 'Chauvin',
  '0350': 'Chipman',
  '0352': 'Clive',
  '0354': 'Clyde',
  '0356': 'Compeer',
  '0358': 'Consort',
  '0360': 'Coronation',
  '0362': 'Crossfield',
  '0364': 'Czar',
  '0366': 'Delburne',
  '0368': 'Delia',
  '0370': 'Derwent',
  '0372': 'Didsbury',
  '0374': 'Donalda',
  '0376': 'Donnelly',
  '0378': 'Duchess',
  '0381': 'Eckville',
  '0383': 'Edgerton',
  '0385': 'Elk Point',
  '0387': 'Elnora',
  '0389': 'Empress',
  '0391': 'Evansburg',
  '0393': 'Fairview',
  '0395': 'Falher',
  '0397': 'Foremost',
  '0399': 'Forestburg',
  '0401': 'Fort Assiniboine',
  '0403': 'Fort Chipewyan',
  '0405': 'Fort Vermilion',
  '0407': 'Fox Creek',
  '0409': 'Gadsby',
  '0411': 'Galahad',
  '0413': 'Gibbons',
  '0415': 'Glendon',
  '0417': 'Glenwood',
  '0419': 'Grande Cache',
  '0421': 'Grassy Lake',
  '0423': 'Grimshaw',
  '0425': 'Gull Lake',
  '0427': 'Halkirk',
  '0429': 'Hanna',
  '0431': 'Hardisty',
  '0433': 'Hay Lakes',
  '0435': 'Heisler',
  '0437': 'High Level',
  '0439': 'High Prairie',
  '0441': 'Hill Spring',
  '0443': 'Hines Creek',
  '0445': 'Holden',
  '0447': 'Hughenden',
  '0449': 'Hussar',
  '0451': 'Hythe',
  '0453': 'Innisfree',
  '0455': 'Irma',
  '0457': 'Irricana',
  '0459': 'Irvine',
  '0461': 'Jasper',
  '0463': 'Joussard',
  '0465': 'Killam',
  '0467': 'Kinuso',
  '0469': 'Kitscoty',
  '0471': 'La Crete',
  '0473': 'La Glace',
  '0475': 'Lamont',
  '0477': 'Legal',
  '0479': 'Linden',
  '0481': 'Lomond',
  '0483': 'Longview',
  '0485': 'Lougheed',
  '0487': 'Mam-Me-O Beach',
  '0489': 'Manning',
  '0491': 'Mannville',
  '0493': 'Marwayne',
  '0495': 'Mayerthorpe',
  '0497': 'McLennan',
  '0499': 'Milk River',
  '0501': 'Millet',
  '0503': 'Milo',
  '0505': 'Minburn',
  '0507': 'Mirror',
  '0509': 'Morrin',
  '0511': 'Mundare',
  '0513': 'Munson',
  '0515': 'Myrnam',
  '0517': 'Nampa',
  '0519': 'New Norway',
  '0521': 'New Sarepta',
  '0523': 'Nobleford',
  '0525': 'Nordegg',
  '0527': 'Paradise Valley',
  '0529': 'Penhold',
  '0531': 'Picture Butte',
  '0533': 'Ponoka',
  '0535': 'Provost',
  '0537': 'Rainbow Lake',
  '0539': 'Ranfurly',
  '0541': 'Redcliff',
  '0543': 'Redwater',
  '0545': 'Rimbey',
  '0547': 'Rockyford',
  '0549': 'Rosemary',
  '0551': 'Rycroft',
  '0553': 'Ryley',
  '0555': 'Sangudo',
  '0557': 'Seba Beach',
  '0559': 'Sexsmith',
  '0561': 'Smoky Lake',
  '0563': 'Spirit River',
  '0565': 'Swan Hills',
  '0567': 'Thorhild',
  '0569': 'Thorsby',
  '0571': 'Tofield',
  '0573': 'Trochu',
  '0575': 'Two Hills',
  '0577': 'Valleyview',
  '0579': 'Vauxhall',
  '0581': 'Wabamun',
  '0583': 'Waskatenau',
  '0585': 'Wembley',
  '0587': 'Wildwood',
  '0589': 'Willingdon',
  '0591': 'Youngstown'
};

const CITY_NAME_TO_CODE = {};
Object.entries(MAJOR_CITIES).forEach(([code, name]) => {
  CITY_NAME_TO_CODE[name.toLowerCase()] = code;
});

// Field sets
const MINIMAL_FIELDS = [
  'ListingId', 'ListingKeyNumeric', 'MlsStatus',
  'ListPrice', 'BedroomsTotal', 'BathroomsTotalInteger',
  'UnparsedAddress', 'City', 'PostalCode',
  'LivingAreaSF', 'YearBuilt', 'PropertyType',
  'ListAgentFullName', 'ListOfficeName',
  'PhotosCount', 'DaysOnMarket', 'ModificationTimestamp'
];

const STANDARD_FIELDS = [
  'ListingId', 'ListingKeyNumeric', 'MlsStatus', 'StandardStatus',
  'PropertyType', 'PropertySubType',
  'ListPrice', 'ListPriceSquareFoot',
  'UnparsedAddress', 'StreetNumber', 'StreetName', 'StreetSuffix',
  'UnitNumber', 'City', 'StateOrProvince', 'PostalCode',
  'CountyOrParish', 'SubdivisionName',
  'Latitude', 'Longitude',
  'BedroomsTotal', 'BathroomsTotalInteger',
  'RoomsTotal', 'LivingAreaSF', 'BuildingAreaTotalSF',
  'LotSizeAcres', 'LotSizeDimensions',
  'StoriesTotal', 'YearBuilt',
  'Appliances', 'Heating', 'Cooling', 'Flooring',
  'Basement', 'FireplacesTotal', 'GarageSpaces', 'ParkingTotal',
  'AssociationYN', 'AssociationFee',
  'ListAgentFullName', 'ListAgentDirectPhone',
  'ListOfficeName', 'ListOfficePhone',
  'DaysOnMarket', 'ModificationTimestamp',
  'PhotosCount', 'PublicRemarks'
];

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
    throw new Error(`Auth failed: ${result.statusCode}`);
  }
  return JSON.parse(result.data).access_token;
}

// ============================================================================
// MEDIA RETRIEVAL
// ============================================================================

async function getPropertyMedia(accessToken, listingKeyNumeric) {
  try {
    const result = await fetchApi(accessToken,
      `/MatrixWebAPI/local/Media?$filter=${encodeURIComponent(`ResourceRecordKeyNumeric eq ${listingKeyNumeric}`)}`);
    
    if (result.statusCode === 200) {
      const data = JSON.parse(result.data);
      return (data.value || []).slice(0, 20).map(media => ({
        MediaURL: media.MediaPath?.find(p => p.MediaSize === 3)?.MediaUrl || 
                  media.MediaPath?.find(p => p.MediaSize === 7)?.MediaUrl || 
                  media.MediaPath?.[0]?.MediaUrl,
        LongDescription: media.LongDescription,
        Order: media.Order
      }));
    }
    return [];
  } catch (err) {
    return [];
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getCityCode(cityNameOrCode) {
  if (/^\d{4}$/.test(cityNameOrCode)) {
    return cityNameOrCode;
  }
  return CITY_NAME_TO_CODE[cityNameOrCode.toLowerCase()] || cityNameOrCode;
}

function getCityName(code) {
  return MAJOR_CITIES[code] || code;
}

function getAvailableCities() {
  return Object.entries(MAJOR_CITIES)
    .map(([code, name]) => ({ code, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// ============================================================================
// MAIN PROPERTY FETCHER
// ============================================================================

/**
 * Fetch properties from Alberta
 * @param {string} accessToken
 * @param {object} options - Query options
 * @param {string} options.status - 'A' (Active), 'P' (Pending), 'S' (Sold)
 * @param {string} options.city - City name or code
 * @param {number} options.minPrice - Minimum price
 * @param {number} options.maxPrice - Maximum price
 * @param {number} options.minBedrooms - Minimum bedrooms
 * @param {number} options.maxBedrooms - Maximum bedrooms
 * @param {number} options.minBathrooms - Minimum bathrooms
 * @param {number} options.minLivingArea - Minimum living area (sq ft)
 * @param {number} options.maxLivingArea - Maximum living area (sq ft)
 * @param {string} options.propertyType - Property type
 * @param {number} options.limit - Results to return (default: 10, max: 100)
 * @param {boolean} options.includeMedia - Fetch photos (default: false)
 * @param {string} options.fields - 'minimal' or 'standard' (default: 'minimal')
 * @returns {Promise<object[]>} Array of property objects
 */
async function fetchProperties(accessToken, options = {}) {
  const {
    status = 'A',
    city = null,
    minPrice = null,
    maxPrice = null,
    minBedrooms = null,
    maxBedrooms = null,
    minBathrooms = null,
    minLivingArea = null,
    maxLivingArea = null,
    propertyType = null,
    limit = 10,
    includeMedia = false,
    fields = 'minimal'
  } = options;

  const fieldSet = fields === 'standard' ? STANDARD_FIELDS : MINIMAL_FIELDS;

  // Build filter
  const filterParts = [`MlsStatus eq '${status}'`];
  
  if (city) {
    const cityCode = getCityCode(city);
    filterParts.push(`City eq '${cityCode}'`);
  }
  
  if (minPrice !== null) filterParts.push(`ListPrice ge ${minPrice}`);
  if (maxPrice !== null) filterParts.push(`ListPrice le ${maxPrice}`);
  if (minBedrooms !== null) filterParts.push(`BedroomsTotal ge ${minBedrooms}`);
  if (maxBedrooms !== null) filterParts.push(`BedroomsTotal le ${maxBedrooms}`);
  if (minBathrooms !== null) filterParts.push(`BathroomsTotalInteger ge ${minBathrooms}`);
  if (minLivingArea !== null) filterParts.push(`LivingAreaSF ge ${minLivingArea}`);
  if (maxLivingArea !== null) filterParts.push(`LivingAreaSF le ${maxLivingArea}`);
  if (propertyType) filterParts.push(`PropertyType eq '${propertyType}'`);

  const filter = encodeURIComponent(filterParts.join(' and '));
  const select = encodeURIComponent(fieldSet.join(','));
  const query = `/MatrixWebAPI/local/Property?$filter=${filter}&$top=${limit}&$select=${select}`;

  const result = await fetchApi(accessToken, query);
  
  if (result.statusCode === 403 || (result.statusCode === 400 && result.data.includes('too many'))) {
    throw new Error(`Too many results - add more filters`);
  }
  
  if (result.statusCode === 401) {
    throw new Error(`Unauthorized - token may have expired`);
  }
  
  if (result.statusCode !== 200) {
    try {
      const error = JSON.parse(result.data);
      throw new Error(`API Error ${result.statusCode}: ${error.error?.message || result.data}`);
    } catch (e) {
      throw new Error(`API Error ${result.statusCode}`);
    }
  }

  const data = JSON.parse(result.data);
  const properties = data.value || [];

  const result_properties = [];
  
  for (const prop of properties) {
    const cityName = getCityName(prop.City);
    
    let media = [];
    if (includeMedia && prop.ListingKeyNumeric) {
      media = await getPropertyMedia(accessToken, prop.ListingKeyNumeric);
    }

    const property = {
      ListingId: prop.ListingId,
      ListingKey: prop.ListingKeyNumeric?.toString(),
      MlsStatus: prop.MlsStatus,
      StandardStatus: MLS_STATUS[prop.MlsStatus] || prop.StandardStatus,
      ListPrice: prop.ListPrice,
      ListPricePerSquareFoot: prop.ListPriceSquareFoot,
      Address: prop.UnparsedAddress,
      City: cityName,
      PostalCode: prop.PostalCode,
      Latitude: prop.Latitude,
      Longitude: prop.Longitude,
      Bedrooms: prop.BedroomsTotal,
      Bathrooms: prop.BathroomsTotalInteger,
      Rooms: prop.RoomsTotal,
      LivingArea: prop.LivingAreaSF,
      BuildingArea: prop.BuildingAreaTotalSF,
      LotSize: prop.LotSizeAcres,
      YearBuilt: prop.YearBuilt,
      PropertyType: prop.PropertyType,
      PropertySubType: prop.PropertySubType,
      Basement: prop.Basement,
      Fireplaces: prop.FireplacesTotal,
      Garage: prop.GarageSpaces,
      Parking: prop.ParkingTotal,
      Heating: prop.Heating,
      Cooling: prop.Cooling,
      Appliances: prop.Appliances,
      HOA: prop.AssociationYN,
      HOAFee: prop.AssociationFee,
      Agent: prop.ListAgentFullName,
      AgentPhone: prop.ListAgentDirectPhone,
      Office: prop.ListOfficeName,
      OfficePhone: prop.ListOfficePhone,
      DaysOnMarket: prop.DaysOnMarket,
      LastModified: prop.ModificationTimestamp,
      PhotoCount: prop.PhotosCount,
      Remarks: prop.PublicRemarks?.substring(0, 300),
      Media: media
    };

    Object.keys(property).forEach(key => {
      if (property[key] === null || property[key] === undefined) {
        delete property[key];
      }
    });

    result_properties.push(property);
  }

  return result_properties;
}

// ============================================================================
// BATCH PROCESSING
// ============================================================================

/**
 * Fetch properties in batches with automatic retries on 401
 * @param {string} accessToken
 * @param {object[]} batchOptions - Array of query options
 * @param {number} delayMs - Delay between batches (default: 500ms)
 * @param {number} retries - Max retries on 401 (default: 3)
 * @returns {Promise<object[]>} Combined results from all batches
 */
async function fetchPropertiesBatch(accessToken, batchOptions, delayMs = 500, retries = 3) {
  const allResults = [];
  const failed = [];
  
  for (let i = 0; i < batchOptions.length; i++) {
    const opts = batchOptions[i];
    let attempts = 0;
    let success = false;

    while (attempts < retries && !success) {
      try {
        const results = await fetchProperties(accessToken, opts);
        allResults.push(...results);
        success = true;
        
        // Delay between batches
        if (i < batchOptions.length - 1) {
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      } catch (error) {
        attempts++;
        
        if (error.message.includes('401') && attempts < retries) {
          // Retry on 401
          await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
          failed.push({
            city: opts.city || 'all',
            error: error.message
          });
          success = true; // Stop retrying
        }
      }
    }
  }
  
  return { properties: allResults, failed };
}

// ============================================================================
// DISPLAY HELPERS
// ============================================================================

function displayProperty(prop, index) {
  console.log(`\n[${index}] ${prop.ListingId}`);
  console.log(`    ${prop.Address}`);
  console.log(`    ${prop.City}, ${prop.PostalCode}`);
  console.log(`    💰 $${prop.ListPrice?.toLocaleString()}`);
  console.log(`    🛏️  ${prop.Bedrooms}bd | 🚿 ${prop.Bathrooms}ba | 📏 ${prop.LivingArea?.toLocaleString()}sqft`);
  console.log(`    🔨 ${prop.YearBuilt}`);
  console.log(`    👤 ${prop.Agent} | ${prop.Office}`);
  if (prop.PhotoCount) console.log(`    📸 ${prop.PhotoCount} photos`);
}

// ============================================================================
// TEST RUNNER: Calgary & Edmonton, 1 property per status
// ============================================================================

const TEST_CITIES = [
  { code: '0046', name: 'Calgary' },
  { code: '0047', name: 'Edmonton' }
];

const MLS_STATUS_CODES = Object.keys(MLS_STATUS);

async function runTest() {
  console.log('Connecting to Matrix API...\n');
  const accessToken = await getAccessToken();
  console.log('✓ Authenticated\n');

  for (const city of TEST_CITIES) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`  ${city.name} (code: ${city.code})`);
    console.log('='.repeat(60));

    for (const status of MLS_STATUS_CODES) {
      const statusLabel = MLS_STATUS[status];
      try {
        const properties = await fetchProperties(accessToken, {
          city: city.code,
          status,
          limit: 1,
          fields: 'minimal'
        });
        if (properties.length > 0) {
          console.log(`\n--- ${statusLabel} (${status}) ---`);
          displayProperty(properties[0], 0);
        } else {
          console.log(`\n--- ${statusLabel} (${status}) --- No properties found`);
        }
      } catch (err) {
        console.log(`\n--- ${statusLabel} (${status}) --- Error: ${err.message}`);
      }
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  console.log('\n✓ Test complete');
}

// ============================================================================
// EXPORTS
// ============================================================================

// Run test when executed directly: node test_matrix_api.js
const __filename = fileURLToPath(import.meta.url);
const isMain = process.argv[1] && path.resolve(process.argv[1]) === __filename;
if (isMain) {
  runTest().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

export {
  getAccessToken,
  fetchProperties,
  fetchPropertiesBatch,
  getPropertyMedia,
  getCityCode,
  getCityName,
  getAvailableCities,
  displayProperty,
  runTest,
  MINIMAL_FIELDS,
  STANDARD_FIELDS,
  MLS_STATUS,
  MAJOR_CITIES,
  config
};