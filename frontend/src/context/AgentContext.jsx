import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAppWebSocket } from './WebSocketContext';

const AgentContext = createContext();

export function AgentProvider({ children }) {
  const [logs, setLogs] = useState([]);
  const [status, setStatus] = useState('ACTIVE');
  const [unreadCount, setUnreadCount] = useState(0);

  const { data: wsData } = useAppWebSocket();

  useEffect(() => {
    if (wsData && wsData.type === 'disruption_scan' && wsData.agent_logs) {
      const newLogs = wsData.agent_logs.map(log => {
        const now = new Date();
        const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
        return {
          ts: timeStr,
          level: 'INFO', // Default level
          tag: log.agent || 'Agent',
          msg: log.action || log.msg || ''
        };
      });

      if (newLogs.length > 0) {
        setLogs(prev => [...prev, ...newLogs].slice(-50)); // Keep last 50
        setUnreadCount(prev => prev + newLogs.length);
      }
    }
  }, [wsData]);

  const clearUnread = () => setUnreadCount(0);

  return (
    <AgentContext.Provider value={{ logs, status, unreadCount, clearUnread }}>
      {children}
    </AgentContext.Provider>
  );
}

export const useAgent = () => useContext(AgentContext);
