import React, { useState, useRef, useEffect } from 'react';
import { Sun, Moon, LogOut, User, Bell, ChevronRight } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useTheme } from '../../hooks/useTheme';
import { useNetwork } from '../../context/NetworkContext';
import { useAgent } from '../../context/AgentContext';
import { useAuth } from '../../context/AuthContext';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import AgentStatusPill from './AgentStatusPill';

const UserInfoChip = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);

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
          <span style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{roleLabel}</span>
        </div>
      </div>

      {isOpen && (
        <div style={{ 
          position: 'absolute', top: '100%', right: 0, marginTop: '6px',
          background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)',
          borderRadius: '8px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          minWidth: '160px', zIndex: 2100, overflow: 'hidden'
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

const AlertDropdown = ({ alerts }) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setIsOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        style={{ 
          width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', position: 'relative'
        }}
      >
        <Bell size={24} />
        {alerts.length > 0 && (
          <div style={{ position: 'absolute', top: '10px', right: '10px', width: '8px', height: '8px', background: 'var(--status-critical)', borderRadius: '50%', border: '2px solid var(--bg-surface)' }}></div>
        )}
      </button>

      {isOpen && (
        <div style={{ 
          position: 'absolute', top: '100%', right: 0, marginTop: '6px',
          background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)',
          borderRadius: '8px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          minWidth: '220px', zIndex: 2100, overflow: 'hidden', padding: '12px'
        }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '8px' }}>
            Active Alerts: {alerts.length}
          </div>
          <Link 
            to="/app/disruptions" 
            onClick={() => setIsOpen(false)}
            style={{ fontSize: '12px', color: 'var(--accent-primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            View all alerts <ChevronRight size={12} />
          </Link>
        </div>
      )}
    </div>
  );
};

export default function Topbar() {
  const { isMobile, isTablet, width } = useBreakpoint();
  const { theme, toggleTheme } = useTheme();
  const { networkHealth, nodes, routes, shipments, alerts } = useNetwork();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const healthColor = networkHealth >= 80 ? 'green' : networkHealth >= 50 ? 'amber' : 'red';
  const topbarHeight = isMobile ? '56px' : (isTablet ? '60px' : '64px');

  return (
    <header style={{ height: topbarHeight, borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: isMobile ? '0 1rem' : '0 1.5rem', background: 'var(--bg-surface)', zIndex: 5000, position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '0.75rem' : '1.5rem', flexShrink: 1, overflow: 'hidden' }}>
        <div 
          style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 800, fontFamily: 'var(--font-display)', fontSize: isMobile ? '1.1rem' : '1.25rem', letterSpacing: '-0.03em', cursor: 'pointer' }} 
          onClick={() => navigate('/app')}
        >
          <div style={{ background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))', color: '#fff', width: isMobile ? '28px' : '32px', height: isMobile ? '28px' : '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', fontSize: isMobile ? '16px' : '18px', fontWeight: 900 }}>N</div>
          <span style={{ color: 'var(--text-main)', WebkitTextFillColor: 'var(--text-main)' }}>NERVE</span>
        </div>
        
        {!isMobile && <div style={{ height: '24px', width: '1px', background: 'var(--border)' }}></div>}
        
        {!isMobile && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--status-live)', background: 'rgba(6, 214, 160, 0.08)', padding: '0.4rem 0.8rem', borderRadius: '4px', border: '1px solid rgba(6, 214, 160, 0.15)', flexShrink: 0 }}>
            <div style={{ width: '8px', height: '8px', background: 'var(--status-live)', borderRadius: '50%' }}></div>
            LIVE
          </div>
        )}
        
        {!isMobile && (
          <div className={`badge ${healthColor}`} style={{ fontSize: '0.75rem', flexShrink: 0 }}>HEALTH {networkHealth}%</div>
        )}
        
        {(!isMobile && !isTablet && width > 1400) && (
          <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.75rem', fontWeight: 700, flexShrink: 1, overflow: 'hidden' }}>
            <div style={{ background: 'rgba(0, 180, 216, 0.15)', color: 'var(--accent-primary)', padding: '0.4rem 0.8rem', borderRadius: '6px', border: '1px solid rgba(0, 180, 216, 0.2)', whiteSpace: 'nowrap' }}>
              NODES {nodes.length}
            </div>
            <div style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#A855F7', padding: '0.4rem 0.8rem', borderRadius: '6px', border: '1px solid rgba(168, 85, 247, 0.2)', whiteSpace: 'nowrap' }}>
              SHIPMENTS {shipments.length}
            </div>
          </div>
        )}
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '0.5rem' : '1rem', flexShrink: 0 }}>
        {(isMobile || isTablet) && <AlertDropdown alerts={alerts} />}
        
        <UserInfoChip />

        {(!isMobile && !isTablet) && (
          <>
            {user?.role === 'platform_admin' && (
              <button 
                onClick={async () => {
                  if (window.confirm('This will reset all demo accounts and data. Continue?')) {
                    const { restoreDemoData } = await import('../../services/api');
                    try {
                      await restoreDemoData({ Authorization: `Bearer ${localStorage.getItem('nerve_access_token')}` });
                      alert('Demo data restored. You will be logged out to refresh the state.');
                      localStorage.clear();
                      navigate('/login');
                    } catch (err) {
                      alert('Restore failed: ' + err.message);
                    }
                  }
                }}
                className="badge pink" 
                style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid #ef476f', cursor: 'pointer' }}
              >
                🔄 Restore Demo
              </button>
            )}
            
            <button 
              onClick={() => navigate('/app/book')}
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
          </>
        )}
      </div>
    </header>
  );
}
