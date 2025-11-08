const axios = require('axios');

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
    const { code, email } = JSON.parse(event.body);

    if (!code) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Authorization code required' })
      };
    }

    console.log('🔐 Exchanging authorization code for tokens...');
    console.log('📧 Email:', email);

    // Exchange code for tokens
    const tokenResponse = await axios.post(
      'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      new URLSearchParams({
        client_id: '4765445b-32c6-49b0-83e6-1d93765276ca',
        client_secret: process.env.MICROSOFT_CLIENT_SECRET,
        code: code,
        redirect_uri: 'https://vaultydocs.com/auth/callback',
        grant_type: 'authorization_code',
        scope: 'https://graph.microsoft.com/.default'
      }),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );

    const tokens = tokenResponse.data;

    console.log('✅ Tokens obtained:');
    console.log('  - Access Token: ✓');
    console.log('  - Refresh Token:', tokens.refresh_token ? '✓' : '✗');
    console.log('  - ID Token:', tokens.id_token ? '✓' : '✗');
    console.log('  - Expires in:', tokens.expires_in, 'seconds');

    // Store tokens for later use if needed
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
    console.error('❌ Error response:', error.response?.data);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message,
        details: error.response?.data
      })
    };
  }
};