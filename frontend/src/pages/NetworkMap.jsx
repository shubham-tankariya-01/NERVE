import React from 'react';
import NetworkMap from '../components/map/NetworkMap';

export default function NetworkMapPage() {
  return (
    <div style={{ height: 'calc(100vh - 64px)', position: 'relative' }}>
      <NetworkMap height="100%" showPanels={true} />
      
      {/* Floating UI Elements can be added here as per route 2 spec */}
      <div style={{ position: 'absolute', top: '1rem', right: '1rem', zIndex: 1000, background: 'var(--bg-overlay)', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border)', display: 'flex', gap: '0.5rem' }}>
         <button className="badge blue">All Nodes</button>
         <button className="badge" style={{ background: 'var(--bg-surface)' }}>Ports</button>
         <button className="badge" style={{ background: 'var(--bg-surface)' }}>Factories</button>
      </div>

      <div style={{ position: 'absolute', bottom: '1rem', left: '1rem', zIndex: 1000, background: 'var(--bg-overlay)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: '0.8rem' }}>
         <div style={{ display: 'flex', gap: '1.5rem' }}>
            <span>Total Nodes: 24</span>
            <span>Congested: 2</span>
            <span>Alerts: 2</span>
            <span>Avg Load: 68%</span>
         </div>
      </div>
    </div>
  );
}
