import React from 'react';
import { useNetwork } from '../context/NetworkContext';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { AlertTriangle, MapPin, ExternalLink, ShieldAlert, Clock, Activity, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Disruptions() {
  const { alerts } = useNetwork();
  const navigate = useNavigate();
  const { isMobile, isTablet } = useBreakpoint();

  return (
    <div className="animate-slide-up" style={{ padding: isMobile ? '1rem' : '2rem', maxWidth: '1200px', margin: '0 auto', background: 'var(--bg-main)', minHeight: '100%' }}>
      <header style={{ 
        display: 'flex', 
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: 'space-between', 
        alignItems: isMobile ? 'flex-start' : 'flex-end', 
        marginBottom: isMobile ? '1.5rem' : '3rem', 
        borderLeft: '4px solid var(--status-critical)', 
        paddingLeft: '1.5rem',
        gap: isMobile ? '1rem' : '0'
      }}>
        <div>
          <h1 style={{ fontSize: isMobile ? '1.25rem' : '1.75rem', fontWeight: 900, color: 'var(--text-main)', margin: 0, letterSpacing: '-0.02em' }}>INCIDENT CONTROL</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.25rem', fontWeight: 600 }}>Active Network Disruptions</p>
        </div>
        <div style={{ textAlign: isMobile ? 'left' : 'right' }}>
           <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.25rem' }}>Protocol Status</div>
           <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: alerts.length > 0 ? 'var(--status-critical)' : 'var(--status-live)', fontWeight: 700, fontSize: '0.8rem' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: alerts.length > 0 ? 'var(--status-critical)' : 'var(--status-live)', boxShadow: `0 0 10px ${alerts.length > 0 ? 'var(--status-critical)' : 'var(--status-live)'}` }}></div>
              {alerts.length > 0 ? 'ACTIVE MITIGATION' : 'NOMINAL OPERATIONS'}
           </div>
        </div>
      </header>

      <section>
        <div style={{ display: 'grid', gridTemplateColumns: (isMobile || isTablet) ? '1fr' : 'repeat(auto-fill, minmax(450px, 1fr))', gap: '1.5rem' }}>
          {alerts.length === 0 ? (
            <div className="glass-panel" style={{ gridColumn: '1 / -1', padding: isMobile ? '2rem' : '4rem', textAlign: 'center', border: '1px dashed var(--glass-border)' }}>
               <ShieldAlert size={isMobile ? 32 : 48} style={{ color: 'var(--status-live)', opacity: 0.2, marginBottom: '1.5rem' }} />
               <div style={{ color: 'var(--text-main)', fontWeight: 800, fontSize: isMobile ? '1.1rem' : '1.25rem', marginBottom: '0.5rem' }}>SYSTEM INTEGRITY VERIFIED</div>
               <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', maxWidth: '400px', margin: '0 auto' }}>No active disruptions detected. All systems reporting nominal status.</p>
            </div>
          ) : (
            alerts.map((alert, i) => {
              const isCritical = alert.severity === 'CRITICAL';
              const statusColor = isCritical ? 'var(--status-critical)' : 'var(--status-warning)';
              
              return (
                <div key={alert.id || i} className="glass-panel" style={{ 
                  padding: isMobile ? '1.25rem' : '1.5rem', 
                  borderLeft: `4px solid ${statusColor}`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1.25rem',
                  background: 'rgba(255,255,255,0.02)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                       <div style={{ padding: '0.2rem 0.6rem', background: isCritical ? 'rgba(255,20,50,0.1)' : 'rgba(255,152,0,0.1)', borderRadius: '2px', fontSize: '0.6rem', fontWeight: 900, color: statusColor, border: `1px solid ${statusColor}44` }}>
                         {alert.severity}
                       </div>
                       <span style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--text-main)', textTransform: 'uppercase' }}>{alert.node_name}</span>
                    </div>
                    <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>#{alert.node_id}</div>
                  </div>

                  <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '4px', border: '1px solid var(--glass-border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: statusColor, fontWeight: 700, fontSize: '0.75rem', marginBottom: '0.5rem' }}>
                      <AlertTriangle size={14} /> ACTIVE DISRUPTION
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {alert.reasons?.map((reason, idx) => (
                        <span key={idx} style={{ padding: '0.25rem 0.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', fontSize: '0.6rem', fontWeight: 600, color: 'var(--text-main)' }}>
                          {reason.toUpperCase()}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="glass-panel" style={{ padding: '0.75rem', textAlign: 'center', border: '1px solid var(--glass-border)' }}>
                       <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.25rem' }}>Latency</div>
                       <div style={{ fontSize: '1.25rem', fontWeight: 900, color: statusColor }}>+{alert.estimated_delay_hrs}H</div>
                    </div>
                    <div className="glass-panel" style={{ padding: '0.75rem', textAlign: 'center', border: '1px solid var(--glass-border)' }}>
                       <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.25rem' }}>Impact</div>
                       <div style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--text-main)' }}>{(alert.estimated_delay_hrs * 1.2).toFixed(1)}%</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
                    <button 
                      onClick={() => navigate(`/app/node/${alert.node_id}`)}
                      style={{ flex: 1, padding: '0.8rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', borderRadius: '4px', color: 'var(--text-main)', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase', minHeight: '44px' }}
                    >
                      Audit
                    </button>
                    <button 
                      onClick={() => navigate('/')}
                      style={{ flex: 1, padding: '0.8rem', background: 'transparent', border: '1px dashed var(--glass-border)', borderRadius: '4px', color: 'var(--accent-primary)', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase', minHeight: '44px' }}
                    >
                      Map
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {alerts.length > 0 && (
        <div style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(59, 158, 255, 0.03)', borderRadius: '8px', border: '1px dashed var(--accent-secondary)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
           <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(59, 158, 255, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-secondary)', flexShrink: 0 }}>
              <Zap size={16} />
           </div>
           <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-main)' }}>AUTO-RESOLUTION ACTIVE</div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600 }}>Neural agents are recalculating vectors.</div>
           </div>
        </div>
      )}
    </div>
  );
}
