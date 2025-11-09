exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'text/html'
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  console.log('✅ OAuth callback received');
  console.log('📋 Method:', event.httpMethod);
  console.log('📦 Body:', event.body);
  console.log('🔗 Query:', event.queryStringParameters);

  let code = null;
  let state = null;
  let id_token = null;
  let session_state = null;
  let error = null;
  let error_description = null;

  // Handle POST request (form_post from Microsoft)
  if (event.httpMethod === 'POST') {
    const params = new URLSearchParams(event.body);
    code = params.get('code');
    state = params.get('state');
    id_token = params.get('id_token');
    session_state = params.get('session_state');
    error = params.get('error');
    error_description = params.get('error_description');
  }
  // Handle GET request (query params from Microsoft)
  else if (event.httpMethod === 'GET') {
    const params = event.queryStringParameters || {};
    code = params.code;
    state = params.state;
    id_token = params.id_token;
    session_state = params.session_state;
    error = params.error;
    error_description = params.error_description;
  }

  console.log('🔑 Code:', code ? code.substring(0, 20) + '...' : 'None');
  console.log('🎫 ID Token:', id_token ? 'Present' : 'None');
  console.log('🔐 State:', state);
  console.log('❌ Error:', error);

  // Helper function to safely escape strings for JavaScript
  function escapeJs(str) {
    if (!str) return '';
    return str
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t');
  }

  // If there's an error from Microsoft
  if (error) {
    console.error('❌ OAuth error:', error, error_description);
    
    const safeError = escapeJs(error);
    const safeErrorDesc = escapeJs(error_description || 'No description provided');
    
    return {
      statusCode: 200,
      headers,
      body: `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Authentication Error</title>
          <meta charset="utf-8">
          <style>
            body {
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              font-family: 'Segoe UI', Arial, sans-serif;
              background-color: #f3f2f1;
              margin: 0;
            }
            .container {
              text-align: center;
              padding: 40px;
              background: white;
              border-radius: 8px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
              max-width: 500px;
            }
            h2 { color: #d13438; margin-bottom: 20px; }
            p { color: #605e5c; font-size: 14px; line-height: 1.6; }
            .error-code { 
              background: #f3f2f1; 
              padding: 10px; 
              border-radius: 4px; 
              margin: 20px 0;
              font-family: 'Courier New', monospace;
              font-size: 13px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>⚠️ Authentication Error</h2>
            <p>An error occurred during the sign-in process.</p>
            <div class="error-code">
              <strong>Error:</strong> ${safeError}<br>
              <strong>Description:</strong> ${safeErrorDesc}
            </div>
            <p>Redirecting you back to the start...</p>
          </div>
          
          <script>
            console.error('OAuth Error: ${safeError}');
            console.error('Description: ${safeErrorDesc}');
            
            sessionStorage.setItem('oauth_error', '${safeError}');
            sessionStorage.setItem('oauth_error_description', '${safeErrorDesc}');
            
            setTimeout(function() {
              window.location.href = '/?error=' + encodeURIComponent('${safeError}');
            }, 3000);
          </script>
        </body>
        </html>
      `
    };
  }

  // No code received - something went wrong
  if (!code) {
    console.warn('⚠️ No authorization code received');
    
    return {
      statusCode: 200,
      headers,
      body: `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Authentication Issue</title>
          <meta charset="utf-8">
          <style>
            body {
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              font-family: 'Segoe UI', Arial, sans-serif;
              background-color: #f3f2f1;
              margin: 0;
            }
            .container {
              text-align: center;
              padding: 40px;
              background: white;
              border-radius: 8px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>⚠️ No Authorization Code</h2>
            <p>The authentication process didn't complete properly.</p>
            <p>Redirecting you back to try again...</p>
          </div>
          
          <script>
            console.warn('No authorization code received from Microsoft');
            setTimeout(function() {
              window.location.href = '/';
            }, 2000);
          </script>
        </body>
        </html>
      `
    };
  }

  // Success case: Store the tokens and redirect DIRECTLY to the callback page (not as query params)
  const safeCode = escapeJs(code);
  const safeState = escapeJs(state || '');
  const safeIdToken = escapeJs(id_token || '');
  const safeSessionState = escapeJs(session_state || '');

  return {
    statusCode: 200,
    headers,
    body: `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Processing Authentication</title>
        <meta charset="utf-8">
        <style>
          body {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            font-family: 'Segoe UI', Arial, sans-serif;
            background-color: #f3f2f1;
            margin: 0;
          }
          .container {
            text-align: center;
          }
          .spinner {
            border: 4px solid #f3f3f3;
            border-top: 4px solid #0078d4;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 0 auto 20px;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          h2 { color: #323130; margin-bottom: 10px; }
          p { color: #605e5c; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="spinner"></div>
          <h2>Processing your authentication...</h2>
          <p>Please wait while we complete the sign-in process.</p>
        </div>
        
        <script>
          console.log('✅ OAuth callback received via ${event.httpMethod}');
          
          var oauthData = {
            code: '${safeCode}',
            state: '${safeState}',
            id_token: '${safeIdToken}',
            session_state: '${safeSessionState}',
            received_at: new Date().toISOString(),
            method: '${event.httpMethod}'
          };
          
          console.log('💾 Storing OAuth data...');
          console.log('📊 Code length:', oauthData.code.length);
          
          sessionStorage.setItem('oauth_callback_data', JSON.stringify(oauthData));
          localStorage.setItem('oauth_callback_data', JSON.stringify(oauthData));
          
          console.log('🔑 Authorization code stored in sessionStorage');
          
          if (oauthData.id_token) {
            console.log('🎫 ID token stored');
          }
          
          console.log('🔄 Redirecting to callback handler...');
          
          // ✅ FIX: Redirect to /auth/callback WITHOUT query parameters to avoid loop
          setTimeout(function() {
            window.location.href = '/auth/callback';
          }, 500);
        </script>
      </body>
      </html>
    `
  };
};