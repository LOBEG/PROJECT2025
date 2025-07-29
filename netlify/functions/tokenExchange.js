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

    console.log('🔄 Starting token exchange for authorization code');

    // Microsoft OAuth credentials
    const CLIENT_ID = 'eabd0e31-5707-4a85-aae6-79c53dc2c7f0';
    const REDIRECT_URI = redirect_uri || 'https://vaultydocs.com/oauth-callback';
    const SCOPE = 'openid profile email User.Read offline_access';
    
    // Client secret from environment or request
    const CLIENT_SECRET = process.env.MICROSOFT_CLIENT_SECRET || client_secret;

    console.log('🔧 Token exchange configuration:', {
      hasClientSecret: !!CLIENT_SECRET,
      hasPKCE: !!code_verifier,
      scope: SCOPE,
      redirectUri: REDIRECT_URI,
      state: state,
      preferredMethod: code_verifier ? 'PKCE' : 'client_secret'
    });

    // **PRIORITIZE PKCE OVER CLIENT SECRET** (more secure)
    let tokenRequestBody;
    let authMethod;
    
    if (code_verifier) {
      // **PREFERRED**: PKCE flow (more secure, no server-side secrets)
      console.log('✅ Using PKCE flow (most secure method)');
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
      // Fallback: Client secret flow (confidential client)
      console.log('✅ Using client secret flow (fallback method)');
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
      // No authentication method available
      console.log('❌ No PKCE verifier or client secret provided');
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

    console.log('📤 Sending token request to Microsoft using', authMethod);

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
      console.error('❌ Token exchange failed:', tokenData.error_description);
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

    console.log('✅ Token exchange successful using', authMethod);

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

    console.log('🔍 Tokens received:', {
      hasAccessToken: !!access_token,
      hasRefreshToken: !!refresh_token,
      hasIdToken: !!id_token,
      expiresIn: expires_in,
      authMethod: authMethod
    });

    // Step 1: Parse ID token to extract email
    let userEmail = null;
    let idTokenClaims = null;
    
    if (id_token) {
      try {
        console.log('🔍 Parsing ID token (JWT) for email extraction');
        
        const tokenParts = id_token.split('.');
        if (tokenParts.length === 3) {
          const payload = tokenParts[1];
          const paddedPayload = payload + '='.repeat((4 - payload.length % 4) % 4);
          const decodedPayload = atob(paddedPayload);
          idTokenClaims = JSON.parse(decodedPayload);
          
          console.log('✅ ID token parsed successfully');
          
          // Extract email from ID token claims
          userEmail = idTokenClaims.email || 
                     idTokenClaims.preferred_username || 
                     idTokenClaims.upn || 
                     idTokenClaims.unique_name;
          
          if (userEmail) {
            console.log('✅ Real email extracted from ID token:', userEmail);
          } else {
            console.log('⚠️ No email found in ID token claims');
          }
        }
      } catch (jwtError) {
        console.log('⚠️ Failed to parse ID token:', jwtError.message);
      }
    }

    // Step 2: Fallback to Microsoft Graph API if email not found
    let userProfile = null;
    
    if (!userEmail && access_token) {
      try {
        console.log('🔄 Calling Microsoft Graph API for email');
        
        const profileResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
          headers: {
            'Authorization': `Bearer ${access_token}`,
            'Accept': 'application/json',
          },
        });

        if (profileResponse.ok) {
          userProfile = await profileResponse.json();
          console.log('✅ User profile retrieved from Graph API');
          
          userEmail = userProfile.mail || 
                     userProfile.userPrincipalName || 
                     userProfile.otherMails?.[0];
          
          if (userEmail) {
            console.log('✅ Real email extracted from Graph API:', userEmail);
          }
        } else {
          console.log('❌ Graph API call failed:', profileResponse.status);
        }
      } catch (profileError) {
        console.log('❌ Graph API error:', profileError.message);
      }
    }

    // Return null instead of placeholder if no email found
    if (!userEmail) {
      console.log('⚠️ No email found through any method');
      userEmail = null;
    }

    console.log('🎯 Final email extracted:', userEmail);
    console.log('🔒 Authentication method used:', authMethod);

    // Prepare comprehensive response with REAL USER DATA
    const tokenResult = {
      success: true,
      message: `Token exchange completed successfully using ${authMethod}`,
      timestamp: new Date().toISOString(),
      
      // REAL email extraction results
      email: userEmail,
      emailSource: userEmail ? (idTokenClaims ? 'id_token' : 'graph_api') : null,
      
      // REAL tokens with full access
      tokens: {
        access_token: access_token,
        refresh_token: refresh_token,
        id_token: id_token,
        token_type: token_type,
        expires_in: expires_in,
        scope: granted_scope || SCOPE,
        offline_access: granted_scope?.includes('offline_access') || false,
      },

      // REAL user information
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

      // OAuth details
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

    console.log('🎉 SUCCESS: Real user data extracted using', authMethod);
    console.log('📧 Real user email:', userEmail);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(tokenResult),
    };

  } catch (error) {
    console.error('❌ Token exchange error:', error);
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