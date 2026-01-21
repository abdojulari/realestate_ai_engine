import https from 'https';

const config = {
  clientId: 'oidc-trestle_dsgnxinc_realstats_134113351420608424-ticuocd',
  clientSecret: 'kOoPeSMxooYgrShfsGQJLrpH0LxFYOv-ONrXWUBY',
  tokenUrl: 'pillarnine.clareityiam.net',
  tokenPath: '/idp/profile/oidc/token?grant_type=client_credentials&scope=openid',
  apiUrl: 'abrls.matrixwebapi.com',
  apiPath: '/MatrixWebAPI/local/Property'
};

console.log('🔐 Step 1: Getting access token from Clareity...\n');

// Step 1: Get token using Basic Auth
const auth = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');

const tokenOptions = {
  hostname: config.tokenUrl,
  path: config.tokenPath,
  method: 'POST',
  headers: {
    'Authorization': `Basic ${auth}`,
    'Content-Type': 'application/x-www-form-urlencoded',
    'Accept': 'application/json'
  }
};

const tokenReq = https.request(tokenOptions, (res) => {
  let data = '';

  console.log('Status Code:', res.statusCode);
  console.log('Headers:', JSON.stringify(res.headers, null, 2));

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('\nRaw Response:', data);
    console.log('---\n');

    if (res.statusCode !== 200) {
      console.error('❌ Token request failed');
      return;
    }

    try {
      const tokenData = JSON.parse(data);
      const accessToken = tokenData.access_token;
      
      console.log('✅ Access Token received:', accessToken.substring(0, 50) + '...');
      console.log('⏱ Expires in:', tokenData.expires_in, 'seconds');
      console.log('🔑 Token type:', tokenData.token_type);
      console.log('\n---\n');

      // Step 2: Use token to fetch property data
      console.log('🏠 Step 2: Fetching property data from Matrix API...\n');

      const filter = encodeURIComponent("(MlsStatus eq 'A') and ListPrice ge 2000000");
      const select = encodeURIComponent("ListingId,PhotosCount,ListPrice,City");
      const query = `?$filter=${filter}&$top=100&$select=${select}`;
      
      const apiOptions = {
        hostname: config.apiUrl,
        path: config.apiPath + query,
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      };

      const apiReq = https.request(apiOptions, (apiRes) => {
        let apiData = '';

        console.log('Status Code:', apiRes.statusCode);

        apiRes.on('data', (chunk) => {
          apiData += chunk;
        });

        apiRes.on('end', () => {
          if (apiRes.statusCode !== 200) {
            console.error('❌ API request failed');
            console.log('Response:', apiData);
            return;
          }

          try {
            const properties = JSON.parse(apiData);
            console.log('\n✅ Successfully retrieved property data!');
            console.log('\nTotal properties:', properties.value?.length || 0);
            console.log('\nProperty Data:');
            console.log(JSON.stringify(properties, null, 2));
          } catch (e) {
            console.error('❌ Failed to parse property data:', e.message);
            console.log('Raw response:', apiData.substring(0, 500));
          }
        });
      });

      apiReq.on('error', (err) => {
        console.error('❌ API request error:', err.message);
      });

      apiReq.end();

    } catch (e) {
      console.error('❌ Failed to parse token response:', e.message);
    }
  });
});

tokenReq.on('error', (err) => {
  console.error('❌ Token request error:', err.message);
});

tokenReq.end();

