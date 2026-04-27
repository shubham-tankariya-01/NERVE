import React, { createContext, useContext, useState, useEffect } from 'react';
import useWebSocket from '../hooks/useWebSocket';

const WebSocketContext = createContext();

export function WebSocketProvider({ children }) {
  const { connected, data } = useWebSocket();
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  useEffect(() => {
    const timeout = setTimeout(() => setIsInitialLoad(false), 5000);
    if (data && isInitialLoad) {
      clearTimeout(timeout);
      const t = setTimeout(() => setIsInitialLoad(false), 400);
      return () => { clearTimeout(t); clearTimeout(timeout); };
    }
    return () => clearTimeout(timeout);
  }, [data, isInitialLoad]);

  return (
    <WebSocketContext.Provider value={{ connected, data, isInitialLoad }}>
      {children}
    </WebSocketContext.Provider>
  );
}

export const useAppWebSocket = () => useContext(WebSocketContext);
