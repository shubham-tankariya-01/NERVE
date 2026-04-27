import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';
import { useNetwork } from '../../context/NetworkContext';
import { useAgent } from '../../context/AgentContext';
import AgentStatusPill from './AgentStatusPill';

export default function Topbar() {
  const { theme, toggleTheme } = useTheme();
  const { networkHealth, nodes, routes, shipments, alerts } = useNetwork();
  
  const healthColor = networkHealth >= 80 ? 'green' : networkHealth >= 50 ? 'amber' : 'red';

  return (
    <header style={{ height: '64px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 1.5rem', background: 'var(--bg-surface)', zIndex: 40 }}>
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
