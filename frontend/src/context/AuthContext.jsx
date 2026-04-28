import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { API_BASE } from '../config';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(localStorage.getItem('nerve_access_token'));
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeNodeId, setActiveNodeId] = useState(localStorage.getItem('nerve_active_node'));

  const clearAuth = useCallback(() => {
    localStorage.removeItem('nerve_access_token');
    localStorage.removeItem('nerve_refresh_token');
    setAccessToken(null);
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('nerve_active_node');
    setActiveNodeId(null);
  }, []);

  const refreshSession = useCallback(async () => {
    const refreshToken = localStorage.getItem('nerve_refresh_token');
    if (!refreshToken) {
      clearAuth();
      return null;
    }

    try {
      const response = await fetch(`${API_BASE}/auth/refresh`, {
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
      const response = await fetch(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        setIsAuthenticated(true);
        
        // Auto-set activeNodeId if not set and user is operator
        if (userData?.role === 'node_operator' && userData.assigned_node_ids?.length > 0) {
          setActiveNodeId(current => {
            if (!current || !userData.assigned_node_ids.includes(current)) {
              const defaultNode = userData.assigned_node_ids[0];
              localStorage.setItem('nerve_active_node', defaultNode);
              return defaultNode;
            }
            return current;
          });
        } else if (userData?.role !== 'node_operator') {
          setActiveNodeId(null);
          localStorage.removeItem('nerve_active_node');
        }
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


  const completeLogin = async (data) => {
    localStorage.setItem('nerve_access_token', data.access_token);
    localStorage.setItem('nerve_refresh_token', data.refresh_token);
    setAccessToken(data.access_token);
    await checkMe(data.access_token);
  };


  const logout = () => {
    clearAuth();
  };

  const updateActiveNode = (nodeId) => {
    setActiveNodeId(nodeId);
    localStorage.setItem('nerve_active_node', nodeId);
  };

  const getAuthHeaders = useCallback(() => {
    return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
  }, [accessToken]);

  return (
    <AuthContext.Provider value={{ 
      user, 
      accessToken, 
      isAuthenticated, 
      isLoading, 
      completeLogin,
      logout, 
      refreshToken: refreshSession,
      getAuthHeaders,
      activeNodeId,
      setActiveNodeId: updateActiveNode
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
