import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useNetwork } from '../context/NetworkContext';
import { useAuth } from '../context/AuthContext';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { fetchNodeOperator } from '../services/api';
import { 
  ChevronLeft, Thermometer, Wind, Activity, Database, Shield, Zap, MapPin, Truck, 
  User, Mail, Phone, CloudRain, Droplets, ArrowUpRight, BadgeCheck, Globe, History, Package, Inbox
} from 'lucide-react';

export default function NodeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { nodes, shipments, weatherData, loading: networkLoading } = useNetwork();
  const { getAuthHeaders } = useAuth();
  const { isMobile, isTablet } = useBreakpoint();
  
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
      <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        <div className="animate-pulse">SYNCHRONIZING...</div>
      </div>
    );
  }

  if (!node) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        <Database size={48} style={{ marginBottom: '1rem', color: 'var(--status-warning)' }} />
        <h2 style={{ color: 'var(--text-main)' }}>Node Connection Lost</h2>
        <p>The specified node ID ({id}) is not responding.</p>
        <Link to="/nodes" style={{ color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: 600 }}>Nodes List</Link>
      </div>
    );
  }

  const nodeShipments = (shipments || []).filter(s => s.current_node === node.id);
  const station = weatherData.find(w => w.node_id === node.id);

  const getRiskColor = (level) => {
    switch (level?.toLowerCase()) {
      case 'low': return 'var(--status-live)';
      case 'medium': return 'var(--status-warning)';
      case 'high': return 'var(--status-critical)';
      default: return 'var(--text-muted)';
    }
  };

  const styles = {
    container: { padding: isMobile ? '1rem' : '2rem', maxWidth: '1600px', margin: '0 auto', background: 'var(--bg-main)', minHeight: '100%' },
    header: { display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', gap: isMobile ? '0.75rem' : '1.5rem', marginBottom: isMobile ? '1.5rem' : '3rem', flexDirection: isMobile ? 'column' : 'row' },
    pill: { padding: '0.3rem 0.8rem', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 900, color: 'var(--accent-primary)', border: '1px solid var(--accent-primary)', letterSpacing: '0.05em' },
    grid4: { display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: isMobile ? '1rem' : '1.5rem', marginBottom: isMobile ? '1.5rem' : '2.5rem' },
    mainGrid: { display: 'grid', gridTemplateColumns: (isMobile || isTablet) ? '1fr' : '0.8fr 1.2fr', gap: isMobile ? '1.5rem' : '2rem' },
    card: { 
      padding: isMobile ? '1.25rem' : '2rem', 
      background: 'rgba(255, 255, 255, 0.02)', 
      border: '1px solid var(--border)', 
      borderRadius: '16px',
      position: 'relative',
      overflow: 'hidden'
    },
    innerBox: {
      padding: isMobile ? '1rem' : '1.5rem',
      background: 'rgba(0,0,0,0.2)',
      border: '1px solid var(--border)',
      borderRadius: '12px',
      marginBottom: '1rem'
    },
    label: { fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.5rem' },
    value: { fontSize: isMobile ? '1.25rem' : '1.5rem', fontWeight: 800, color: 'var(--text-main)' },
    highlightBorder: (color) => ({
      border: `1px solid ${color || 'var(--border)'}`,
      boxShadow: `0 0 15px ${color}22`
    })
  };

  return (
    <div className="animate-slide-up" style={styles.container}>
      <header style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={() => navigate(-1)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '8px' }}>
            <ChevronLeft size={24} />
          </button>
          <div style={styles.pill}>{node.type?.toUpperCase()}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', flexWrap: 'wrap' }}>
          <h1 style={{ fontSize: isMobile ? '1.5rem' : '2.25rem', fontWeight: 900, color: 'var(--text-main)', margin: 0, letterSpacing: '-0.02em' }}>{node.name}</h1>
          <span style={{ fontSize: isMobile ? '0.85rem' : '1.1rem', fontWeight: 600, color: 'var(--accent-primary)', fontFamily: 'var(--font-mono)', background: 'rgba(0,180,216,0.1)', padding: '4px 10px', borderRadius: '4px' }}>#{node.id}</span>
        </div>
      </header>

      <div style={styles.grid4}>
        <div className="glass-panel" style={{ ...styles.card, ...styles.highlightBorder(getRiskColor(node.risk_level)), borderLeft: `4px solid ${getRiskColor(node.risk_level)}` }}>
           <div style={styles.label}><Shield size={14} /> Risk</div>
           <div style={{ ...styles.value, color: getRiskColor(node.risk_level) }}>{(node.risk_level || 'LOW').toUpperCase()}</div>
        </div>
        <div className="glass-panel" style={{ ...styles.card, ...styles.highlightBorder('var(--accent-primary)'), borderLeft: `4px solid var(--accent-primary)` }}>
           <div style={styles.label}><Activity size={14} /> Latency</div>
           <div style={styles.value}>{node.processing_time_hrs || 0.4}H</div>
        </div>
        <div className="glass-panel" style={{ ...styles.card, ...styles.highlightBorder('var(--accent-purple)'), borderLeft: `4px solid var(--accent-purple)` }}>
           <div style={styles.label}><Truck size={14} /> Units</div>
           <div style={styles.value}>{nodeShipments.length}</div>
        </div>
      </div>

      <div style={styles.mainGrid}>
         {/* Left Column */}
         <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '1rem' : '1.5rem' }}>
            <div className="glass-panel" style={{ ...styles.card, ...styles.highlightBorder('rgba(255,255,255,0.1)') }}>
               <h3 style={styles.label}><MapPin size={16} /> Coordinates</h3>
               <div style={{ ...styles.innerBox, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: 0 }}>
                  <div>
                     <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginBottom: '4px' }}>LAT</div>
                     <div style={{ fontWeight: 800, fontSize: isMobile ? '0.9rem' : '1.1rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-primary)' }}>
                        {(node.lat || node.location?.lat || 0).toFixed(4)}
                     </div>
                  </div>
                  <div>
                     <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginBottom: '4px' }}>LNG</div>
                     <div style={{ fontWeight: 800, fontSize: isMobile ? '0.9rem' : '1.1rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-primary)' }}>
                        {(node.lng || node.location?.lng || 0).toFixed(4)}
                     </div>
                  </div>
               </div>
            </div>

            <div className="glass-panel" style={{ ...styles.card, ...styles.highlightBorder('rgba(255,255,255,0.1)') }}>
               <h3 style={styles.label}><Thermometer size={16} /> Weather</h3>
               <div style={styles.innerBox}>
                  {!station ? (
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textAlign: 'center' }}>Syncing...</div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                       <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <Thermometer size={18} color="#00b4d8" />
                          <div>
                            <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)' }}>TEMP</div>
                            <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>{station.temperature_c}°C</div>
                          </div>
                       </div>
                       <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <Wind size={18} color="var(--text-main)" />
                          <div>
                            <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)' }}>WIND</div>
                            <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>{station.wind_speed_kmh} <span style={{ fontSize: '0.55rem' }}>KM/H</span></div>
                          </div>
                       </div>
                    </div>
                  )}
               </div>
            </div>

            <div className="glass-panel" style={{ ...styles.card, ...styles.highlightBorder('rgba(255,255,255,0.1)') }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.5rem' }}>
                   <History size={18} color="var(--info)" />
                   <h3 style={{ ...styles.label, marginBottom: 0 }}>Station Activity Log</h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                   {nodeShipments.length === 0 ? (
                      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>No recent activity detected.</div>
                   ) : (
                      nodeShipments.slice(0, 5).map(s => (
                         <div key={s.id} style={{ ...styles.innerBox, marginBottom: 0, padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                               <div style={{ fontSize: '11px', fontWeight: 900 }}>{s.id}</div>
                               <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>{s.cargo_type} • ARRIVED</div>
                            </div>
                            <div style={{ fontSize: '9px', fontWeight: 700, color: 'var(--brand)' }}>{new Date().toLocaleDateString()}</div>
                         </div>
                      ))
                   )}
                </div>
            </div>
         </div>

         {/* Right Column */}
         <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '1rem' : '1.5rem' }}>
            <div className="glass-panel" style={{ ...styles.card, ...styles.highlightBorder('var(--info)'), minHeight: '400px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Package size={20} color="var(--info)" />
                      <h3 style={{ ...styles.label, marginBottom: 0 }}>Active Manifests</h3>
                   </div>
                   <div style={{ fontSize: '10px', fontWeight: 900, background: 'var(--info-dim)', color: 'var(--info)', padding: '4px 10px', borderRadius: '4px' }}>
                      {nodeShipments.length} UNITS
                   </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                   {nodeShipments.length === 0 ? (
                      <div style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                         <Inbox size={48} style={{ opacity: 0.1, marginBottom: '1rem' }} />
                         <div style={{ fontSize: '0.9rem', fontWeight: 800 }}>STATION EMPTY</div>
                         <p style={{ fontSize: '0.7rem' }}>No active shipments are currently processed at this node.</p>
                      </div>
                   ) : (
                      nodeShipments.map(s => (
                         <Link to={`/app/shipment/${s.id}`} key={s.id} style={{ textDecoration: 'none', color: 'inherit' }}>
                            <div style={{ ...styles.innerBox, marginBottom: 0, border: '1px solid var(--border)', transition: 'all 0.2s' }} onMouseOver={e => e.currentTarget.style.borderColor = 'var(--info)'} onMouseOut={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                  <div>
                                     <div style={{ fontSize: '14px', fontWeight: 900 }}>{s.cargo_type}</div>
                                     <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700 }}>ID: {s.id}</div>
                                  </div>
                                  <div style={{ fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', color: s.status === 'delayed' ? 'var(--status-critical)' : 'var(--brand)' }}>
                                     {s.status}
                                  </div>
                               </div>
                               <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px', fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)' }}>
                                  <span>{s.origin}</span>
                                  <ArrowUpRight size={12} />
                                  <span>{s.destination}</span>
                                </div>
                            </div>
                         </Link>
                      ))
                   )}
                </div>
            </div>

            <div className="glass-panel" style={{ ...styles.card, ...styles.highlightBorder('var(--accent-primary)'), borderTop: '4px solid var(--accent-primary)' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexDirection: isMobile ? 'column' : 'row', gap: '1rem' }}>
                  <h3 style={styles.label}><User size={16} /> Station Operator</h3>
                  {operator && (
                    <div style={{ padding: '4px 12px', background: 'rgba(6,214,160,0.1)', color: '#06d6a0', borderRadius: '20px', fontSize: '0.6rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <BadgeCheck size={14} /> VERIFIED
                    </div>
                  )}
               </div>

               {opLoading ? (
                 <div className="animate-pulse" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Retrieving records...</div>
               ) : !operator ? (
                 <div style={{ ...styles.innerBox, textAlign: 'center', padding: '2rem' }}>
                    <Shield size={32} style={{ color: 'var(--status-warning)', opacity: 0.5, marginBottom: '1rem' }} />
                    <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-main)' }}>STATION UNMANNED</div>
                 </div>
               ) : (
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div style={{ ...styles.innerBox, display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: 0 }}>
                       <div style={{ width: isMobile ? '48px' : '64px', height: isMobile ? '48px' : '64px', borderRadius: '12px', background: 'var(--grad-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: isMobile ? '1.25rem' : '1.5rem', fontWeight: 900, color: '#fff' }}>
                          {operator.full_name?.[0]}
                       </div>
                       <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 900, fontSize: isMobile ? '1.1rem' : '1.25rem', color: 'var(--text-main)' }}>{operator.full_name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', fontWeight: 800, textTransform: 'uppercase' }}>Senior Manager</div>
                       </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '0.75rem' }}>
                       <div style={{ ...styles.innerBox, marginBottom: 0, padding: '0.75rem' }}>
                          <div style={styles.label}><Mail size={12} /> Email</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-main)', fontWeight: 600, wordBreak: 'break-all' }}>{operator.email}</div>
                       </div>
                       <div style={{ ...styles.innerBox, marginBottom: 0, padding: '0.75rem' }}>
                          <div style={styles.label}><Phone size={12} /> Mobile</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-main)', fontWeight: 600 }}>{operator.mobile || 'N/A'}</div>
                       </div>
                    </div>

                    <button style={{ width: '100%', padding: '1rem', background: 'var(--accent-primary)', border: 'none', borderRadius: '12px', color: '#000', fontSize: '0.8rem', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', minHeight: '48px' }}>
                       CONTACT OPERATOR <ArrowUpRight size={16} />
                    </button>
                 </div>
               )}
            </div>
         </div>
      </div>
    </div>
  );
}
