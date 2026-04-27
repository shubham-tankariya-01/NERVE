import React from 'react';
import { useAgent } from '../../context/AgentContext';

export default function AgentStatusPill() {
  const { status, unreadCount } = useAgent();

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-elevated)', padding: '0.25rem 0.75rem', borderRadius: '20px', border: '1px solid var(--border)' }}>
      <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: status === 'ACTIVE' ? 'var(--brand)' : 'var(--danger)', boxShadow: status === 'ACTIVE' ? 'var(--shadow-glow-g)' : 'var(--shadow-glow-r)' }}></div>
      <span style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em' }}>Agent: {status}</span>
      {unreadCount > 0 && (
        <span style={{ background: 'var(--warning)', color: '#fff', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '10px', marginLeft: '0.5rem' }}>
          {unreadCount} new
        </span>
      )}
    </div>
  );
}
