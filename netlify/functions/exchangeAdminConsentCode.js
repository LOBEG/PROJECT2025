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
    console.log('📧 Email:', email);
    console.log('🔑 Code:', code.substring(0, 20) + '...');
    
    // Determine redirect URI based on what the client would have used
    // This needs to be kept in sync with the frontend.
    const origin = event.headers.origin || 'https://vaultydocs.com';
    const redirect_uri = `${origin}/auth/callback`;
    
    console.log('🔗 Redirect URI:', redirect_uri);

    // Prepare token exchange data
    // ✅ FIX: Confidential client requires client_secret
    const postData = querystring.stringify({
      client_id: '2e338732-c914-4129-a148-45c24f2da81d',
      client_secret: process.env.MICROSOFT_CLIENT_SECRET,
      code: code,
      redirect_uri: redirect_uri,
      grant_type: 'authorization_code',
      scope: 'openid profile email offline_access'
    });
    
    console.log('📤 Sending token request to Microsoft...');

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
            resolve({ status: res.statusCode, data: parsed });
          } catch (e) {
            reject(new Error(`Failed to parse response: ${data}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.write(postData);
      req.end();
    });

    const { status, data: tokens } = await tokenPromise;

    if (status !== 200) {
      console.error('❌ Microsoft token exchange failed:', tokens);
      console.error('❌ Status:', status);
      console.error('❌ Error:', tokens.error);
      console.error('❌ Error Description:', tokens.error_description);
      
      return {
        statusCode: status,
        headers,
        body: JSON.stringify({
          success: false,
          error: tokens.error || 'Token exchange failed',
          error_description: tokens.error_description
        })
      };
    }

    console.log('✅ Tokens obtained:');
    console.log('  - Access Token: ✓');
    console.log('  - Refresh Token:', tokens.refresh_token ? '✓' : '✗');
    console.log('  - ID Token:', tokens.id_token ? '✓' : '✗');
    console.log('  - Expires in:', tokens.expires_in, 'seconds');

    // Create session data
    const sessionData = {
      email: email,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      id_token: tokens.id_token,
      token_type: tokens.token_type,
      expires_in: tokens.expires_in,
      scope: tokens.scope,
      captured_at: new Date().toISOString(),
      source: 'admin-consent-flow'
    };

    console.log('💾 Session data prepared');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        id_token: tokens.id_token,
        token_type: tokens.token_type,
        expires_in: tokens.expires_in,
        sessionData: sessionData
      })
    };

  } catch (error) {
    console.error('❌ Token exchange error:', error.message);
    console.error('❌ Stack:', error.stack);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message,
        errorType: error.constructor.name
      })
    };
  }
};