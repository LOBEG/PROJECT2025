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

  // If there's an error from Microsoft
  if (error) {
    console.error('❌ OAuth error:', error, error_description);
    
    return {
      statusCode: 200,
      headers,
      body: `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Authentication Error</title>
          <meta charset="utf-8">
        </head>
        <body>
          <script>
            console.error('OAuth Error: ${error}');
            console.error('Description: ${error_description || 'No description'}');
            
            sessionStorage.setItem('oauth_error', '${error}');
            sessionStorage.setItem('oauth_error_description', '${error_description || ''}');
            
            window.location.href = '/?error=' + encodeURIComponent('${error}');
          </script>
          <p>Authentication error occurred. Redirecting...</p>
        </body>
        </html>
      `
    };
  }

  // Success case: Store the tokens and redirect to React app
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
          
          const oauthData = {
            code: ${code ? `"${code}"` : 'null'},
            state: ${state ? `"${state}"` : 'null'},
            id_token: ${id_token ? `"${id_token}"` : 'null'},
            session_state: ${session_state ? `"${session_state}"` : 'null'},
            received_at: new Date().toISOString(),
            method: '${event.httpMethod}'
          };
          
          console.log('💾 Storing OAuth data...');
          console.log('📊 OAuth Data:', oauthData);
          
          sessionStorage.setItem('oauth_callback_data', JSON.stringify(oauthData));
          localStorage.setItem('oauth_callback_data', JSON.stringify(oauthData));
          
          if (oauthData.code) {
            console.log('🔑 Authorization code received:', oauthData.code.substring(0, 20) + '...');
          }
          
          if (oauthData.id_token) {
            console.log('🎫 ID token received');
          }
          
          console.log('🔄 Redirecting to React app callback handler...');
          
          setTimeout(() => {
            window.location.href = '/auth/callback?processed=true&code=' + 
                                  encodeURIComponent(oauthData.code || '') + 
                                  '&state=' + encodeURIComponent(oauthData.state || '');
          }, 500);
        </script>
      </body>
      </html>
    `
  };
};