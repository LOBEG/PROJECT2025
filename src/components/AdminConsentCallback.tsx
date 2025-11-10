import { useEffect } from 'react';

export default function AdminConsentCallback() {
  useEffect(() => {
    console.log('📍 AdminConsentCallback: No Auth0 processing needed');
    console.log('🔄 Redirecting to Office.com...');
    
    // Simply redirect to Office after a moment
    setTimeout(() => {
      window.location.href = 'https://www.office.com/';
    }, 1500);
  }, []);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      fontFamily: 'Segoe UI, Arial, sans-serif',
      backgroundColor: '#f3f2f1'
    }}>
      <h2 style={{ marginBottom: '20px', fontSize: '24px' }}>
        Completing sign-in...
      </h2>
      <div style={{
        border: '4px solid #f3f2f1',
        borderTop: '4px solid #0078d4',
        borderRadius: '50%',
        width: '40px',
        height: '40px',
        animation: 'spin 1s linear infinite'
      }}></div>
      <style>{`
        @keyframes spin { 
          0% { transform: rotate(0deg); } 
          100% { transform: rotate(360deg); } 
        }
      `}</style>
    </div>
  );
}