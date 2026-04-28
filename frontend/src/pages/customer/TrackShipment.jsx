import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { fetchCustomerShipmentDetail } from '../../services/api';
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
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'120px 20px', color:'var(--text-secondary)', gap:'16px' }}>
        <Loader size={32} style={{ animation:'spin 1s linear infinite' }} />
        <span style={{ fontSize:'14px', fontWeight:'600', letterSpacing: '0.5px' }}>INTERROGATING SHIPMENT NETWORK...</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding:'40px 20px', textAlign:'center', backgroundColor: 'var(--bg-surface)', borderRadius: '12px', border: '1px solid var(--border)' }}>
        <AlertTriangle size={48} color="var(--danger)" style={{ marginBottom: '16px' }} />
        <div style={{ fontSize:'18px', fontWeight:'800', color:'var(--text-primary)', marginBottom:'8px' }}>Shipment Not Found</div>
        <div style={{ fontSize:'14px', color:'var(--text-secondary)', marginBottom:'24px' }}>{error}</div>
        <button onClick={() => navigate('/customer')} style={{ padding:'12px 24px', backgroundColor:'var(--brand-dim)', border:'1px solid rgba(0,229,160,0.2)', borderRadius:'8px', color:'var(--brand)', cursor:'pointer', fontWeight:'700' }}>← Return to Fleet Overview</button>
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
    if (st === 'visited') return <CheckCircle size={18} color="var(--brand)" />;
    if (st === 'current') return <Circle size={18} color="var(--info)" fill="var(--info)" />;
    return <Circle size={18} color="var(--text-secondary)" />;
  };

  const styles = {
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '32px',
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
      gap: '32px',
    },
    card: {
      backgroundColor: 'var(--bg-surface)',
      border: '1px solid var(--border)',
      borderRadius: '16px',
      padding: '32px',
      height: 'fit-content',
    },
    cardHeader: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      fontSize: '14px',
      fontWeight: '800',
      letterSpacing: '1px',
      marginBottom: '24px',
      color: 'var(--text-secondary)',
    },
    infoRow: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '24px',
    },
    label: {
      fontSize: '11px',
      color: 'var(--text-secondary)',
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      marginBottom: '6px',
    },
    value: {
      fontSize: '15px',
      fontWeight: '700',
      color: 'var(--text-primary)',
    }
  };

  return (
    <div>
      <div style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <button 
            onClick={() => navigate('/customer')} 
            style={{ 
              width: '40px', 
              height: '40px', 
              borderRadius: '10px', 
              backgroundColor: 'var(--bg-surface)', 
              border: '1px solid var(--border)', 
              color: 'var(--text-primary)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              cursor: 'pointer' 
            }}
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase' }}>Fleet / Tracking</div>
            <div style={{ fontSize: '24px', fontWeight: '800', fontFamily: "'Space Grotesk', sans-serif" }}>{shipment.id}</div>
          </div>
        </div>

        <div style={{ 
          padding: '8px 20px', 
          borderRadius: '10px', 
          fontSize: '12px', 
          fontWeight: '800', 
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <Info size={18} />
              <span>SHIPMENT SPECIFICATIONS</span>
            </div>
            <div style={styles.infoRow}>
              <div>
                <div style={styles.label}>Manifest Type</div>
                <div style={styles.value}>{shipment.cargo_type}</div>
              </div>
              <div>
                <div style={styles.label}>Net Weight</div>
                <div style={styles.value}>{shipment.weight_kg} kg</div>
              </div>
              <div>
                <div style={styles.label}>Global Origin</div>
                <div style={styles.value}>{shipment.origin}</div>
              </div>
              <div>
                <div style={styles.label}>Final Destination</div>
                <div style={styles.value}>{shipment.destination}</div>
              </div>
              <div>
                <div style={styles.label}>Transport Priority</div>
                <div style={{ ...styles.value, textTransform: 'capitalize' }}>{shipment.priority}</div>
              </div>
              <div>
                <div style={styles.label}>Target Arrival (ETA)</div>
                <div style={{ ...styles.value, color: 'var(--brand)' }}>
                   {shipment.estimated_arrival ? new Date(shipment.estimated_arrival).toLocaleDateString('en-US', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' }) : 'Pending'}
                </div>
              </div>
            </div>
          </div>

          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <Truck size={18} />
              <span>TRANSIT PROGRESS</span>
            </div>
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '12px' }}>
                <div style={{ fontSize: '32px', fontWeight: '800', color: 'var(--brand)' }}>{progress}<span style={{ fontSize: '16px', color: 'var(--text-secondary)', marginLeft: '4px' }}>%</span></div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '600' }}>
                  {taken.length} OF {planned.length} NODES CLEARED
                </div>
              </div>
              <div style={{ height: '12px', backgroundColor: 'var(--bg-elevated)', borderRadius: '6px', overflow: 'hidden', padding: '2px' }}>
                <div style={{ 
                  height: '100%', 
                  width: `${progress}%`, 
                  background: 'linear-gradient(90deg, var(--brand), var(--info))', 
                  borderRadius: '4px', 
                  transition: 'width(0.8s) cubic-bezier(0.4, 0, 0.2, 1)' 
                }} />
              </div>
            </div>
            {data.total_transit_hrs && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', backgroundColor: 'var(--bg-elevated)', borderRadius: '10px' }}>
                <Clock size={20} color="var(--brand)" />
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase' }}>Time in Transit</div>
                  <div style={{ fontSize: '14px', fontWeight: '700' }}>{Math.round(data.total_transit_hrs)} Hours and Counting</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Timeline & Alerts */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <Calendar size={18} />
              <span>ROUTING LOGISTICS</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {planned.map((nodeId, idx) => {
                const st = getNodeStatus(nodeId);
                const node = nodeDetails[nodeId] || {};
                const isLast = idx === planned.length - 1;
                return (
                  <div key={nodeId} style={{ display:'flex', gap:'20px', position:'relative' }}>
                    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', minWidth:'24px' }}>
                      <div style={{ zIndex: 1, backgroundColor: 'var(--bg-surface)' }}>{nodeStatusIcon(st)}</div>
                      {!isLast && <div style={{ width:'2px', flex:1, minHeight:'32px', backgroundColor: st === 'visited' ? 'var(--brand)' : 'var(--border)' }} />}
                    </div>
                    <div style={{ paddingBottom: isLast ? '0' : '24px', flex:1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ fontSize:'15px', fontWeight:'700', color: st === 'current' ? 'var(--info)' : 'var(--text-primary)' }}>
                            {node.name || nodeId}
                          </div>
                          <div style={{ fontSize:'12px', color:'var(--text-secondary)', marginTop:'2px', fontWeight: '500' }}>
                            {node.type || 'In-Network Point'}
                          </div>
                        </div>
                        <div style={{ fontSize:'10px', fontWeight:'800', textTransform:'uppercase', color: st === 'visited' ? 'var(--brand)' : st === 'current' ? 'var(--info)' : 'var(--text-secondary)', padding: '4px 8px', border: '1px solid currentColor', borderRadius: '4px' }}>
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
            <div style={{ ...styles.card, backgroundColor: 'var(--danger-dim)', borderColor: 'rgba(239, 68, 68, 0.3)' }}>
              <div style={{ ...styles.cardHeader, color: 'var(--danger)' }}>
                <AlertTriangle size={18} />
                <span>CRITICAL ROUTE ADVISORIES</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {routeAlerts.map((a, i) => (
                  <div key={i} style={{ padding:'16px', backgroundColor:'rgba(0,0,0,0.2)', borderRadius:'12px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                    <div style={{ fontWeight:'800', fontSize: '14px', marginBottom:'8px', display: 'flex', justifyContent: 'space-between' }}>
                       <span>{a.node_name || a.node_id}</span>
                       <span style={{ color: 'var(--danger)', fontSize: '11px' }}>{a.severity.toUpperCase()}</span>
                    </div>
                    <div style={{ fontSize: '13px', color:'var(--text-secondary)', lineHeight: '1.5' }}>
                       Anomaly detected in node throughput. Impact: <span style={{ fontWeight:'700', color:'var(--danger)' }}>+{a.estimated_delay_hrs}h</span> projected delay.
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
