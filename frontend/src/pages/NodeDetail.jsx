import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useNetwork } from '../context/NetworkContext';
import { useTheme } from '../context/ThemeContext';
import { ChevronLeft, Thermometer, Wind, Activity, Database, Shield, Zap, MapPin, Truck } from 'lucide-react';

export default function NodeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { nodes, shipments, loading } = useNetwork();
  const { theme } = useTheme();
  
  const node = nodes.find(n => n.id === id);

  if (loading) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        <div className="animate-pulse">SYNCHRONIZING NODE TELEMETRY...</div>
      </div>
    );
  }

  if (!node) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        <Database size={48} style={{ marginBottom: '1rem', color: 'var(--status-warning)' }} />
        <h2 style={{ color: 'var(--text-main)' }}>Node Connection Lost</h2>
        <p>The specified node ID ({id}) is not responding to current network pings.</p>
        <Link to="/nodes" style={{ color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: 600 }}>Back to Infrastructure View</Link>
      </div>
    );
  }

  const nodeShipments = (shipments || []).filter(s => s.current_node === node.id);
  const loadPercentage = node.capacity ? Math.round((node.current_load / node.capacity) * 100) : 0;

  const getRiskColor = (level) => {
    switch (level?.toLowerCase()) {
      case 'low': return 'var(--status-live)';
      case 'medium': return 'var(--status-warning)';
      case 'high': return 'var(--status-critical)';
      default: return 'var(--text-muted)';
    }
  };

  return (
    <div className="animate-slide-up" style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto', background: 'var(--bg-main)', minHeight: '100%' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '3rem' }}>
        <button 
          onClick={() => navigate('/nodes')} 
          style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
        >
          <ChevronLeft size={24} />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.3rem 0.8rem', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', fontSize: '0.7rem', fontWeight: 900, color: 'var(--accent-primary)', border: '1px solid var(--accent-primary)' }}>
            {node.type?.toUpperCase() || 'UNKNOWN'}
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>{node.name}</h1>
          <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>[{node.id}]</span>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '2.5rem' }}>
        {[
          { label: 'Operational Load', value: `${node.current_load || 0} / ${node.capacity || 0} units`, icon: <Zap size={14} />, color: loadPercentage > 80 ? 'var(--status-critical)' : 'var(--accent-primary)' },
          { label: 'Risk Protocol', value: (node.risk_level || 'LOW').toUpperCase(), icon: <Shield size={14} />, color: getRiskColor(node.risk_level) },
          { label: 'Processing Latency', value: `${node.processing_time_hrs || 0}H`, icon: <Activity size={14} />, color: 'var(--text-main)' },
          { label: 'Active Shipments', value: nodeShipments.length, icon: <Truck size={14} />, color: 'var(--accent-primary)' }
        ].map((s, i) => (
          <div key={i} className="glass-panel" style={{ padding: '1.5rem', borderLeft: `3px solid ${s.color}` }}>
             <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '0.75rem', textTransform: 'uppercase', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {s.icon} {s.label}
             </div>
             <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1.5rem' }}>
         <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="glass-panel" style={{ padding: '2rem' }}>
               <h3 style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <MapPin size={16} /> Geographic Intelligence
               </h3>
               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                  <div>
                     <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>LATITUDE</div>
                     <div style={{ fontWeight: 700, fontSize: '1.1rem', fontFamily: 'var(--font-mono)' }}>
                        {node.location?.lat != null ? node.location.lat.toFixed(4) : 'N/A'}
                     </div>
                  </div>
                  <div>
                     <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>LONGITUDE</div>
                     <div style={{ fontWeight: 700, fontSize: '1.1rem', fontFamily: 'var(--font-mono)' }}>
                        {node.location?.lng != null ? node.location.lng.toFixed(4) : 'N/A'}
                     </div>
                  </div>
               </div>
            </div>

            <div className="glass-panel" style={{ padding: '2rem' }}>
               <h3 style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Thermometer size={16} /> Environmental Telemetry
               </h3>
               {(() => {
                  const { weatherData } = useNetwork();
                  const station = weatherData.find(w => w.node_id === node.id);
                  if (!station) return <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>NO LIVE STATION DATA AVAILABLE FOR THIS VECTOR</div>;
                  return (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2rem' }}>
                       <div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>TEMPERATURE</div>
                          <div style={{ fontWeight: 700, fontSize: '1.25rem' }}>{station.temperature_c}°C</div>
                       </div>
                       <div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>WIND VELOCITY</div>
                          <div style={{ fontWeight: 700, fontSize: '1.25rem' }}>{station.wind_speed_kmh} km/h</div>
                       </div>
                       <div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>CONDITION</div>
                          <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--accent-primary)', textTransform: 'uppercase' }}>{station.condition}</div>
                       </div>
                    </div>
                  );
               })()}
            </div>
         </div>

         <div className="glass-panel" style={{ padding: '2rem' }}>
            <h3 style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
               <Activity size={16} /> Live Node Throughput
            </h3>
            <div style={{ height: '300px', background: 'rgba(255,255,255,0.02)', borderRadius: '4px', border: '1px dashed var(--glass-border)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', gap: '1rem' }}>
               <Database size={32} opacity={0.3} />
               <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>ESTABLISHING REAL-TIME DATA STREAM...</span>
            </div>
         </div>
      </div>
    </div>
  );
}
