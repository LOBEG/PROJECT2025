import React, { useState, useCallback, useEffect } from 'react';

interface CloudflareCaptchaProps {
  onVerified: () => void;
  onBack: () => void;
  verificationDelay?: number;
  autoRedirectDelay?: number;
}

// Animated background with moving shapes
const AnimatedBackground: React.FC = () => (
  <div className="absolute inset-0 overflow-hidden">
    <div className="absolute top-0 left-0 w-72 h-72 bg-purple-500/20 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000" />
    <div className="absolute top-0 right-0 w-72 h-72 bg-pink-500/20 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000" />
    <div className="absolute bottom-0 left-1/2 w-72 h-72 bg-blue-500/20 rounded-full mix-blend-multiply filter blur-3xl animate-blob" />
  </div>
);

// Interactive mesh background
const MeshBg: React.FC = () => (
  <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
    <defs>
      <filter id="noise">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" result="noise" />
      </filter>
      <linearGradient id="meshGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#9333ea" stopOpacity="0.1" />
        <stop offset="50%" stopColor="#ec4899" stopOpacity="0.1" />
        <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.1" />
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#meshGrad)" filter="url(#noise)" opacity="0.5" />
  </svg>
);

// Orb effect
const Orb: React.FC<{ state: 'idle' | 'verifying' | 'verified' }> = ({ state }) => {
  const getColors = () => {
    switch (state) {
      case 'verified':
        return ['from-emerald-400', 'to-emerald-600', 'shadow-emerald-500/50'];
      case 'verifying':
        return ['from-purple-500', 'to-pink-500', 'shadow-purple-500/50'];
      default:
        return ['from-blue-400', 'to-purple-500', 'shadow-blue-500/50'];
    }
  };

  const [colorFrom, colorTo, shadowColor] = getColors();

  return (
    <div className="relative w-32 h-32 mb-8">
      {/* Outer glow rings */}
      <div className={`absolute inset-0 rounded-full border-2 border-transparent border-t-purple-400 border-r-pink-400 animate-spin`} style={{ animationDuration: '3s' }} />
      <div className={`absolute inset-2 rounded-full border-2 border-transparent border-b-blue-400 border-l-purple-400 animate-spin`} style={{ animationDuration: '4s', animationDirection: 'reverse' }} />

      {/* Main orb */}
      <div className={`absolute inset-4 rounded-full bg-gradient-to-br ${colorFrom} ${colorTo} shadow-2xl ${shadowColor} ${state === 'verifying' ? 'animate-pulse' : state === 'verified' ? 'animate-bounce' : ''}`}>
        {/* Inner shine */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent to-white/20" />

        {/* Icon */}
        <div className="absolute inset-0 flex items-center justify-center">
          {state === 'verified' ? (
            <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          ) : state === 'verifying' ? (
            <div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          )}
        </div>
      </div>
    </div>
  );
};

// Scanline effect
const Scanlines: React.FC = () => (
  <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent via-transparent to-black/5 opacity-20" />
);

// Interactive ripple effect
const RippleEffect: React.FC<{ isActive: boolean }> = ({ isActive }) => (
  <>
    {isActive && (
      <>
        <div className="absolute inset-0 rounded-3xl border-2 border-purple-400/30 animate-pulse" />
        <div className="absolute -inset-1 rounded-3xl border border-pink-400/20 animate-ping" />
      </>
    )}
  </>
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
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

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
    <div
      className="min-h-screen bg-black/95 flex items-center justify-center p-4 relative overflow-hidden"
      onMouseMove={handleMouseMove}
    >
      {/* Background effects */}
      <AnimatedBackground />
      <MeshBg />
      <Scanlines />

      {/* Main container */}
      <div className="relative z-10 max-w-sm w-full">
        {/* Glow effect following mouse */}
        <div
          className="absolute -inset-32 rounded-3xl pointer-events-none"
          style={{
            background: `radial-gradient(circle 400px at ${mousePosition.x}px ${mousePosition.y}px, rgba(139, 92, 246, 0.1), transparent 80%)`,
          }}
        />

        {/* Card container */}
        <div className="relative backdrop-blur-xl bg-white/5 rounded-3xl p-8 sm:p-12 border border-white/10 shadow-2xl overflow-hidden">
          <RippleEffect isActive={isVerifying} />

          {/* Top accent line */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500 to-transparent" />

          {/* Content container */}
          <div className="flex flex-col items-center text-center">
            {/* Orb */}
            <Orb state={isVerified ? 'verified' : isVerifying ? 'verifying' : 'idle'} />

            {/* Text content */}
            <div className="mb-8">
              <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent mb-3">
                {isVerified ? 'Access Granted' : isVerifying ? 'Analyzing' : 'Verify Access'}
              </h1>
              <p className="text-white/60 text-sm sm:text-base leading-relaxed max-w-xs">
                {isVerified
                  ? 'Your identity has been confirmed. Welcome aboard.'
                  : isVerifying
                  ? 'Running advanced security protocols...'
                  : 'Complete the verification to continue'}
              </p>
            </div>

            {/* Interactive button */}
            <button
              onClick={handleCheckboxClick}
              onKeyDown={handleKeyDown}
              disabled={isVerified || isVerifying}
              className={`relative group px-8 py-3 rounded-xl font-semibold text-sm transition-all duration-300 overflow-hidden ${
                isVerified
                  ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/50'
                  : isVerifying
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/50'
                  : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/50 cursor-pointer'
              }`}
              tabIndex={0}
              role="button"
              aria-pressed={isVerified}
              aria-label="Verify you are human"
            >
              {/* Button glow effect */}
              {!isVerified && (
                <div className="absolute inset-0 bg-gradient-to-r from-purple-400/0 via-white/20 to-pink-400/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 translate-x-full group-hover:translate-x-0" />
              )}

              <span className="relative flex items-center justify-center space-x-2">
                {isVerified ? (
                  <>
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>Verified</span>
                  </>
                ) : isVerifying ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Verifying</span>
                  </>
                ) : (
                  <>
                    <span>Initiate Verification</span>
                    <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </>
                )}
              </span>
            </button>

            {/* Status indicator */}
            {isVerifying && (
              <div className="mt-6 flex items-center space-x-2 text-xs text-purple-400">
                <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                <span>Scanning encryption keys...</span>
              </div>
            )}

            {isVerified && (
              <div className="mt-6 flex items-center space-x-2 text-xs text-emerald-400">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Security verification passed</span>
              </div>
            )}
          </div>

          {/* Bottom accent line */}
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-pink-500 to-transparent" />
        </div>

        {/* Footer branding */}
        <div className="mt-8 text-center text-xs text-white/40">
          <p>Protected by <span className="text-white/60 font-semibold">Cloudflare</span></p>
        </div>
      </div>

      <style>{`
        @keyframes blob {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
        }

        .animate-blob {
          animation: blob 7s infinite;
        }

        .animation-delay-2000 {
          animation-delay: 2s;
        }

        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
};

export default CloudflareCaptcha;
