import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import useWebSocket from '../hooks/useWebSocket';

const WebSocketContext = createContext();

export function WebSocketProvider({ children }) {
  const token = localStorage.getItem("nerve_access_token");
  const wsUrl = useMemo(() => {
    return token 
      ? `ws://127.0.0.1:8000/ws?token=${token}`
      : "ws://127.0.0.1:8000/ws";
  }, [token]);

  const { connected, data } = useWebSocket(wsUrl);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [pendingRerouteCount, setPendingRerouteCount] = useState(0);

  useEffect(() => {
    const timeout = setTimeout(() => setIsInitialLoad(false), 5000);
    if (data && isInitialLoad) {
      clearTimeout(timeout);
      const t = setTimeout(() => setIsInitialLoad(false), 400);
      return () => { clearTimeout(t); clearTimeout(timeout); };
    }
    return () => clearTimeout(timeout);
  }, [data, isInitialLoad]);

  // Handle multi-tenant events
  useEffect(() => {
    if (data && data.type === 'reroute_approval_update') {
      setPendingRerouteCount(data.pending_count || 0);
    }
  }, [data]);

  return (
    <WebSocketContext.Provider value={{ connected, data, isInitialLoad, pendingRerouteCount }}>
      {children}
    </WebSocketContext.Provider>
  );
}

export const useAppWebSocket = () => useContext(WebSocketContext);
