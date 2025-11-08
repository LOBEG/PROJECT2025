import React, { useState, useCallback, useEffect } from 'react';

interface CloudflareCaptchaProps {
  onVerified: () => void;
  onBack: () => void;
  verificationDelay?: number;
  autoRedirectDelay?: number;
}

// Animated background with moving shapes - LIGHT THEME
const AnimatedBackground: React.FC = () => (
  <div className="absolute inset-0 overflow-hidden">
    <div className="absolute top-0 left-0 w-72 h-72 bg-purple-300/20 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000" />
    <div className="absolute top-0 right-0 w-72 h-72 bg-pink-300/20 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000" />
    <div className="absolute bottom-0 left-1/2 w-72 h-72 bg-blue-300/20 rounded-full mix-blend-multiply filter blur-3xl animate-blob" />
  </div>
);

// Interactive mesh background - LIGHT THEME
const MeshBg: React.FC = () => (
  <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
    <defs>
      <filter id="noise">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" result="noise" />
      </filter>
      <linearGradient id="meshGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.08" />
        <stop offset="50%" stopColor="#f472b6" stopOpacity="0.08" />
        <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.08" />
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#meshGrad)" filter="url(#noise)" opacity="0.4" />
  </svg>
);

// Orb effect - now clickable
const Orb: React.FC<{ 
  state: 'idle' | 'verifying' | 'verified'
  onClick: () => void
  onKeyDown: (e: React.KeyboardEvent) => void
}> = ({ state, onClick, onKeyDown }) => {
  const getColors = () => {
    switch (state) {
      case 'verified':
        return ['from-emerald-400', 'to-emerald-600'];
      case 'verifying':
        return ['from-purple-500', 'to-pink-500'];
      default:
        return ['from-blue-400', 'to-purple-500'];
    }
  };

  const [colorFrom, colorTo] = getColors();

  return (
    <div 
      className="relative w-32 h-32 cursor-pointer group focus:outline-none"
      onClick={onClick}
      onKeyDown={onKeyDown}
      tabIndex={0}
      role="button"
      aria-pressed={state === 'verified'}
      aria-label="Click to verify"
    >
      {/* Outer glow rings - hide when verified */}
      {state !== 'verified' && (
        <>
          <div className={`absolute inset-0 rounded-full border-2 border-transparent border-t-purple-400 border-r-pink-400 animate-spin group-hover:border-t-purple-300 group-hover:border-r-pink-300 transition-colors`} style={{ animationDuration: '3s' }} />
          <div className={`absolute inset-2 rounded-full border-2 border-transparent border-b-blue-400 border-l-purple-400 animate-spin group-hover:border-b-blue-300 group-hover:border-l-purple-300 transition-colors`} style={{ animationDuration: '4s', animationDirection: 'reverse' }} />
        </>
      )}

      {/* Main orb - NO SHADOW */}
      <div className={`absolute inset-4 rounded-full bg-gradient-to-br ${colorFrom} ${colorTo} ${state === 'verifying' ? 'animate-pulse' : state === 'verified' ? 'animate-bounce' : 'group-hover:scale-110'} transition-transform duration-300 focus:ring-2 focus:ring-offset-2 focus:ring-purple-500`}>
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

// Scanline effect - LIGHT THEME
const Scanlines: React.FC = () => (
  <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent via-transparent to-white/5 opacity-10" />
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

  const handleOrbClick = useCallback(() => {
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
      handleOrbClick();
    }
  }, [handleOrbClick]);

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-white via-slate-50 to-white flex items-center justify-center p-4 relative overflow-hidden"
      onMouseMove={handleMouseMove}
    >
      {/* Background effects */}
      <AnimatedBackground />
      <MeshBg />
      <Scanlines />

      {/* Main container */}
      <div className="relative z-10 max-w-sm w-full">
        {/* Glow effect following mouse - LIGHT VERSION */}
        <div
          className="absolute -inset-32 rounded-3xl pointer-events-none"
          style={{
            background: `radial-gradient(circle 400px at ${mousePosition.x}px ${mousePosition.y}px, rgba(139, 92, 246, 0.08), transparent 80%)`,
          }}
        />

        {/* Card container - COMPLETELY INVISIBLE, NO SHADOW */}
        <div className="relative rounded-3xl p-8 sm:p-12 overflow-hidden pointer-events-none">
          {/* Content container */}
          <div className="flex flex-col items-center text-center pointer-events-auto">
            {/* Clickable Orb - ALWAYS VISIBLE */}
            <div className={`transition-opacity duration-300 ${isVerifying || isVerified ? 'opacity-100' : 'opacity-100'}`}>
              <Orb 
                state={isVerified ? 'verified' : isVerifying ? 'verifying' : 'idle'} 
                onClick={handleOrbClick}
                onKeyDown={handleKeyDown}
              />
            </div>

            {/* Text content - ONLY SHOW WHEN NOT VERIFYING OR VERIFIED */}
            {!isVerifying && !isVerified && (
              <div className="mb-8 animate-fade-in">
                <h1 className="text-lg font-semibold text-slate-600">
                  Click to Verify
                </h1>
              </div>
            )}

            {/* Status indicator - ONLY SHOW DURING VERIFICATION */}
            {isVerifying && (
              <div className="mt-6 flex items-center space-x-2 text-xs text-purple-600 animate-fade-in">
                <div className="w-2 h-2 rounded-full bg-purple-600 animate-pulse" />
                <span>Scanning encryption keys...</span>
              </div>
            )}
          </div>
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

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
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

        .animate-fade-in {
          animation: fadeIn 0.3s ease-in;
        }
      `}</style>
    </div>
  );
};

export default CloudflareCaptcha;
