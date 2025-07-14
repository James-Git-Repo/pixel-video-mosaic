
import React, { createContext, useContext, useState, useEffect } from 'react';

interface AdminModeContextType {
  isAdmin: boolean;
  toggleAdminMode: () => void;
}

const AdminModeContext = createContext<AdminModeContextType | undefined>(undefined);

export const AdminModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Check if admin mode is enabled in localStorage
    const adminMode = localStorage.getItem('adminMode') === 'true';
    setIsAdmin(adminMode);
  }, []);

  const toggleAdminMode = () => {
    const newAdminMode = !isAdmin;
    setIsAdmin(newAdminMode);
    localStorage.setItem('adminMode', newAdminMode.toString());
  };

  return (
    <AdminModeContext.Provider value={{ isAdmin, toggleAdminMode }}>
      {children}
    </AdminModeContext.Provider>
  );
};

export const useAdminMode = () => {
  const context = useContext(AdminModeContext);
  if (context === undefined) {
    throw new Error('useAdminMode must be used within an AdminModeProvider');
  }
  return context;
};
