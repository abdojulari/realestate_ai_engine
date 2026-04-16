#!/usr/bin/env node
/**
 * Test which $select fields are valid on the Pillar9/Matrix API
 */
const CLIENT_ID = process.env.PILLAR9_CLIENT_ID
const CLIENT_SECRET = process.env.PILLAR9_CLIENT_SECRET
const API_HOST = process.env.PILLAR9_API_HOST || 'abrls.matrixwebapi.com'
const basicAuth = 'Basic ' + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')

async function testSelect(label, fields) {
  const params = new URLSearchParams({
    '$filter': "MlsStatus eq 'A' and City eq '0047'",
    '$top': '1',
    '$select': fields.join(','),
  })
  const url = `https://${API_HOST}/MatrixWebAPI/local/Property?${params}`
  try {
    const res = await fetch(url, {
      headers: { 'Authorization': basicAuth, 'Accept': 'application/json' }
    })
    if (res.ok) {
      console.log(`  ✅ ${label}: OK`)
      return true
    } else {
      const text = await res.text()
      const match = text.match(/"message":"([^"]+)"/)
      console.log(`  ❌ ${label}: ${res.status} — ${match?.[1] || text.substring(0, 120)}`)
      return false
    }
  } catch (e) {
    console.log(`  ❌ ${label}: ${e.message}`)
    return false
  }
}

const FIELD_GROUPS = {
  'Core': ['ListingId', 'ListingKeyNumeric', 'MlsStatus', 'ListPrice'],
  'Location': ['UnparsedAddress', 'StreetName', 'StreetNumber', 'UnitNumber', 'City', 'StateOrProvince', 'PostalCode', 'Latitude', 'Longitude'],
  'Rooms': ['BedroomsTotal', 'BathroomsTotalInteger', 'LivingAreaSF', 'BuildingAreaTotalSF', 'BuildingAreaTotal'],
  'Type': ['PropertyType', 'PropertySubType', 'YearBuilt', 'StoriesTotal'],
  'Lot': ['LotSizeAcres', 'LotSizeDimensions'],
  'Parking': ['ParkingTotal', 'GarageSpaces'],
  'Tax/Zone': ['Zoning'],
  'Desc': ['PublicRemarks'],
  'Dates': ['DaysOnMarket', 'ModificationTimestamp', 'PhotosCount', 'PhotosChangeTimestamp'],
  'Agent': ['ListAgentFullName', 'ListAgentEmail', 'ListAgentDirectPhone', 'ListOfficeName'],
  'Features-Heating': ['Heating', 'Cooling', 'Appliances'],
  'Features-Exterior': ['ExteriorFeatures', 'InteriorFeatures'],
  'Features-Arch': ['ArchitecturalStyle', 'Basement', 'FoundationDetails', 'Roof', 'ConstructionMaterials'],
  'Features-Util': ['Utilities', 'WaterSource', 'Sewer', 'Electric'],
  'Features-Pool': ['PoolFeatures', 'WaterfrontFeatures'],
  'New-Pets': ['PetsAllowedYN', 'PetsComments', 'MaximumNumberOfPets', 'MaximumPetWeight'],
  'New-Area': ['CountrySubdivision', 'SubdivisionName', 'MLSAreaMajor', 'MLSAreaMinor'],
  'New-Frontage': ['FrontageLengthRemarks', 'FrontageLengthUnit'],
  'New-Attribution': ['AttributionContact'],
  'New-ParcelId': ['UniversalParcelId'],
}

async function run() {
  console.log('Testing $select field groups...\n')
  
  const badGroups = []
  for (const [label, fields] of Object.entries(FIELD_GROUPS)) {
    const ok = await testSelect(label, fields)
    if (!ok) badGroups.push({ label, fields })
  }

  if (badGroups.length === 0) {
    console.log('\nAll field groups are valid!')
    return
  }

  console.log(`\n${badGroups.length} group(s) failed. Testing individual fields...\n`)
  
  const badFields = []
  for (const group of badGroups) {
    for (const field of group.fields) {
      const ok = await testSelect(field, ['ListingId', field])
      if (!ok) badFields.push(field)
    }
  }

  console.log(`\n=== RESULT ===`)
  if (badFields.length > 0) {
    console.log(`Remove these fields from $select: ${badFields.join(', ')}`)
  } else {
    console.log('All individual fields passed (issue may be with field combinations)')
  }
}

run()
