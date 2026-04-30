import React, { useState, useEffect } from 'react';
import { useNetwork } from '../../context/NetworkContext';
import { useAuth } from '../../context/AuthContext';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import { fetchShipments, fetchDecisionLogs, manualReroute } from '../../services/api';
import { Package, Activity, AlertTriangle, CheckCircle, Search, Terminal, Save, History, MessageSquare, Shield, ArrowRight, Loader, ChevronRight } from 'lucide-react';

export default function OwnerDashboard() {
  const { networkHealth, alerts } = useNetwork();
  const { getAuthHeaders, user: currentUser } = useAuth();
  const { isMobile } = useBreakpoint();
  
  const [shipments, setShipments] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Manual Reroute State
  const [selectedShipment, setSelectedShipment] = useState('');
  const [newRoute, setNewRoute] = useState('');
  const [reason, setReason] = useState('');
  const [statusMsg, setStatusMsg] = useState({ text: '', type: '' });
  
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [shipData, logsData] = await Promise.all([
        fetchShipments(getAuthHeaders()),
        fetchDecisionLogs(getAuthHeaders())
      ]);
      setShipments(shipData.shipments || []);
      setLogs(logsData.logs || []);
    } catch (err) {
      console.error("Failed to load owner dashboard data", err);
    } finally {
      setLoading(false);
    }
  };

  const handleReroute = async (e) => {
    e.preventDefault();
    if (!selectedShipment || !newRoute || !reason) {
      setStatusMsg({ text: 'Please fill all fields', type: 'error' });
      return;
    }

    try {
      const routeArray = newRoute.split(',').map(s => s.trim()).filter(Boolean);
      await manualReroute({
        shipment_id: selectedShipment,
        new_route: routeArray,
        reason: reason
      }, getAuthHeaders());
      
      setStatusMsg({ text: 'Reroute applied successfully', type: 'success' });
      setNewRoute('');
      setReason('');
      setSelectedShipment('');
      loadData();
      setTimeout(() => setStatusMsg({ text: '', type: '' }), 5000);
    } catch (err) {
      setStatusMsg({ text: 'Failed to apply reroute', type: 'error' });
    }
  };

  const stats = [
    { label: 'Health', value: `${networkHealth}%`, icon: <Activity size={18} />, color: networkHealth > 80 ? 'var(--status-live)' : 'var(--status-warning)' },
    { label: 'Alerts', value: alerts.length, icon: <AlertTriangle size={18} />, color: alerts.length > 0 ? 'var(--status-critical)' : 'var(--text-muted)' },
    { label: 'Units', value: shipments.length, icon: <Package size={18} />, color: 'var(--accent-primary)' },
    { label: 'Audits', value: logs.length, icon: <History size={18} />, color: 'var(--accent-secondary)' },
  ];

  const styles = {
    container: { 
      padding: isMobile ? '16px' : '24px', 
      display: 'flex', 
      flexDirection: 'column', 
      gap: isMobile ? '16px' : '24px', 
      backgroundColor: 'var(--bg-canvas)', 
      color: 'var(--text-primary)', 
      fontFamily: "'Inter', sans-serif" 
    },
    header: { 
      display: 'flex', 
      flexDirection: isMobile ? 'column' : 'row',
      justifyContent: 'space-between', 
      alignItems: isMobile ? 'stretch' : 'center',
      gap: isMobile ? '16px' : '0'
    },
    title: { fontSize: isMobile ? '20px' : '24px', fontWeight: '900', letterSpacing: '-0.5px' },
    grid: { 
      display: 'grid', 
      gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(auto-fit, minmax(240px, 1fr))', 
      gap: isMobile ? '12px' : '20px' 
    },
    statCard: { 
      backgroundColor: 'var(--bg-surface)', 
      border: '1px solid var(--border)', 
      borderRadius: '14px', 
      padding: isMobile ? '16px' : '20px', 
      display: 'flex', 
      alignItems: 'center', 
      gap: isMobile ? '12px' : '20px', 
      boxShadow: '0 4px 20px rgba(0,0,0,0.1)' 
    },
    mainContent: { 
      display: 'grid', 
      gridTemplateColumns: isMobile ? '1fr' : '2fr 1.2fr', 
      gap: isMobile ? '16px' : '24px' 
    },
    panel: { 
      backgroundColor: 'var(--bg-surface)', 
      border: '1px solid var(--border)', 
      borderRadius: '16px', 
      padding: isMobile ? '20px' : '24px', 
      display: 'flex', 
      flexDirection: 'column', 
      gap: isMobile ? '16px' : '20px' 
    },
    shipmentCard: {
      padding: '12px',
      borderRadius: '10px',
      backgroundColor: 'var(--bg-elevated)',
      border: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px'
    },
    input: { width: '100%', padding: '12px', backgroundColor: 'var(--bg-canvas)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' },
    label: { fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px', display: 'block' },
    btn: { padding: '12px', background: 'var(--status-critical)', color: '#000', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' },
    logItem: { padding: '14px', backgroundColor: 'var(--bg-canvas)', borderRadius: '10px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '8px' }
  };

  const getStatusStyle = (type) => ({
    padding: '3px 8px', borderRadius: '4px', fontSize: '9px', fontWeight: '900', textTransform: 'uppercase', 
    backgroundColor: type === 'delayed' ? 'var(--status-warning-dim)' : type === 'completed' ? 'var(--brand-dim)' : 'var(--info-dim)',
    color: type === 'delayed' ? 'var(--status-warning)' : type === 'completed' ? 'var(--brand)' : 'var(--info)'
  });

  if (loading) {
     return (
       <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'100px 20px', color:'var(--text-muted)', gap:'16px' }}>
         <Loader size={32} style={{ animation:'spin 1s linear infinite' }} />
         <div style={{ fontSize: '12px', fontWeight: '800' }}>SYNCING COMMAND DATA...</div>
         <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
       </div>
     );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>COMMAND CENTER</h1>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600' }}>Control interface for <span style={{ color: 'var(--brand)' }}>{currentUser?.company_id || 'Global'}</span></p>
        </div>
        <div style={{ position: 'relative', width: isMobile ? '100%' : '300px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input style={styles.input} placeholder="Search network assets..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        </div>
      </div>

      <div style={styles.grid}>
        {stats.map((stat, i) => (
          <div key={i} style={styles.statCard}>
            <div style={{ color: stat.color, backgroundColor: `${stat.color}15`, padding: '10px', borderRadius: '8px' }}>{stat.icon}</div>
            <div>
              <div style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase' }}>{stat.label}</div>
              <div style={{ fontSize: isMobile ? '18px' : '22px', fontWeight: '900' }}>{stat.value}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={styles.mainContent}>
        {/* Shipments & Operations */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '16px' : '24px' }}>
          <div style={styles.panel}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '14px', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Package size={18} color="var(--info)" /> OPERATIONS
              </h2>
              <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: '800' }}>LIVE HUB</span>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {shipments.slice(0, 5).map(shp => (
                <div key={shp.id} style={styles.shipmentCard}>
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '12px', fontWeight: '900', fontFamily: 'monospace' }}>{shp.id}</span>
                      <span style={getStatusStyle(shp.status)}>{shp.status}</span>
                   </div>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', fontWeight: '700' }}>
                      <span style={{ color: 'var(--brand)' }}>{shp.origin}</span>
                      <ArrowRight size={12} color="var(--text-muted)" />
                      <span style={{ color: 'var(--status-critical)' }}>{shp.destination}</span>
                   </div>
                   <div style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                      <span>{shp.cargo_type}</span>
                      <span style={{ color: shp.priority === 'critical' ? 'var(--status-critical)' : 'inherit' }}>{shp.priority?.toUpperCase()}</span>
                   </div>
                </div>
              ))}
            </div>
          </div>

          <div style={styles.panel}>
            <h2 style={{ fontSize: '14px', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Terminal size={18} color="var(--status-critical)" /> INTERVENTION
            </h2>
            <form onSubmit={handleReroute} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={styles.label}>Manifest ID</label>
                  <select style={styles.input} value={selectedShipment} onChange={e => setSelectedShipment(e.target.value)}>
                    <option value="">Select...</option>
                    {shipments.filter(s => s.status !== 'completed').map(s => (
                      <option key={s.id} value={s.id}>{s.id}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={styles.label}>Intervention Path</label>
                  <input style={styles.input} placeholder="N01, N04..." value={newRoute} onChange={e => setNewRoute(e.target.value)} />
                </div>
              </div>
              <div>
                <label style={styles.label}>Strategic Rationale</label>
                <input style={styles.input} placeholder="Enter reason for bypass..." value={reason} onChange={e => setReason(e.target.value)} />
              </div>
              <button type="submit" style={styles.btn}><Save size={16} /> COMMIT OVERRIDE</button>
            </form>
            {statusMsg.text && (
              <div style={{ fontSize: '11px', color: statusMsg.type === 'error' ? 'var(--status-critical)' : 'var(--brand)', backgroundColor: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '8px', textAlign: 'center', fontWeight: '800' }}>
                {statusMsg.text.toUpperCase()}
              </div>
            )}
          </div>
        </div>

        {/* Audit Trail */}
        <div style={styles.panel}>
          <h2 style={{ fontSize: '14px', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <History size={18} color="var(--accent-secondary)" /> AUDIT LOG
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: isMobile ? '400px' : '600px', overflowY: 'auto' }}>
            {logs.map((log, i) => (
              <div key={i} style={styles.logItem}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '9px', fontWeight: '900', color: log.action_type?.includes('MANUAL') ? 'var(--status-critical)' : 'var(--info)' }}>{log.action_type}</span>
                  <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>{new Date(log.timestamp).toLocaleTimeString()}</span>
                </div>
                <div style={{ fontSize: '13px', fontWeight: '850', fontFamily: 'monospace' }}>{log.shipment_id}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', backgroundColor: 'rgba(0,0,0,0.1)', padding: '10px', borderRadius: '8px', lineHeight: '1.4' }}>
                  {log.reasoning}
                </div>
                <div style={{ fontSize: '9px', color: 'var(--text-muted)', alignSelf: 'flex-end', fontWeight: '700' }}>BY: {log.performed_by}</div>
              </div>
            ))}
            {logs.length === 0 && (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>No audit trail detected.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
