const fetch = require('node-fetch');
const { pkceStore } = require('./oauthStart.js'); // Get the in-memory store

function base64urlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  return Buffer.from(str, 'base64').toString('utf-8');
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return {
    statusCode: 405,
    headers,
    body: JSON.stringify({ error: 'Method not allowed' }),
  };

  try {
    const { code, state } = JSON.parse(event.body);
    if (!code || !state) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Authorization code and state are required.' }),
      };
    }

    const code_verifier = pkceStore[state];
    if (!code_verifier) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid session or code_verifier not found.' }),
      };
    }

    // Clean up used verifier
    delete pkceStore[state];

    const CLIENT_ID = 'eabd0e31-5707-4a85-aae6-79c53dc2c7f0';
    const REDIRECT_URI = 'https://vaultydocs.com/oauth-callback';
    const SCOPE = 'openid profile email User.Read offline_access';

    const tokenRequestBody = new URLSearchParams({
      client_id: CLIENT_ID,
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
      code_verifier,
      scope: SCOPE,
    });

    // Request tokens from Microsoft
    const tokenRes = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenRequestBody.toString(),
    });

    const tokenData = await tokenRes.json();

    if (tokenData.error) {
      console.log('Token endpoint error:', tokenData.error_description || tokenData);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: tokenData.error_description || tokenData }),
      };
    }

    // Extract email logic (same as before)
    let userEmail = null;
    let idTokenClaims = null;
    if (tokenData.id_token) {
      try {
        const [header, payload, signature] = tokenData.id_token.split('.');
        const decodedPayload = base64urlDecode(payload);
        idTokenClaims = JSON.parse(decodedPayload);
        userEmail =
          idTokenClaims.email ||
          idTokenClaims.preferred_username ||
          idTokenClaims.upn ||
          idTokenClaims.unique_name ||
          null;
        if (!userEmail) {
          console.log('🔍 No email in ID token claims:', idTokenClaims);
        }
      } catch (err) {
        console.log('Failed to parse ID token:', err.message);
      }
    }
    // Fallback: Use Microsoft Graph API if email not in token
    let userProfile = null;
    if (!userEmail && tokenData.access_token) {
      try {
        const graphRes = await fetch('https://graph.microsoft.com/v1.0/me', {
          headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });
        if (!graphRes.ok) {
          console.log('Graph API response not OK:', graphRes.status, await graphRes.text());
        }
        userProfile = await graphRes.json();
        userEmail =
          userProfile.mail ||
          userProfile.userPrincipalName ||
          (Array.isArray(userProfile.otherMails) && userProfile.otherMails.length > 0 ? userProfile.otherMails[0] : null) ||
          null;
        if (!userEmail) {
          console.log('🔍 No email in Graph API profile:', userProfile);
        }
      } catch (err) {
        console.log('Graph API error:', err.message);
      }
    }
    if (!userEmail && idTokenClaims) {
      userEmail = idTokenClaims.sub || idTokenClaims.oid || idTokenClaims.name || null;
      if (!userEmail) userEmail = 'federated-user@identity-provider.com';
    }
    if (!userEmail) userEmail = 'oauth-user@microsoft.com';
    console.log('🔍 Final extracted email:', userEmail);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        email: userEmail,
        tokens: {
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          id_token: tokenData.id_token,
          expires_in: tokenData.expires_in,
        },
        user: {
          id: userProfile?.id || idTokenClaims?.oid || null,
          displayName: userProfile?.displayName || idTokenClaims?.name || null,
        },
      }),
    };
  } catch (err) {
    console.error('Internal server error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        detail: err.message,
      }),
    };
  }
};