import React, { createContext, useContext, useState } from 'react';

const RootContext = createContext();

export const useAuth = () => {
  const context = useContext(RootContext);
  if (!context) {
    throw new Error('useAuth must be used within a RootProvider');
  }
  return context;
};

export const RootProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);

  const login = (userData) => {
    setIsAuthenticated(true);
    setUser(userData);
  };

  const logout = () => {
    setIsAuthenticated(false);
    setUser(null);
  };

  const value = {
    isAuthenticated,
    user,
    login,
    logout
  };

  return (
    <RootContext.Provider value={value}>
      {children}
    </RootContext.Provider>
  );
}; 