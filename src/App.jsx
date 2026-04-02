import React, { useState } from 'react';
import Dashboard from './Dashboard';
import Auth from './Auth';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => !!localStorage.getItem('safeSphereUser')
  );

  const handleLogin = () => setIsAuthenticated(true);

  const handleLogout = () => {
    localStorage.removeItem('safeSphereUser');
    setIsAuthenticated(false);
  };

  return isAuthenticated ? (
    <Dashboard onLogout={handleLogout} />
  ) : (
    <Auth onLogin={handleLogin} />
  );
}
