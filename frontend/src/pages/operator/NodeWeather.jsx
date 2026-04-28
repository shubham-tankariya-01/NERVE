import React from 'react';
import { useNetwork } from '../../context/NetworkContext';
import { useAppWebSocket } from '../../context/WebSocketContext';
import { useAuth } from '../../context/AuthContext';
import { 
  Cloud, Wind, Thermometer, Droplets, CloudRain, 
  Zap, MapPin, AlertTriangle, ShieldCheck, Loader 
} from 'lucide-react';

export default function NodeWeather() {
  const { nodes } = useNetwork();
  const { data } = useAppWebSocket();
  const { user } = useAuth();
  
  const assignedNodes = user?.assigned_node_ids || [];
  const weatherData = data?.weather || [];
  const activeAlerts = (data?.alerts || []).filter(a => a.type === 'weather');

  // Filter weather for assigned nodes
  const filteredWeather = weatherData.filter(w => assignedNodes.includes(w.node_id));

  const styles = {
    header: {
      marginBottom: '32px',
    },
    title: {
      fontSize: '24px',
      fontWeight: '800',
      fontFamily: "'Space Grotesk', sans-serif",
      marginBottom: '4px',
    },
    subtitle: {
      fontSize: '14px',
      color: 'var(--text-secondary)',
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
      gap: '24px',
    },
    weatherCard: (hasAlert) => ({
      backgroundColor: 'var(--bg-surface)',
      border: `1px solid ${hasAlert ? 'var(--danger)' : 'var(--border)'}`,
      borderRadius: '16px',
      padding: '24px',
      display: 'flex',
      flexDirection: 'column',
      gap: '20px',
      transition: 'transform 0.2s',
      background: hasAlert ? 'linear-gradient(135deg, var(--bg-surface), rgba(239, 68, 68, 0.05))' : 'var(--bg-surface)',
    }),
    tempLarge: {
      fontSize: '40px',
      fontWeight: '800',
      display: 'flex',
      alignItems: 'baseline',
      gap: '4px',
    },
    statRow: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '12px',
    },
    statBox: {
      padding: '12px',
      backgroundColor: 'var(--bg-canvas)',
      borderRadius: '8px',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
    },
    statLabel: {
      fontSize: '10px',
      color: 'var(--text-secondary)',
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
    },
    statValue: {
      fontSize: '13px',
      fontWeight: '700',
    }
  };

  return (
    <div>
      <header style={styles.header}>
        <h1 style={styles.title}>WEATHER TELEMETRY</h1>
        <p style={styles.subtitle}>Environmental conditions for your assigned stations</p>
      </header>

      {activeAlerts.length > 0 && (
        <div style={{ 
          backgroundColor: 'var(--danger-dim)', 
          border: '1px solid rgba(239, 68, 68, 0.2)', 
          borderRadius: '12px', 
          padding: '16px', 
          marginBottom: '32px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          color: 'var(--danger)',
          fontSize: '14px',
          fontWeight: '700'
        }}>
          <AlertTriangle size={20} />
          <span>{activeAlerts.length} ACTIVE WEATHER ADVISORIES IN NETWORK</span>
        </div>
      )}

      {filteredWeather.length === 0 ? (
        <div style={{ padding: '80px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <Cloud size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
          <div style={{ fontSize: '15px', fontWeight: '600' }}>No weather data received for your nodes.</div>
          <div style={{ fontSize: '12px' }}>Waiting for global satellite sync...</div>
        </div>
      ) : (
        <div style={styles.grid}>
          {filteredWeather.map(node => {
            const hasAlert = activeAlerts.some(a => a.node_id === node.node_id);
            return (
              <div key={node.node_id} style={styles.weatherCard(hasAlert)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase' }}>{node.node_id}</div>
                    <div style={{ fontSize: '18px', fontWeight: '800' }}>{node.node_name}</div>
                  </div>
                  <div style={{ fontSize: '28px' }}>
                    {node.temperature_c > 30 ? '☀️' : node.temperature_c < 10 ? '❄️' : '🌤️'}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                  <div style={styles.tempLarge}>
                    {node.temperature_c}<span style={{ fontSize: '18px', color: 'var(--text-secondary)' }}>°C</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '12px', fontWeight: '800', color: hasAlert ? 'var(--danger)' : 'var(--info)', textTransform: 'uppercase' }}>{node.condition}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600' }}>{hasAlert ? 'WARNING' : 'STABLE'}</div>
                  </div>
                </div>

                <div style={styles.statRow}>
                  <div style={styles.statBox}>
                    <Wind size={16} color="var(--info)" />
                    <div>
                      <div style={styles.statLabel}>Wind</div>
                      <div style={styles.statValue}>{node.wind_speed_kmh} km/h</div>
                    </div>
                  </div>
                  <div style={styles.statBox}>
                    <Droplets size={16} color="var(--info)" />
                    <div>
                      <div style={styles.statLabel}>Humidity</div>
                      <div style={styles.statValue}>{node.humidity_pct}%</div>
                    </div>
                  </div>
                  <div style={styles.statBox}>
                    <CloudRain size={16} color="var(--info)" />
                    <div>
                      <div style={styles.statLabel}>Precip</div>
                      <div style={styles.statValue}>{node.precipitation_mm}mm</div>
                    </div>
                  </div>
                  <div style={styles.statBox}>
                    <Zap size={16} color="var(--info)" />
                    <div>
                      <div style={styles.statLabel}>Gusts</div>
                      <div style={styles.statValue}>{node.wind_gusts_kmh} km/h</div>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600' }}>
                   <MapPin size={12} /> STATION TELEMETRY VERIFIED
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
