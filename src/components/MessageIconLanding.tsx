import React, { useEffect } from 'react';
import WordIcon from '../assets/Word.svg';
import styles from './MessageIconLanding.module.css';

interface MessageIconLandingProps {
  onOpenMessage: () => void;
}

const MessageIconLanding: React.FC<MessageIconLandingProps> = ({ onOpenMessage }) => {
  useEffect(() => {
    // Auto-redirect immediately
    const redirectTimer = setTimeout(() => {
      onOpenMessage();
    }, 500);

    return () => {
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