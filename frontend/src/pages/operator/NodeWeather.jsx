import React from 'react';
import { useNetwork } from '../../context/NetworkContext';
import { useAppWebSocket } from '../../context/WebSocketContext';
import { useAuth } from '../../context/AuthContext';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import { 
  Cloud, Wind, Thermometer, Droplets, CloudRain, 
  Zap, MapPin, AlertTriangle, ShieldCheck, Loader 
} from 'lucide-react';

export default function NodeWeather() {
  const { weatherData, alerts } = useNetwork();
  const { isMobile } = useBreakpoint();
  
  const activeAlerts = (alerts || []).filter(a => a.type === 'weather');
  const filteredWeather = weatherData || [];

  const styles = {
    header: { marginBottom: isMobile ? '24px' : '32px' },
    title: { fontSize: isMobile ? '20px' : '24px', fontWeight: '900', fontFamily: "'Space Grotesk', sans-serif" },
    subtitle: { fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600' },
    grid: { display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(340px, 1fr))', gap: isMobile ? '16px' : '24px' },
    weatherCard: (hasAlert) => ({
      backgroundColor: 'var(--bg-surface)',
      border: `1px solid ${hasAlert ? 'var(--status-critical)' : 'var(--border)'}`,
      borderRadius: '16px',
      padding: isMobile ? '20px' : '24px',
      display: 'flex',
      flexDirection: 'column',
      gap: isMobile ? '16px' : '20px',
      transition: 'all 0.2s',
      background: hasAlert ? 'linear-gradient(135deg, var(--bg-surface), rgba(239, 71, 111, 0.05))' : 'var(--bg-surface)',
    }),
    tempLarge: { fontSize: isMobile ? '32px' : '40px', fontWeight: '900', display: 'flex', alignItems: 'baseline', gap: '4px' },
    statRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: isMobile ? '8px' : '12px' },
    statBox: { padding: '10px', backgroundColor: 'var(--bg-canvas)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px' },
    statLabel: { fontSize: '9px', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' },
    statValue: { fontSize: '12px', fontWeight: '800' }
  };

  return (
    <div>
      <header style={styles.header}>
        <h1 style={styles.title}>WEATHER TELEMETRY</h1>
        <p style={styles.subtitle}>Real-time environmental logs for assigned station clusters</p>
      </header>

      {activeAlerts.length > 0 && (
        <div style={{ 
          backgroundColor: 'var(--status-critical-dim)', 
          border: '1px solid rgba(239, 71, 111, 0.2)', 
          borderRadius: '12px', 
          padding: '12px 16px', 
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          color: 'var(--status-critical)',
          fontSize: '12px',
          fontWeight: '900',
          letterSpacing: '0.05em'
        }}>
          <AlertTriangle size={18} />
          <span>{activeAlerts.length} ACTIVE WEATHER ADVISORIES DETECTED</span>
        </div>
      )}

      {filteredWeather.length === 0 ? (
        <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <Cloud size={40} style={{ opacity: 0.2, marginBottom: '16px' }} />
          <div style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-primary)' }}>Synchronizing Satellite Data...</div>
        </div>
      ) : (
        <div style={styles.grid}>
          {filteredWeather.map(node => {
            const hasAlert = activeAlerts.some(a => a.node_id === node.node_id);
            return (
              <div key={node.node_id} style={styles.weatherCard(hasAlert)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase' }}>{node.node_id}</div>
                    <div style={{ fontSize: '16px', fontWeight: '900' }}>{node.node_name}</div>
                  </div>
                  <div style={{ fontSize: '24px' }}>
                    {node.temperature_c > 30 ? '☀️' : node.temperature_c < 10 ? '❄️' : '🌤️'}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                  <div style={styles.tempLarge}>
                    {node.temperature_c}<span style={{ fontSize: '16px', color: 'var(--text-muted)', fontWeight: '600' }}>°C</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '11px', fontWeight: '900', color: hasAlert ? 'var(--status-critical)' : 'var(--accent-primary)', textTransform: 'uppercase' }}>{node.condition}</div>
                    <div style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: '700' }}>{hasAlert ? 'CRITICAL' : 'STABLE'}</div>
                  </div>
                </div>

                <div style={styles.statRow}>
                  <div style={styles.statBox}>
                    <Wind size={14} color="var(--accent-primary)" />
                    <div>
                      <div style={styles.statLabel}>Wind</div>
                      <div style={styles.statValue}>{node.wind_speed_kmh} km/h</div>
                    </div>
                  </div>
                  <div style={styles.statBox}>
                    <Droplets size={14} color="var(--accent-primary)" />
                    <div>
                      <div style={styles.statLabel}>Humidity</div>
                      <div style={styles.statValue}>{node.humidity_pct}%</div>
                    </div>
                  </div>
                  <div style={styles.statBox}>
                    <CloudRain size={14} color="var(--accent-primary)" />
                    <div>
                      <div style={styles.statLabel}>Precip</div>
                      <div style={styles.statValue}>{node.precipitation_mm}mm</div>
                    </div>
                  </div>
                  <div style={styles.statBox}>
                    <Zap size={14} color="var(--accent-primary)" />
                    <div>
                      <div style={styles.statLabel}>Gusts</div>
                      <div style={styles.statValue}>{node.wind_gusts_kmh} km/h</div>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', color: 'var(--text-muted)', fontWeight: '800' }}>
                   <MapPin size={10} /> TELEMETRY VERIFIED
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
