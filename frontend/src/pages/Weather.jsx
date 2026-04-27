import React from 'react';
import { useNetwork } from '../context/NetworkContext';
import { useAppWebSocket } from '../context/WebSocketContext';
import { Cloud, Wind, Thermometer, Droplets, CloudRain, Zap, MapPin, AlertTriangle, ShieldCheck } from 'lucide-react';

export default function Weather() {
  const { nodes } = useNetwork();
  const { data } = useAppWebSocket();
  
  const weatherData = data?.weather || [];
  const activeAlerts = (data?.alerts || []).filter(a => a.type === 'weather');

  return (
    <div className="animate-slide-up" style={{ padding: '2rem', maxWidth: '1600px', margin: '0 auto', background: 'var(--bg-main)', minHeight: '100%' }}>
      <header style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-end', 
        marginBottom: '3rem', 
        borderLeft: '4px solid var(--accent-primary)', 
        paddingLeft: '1.5rem' 
      }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--text-main)', margin: 0, letterSpacing: '-0.02em' }}>GLOBAL WEATHER INTELLIGENCE</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.25rem', fontWeight: 600 }}>Real-Time Environmental Telemetry · Station Network [24 Units]</p>
        </div>
        <div style={{ textAlign: 'right' }}>
           <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.25rem' }}>Network Sync</div>
           <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--status-live)', fontWeight: 700, fontSize: '0.85rem' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--status-live)', boxShadow: '0 0 10px var(--status-live)' }}></div>
              LIVE FEED
           </div>
        </div>
      </header>

      {activeAlerts.length > 0 ? (
        <div className="glass-panel" style={{ 
          padding: '1.5rem', 
          marginBottom: '2.5rem', 
          borderLeft: '4px solid var(--status-critical)', 
          background: 'rgba(255,20,50,0.03)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}>
           <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--status-critical)', fontWeight: 900, fontSize: '0.9rem' }}>
              <AlertTriangle size={18} /> CRITICAL WEATHER ADVISORIES ACTIVE
           </div>
           <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              {activeAlerts.map((a, i) => (
                <div key={i} style={{ 
                  padding: '0.5rem 1rem', 
                  background: 'rgba(255,20,50,0.1)', 
                  borderRadius: '4px', 
                  fontSize: '0.75rem', 
                  fontWeight: 700,
                  color: 'var(--text-main)',
                  border: '1px solid rgba(255,20,50,0.2)'
                }}>
                  {a.node_name?.toUpperCase()}: {a.description}
                </div>
              ))}
           </div>
        </div>
      ) : (
        <div className="glass-panel" style={{ 
          padding: '1rem 1.5rem', 
          marginBottom: '2.5rem', 
          borderLeft: '4px solid var(--status-live)', 
          background: 'rgba(50,255,100,0.02)',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          color: 'var(--status-live)',
          fontWeight: 700,
          fontSize: '0.85rem'
        }}>
           <ShieldCheck size={18} /> ALL GLOBAL CHANNELS REPORTING STABLE ENVIRONMENTAL CONDITIONS
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
        {weatherData.length > 0 ? weatherData.map(node => {
          const hasAlert = activeAlerts.some(a => a.node_id === node.node_id);
          const statusColor = hasAlert ? 'var(--status-critical)' : 'var(--accent-primary)';
          
          return (
            <div key={node.node_id} className="glass-panel" style={{ 
              padding: '1.5rem', 
              borderLeft: `4px solid ${statusColor}`,
              display: 'flex',
              flexDirection: 'column',
              gap: '1.5rem',
              background: hasAlert ? 'rgba(255,20,50,0.02)' : 'rgba(255,255,255,0.02)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ padding: '0.2rem 0.6rem', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', fontSize: '0.6rem', fontWeight: 900, color: 'var(--text-muted)', border: '1px solid var(--glass-border)' }}>
                      {node.node_id}
                    </div>
                    <span style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-main)', textTransform: 'uppercase' }}>{node.node_name}</span>
                 </div>
                 <div style={{ fontSize: '1.25rem' }}>
                   {node.temperature_c > 30 ? '☀️' : node.temperature_c < 10 ? '❄️' : '🌤️'}
                 </div>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--text-main)', display: 'flex', alignItems: 'baseline', gap: '0.25rem' }}>
                   {node.temperature_c}<span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>°C</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                   <div style={{ fontSize: '0.7rem', fontWeight: 800, color: statusColor, textTransform: 'uppercase' }}>{node.condition}</div>
                   <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 600 }}>STATION STATUS: {hasAlert ? 'ALERT' : 'OPTIMAL'}</div>
                </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                   <Wind size={14} style={{ color: 'var(--accent-primary)' }} />
                   <div>
                      <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 800 }}>WIND</div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700 }}>{node.wind_speed_kmh} km/h</div>
                   </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                   <Droplets size={14} style={{ color: 'var(--accent-primary)' }} />
                   <div>
                      <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 800 }}>HUMIDITY</div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700 }}>{node.humidity_pct}%</div>
                   </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                   <CloudRain size={14} style={{ color: 'var(--accent-primary)' }} />
                   <div>
                      <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 800 }}>PRECIP</div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700 }}>{node.precipitation_mm}mm</div>
                   </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                   <Zap size={14} style={{ color: 'var(--accent-primary)' }} />
                   <div>
                      <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 800 }}>GUSTS</div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700 }}>{node.wind_gusts_kmh} km/h</div>
                   </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                 <MapPin size={10} /> STATION_COORDS_VERIFIED
              </div>
            </div>
          );
        }) : (
          <div style={{ gridColumn: '1 / -1', padding: '4rem', textAlign: 'center' }}>
             <div className="animate-pulse" style={{ color: 'var(--text-muted)', fontWeight: 700 }}>INITIALIZING GLOBAL WEATHER SYNC...</div>
          </div>
        )}
      </div>
    </div>
  );
}
