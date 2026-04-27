import React from 'react';
import { useAgent } from '../../context/AgentContext';
import { useNavigate } from 'react-router-dom';

export default function AgentLogBar() {
  const { logs, unreadCount, clearUnread } = useAgent();
  const navigate = useNavigate();
  const lastLog = logs[logs.length - 1];

  const handleClick = () => {
    clearUnread();
    navigate('/agents');
  };

  if (!lastLog) return null;

  return (
    <div 
      onClick={handleClick}
      style={{ 
        height: '32px', 
        background: 'var(--bg-surface)', 
        borderTop: '1px solid var(--border)', 
        display: 'flex', 
        alignItems: 'center', 
        padding: '0 1rem',
        cursor: 'pointer',
        fontSize: '0.75rem',
        fontFamily: 'JetBrains Mono',
        color: 'var(--text-secondary)',
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 100
      }}
    >
      <span style={{ color: 'var(--text-muted)', marginRight: '0.75rem' }}>[{lastLog.ts}]</span>
      <span style={{ color: lastLog.level === 'BLOCKED' ? 'var(--danger)' : lastLog.level === 'REROUTE' ? 'var(--brand)' : 'var(--info)', marginRight: '0.5rem' }}>
        &lt;{lastLog.tag}&gt;
      </span>
      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>
        {lastLog.msg}
      </span>
      {unreadCount > 0 && (
        <span style={{ background: 'var(--warning)', color: '#000', padding: '0 6px', borderRadius: '4px', marginLeft: '1rem', fontSize: '0.7rem', fontWeight: 'bold' }}>
          {unreadCount} new
        </span>
      )}
    </div>
  );
}
