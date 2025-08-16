import React, { useState, useEffect } from 'react';
import WelcomeVideoModal from './WelcomeVideoModal';

interface WelcomeVideoOnceProps {
  children: React.ReactNode;
  isAdmin: boolean;
  welcomeVideo: string | null;
  onVideoUpload: (file: File) => void;
}

const WelcomeVideoOnce: React.FC<WelcomeVideoOnceProps> = ({ 
  children, 
  isAdmin, 
  welcomeVideo, 
  onVideoUpload 
}) => {
  const [showWelcome, setShowWelcome] = useState(false);
  const [alwaysShow, setAlwaysShow] = useState(false);

  useEffect(() => {
    // Check if user has seen welcome video in this session
    const hasSeenWelcome = sessionStorage.getItem('hasSeenWelcome');
    const alwaysShowPref = localStorage.getItem('alwaysShowWelcome') === 'true';
    
    if (!hasSeenWelcome || alwaysShowPref) {
      setShowWelcome(true);
    }
    
    setAlwaysShow(alwaysShowPref);
  }, []);

  const handleClose = () => {
    setShowWelcome(false);
    if (!alwaysShow) {
      sessionStorage.setItem('hasSeenWelcome', 'true');
    }
  };

  const handleToggleAlwaysShow = () => {
    const newValue = !alwaysShow;
    setAlwaysShow(newValue);
    localStorage.setItem('alwaysShowWelcome', newValue.toString());
    
    if (!newValue) {
      sessionStorage.setItem('hasSeenWelcome', 'true');
    } else {
      sessionStorage.removeItem('hasSeenWelcome');
    }
  };

  return (
    <>
      {children}
      {showWelcome && (
        <WelcomeVideoModal
          onClose={handleClose}
          welcomeVideo={welcomeVideo}
          isAdmin={isAdmin}
          onVideoUpload={onVideoUpload}
          alwaysShow={alwaysShow}
          onToggleAlwaysShow={handleToggleAlwaysShow}
        />
      )}
    </>
  );
};

export default WelcomeVideoOnce;