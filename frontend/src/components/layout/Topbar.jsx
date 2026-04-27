import React, { useState, useRef, useEffect } from 'react';
import { Sun, Moon, LogOut, User } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';
import { useNetwork } from '../../context/NetworkContext';
import { useAgent } from '../../context/AgentContext';
import { useAuth } from '../../context/AuthContext'; // ← NEW
import AgentStatusPill from './AgentStatusPill';

// ← NEW: User info chip with dropdown
const UserInfoChip = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setIsOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!isAuthenticated || !user) return null;

  const initials = (user.full_name || user.username || '?')
    .split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const roleLabel = (user.role || 'user').replace(/_/g, ' ');

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        style={{ 
          display: 'flex', alignItems: 'center', gap: '0.5rem', 
          background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)',
          borderRadius: '8px', padding: '0.35rem 0.75rem', cursor: 'pointer',
          transition: 'all 0.2s'
        }}
      >
        <div style={{ 
          width: '28px', height: '28px', borderRadius: '50%', 
          background: 'linear-gradient(135deg, #A855F7, #6366F1)', 
          color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', 
          fontSize: '0.65rem', fontWeight: 800
        }}>{initials}</div>
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)', whiteSpace: 'nowrap' }}>{user.full_name || user.username}</span>
          <span style={{ fontSize: '0.6rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{roleLabel}</span>
        </div>
      </div>

      {isOpen && (
        <div style={{ 
          position: 'absolute', top: '100%', right: 0, marginTop: '6px',
          background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)',
          borderRadius: '8px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          minWidth: '160px', zIndex: 9999, overflow: 'hidden'
        }}>
          <div 
            onClick={() => { setIsOpen(false); }}
            style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', borderBottom: '1px solid var(--glass-border)' }}
          >
            <User size={14} /> My Profile
          </div>
          <div 
            onClick={() => { logout(); window.location.href = '/login'; }}
            style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--status-critical)' }}
          >
            <LogOut size={14} /> Sign Out
          </div>
        </div>
      )}
    </div>
  );
};

export default function Topbar() {
  const { theme, toggleTheme } = useTheme();
  const { networkHealth, nodes, routes, shipments, alerts } = useNetwork();
  
  const healthColor = networkHealth >= 80 ? 'green' : networkHealth >= 50 ? 'amber' : 'red';

  return (
    <header style={{ height: '64px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 1.5rem', background: 'var(--bg-surface)', position: 'relative', zIndex: 1000 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontFamily: 'Space Grotesk', fontSize: '1.25rem', letterSpacing: '-0.02em', cursor: 'pointer' }} onClick={() => window.location.href = '/'}>
          <div style={{ background: 'var(--brand)', color: '#000', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px', fontSize: '14px' }}>N</div>
          Nerve
        </div>
        
        <div style={{ height: '24px', width: '1px', background: 'var(--border)' }}></div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--status-live)', background: 'rgba(6, 214, 160, 0.08)', padding: '0.4rem 0.8rem', borderRadius: '4px', border: '1px solid rgba(6, 214, 160, 0.15)' }}>
          <div style={{ width: '8px', height: '8px', background: 'var(--status-live)', borderRadius: '50%' }}></div>
          LIVE
        </div>
        
        <div className={`badge ${healthColor}`} style={{ fontSize: '0.75rem' }}>HEALTH {networkHealth}%</div>
        
        <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.75rem', fontWeight: 700 }}>
          <div style={{ background: 'rgba(0, 180, 216, 0.15)', color: 'var(--accent-primary)', padding: '0.4rem 0.8rem', borderRadius: '6px', border: '1px solid rgba(0, 180, 216, 0.2)' }}>
            NODES {nodes.length}
          </div>
          <div style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#A855F7', padding: '0.4rem 0.8rem', borderRadius: '6px', border: '1px solid rgba(168, 85, 247, 0.2)' }}>
            SHIPMENTS {shipments.length}
          </div>
        </div>
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {/* ← NEW: User info chip */}
        <UserInfoChip />

        <button onClick={toggleTheme} style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', color: 'inherit' }}>
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        
        <button 
          onClick={() => window.location.href = '/book'}
          className="badge blue" 
          style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid var(--info)', cursor: 'pointer' }}
        >
          + Book Shipment
        </button>
        
        <button 
          onClick={async () => {
             const { clearDisruptions } = await import('../../services/api');
             await clearDisruptions();
             alert('Simulation cleared and reset.');
          }}
          className="badge amber" 
          style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid var(--warning)', cursor: 'pointer' }}
        >
          ⚡ Reset Sim
        </button>
      </div>
    </header>
  );
}
