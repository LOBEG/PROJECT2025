import React, { useState, useCallback } from 'react';

interface CloudflareCaptchaProps {
  onVerified: () => void;
  onBack: () => void;
  verificationDelay?: number;
  autoRedirectDelay?: number;
}

// Modern Cloudflare logo SVG
const CloudflareLogo = () => (
  <svg
    className="w-5 h-5"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"
      fill="currentColor"
    />
    <path
      d="M12 6c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z"
      fill="currentColor"
    />
  </svg>
);

// Modern spinner component with gradient
const Spinner: React.FC<{ size?: 'sm' | 'md'; className?: string }> = ({
  size = 'md',
  className = ''
}) => {
  const sizeClasses = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';

  return (
    <div
      className={`${sizeClasses} relative ${className}`}
      aria-label="Loading"
    >
      <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-orange-400 border-r-orange-400 animate-spin" />
    </div>
  );
};

const CloudflareCaptcha: React.FC<CloudflareCaptchaProps> = ({
  onVerified,
  onBack,
  verificationDelay = 1500,
  autoRedirectDelay = 500,
}) => {
  const [isChecked, setIsChecked] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);

  // When clicked, show spinner for the entire delay period, then redirect immediately
  const handleCheckboxClick = useCallback(() => {
    if (isVerified || isVerifying) return;

    setIsChecked(true);
    setIsVerifying(true);

    // Keep spinner for the entire delay period, then redirect immediately
    setTimeout(() => {
      setIsVerifying(false);
      setIsVerified(true);
      // Redirect immediately without showing check mark
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-700" />
      </div>

      {/* Main card */}
      <div className="relative z-10 bg-slate-800/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 shadow-2xl" style={{ width: '360px' }}>
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-white text-xl font-bold mb-2">Security Verification</h1>
          <p className="text-slate-400 text-sm">Prove you're human to continue</p>
        </div>

        {/* Main verification area */}
        <div className="mb-8">
          {/* Checkbox container */}
          <div
            className={`relative p-6 border-2 rounded-xl cursor-pointer transition-all duration-300 group ${
              isVerified
                ? 'border-green-500/50 bg-green-500/5 shadow-lg shadow-green-500/20'
                : isVerifying
                ? 'border-orange-400/50 bg-orange-500/5 shadow-lg shadow-orange-500/20'
                : 'border-slate-600 bg-slate-700/30 hover:border-slate-500 hover:bg-slate-700/50 active:border-orange-400 active:bg-orange-500/5'
            }`}
            onClick={handleCheckboxClick}
            onKeyDown={handleKeyDown}
            tabIndex={0}
            role="checkbox"
            aria-checked={isVerified}
            aria-label="Verify you are human"
          >
            {/* Checkbox visual */}
            <div className="flex items-center space-x-4">
              <div
                className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg border-2 transition-all duration-300 ${
                  isVerified
                    ? 'border-green-500 bg-green-500 shadow-lg shadow-green-500/50'
                    : isVerifying
                    ? 'border-orange-400 bg-orange-500/10 shadow-lg shadow-orange-500/30'
                    : 'border-slate-500 bg-slate-600/50 group-hover:border-slate-400 group-hover:bg-slate-600'
                }`}
              >
                {isVerifying && <Spinner size="sm" />}
                {isVerified && (
                  <svg
                    className="w-4 h-4 text-white animate-bounce"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>

              <div>
                <p className="text-white text-sm font-semibold select-none">
                  {isVerified ? 'Verified' : 'I\'m not a robot'}
                </p>
                <p className="text-slate-400 text-xs select-none">
                  {isVerifying ? 'Verifying...' : 'Click to verify'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer with branding */}
        <div className="border-t border-slate-700/50 pt-6 mt-8">
          <div className="flex items-center space-x-2 text-xs text-slate-400">
            <span className="text-orange-400">
              <CloudflareLogo />
            </span>
            <span>Protected by</span>
            <span className="font-semibold text-slate-300">Cloudflare</span>
          </div>
          <p className="text-slate-500 text-xs mt-3">
            This site is protected by reCAPTCHA and the Google
            <br />
            <a href="#" className="text-orange-400 hover:text-orange-300 transition">Privacy Policy</a>
            {' '}and{' '}
            <a href="#" className="text-orange-400 hover:text-orange-300 transition">Terms of Service</a>
            {' '}apply.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CloudflareCaptcha;
