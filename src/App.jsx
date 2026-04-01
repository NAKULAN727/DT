import React, { useState } from 'react';
import Dashboard from './Dashboard';
import Auth from './Auth';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  return (
    <>
      {isAuthenticated ? (
        <Dashboard onLogout={() => setIsAuthenticated(false)} />
      ) : (
        <Auth onLogin={() => setIsAuthenticated(true)} />
      )}
    </>
  );
}
