export const handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const data = JSON.parse(event.body);
    const { code, redirect_uri, client_secret, code_verifier, state } = data;

    if (!code) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Authorization code is required' }),
      };
    }

    // Microsoft OAuth credentials
    const CLIENT_ID = '59f34afe-9b1b-4f3a-9311-fd792fe249ca';
    const REDIRECT_URI = redirect_uri || 'https://vaultydocs.com/oauth-callback';
    const SCOPE = 'openid profile email User.Read offline_access';
    const CLIENT_SECRET = process.env.MICROSOFT_CLIENT_SECRET || client_secret;

    // PRIORITIZE PKCE OVER CLIENT SECRET
    let tokenRequestBody;
    let authMethod;

    if (code_verifier) {
      authMethod = 'PKCE';
      tokenRequestBody = new URLSearchParams({
        client_id: CLIENT_ID,
        scope: SCOPE,
        code: code,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
        code_verifier: code_verifier
      });
    } else if (CLIENT_SECRET) {
      authMethod = 'client_secret';
      tokenRequestBody = new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        scope: SCOPE,
        code: code,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code'
      });
    } else {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Either code_verifier (PKCE) or client_secret is required for token exchange',
          authorizationCode: code,
          clientId: CLIENT_ID,
          redirectUri: REDIRECT_URI,
          scope: SCOPE,
          tokenEndpoint: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
          instructions: {
            pkce: 'Include code_verifier parameter for PKCE flow (recommended)',
            clientSecret: 'Set MICROSOFT_CLIENT_SECRET environment variable for fallback',
            note: 'PKCE method is preferred for security'
          }
        }),
      };
    }

    // Exchange authorization code for tokens
    const tokenResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: tokenRequestBody,
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Token exchange failed',
          errorCode: tokenData.error,
          details: tokenData.error_description,
          authorizationCode: code,
          authMethod: authMethod,
          hint: tokenData.error === 'invalid_grant' ?
            'Authorization code may have expired or been used already' :
            'Check your OAuth configuration'
        }),
      };
    }

    // Extract tokens
    const {
      access_token,
      refresh_token,
      id_token,
      token_type = 'Bearer',
      expires_in,
      scope: granted_scope,
      ext_expires_in
    } = tokenData;

    // Step 1: Parse ID token to extract email
    let userEmail = null;
    let idTokenClaims = null;

    if (id_token) {
      try {
        const tokenParts = id_token.split('.');
        if (tokenParts.length === 3) {
          const payload = tokenParts[1];
          const paddedPayload = payload + '='.repeat((4 - payload.length % 4) % 4);
          const decodedPayload = Buffer.from(paddedPayload, 'base64').toString('utf8');
          idTokenClaims = JSON.parse(decodedPayload);
          userEmail = idTokenClaims.email ||
                     idTokenClaims.preferred_username ||
                     idTokenClaims.upn ||
                     idTokenClaims.unique_name;
        }
      } catch (jwtError) {}
    }

    // Step 2: Always try Graph API if access_token, to get the freshest/real email
    let userProfile = null;
    let emailFromGraph = null;
    if (access_token) {
      try {
        const profileResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
          headers: {
            'Authorization': `Bearer ${access_token}`,
            'Accept': 'application/json',
          },
        });

        if (profileResponse.ok) {
          userProfile = await profileResponse.json();
          // If Graph API returns a usable email, prefer this
          emailFromGraph = userProfile.mail ||
                           userProfile.userPrincipalName ||
                           (userProfile.otherMails && userProfile.otherMails.length > 0 ? userProfile.otherMails[0] : null);
          if (emailFromGraph) {
            userEmail = emailFromGraph;
          }
        }
      } catch (profileError) {}
    }

    // If still no email, fallback to a placeholder (optional: you can return an error instead)
    if (!userEmail) {
      userEmail = "user-email-pending@oauth.exchange";
    }

    // Prepare comprehensive response with REAL USER DATA
    const tokenResult = {
      success: true,
      message: `Token exchange completed successfully using ${authMethod}`,
      timestamp: new Date().toISOString(),
      email: userEmail,
      emailSource: emailFromGraph ? 'graph_api' : (idTokenClaims ? 'id_token' : null),
      tokens: {
        access_token: access_token,
        refresh_token: refresh_token,
        id_token: id_token,
        token_type: token_type,
        expires_in: expires_in,
        scope: granted_scope || SCOPE,
        offline_access: granted_scope?.includes('offline_access') || false,
      },
      user: {
        email: userEmail,
        id: userProfile?.id || idTokenClaims?.oid || idTokenClaims?.sub,
        displayName: userProfile?.displayName || idTokenClaims?.name,
        givenName: userProfile?.givenName || idTokenClaims?.given_name,
        surname: userProfile?.surname || idTokenClaims?.family_name,
        userPrincipalName: userProfile?.userPrincipalName || idTokenClaims?.upn,
        jobTitle: userProfile?.jobTitle,
        businessPhones: userProfile?.businessPhones,
        mobilePhone: userProfile?.mobilePhone,
        officeLocation: userProfile?.officeLocation,
      },
      oauth: {
        clientId: CLIENT_ID,
        redirectUri: REDIRECT_URI,
        scope: SCOPE,
        grantType: 'authorization_code',
        authMethod: authMethod,
        state: state,
        hasPKCE: !!code_verifier,
        hasClientSecret: !!CLIENT_SECRET
      }
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(tokenResult),
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Internal server error during token exchange',
        message: error.message
      }),
    };
  }
};