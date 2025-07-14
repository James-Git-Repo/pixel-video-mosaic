
import React from 'react';
import VideoGrid from './VideoGrid';
import AdminLogin from './AdminLogin';
import { Film, Layers, Zap, Settings, LogOut } from 'lucide-react';
import { useAdminMode } from '../hooks/useAdminMode';

const VideoGridInterface: React.FC = () => {
  const { isAdmin, toggleAdminMode } = useAdminMode();
  const [showAdminLogin, setShowAdminLogin] = React.useState(false);

  const handleAdminAccess = () => {
    if (isAdmin) {
      toggleAdminMode();
    } else {
      setShowAdminLogin(true);
    }
  };

  const handleLogin = () => {
    toggleAdminMode();
    setShowAdminLogin(false);
  };

  return (
    <div className="w-full h-screen bg-background text-foreground flex flex-col">
      {/* Main Title */}
      <div className="bg-card border-b border-border px-6 py-6">
        <h1 className="text-4xl font-bold text-center sparkle-text">
          The Million Slots AI Billboard
        </h1>
        <p className="text-center text-muted-foreground mt-2">
          1,000,000 video slots • Interactive digital canvas
        </p>
      </div>

      {/* Admin Header - Only show if admin */}
      {isAdmin && (
        <header className="bg-card border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 sparkle-bg rounded-lg">
                <Film className="w-6 h-6 text-background" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Admin Control Panel</h2>
                <p className="text-sm text-muted-foreground">Upload and manage video content</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-accent" />
                  <span>Interactive Mosaic</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-secondary" />
                  <span>15s Max Length</span>
                </div>
              </div>
              
              <button
                onClick={handleAdminAccess}
                className="flex items-center gap-2 px-3 py-2 bg-destructive hover:bg-destructive/80 text-destructive-foreground rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Exit Admin
              </button>
            </div>
          </div>
        </header>
      )}

      {/* Admin Instructions - Only show if admin */}
      {isAdmin && (
        <div className="bg-muted px-6 py-3 border-b border-border">
          <p className="text-sm text-muted-foreground">
            Click any slot to upload a video (max 15 seconds). Use zoom controls to navigate the massive grid. Each slot is exactly 10x10 pixels.
          </p>
        </div>
      )}

      {/* Admin Access Button for non-admin users */}
      {!isAdmin && (
        <div className="absolute top-4 right-4 z-20">
          <button
            onClick={handleAdminAccess}
            className="flex items-center gap-2 px-3 py-2 bg-card hover:bg-muted border border-border rounded-lg transition-colors"
          >
            <Settings className="w-4 h-4" />
            Admin
          </button>
        </div>
      )}

      {/* Main Grid */}
      <main className="flex-1 relative">
        <VideoGrid />
      </main>

      {/* Admin Login Modal */}
      {showAdminLogin && (
        <AdminLogin onLogin={handleLogin} />
      )}
    </div>
  );
};

export default VideoGridInterface;
