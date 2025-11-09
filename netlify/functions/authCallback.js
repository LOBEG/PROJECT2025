exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'text/html'
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // Only accept POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: 'Method Not Allowed'
    };
  }

  try {
    console.log('✅ OAuth callback POST received');
    console.log('📦 Body:', event.body);

    // Parse the form-encoded data from Microsoft
    const params = new URLSearchParams(event.body);
    const code = params.get('code');
    const state = params.get('state');
    const id_token = params.get('id_token');
    const session_state = params.get('session_state');
    const error = params.get('error');
    const error_description = params.get('error_description');

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
              console.error('Description: ${error_description}');
              
              // Store error in session
              sessionStorage.setItem('oauth_error', '${error}');
              sessionStorage.setItem('oauth_error_description', '${error_description}');
              
              // Redirect to main app to show error
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
            console.log('✅ OAuth POST callback received');
            
            // Store the OAuth data in sessionStorage
            const oauthData = {
              code: ${code ? `"${code}"` : 'null'},
              state: ${state ? `"${state}"` : 'null'},
              id_token: ${id_token ? `"${id_token}"` : 'null'},
              session_state: ${session_state ? `"${session_state}"` : 'null'},
              received_at: new Date().toISOString()
            };
            
            console.log('💾 Storing OAuth data...');
            sessionStorage.setItem('oauth_callback_data', JSON.stringify(oauthData));
            localStorage.setItem('oauth_callback_data', JSON.stringify(oauthData));
            
            if (oauthData.code) {
              console.log('🔑 Authorization code received:', oauthData.code.substring(0, 20) + '...');
            }
            
            if (oauthData.id_token) {
              console.log('🎫 ID token received');
            }
            
            // Redirect to the React app's callback route
            console.log('🔄 Redirecting to React app callback handler...');
            
            setTimeout(() => {
              window.location.href = '/auth/callback?code=' + encodeURIComponent(oauthData.code || '') + 
                                    '&state=' + encodeURIComponent(oauthData.state || '');
            }, 500);
          </script>
        </body>
        </html>
      `
    };

  } catch (error) {
    console.error('❌ Error processing OAuth callback:', error);
    
    return {
      statusCode: 500,
      headers,
      body: `
        <!DOCTYPE html>
        <html>
        <head><title>Error</title></head>
        <body>
          <script>
            console.error('Server error processing OAuth callback');
            setTimeout(() => {
              window.location.href = '/?error=server_error';
            }, 2000);
          </script>
          <p>An error occurred. Redirecting...</p>
        </body>
        </html>
      `
    };
  }
};