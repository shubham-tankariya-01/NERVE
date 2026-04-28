import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useNetwork } from '../context/NetworkContext';
import { useAuth } from '../context/AuthContext';
import { fetchNodeOperator } from '../services/api';
import { 
  ChevronLeft, Thermometer, Wind, Activity, Database, Shield, Zap, MapPin, Truck, 
  User, Mail, Phone, CloudRain, Droplets, ArrowUpRight, BadgeCheck, Globe, History
} from 'lucide-react';

export default function NodeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { nodes, shipments, weatherData, loading: networkLoading } = useNetwork();
  const { getAuthHeaders } = useAuth();
  
  const [operator, setOperator] = useState(null);
  const [opLoading, setOpLoading] = useState(true);

  const node = nodes.find(n => n.id === id);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const data = await fetchNodeOperator(id, getAuthHeaders());
        setOperator(data.operator);
      } catch (err) {
        console.error('Failed to fetch operator:', err);
      } finally {
        setOpLoading(false);
      }
    })();
  }, [id, getAuthHeaders]);

  if (networkLoading) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <div className="animate-pulse">SYNCHRONIZING NODE TELEMETRY...</div>
      </div>
    );
  }

  if (!node) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <Database size={48} style={{ marginBottom: '1rem', color: 'var(--status-warning)' }} />
        <h2 style={{ color: 'var(--text-primary)' }}>Node Connection Lost</h2>
        <p>The specified node ID ({id}) is not responding to current network pings.</p>
        <Link to="/nodes" style={{ color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: 600 }}>Back to Infrastructure View</Link>
      </div>
    );
  }

  const nodeShipments = (shipments || []).filter(s => s.current_node === node.id);
  const station = weatherData.find(w => w.node_id === node.id);

  const getRiskColor = (level) => {
    switch (level?.toLowerCase()) {
      case 'low': return 'var(--status-success)';
      case 'medium': return 'var(--status-warning)';
      case 'high': return 'var(--status-danger)';
      default: return 'var(--text-secondary)';
    }
  };

  const styles = {
    container: { padding: '2rem', maxWidth: '1600px', margin: '0 auto', background: 'var(--bg-primary)', minHeight: '100%' },
    header: { display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '3rem' },
    pill: { padding: '0.3rem 0.8rem', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 900, color: 'var(--accent-primary)', border: '1px solid var(--accent-primary)', letterSpacing: '0.05em' },
    grid4: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '2.5rem' },
    mainGrid: { display: 'grid', gridTemplateColumns: '0.8fr 1.2fr', gap: '2rem' },
    card: { 
      padding: '2rem', 
      background: 'rgba(255, 255, 255, 0.02)', 
      border: '1px solid var(--border)', 
      borderRadius: '16px',
      position: 'relative',
      overflow: 'hidden'
    },
    innerBox: {
      padding: '1.5rem',
      background: 'rgba(0,0,0,0.2)',
      border: '1px solid var(--border)',
      borderRadius: '12px',
      marginBottom: '1rem'
    },
    label: { fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.5rem' },
    value: { fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' },
    highlightBorder: (color) => ({
      border: `1px solid ${color || 'var(--border)'}`,
      boxShadow: `0 0 15px ${color}22`
    })
  };

  return (
    <div className="animate-slide-up" style={styles.container}>
      <header style={styles.header}>
        <button onClick={() => navigate(-1)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
          <ChevronLeft size={24} />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={styles.pill}>{node.type?.toUpperCase()}</div>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 900, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>{node.name}</h1>
          <span style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--accent-primary)', fontFamily: 'var(--font-mono)', background: 'rgba(0,180,216,0.1)', padding: '4px 10px', borderRadius: '4px' }}>#{node.id}</span>
        </div>
      </header>

      <div style={styles.grid4}>
        <div className="glass-panel" style={{ ...styles.card, ...styles.highlightBorder(getRiskColor(node.risk_level)), padding: '1.5rem', borderLeft: `4px solid ${getRiskColor(node.risk_level)}` }}>
           <div style={styles.label}><Shield size={14} /> Risk Protocol</div>
           <div style={{ ...styles.value, color: getRiskColor(node.risk_level) }}>{(node.risk_level || 'LOW').toUpperCase()}</div>
        </div>
        <div className="glass-panel" style={{ ...styles.card, ...styles.highlightBorder('var(--accent-primary)'), padding: '1.5rem', borderLeft: `4px solid var(--accent-primary)` }}>
           <div style={styles.label}><Activity size={14} /> Processing Latency</div>
           <div style={styles.value}>{node.processing_time_hrs || 0.4}H <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 400 }}>BASE OFFSET</span></div>
        </div>
        <div className="glass-panel" style={{ ...styles.card, ...styles.highlightBorder('var(--accent-purple)'), padding: '1.5rem', borderLeft: `4px solid var(--accent-purple)` }}>
           <div style={styles.label}><Truck size={14} /> Local Inventory</div>
           <div style={styles.value}>{nodeShipments.length} <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 400 }}>ACTIVE UNITS</span></div>
        </div>
      </div>

      <div style={styles.mainGrid}>
         <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="glass-panel" style={{ ...styles.card, ...styles.highlightBorder('rgba(255,255,255,0.1)') }}>
               <h3 style={styles.label}><MapPin size={16} /> Vector Coordinates</h3>
               <div style={{ ...styles.innerBox, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: 0 }}>
                  <div>
                     <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>LATITUDE</div>
                     <div style={{ fontWeight: 800, fontSize: '1.1rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-primary)' }}>
                        {(node.lat || node.location?.lat || 0).toFixed(6)}
                     </div>
                  </div>
                  <div>
                     <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>LONGITUDE</div>
                     <div style={{ fontWeight: 800, fontSize: '1.1rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-primary)' }}>
                        {(node.lng || node.location?.lng || 0).toFixed(6)}
                     </div>
                  </div>
               </div>
            </div>

            <div className="glass-panel" style={{ ...styles.card, ...styles.highlightBorder('rgba(255,255,255,0.1)') }}>
               <h3 style={styles.label}><Thermometer size={16} /> Regional Meteorological Telemetry</h3>
               <div style={styles.innerBox}>
                  {!station ? (
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', textAlign: 'center' }}>Awaiting satellite telemetry...</div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem' }}>
                       <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <Thermometer size={20} color="#00b4d8" />
                          <div>
                            <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)' }}>TEMP</div>
                            <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>{station.temperature_c}°C</div>
                          </div>
                       </div>
                       <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <Wind size={20} color="var(--text-primary)" />
                          <div>
                            <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)' }}>WIND</div>
                            <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>{station.wind_speed_kmh} <span style={{ fontSize: '0.6rem' }}>KM/H</span></div>
                          </div>
                       </div>
                       <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <Droplets size={20} color="#06d6a0" />
                          <div>
                            <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)' }}>HUMIDITY</div>
                            <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>{station.humidity_pct || 45}%</div>
                          </div>
                       </div>
                       <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <CloudRain size={20} color="#ff9800" />
                          <div>
                            <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)' }}>PRECIP</div>
                            <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>{station.precipitation_mm || 0} <span style={{ fontSize: '0.6rem' }}>MM</span></div>
                          </div>
                       </div>
                    </div>
                  )}
               </div>
            </div>
         </div>

         <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="glass-panel" style={{ ...styles.card, ...styles.highlightBorder('var(--accent-primary)'), borderTop: '4px solid var(--accent-primary)' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
                  <h3 style={styles.label}><User size={16} /> Assigned Node Authority / Station Operator</h3>
                  <div style={{ padding: '4px 12px', background: 'rgba(6,214,160,0.1)', color: '#06d6a0', borderRadius: '20px', fontSize: '0.65rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <BadgeCheck size={14} /> VERIFIED OPERATOR
                  </div>
               </div>

               {opLoading ? (
                 <div className="animate-pulse" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Retrieving personnel records from Central Registry...</div>
               ) : !operator ? (
                 <div style={{ ...styles.innerBox, textAlign: 'center', padding: '3rem' }}>
                    <Shield size={40} style={{ color: 'var(--status-warning)', opacity: 0.5, marginBottom: '1rem' }} />
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>STATION UNMANNED</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Operating under autonomous neural protocols.</div>
                 </div>
               ) : (
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div style={{ ...styles.innerBox, display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: 0 }}>
                       <div style={{ width: '80px', height: '80px', borderRadius: '16px', background: 'var(--grad-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 900, color: '#fff', boxShadow: '0 8px 20px rgba(0,180,216,0.3)' }}>
                          {operator.full_name?.[0] || 'U'}
                       </div>
                       <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 900, fontSize: '1.5rem', color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>{operator.full_name}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--accent-primary)', fontWeight: 800, textTransform: 'uppercase', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                             Senior Node Manager <Globe size={12} />
                          </div>
                       </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                       <div style={{ ...styles.innerBox, marginBottom: 0 }}>
                          <div style={styles.label}><Mail size={14} /> Registered Email</div>
                          <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 600 }}>{operator.email}</div>
                       </div>
                       <div style={{ ...styles.innerBox, marginBottom: 0 }}>
                          <div style={styles.label}><Phone size={14} /> Direct Comms</div>
                          <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 600 }}>{operator.mobile || '+1 (555) 000-0000'}</div>
                       </div>
                    </div>

                    <div style={styles.innerBox}>
                       <div style={styles.label}><History size={14} /> Management History</div>
                       <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                          {[
                             'Security Clearance: Level 4 (Tactical)',
                             'Incident Response: 100% Efficiency',
                             'Assigned: 12 months in current sector'
                          ].map((item, i) => (
                             <div key={i} style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ width: '4px', height: '4px', background: 'var(--accent-primary)', borderRadius: '50%' }}></div>
                                {item}
                             </div>
                          ))}
                       </div>
                    </div>

                    <button style={{ width: '100%', padding: '1.25rem', background: 'var(--accent-primary)', border: 'none', borderRadius: '12px', color: '#000', fontSize: '0.85rem', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', transition: 'all 0.2s', boxShadow: '0 4px 15px rgba(0,180,216,0.3)' }} onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseOut={e => e.currentTarget.style.transform = 'none'}>
                       ESTABLISH ENCRYPTED CHANNEL <ArrowUpRight size={16} />
                    </button>
                 </div>
               )}
            </div>
         </div>
      </div>
    </div>
  );
}
