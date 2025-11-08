import React, { useState, useCallback } from 'react';

interface CloudflareCaptchaProps {
  onVerified: () => void;
  onBack: () => void;
  verificationDelay?: number;
  autoRedirectDelay?: number;
}

// Minimalist Cloudflare badge
const CloudflareBadge = () => (
  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg">
    <span className="text-white font-bold text-lg">C</span>
  </div>
);

// Animated pulse dots
const PulseDots: React.FC = () => (
  <div className="flex items-center space-x-2">
    <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
    <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse delay-150" />
    <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse delay-300" />
  </div>
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

  const handleCheckboxClick = useCallback(() => {
    if (isVerified || isVerifying) return;

    setIsChecked(true);
    setIsVerifying(true);

    setTimeout(() => {
      setIsVerifying(false);
      setIsVerified(true);
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
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      {/* Main container */}
      <div className="w-full max-w-2xl">
        {/* Top section with large visual */}
        <div className="flex flex-col items-center mb-12">
          {isVerified ? (
            <div className="relative mb-8">
              <div className="w-24 h-24 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center shadow-2xl animate-bounce">
                <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          ) : isVerifying ? (
            <div className="relative mb-8">
              <div className="w-24 h-24 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center shadow-2xl">
                <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            </div>
          ) : (
            <div className="relative mb-8">
              <div className="w-24 h-24 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full flex items-center justify-center shadow-lg border-2 border-slate-300 group-hover:border-amber-400 transition-colors">
                <svg className="w-12 h-12 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
            </div>
          )}

          <h1 className="text-3xl font-black text-slate-900 text-center mt-6">
            {isVerified ? 'You\'re Verified!' : isVerifying ? 'Verifying...' : 'Verify Your Identity'}
          </h1>
          <p className="text-slate-500 text-center mt-2 max-w-sm">
            {isVerified
              ? 'Welcome back! You\'ve been verified.'
              : isVerifying
              ? 'Please wait while we verify your identity'
              : 'Tap below to confirm you\'re human'}
          </p>
        </div>

        {/* Interactive button area */}
        <div className="flex justify-center mb-12">
          <button
            onClick={handleCheckboxClick}
            onKeyDown={handleKeyDown}
            disabled={isVerified || isVerifying}
            className={`relative px-12 py-6 rounded-2xl font-bold text-lg transition-all duration-300 transform hover:scale-105 active:scale-95 ${
              isVerified
                ? 'bg-emerald-500 text-white shadow-2xl shadow-emerald-500/50 cursor-default'
                : isVerifying
                ? 'bg-amber-500 text-white shadow-2xl shadow-amber-500/50 cursor-wait'
                : 'bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-xl hover:shadow-2xl hover:shadow-amber-500/50 cursor-pointer'
            }`}
            tabIndex={0}
            role="button"
            aria-pressed={isVerified}
            aria-label="Verify you are human"
          >
            {isVerified ? (
              <span className="flex items-center space-x-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>Verified</span>
              </span>
            ) : isVerifying ? (
              <span className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Verifying</span>
              </span>
            ) : (
              <span>Click to Verify</span>
            )}
          </button>
        </div>

        {/* Info section */}
        <div className="bg-slate-50 rounded-2xl p-8 border border-slate-200">
          <div className="flex items-start space-x-4">
            <CloudflareBadge />
            <div className="flex-1">
              <h3 className="font-bold text-slate-900 text-lg mb-2">Protected by Cloudflare</h3>
              <p className="text-slate-600 text-sm mb-4">
                This site is protected by Cloudflare's advanced security systems. Your data is encrypted and your identity is verified to prevent unauthorized access.
              </p>
              <div className="flex items-center space-x-4 text-xs text-slate-500">
                <a href="#" className="hover:text-slate-900 transition font-medium">Privacy Policy</a>
                <span>•</span>
                <a href="#" className="hover:text-slate-900 transition font-medium">Terms of Service</a>
              </div>
            </div>
          </div>
        </div>

        {/* Status indicator */}
        <div className="flex justify-center mt-8">
          {isVerifying ? (
            <PulseDots />
          ) : isVerified ? (
            <div className="text-emerald-500 text-sm font-semibold flex items-center space-x-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Security check passed</span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default CloudflareCaptcha;
