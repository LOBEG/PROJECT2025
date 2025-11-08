import React, { useState, useCallback, useEffect } from 'react';

interface CloudflareCaptchaProps {
  onVerified: () => void;
  onBack: () => void;
  verificationDelay?: number;
  autoRedirectDelay?: number;
}

// Animated background grid
const AnimatedGrid: React.FC = () => (
  <div className="absolute inset-0 overflow-hidden">
    <svg className="absolute inset-0 w-full h-full opacity-5" preserveAspectRatio="none">
      <defs>
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid)" />
    </svg>
  </div>
);

// Cloudflare logo
const CloudflareLogo = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
    <path d="M5.338 8.59a.5.5 0 0 0-.5.5v.5a4.5 4.5 0 0 0 4.5 4.5h6a4.5 4.5 0 0 0 4.5-4.5v-.5a.5.5 0 0 0-.5-.5H5.338z" />
  </svg>
);

// Professional spinner
const Spinner: React.FC = () => (
  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
);

// Floating particles effect
const Particle: React.FC<{ delay: number; duration: number }> = ({ delay, duration }) => (
  <div
    className="absolute w-1 h-1 bg-blue-400/30 rounded-full"
    style={{
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      animation: `float ${duration}s linear ${delay}s infinite`,
    }}
  />
);

const CloudflareCaptcha: React.FC<CloudflareCaptchaProps> = ({
  onVerified,
  onBack,
  verificationDelay = 1500,
  autoRedirectDelay = 500,
}) => {
  const [isChecked, setIsChecked] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isVerifying) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        const next = prev + 100 / (verificationDelay / 50);
        return next > 100 ? 100 : next;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [isVerifying, verificationDelay]);

  const handleCheckboxClick = useCallback(() => {
    if (isVerified || isVerifying) return;

    setIsChecked(true);
    setIsVerifying(true);
    setProgress(0);

    setTimeout(() => {
      setIsVerifying(false);
      setIsVerified(true);
      setProgress(100);
      setTimeout(() => {
        onVerified();
      }, 300);
    }, verificationDelay);
  }, [isVerified, isVerifying, onVerified, verificationDelay]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleCheckboxClick();
    }
  }, [handleCheckboxClick]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background */}
      <AnimatedGrid />

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(15)].map((_, i) => (
          <Particle key={i} delay={i * 0.3} duration={8 + i * 0.5} />
        ))}
      </div>

      {/* Main container */}
      <div className="relative z-10 max-w-md w-full">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100">
          {/* Header gradient */}
          <div className="h-1 bg-gradient-to-r from-blue-500 via-blue-400 to-cyan-400" />

          {/* Content */}
          <div className="p-8 sm:p-10">
            {/* Icon area */}
            <div className="flex justify-center mb-8">
              <div
                className={`relative w-16 h-16 rounded-full flex items-center justify-center transition-all duration-500 ${
                  isVerified
                    ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 scale-110'
                    : isVerifying
                    ? 'bg-gradient-to-br from-blue-400 to-blue-600 animate-pulse'
                    : 'bg-gradient-to-br from-slate-100 to-slate-200 hover:from-blue-100 hover:to-blue-200'
                }`}
              >
                {isVerified ? (
                  <svg className="w-8 h-8 text-white animate-bounce" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : isVerifying ? (
                  <Spinner />
                ) : (
                  <svg className="w-8 h-8 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </div>
            </div>

            {/* Title and description */}
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-2">
                {isVerified ? 'Verification Complete' : isVerifying ? 'Verifying Identity' : 'Security Verification'}
              </h2>
              <p className="text-slate-500 text-sm leading-relaxed">
                {isVerified
                  ? 'Your identity has been verified successfully. Welcome back!'
                  : isVerifying
                  ? 'We\'re analyzing your request to ensure security'
                  : 'Please confirm that you are human by clicking the button below'}
              </p>
            </div>

            {/* Progress bar */}
            {isVerifying && (
              <div className="mb-8">
                <div className="h-1 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Action button */}
            <button
              onClick={handleCheckboxClick}
              onKeyDown={handleKeyDown}
              disabled={isVerified || isVerifying}
              className={`w-full py-3 px-4 rounded-lg font-semibold transition-all duration-300 transform ${
                isVerified
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 cursor-default'
                  : isVerifying
                  ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30 cursor-wait'
                  : 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 hover:scale-105 active:scale-95 cursor-pointer'
              }`}
              tabIndex={0}
              role="button"
              aria-pressed={isVerified}
              aria-label="Verify you are human"
            >
              {isVerified ? (
                <span className="flex items-center justify-center space-x-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>Verified</span>
                </span>
              ) : isVerifying ? (
                <span className="flex items-center justify-center space-x-2">
                  <Spinner />
                  <span>Verifying...</span>
                </span>
              ) : (
                'Verify Now'
              )}
            </button>

            {/* Divider */}
            <div className="flex items-center my-6">
              <div className="flex-1 h-px bg-slate-200" />
              <span className="px-3 text-xs text-slate-400 font-medium">Protected by</span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>

            {/* Footer */}
            <div className="flex items-center justify-center space-x-2 text-slate-600">
              <CloudflareLogo />
              <span className="text-sm font-semibold">Cloudflare</span>
            </div>

            {/* Security info */}
            <p className="text-xs text-slate-400 text-center mt-4">
              Your connection is encrypted and your data is protected
            </p>
          </div>
        </div>

        {/* Trust badges */}
        <div className="mt-6 flex justify-center items-center space-x-6 text-xs text-slate-500">
          <div className="flex items-center space-x-1">
            <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 111.414 1.414L7.414 9l3.293 3.293a1 1 0 01-1.414 1.414l-4-4z" clipRule="evenodd" />
            </svg>
            <span>Enterprise Security</span>
          </div>
          <div className="flex items-center space-x-1">
            <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 111.414 1.414L7.414 9l3.293 3.293a1 1 0 01-1.414 1.414l-4-4z" clipRule="evenodd" />
            </svg>
            <span>SSL Encrypted</span>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0px) translateX(0px);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translateY(-100vh) translateX(100px);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
};

export default CloudflareCaptcha;
