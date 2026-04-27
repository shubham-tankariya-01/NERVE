import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(localStorage.getItem('nerve_access_token'));
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const clearAuth = useCallback(() => {
    localStorage.removeItem('nerve_access_token');
    localStorage.removeItem('nerve_refresh_token');
    setAccessToken(null);
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  const refreshSession = useCallback(async () => {
    const refreshToken = localStorage.getItem('nerve_refresh_token');
    if (!refreshToken) {
      clearAuth();
      return null;
    }

    try {
      const response = await fetch('http://localhost:8000/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken })
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('nerve_access_token', data.access_token);
        setAccessToken(data.access_token);
        return data.access_token;
      } else {
        clearAuth();
        return null;
      }
    } catch (err) {
      console.error('Session refresh failed:', err);
      clearAuth();
      return null;
    }
  }, [clearAuth]);

  const checkMe = useCallback(async (token) => {
    try {
      const response = await fetch('http://localhost:8000/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        setIsAuthenticated(true);
      } else if (response.status === 401) {
        const newToken = await refreshSession();
        if (newToken) {
          await checkMe(newToken);
        }
      } else {
        clearAuth();
      }
    } catch (err) {
      console.error('Auth check failed:', err);
      clearAuth();
    } finally {
      setIsLoading(false);
    }
  }, [clearAuth, refreshSession]);

  useEffect(() => {
    if (accessToken) {
      checkMe(accessToken);
    } else {
      setIsLoading(false);
    }
  }, [accessToken, checkMe]);

  const login = async (username, password) => {
    const response = await fetch('http://localhost:8000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ username, password })
    });

    if (response.ok) {
      const data = await response.json();
      localStorage.setItem('nerve_access_token', data.access_token);
      localStorage.setItem('nerve_refresh_token', data.refresh_token);
      setAccessToken(data.access_token);
      await checkMe(data.access_token);
      return data;
    } else {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Login failed');
    }
  };

  const completeLogin = async (data) => {
    localStorage.setItem('nerve_access_token', data.access_token);
    localStorage.setItem('nerve_refresh_token', data.refresh_token);
    setAccessToken(data.access_token);
    await checkMe(data.access_token);
  };


  const logout = () => {
    clearAuth();
  };

  const getAuthHeaders = () => {
    return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
  };

  const updateUser = useCallback((patches) => {
    setUser((prev) => prev ? { ...prev, ...patches } : prev);
  }, []);

  return (
    <AuthContext.Provider value={{ 
      user, 
      accessToken, 
      isAuthenticated, 
      isLoading, 
      login, 
      completeLogin,
      logout, 
      updateUser,
      refreshToken: refreshSession,
      getAuthHeaders 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
