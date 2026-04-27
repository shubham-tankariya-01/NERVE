import React from 'react';
import { useNetwork } from '../../context/NetworkContext';
import { Package, MapPin, AlertTriangle, CloudRain, Wind, Thermometer, Clock, Search, Cloud } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export function ShipmentTrackerPanel() {
  const navigate = useNavigate();
  const [search, setSearch] = React.useState('');
  const { shipments } = useNetwork();

  const handleTrack = (id) => {
    const targetId = id || search;
    if (targetId) navigate(`/shipment/${targetId}`);
  };

  return (
    <div className="card" style={{ padding: '1rem', marginBottom: '1rem', border: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)' }}>
      <h2 style={{ fontSize: '0.75rem', letterSpacing: '0.1em', margin: '0 0 1rem 0', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Active Shipments</h2>
      
      <div style={{ position: 'relative', marginBottom: '1rem' }}>
        <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input 
          type="text" 
          placeholder="Filter by ID..." 
          className="input-control" 
          style={{ width: '100%', padding: '0.5rem 0.75rem 0.5rem 2.25rem', fontSize: '0.8rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-main)' }}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleTrack()}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '180px', overflowY: 'auto', paddingRight: '4px' }}>
        {shipments
          .filter(s => s.id.toLowerCase().includes(search.toLowerCase()))
          .slice(0, 6)
          .map(s => (
          <div 
            key={s.id} 
            onClick={() => handleTrack(s.id)}
            style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              padding: '0.65rem', 
              background: 'rgba(255,255,255,0.03)', 
              borderRadius: '6px', 
              cursor: 'pointer',
              border: '1px solid transparent',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
            onMouseOut={(e) => e.currentTarget.style.borderColor = 'transparent'}
          >
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)' }}>{s.id}</div>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: s.status === 'delayed' ? 'var(--status-critical)' : 'var(--status-live)' }}></div>
          </div>
        ))}
      </div>

      <button 
        onClick={() => navigate('/shipments')}
        style={{ width: '100%', marginTop: '1rem', padding: '0.5rem', background: 'transparent', border: '1px dashed var(--border)', color: 'var(--accent-primary)', fontSize: '0.7rem', fontWeight: 600, borderRadius: '4px', cursor: 'pointer' }}
      >
        VIEW ALL SHIPMENTS
      </button>
    </div>
  );
}

export function DisruptionAlertsPanel() {
  const { alerts } = useNetwork();
  const navigate = useNavigate();

  return (
    <div className="card" style={{ padding: '1rem', marginBottom: '1rem', border: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '0.75rem', letterSpacing: '0.1em', margin: 0, textTransform: 'uppercase', color: 'var(--status-critical)', fontWeight: 800 }}>Incident Feed</h2>
        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)' }}>{alerts.length} ACTIVE</span>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '200px', overflowY: 'auto', paddingRight: '4px' }}>
        {alerts.length === 0 ? (
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem', border: '1px dashed rgba(255,255,255,0.05)', borderRadius: '6px' }}>
            System Integrity Optimal
          </div>
        ) : (
          alerts.slice(0, 5).map(alert => (
            <div key={alert.id || alert.node_id} style={{ background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: '6px', borderLeft: `3px solid var(--${alert.severity === 'CRITICAL' ? 'danger' : 'warning'})` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 800, color: `var(--${alert.severity === 'CRITICAL' ? 'danger' : 'warning'})` }}>{alert.severity}</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>+{alert.estimated_delay_hrs}h</span>
              </div>
              <div style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{alert.node_name}</div>
            </div>
          ))
        )}
      </div>
      
      {alerts.length > 0 && (
        <button 
          onClick={() => navigate('/disruptions')}
          style={{ width: '100%', marginTop: '1rem', padding: '0.5rem', background: 'transparent', border: '1px dashed var(--border)', color: 'var(--status-critical)', fontSize: '0.7rem', fontWeight: 600, borderRadius: '4px', cursor: 'pointer' }}
        >
          OPEN INCIDENT CENTER
        </button>
      )}
    </div>
  );
}

export function WeatherOverviewPanel() {
  const { weatherData } = useNetwork();
  const navigate = useNavigate();
  
  return (
    <div className="card" style={{ padding: '1rem', flex: 1, display: 'flex', flexDirection: 'column', border: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '0.75rem', letterSpacing: '0.1em', margin: 0, textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Weather Nodes</h2>
        <Cloud size={14} color="var(--accent-primary)" />
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem', flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
        {weatherData.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.7rem' }}>Syncing telemetry...</div>
        ) : (
          weatherData.slice(0, 10).map(station => (
            <div key={station.node_id} style={{ 
              background: 'rgba(255,255,255,0.03)', 
              padding: '0.65rem', 
              borderRadius: '6px',
              border: '1px solid transparent'
            }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, marginBottom: '0.35rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-main)' }}>{station.node_name}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                  <Thermometer size={10} />
                  <span>{station.temperature_c}°</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                  <Wind size={10} />
                  <span>{station.wind_speed_kmh}k/h</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      
      <button 
        onClick={() => navigate('/weather')}
        style={{ width: '100%', marginTop: '1rem', padding: '0.5rem', background: 'transparent', border: '1px dashed var(--border)', color: 'var(--accent-primary)', fontSize: '0.7rem', fontWeight: 600, borderRadius: '4px', cursor: 'pointer' }}
      >
        METEOROLOGICAL DATA
      </button>
    </div>
  );
}
