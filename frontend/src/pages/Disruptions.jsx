import React from 'react';
import { useNetwork } from '../context/NetworkContext';
import { AlertTriangle, MapPin, ExternalLink, ShieldAlert, Clock, Activity, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Disruptions() {
  const { alerts } = useNetwork();
  const navigate = useNavigate();

  return (
    <div className="animate-slide-up" style={{ padding: '2.5rem 3rem', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
      <header style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        background: 'var(--bg-elevated)', 
        padding: '1.25rem 2rem', 
        borderLeft: '4px solid var(--status-critical)',
        borderRadius: '0 8px 8px 0',
        marginBottom: '2.5rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              INCIDENT CONTROL CENTER
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.25rem', fontWeight: 600 }}>Active Network Disruptions & Latency Vectors</p>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
           <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.25rem' }}>Protocol Status</div>
           <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: alerts.length > 0 ? 'var(--status-danger)' : 'var(--status-success)', fontWeight: 700, fontSize: '0.85rem' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: alerts.length > 0 ? 'var(--status-danger)' : 'var(--status-success)', boxShadow: `0 0 10px ${alerts.length > 0 ? 'var(--status-danger)' : 'var(--status-success)'}` }}></div>
              {alerts.length > 0 ? 'ACTIVE MITIGATION' : 'NOMINAL OPERATIONS'}
           </div>
        </div>
      </header>

      <section>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(450px, 1fr))', gap: '1.5rem' }}>
          {alerts.length === 0 ? (
            <div className="glass-panel" style={{ gridColumn: '1 / -1', padding: '4rem', textAlign: 'center', border: '1px dashed var(--border-color)' }}>
               <ShieldAlert size={48} style={{ color: 'var(--status-success)', opacity: 0.2, marginBottom: '1.5rem' }} />
               <div style={{ color: 'var(--text-primary)', fontWeight: 800, fontSize: '1.25rem', marginBottom: '0.5rem' }}>SYSTEM INTEGRITY VERIFIED</div>
               <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '400px', margin: '0 auto' }}>No active disruptions detected across the global corridor. All neural agents reporting nominal operational status.</p>
            </div>
          ) : (
            alerts.map((alert, i) => {
              const isCritical = alert.severity === 'CRITICAL';
              const statusColor = isCritical ? 'var(--status-danger)' : 'var(--status-warning)';
              
              return (
                <div key={alert.id || i} className="glass-panel" style={{ 
                  padding: '1.5rem', 
                  borderLeft: `4px solid ${statusColor}`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1.5rem',
                  background: 'rgba(255,255,255,0.02)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                       <div style={{ padding: '0.2rem 0.6rem', background: isCritical ? 'rgba(255,20,50,0.1)' : 'rgba(255,152,0,0.1)', borderRadius: '2px', fontSize: '0.6rem', fontWeight: 900, color: statusColor, border: `1px solid ${statusColor}44` }}>
                         {alert.severity}
                       </div>
                       <span style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-primary)', textTransform: 'uppercase' }}>{alert.node_name}</span>
                    </div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>#{alert.node_id}</div>
                  </div>

                  <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: statusColor, fontWeight: 700, fontSize: '0.8rem', marginBottom: '0.5rem' }}>
                      <AlertTriangle size={14} /> ACTIVE DISRUPTION DETECTED
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {alert.reasons?.map((reason, idx) => (
                        <span key={idx} style={{ padding: '0.25rem 0.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {reason.toUpperCase()}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="glass-panel" style={{ padding: '1rem', textAlign: 'center', border: '1px solid var(--border-color)' }}>
                       <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Estimated Latency</div>
                       <div style={{ fontSize: '1.5rem', fontWeight: 900, color: statusColor }}>+{alert.estimated_delay_hrs}H</div>
                    </div>
                    <div className="glass-panel" style={{ padding: '1rem', textAlign: 'center', border: '1px solid var(--border-color)' }}>
                       <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Network Impact</div>
                       <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-primary)' }}>{(alert.estimated_delay_hrs * 1.2).toFixed(1)}%</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                    <button 
                      onClick={() => navigate(`/node/${alert.node_id}`)}
                      style={{ flex: 1, padding: '0.75rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-primary)', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase', transition: 'all 0.2s' }}
                      onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                      onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                    >
                      Audit Station
                    </button>
                    <button 
                      onClick={() => navigate('/')}
                      style={{ flex: 1, padding: '0.75rem', background: 'transparent', border: '1px dashed var(--border-color)', borderRadius: '4px', color: 'var(--accent-primary)', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase' }}
                    >
                      View Map
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {alerts.length > 0 && (
        <div style={{ marginTop: '3rem', padding: '1.5rem', background: 'rgba(59, 158, 255, 0.03)', borderRadius: '8px', border: '1px dashed var(--accent-secondary)', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
           <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(59, 158, 255, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-secondary)' }}>
              <Zap size={20} />
           </div>
           <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)' }}>AUTO-RESOLUTION PROTOCOL ACTIVE</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Multi-agent neural systems are currently recalculating global vectors to bypass high-latency nodes.</div>
           </div>
        </div>
      )}
    </div>
  );
}
