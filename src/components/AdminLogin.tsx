
import React, { useState } from 'react';
import { Lock, Eye, EyeOff } from 'lucide-react';

interface AdminLoginProps {
  onLogin: () => void;
}

const AdminLogin: React.FC<AdminLoginProps> = ({ onLogin }) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  // Simple password check - in production, use proper authentication
  const ADMIN_PASSWORD = 'admin2024';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      onLogin();
      setError('');
    } else {
      setError('Invalid password');
    }
  };

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-card border border-border rounded-lg p-8 w-full max-w-md">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 sparkle-bg rounded-lg">
            <Lock className="w-6 h-6 text-background" />
          </div>
          <h2 className="text-xl font-bold sparkle-text">Admin Access</h2>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter admin password"
              className="w-full px-4 py-3 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          
          {error && (
            <p className="text-destructive text-sm">{error}</p>
          )}
          
          <button
            type="submit"
            className="w-full sparkle-bg text-background py-3 rounded-lg font-medium hover:opacity-90 transition-opacity"
          >
            Access Admin Panel
          </button>
        </form>
        
        <div className="mt-4 text-xs text-muted-foreground text-center">
          Admin password: admin2024 (for demo purposes)
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
