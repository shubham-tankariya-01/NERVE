import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { fetchCustomerShipmentDetail } from '../../services/api';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import { 
  ArrowLeft, Package, MapPin, Clock, AlertTriangle, 
  CheckCircle, Circle, Loader, Truck, Info, Calendar 
} from 'lucide-react';

const STATUS_COLORS = { 
  in_transit: 'var(--info)', 
  delayed: 'var(--warning)', 
  delivered: 'var(--brand)', 
  blocked: 'var(--danger)' 
};
const STATUS_BG = { 
  in_transit: 'var(--info-dim)', 
  delayed: 'var(--warning-dim)', 
  delivered: 'var(--brand-dim)', 
  blocked: 'var(--danger-dim)' 
};

export default function TrackShipment() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getAuthHeaders } = useAuth();
  const { isMobile } = useBreakpoint();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetchCustomerShipmentDetail(id, getAuthHeaders());
        setData(res);
      } catch (err) {
        setError(err.message || 'Failed to load shipment');
      } finally { setLoading(false); }
    })();
  }, [id, getAuthHeaders]);

  if (loading) {
    return (
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding: isMobile ? '80px 20px' : '120px 20px', color:'var(--text-muted)', gap:'16px' }}>
        <Loader size={32} style={{ animation:'spin 1s linear infinite' }} />
        <span style={{ fontSize:'13px', fontWeight:'700', letterSpacing: '0.5px' }}>INTERROGATING NETWORK...</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding:'40px 20px', textAlign:'center', backgroundColor: 'var(--bg-surface)', borderRadius: '12px', border: '1px solid var(--border)' }}>
        <AlertTriangle size={48} color="var(--danger)" style={{ marginBottom: '16px' }} />
        <div style={{ fontSize:'16px', fontWeight:'800', color:'var(--text-primary)', marginBottom:'8px' }}>Shipment Not Found</div>
        <button onClick={() => navigate('/customer')} style={{ padding:'10px 20px', backgroundColor:'var(--brand-dim)', border:'1px solid rgba(0,229,160,0.2)', borderRadius:'8px', color:'var(--brand)', cursor:'pointer', fontWeight:'800', fontSize: '12px' }}>← RETURN TO OVERVIEW</button>
      </div>
    );
  }

  const shipment = data.shipment;
  const nodeDetails = data.node_details || {};
  const routeAlerts = data.route_alerts || [];
  const planned = shipment.planned_route || [];
  const taken = shipment.route_taken || [];
  const progress = planned.length > 0 ? Math.round((taken.length / planned.length) * 100) : 0;

  const getNodeStatus = (nodeId) => {
    const takenIdx = taken.indexOf(nodeId);
    if (takenIdx >= 0 && takenIdx < taken.length - 1) return 'visited';
    if (nodeId === taken[taken.length - 1]) return 'current';
    return 'upcoming';
  };

  const nodeStatusIcon = (st) => {
    if (st === 'visited') return <CheckCircle size={isMobile ? 16 : 18} color="var(--brand)" />;
    if (st === 'current') return <Circle size={isMobile ? 16 : 18} color="var(--info)" fill="var(--info)" />;
    return <Circle size={isMobile ? 16 : 18} color="var(--text-muted)" />;
  };

  const styles = {
    header: {
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      justifyContent: 'space-between',
      alignItems: isMobile ? 'flex-start' : 'center',
      marginBottom: isMobile ? '24px' : '32px',
      gap: isMobile ? '16px' : '20px',
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(400px, 1fr))',
      gap: isMobile ? '20px' : '32px',
    },
    card: {
      backgroundColor: 'var(--bg-surface)',
      border: '1px solid var(--border)',
      borderRadius: '16px',
      padding: isMobile ? '20px' : '32px',
      height: 'fit-content',
    },
    cardHeader: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      fontSize: '12px',
      fontWeight: '900',
      letterSpacing: '1px',
      marginBottom: '20px',
      color: 'var(--text-secondary)',
      textTransform: 'uppercase'
    },
    infoRow: {
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr',
      gap: isMobile ? '16px' : '24px',
    },
    label: {
      fontSize: '10px',
      color: 'var(--text-muted)',
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      marginBottom: '4px',
    },
    value: {
      fontSize: isMobile ? '13px' : '15px',
      fontWeight: '700',
      color: 'var(--text-primary)',
    }
  };

  return (
    <div>
      <div style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '12px' : '20px' }}>
          <button 
            onClick={() => navigate('/customer')} 
            style={{ 
              width: isMobile ? '36px' : '40px', 
              height: isMobile ? '36px' : '40px', 
              borderRadius: '8px', 
              backgroundColor: 'var(--bg-surface)', 
              border: '1px solid var(--border)', 
              color: 'var(--text-primary)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              cursor: 'pointer' 
            }}
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Fleet Tracking</div>
            <div style={{ fontSize: isMobile ? '20px' : '24px', fontWeight: '900', fontFamily: "'Space Grotesk', sans-serif" }}>{shipment.id}</div>
          </div>
        </div>

        <div style={{ 
          padding: '6px 16px', 
          borderRadius: '8px', 
          fontSize: '10px', 
          fontWeight: '900', 
          textTransform: 'uppercase', 
          letterSpacing: '1px',
          backgroundColor: STATUS_BG[shipment.status] || 'var(--bg-elevated)', 
          color: STATUS_COLORS[shipment.status] || 'var(--text-secondary)',
          border: `1px solid ${STATUS_COLORS[shipment.status]}22`
        }}>
          {shipment.status?.replace('_', ' ')}
        </div>
      </div>

      <div style={styles.grid}>
        {/* Left Column: Details & Progress */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '20px' : '32px' }}>
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <Info size={16} />
              <span>Manifest Details</span>
            </div>
            <div style={styles.infoRow}>
              <div>
                <div style={styles.label}>Cargo Type</div>
                <div style={styles.value}>{shipment.cargo_type}</div>
              </div>
              <div>
                <div style={styles.label}>Weight</div>
                <div style={styles.value}>{shipment.weight_kg} KG</div>
              </div>
              <div style={{ gridColumn: isMobile ? 'span 2' : 'span 1' }}>
                <div style={styles.label}>Origin</div>
                <div style={styles.value}>{shipment.origin}</div>
              </div>
              <div style={{ gridColumn: isMobile ? 'span 2' : 'span 1' }}>
                <div style={styles.label}>Destination</div>
                <div style={styles.value}>{shipment.destination}</div>
              </div>
              <div>
                <div style={styles.label}>Priority</div>
                <div style={{ ...styles.value, textTransform: 'capitalize' }}>{shipment.priority}</div>
              </div>
              <div>
                <div style={styles.label}>ETA</div>
                <div style={{ ...styles.value, color: 'var(--brand)' }}>
                   {shipment.estimated_arrival ? new Date(shipment.estimated_arrival).toLocaleDateString('en-US', { month:'short', day:'numeric' }) : 'TBD'}
                </div>
              </div>
            </div>
          </div>

          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <Truck size={16} />
              <span>Transit Health</span>
            </div>
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '8px' }}>
                <div style={{ fontSize: '28px', fontWeight: '900', color: 'var(--brand)' }}>{progress}<span style={{ fontSize: '14px', color: 'var(--text-muted)', marginLeft: '2px' }}>%</span></div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700' }}>
                  {taken.length}/{planned.length} NODES
                </div>
              </div>
              <div style={{ height: '8px', backgroundColor: 'var(--bg-elevated)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ 
                  height: '100%', 
                  width: `${progress}%`, 
                  background: 'linear-gradient(90deg, var(--brand), var(--info))', 
                  borderRadius: '4px', 
                  transition: 'width 0.8s ease' 
                }} />
              </div>
            </div>
            {data.total_transit_hrs && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', backgroundColor: 'var(--bg-elevated)', borderRadius: '10px' }}>
                <Clock size={18} color="var(--brand)" />
                <div style={{ fontSize: '12px', fontWeight: '700' }}>{Math.round(data.total_transit_hrs)}h Active Transit</div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Timeline & Alerts */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '20px' : '32px' }}>
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <Calendar size={16} />
              <span>Network Path</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {planned.map((nodeId, idx) => {
                const st = getNodeStatus(nodeId);
                const node = nodeDetails[nodeId] || {};
                const isLast = idx === planned.length - 1;
                return (
                  <div key={nodeId} style={{ display:'flex', gap:'16px', position:'relative' }}>
                    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', minWidth:'20px' }}>
                      <div style={{ zIndex: 1, backgroundColor: 'var(--bg-surface)' }}>{nodeStatusIcon(st)}</div>
                      {!isLast && <div style={{ width:'2px', flex:1, minHeight:'24px', backgroundColor: st === 'visited' ? 'var(--brand)' : 'var(--border)' }} />}
                    </div>
                    <div style={{ paddingBottom: isLast ? '0' : '20px', flex:1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ fontSize: isMobile ? '13px' : '14px', fontWeight:'750', color: st === 'current' ? 'var(--info)' : 'var(--text-primary)' }}>
                            {node.name || nodeId}
                          </div>
                          <div style={{ fontSize:'10px', color:'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>
                            {node.type || 'STATION'}
                          </div>
                        </div>
                        <div style={{ fontSize:'8px', fontWeight:'900', textTransform:'uppercase', color: st === 'visited' ? 'var(--brand)' : st === 'current' ? 'var(--info)' : 'var(--text-muted)', padding: '2px 6px', border: '1px solid currentColor', borderRadius: '3px' }}>
                          {st}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {routeAlerts.length > 0 && (
            <div style={{ ...styles.card, backgroundColor: 'rgba(239, 68, 68, 0.05)', borderColor: 'rgba(239, 68, 68, 0.2)' }}>
              <div style={{ ...styles.cardHeader, color: 'var(--danger)', marginBottom: '12px' }}>
                <AlertTriangle size={16} />
                <span>Risk Advisories</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {routeAlerts.map((a, i) => (
                  <div key={i} style={{ padding:'12px', backgroundColor:'rgba(0,0,0,0.15)', borderRadius:'10px', border: '1px solid rgba(239, 68, 68, 0.1)' }}>
                    <div style={{ fontWeight:'850', fontSize: '12px', marginBottom:'4px', color: 'var(--text-primary)' }}>{a.node_name || a.node_id}</div>
                    <div style={{ fontSize: '11px', color:'var(--text-secondary)', lineHeight: '1.4' }}>
                       Anomaly detected: <span style={{ fontWeight:'900', color:'var(--danger)' }}>+{a.estimated_delay_hrs}h</span> projection.
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
