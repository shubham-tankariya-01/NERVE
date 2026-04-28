import React, { useState, useEffect } from 'react';
import { useNetwork } from '../../context/NetworkContext';
import { useAuth } from '../../context/AuthContext';
import { fetchShipments, fetchDecisionLogs, manualReroute } from '../../services/api';
import { Package, Activity, AlertTriangle, CheckCircle, Search, Settings, Save, History, MessageSquare, Shield, ArrowRight } from 'lucide-react';

export default function OwnerDashboard() {
  const { networkHealth, alerts } = useNetwork();
  const { getAuthHeaders, user: currentUser } = useAuth();
  
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
    { label: 'Network Health', value: `${networkHealth}%`, icon: <Activity size={18} />, color: networkHealth > 80 ? '#00E5A0' : '#FFD166' },
    { label: 'Active Alerts', value: alerts.length, icon: <AlertTriangle size={18} />, color: alerts.length > 0 ? '#EF476F' : '#94A3B8' },
    { label: 'Shipments', value: shipments.length, icon: <Package size={18} />, color: '#00B4D8' },
    { label: 'Audit Events', value: logs.length, icon: <History size={18} />, color: '#BB86FC' },
  ];

  const s = {
    container: { padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px', backgroundColor: '#060b19', minHeight: '100vh', color: '#e2e8f0', fontFamily: "'Inter', sans-serif" },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    title: { fontSize: '24px', fontWeight: '800', letterSpacing: '-0.5px' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' },
    statCard: { backgroundColor: '#0a1128', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '20px', display: 'flex', alignItems: 'center', gap: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' },
    mainContent: { display: 'grid', gridTemplateColumns: '2fr 1.2fr', gap: '24px' },
    panel: { backgroundColor: '#0a1128', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' },
    table: { width: '100%', borderCollapse: 'collapse', fontSize: '13px' },
    th: { textAlign: 'left', padding: '12px', color: '#64748b', borderBottom: '1px solid rgba(255,255,255,0.06)', textTransform: 'uppercase', fontSize: '10px', fontWeight: '800', letterSpacing: '0.5px' },
    td: { padding: '12px', borderBottom: '1px solid rgba(255,255,255,0.04)' },
    status: (type) => ({ padding: '4px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', 
      backgroundColor: type === 'delayed' ? 'rgba(255, 209, 102, 0.1)' : type === 'completed' ? 'rgba(0, 229, 160, 0.1)' : 'rgba(0, 180, 216, 0.1)',
      color: type === 'delayed' ? '#FFD166' : type === 'completed' ? '#00E5A0' : '#00B4D8'
    }),
    input: { width: '100%', padding: '12px', backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#e2e8f0', fontSize: '13px', outline: 'none' },
    label: { fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px', display: 'block' },
    btn: { padding: '12px', background: 'linear-gradient(135deg, #EF476F, #FF8A00)', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' },
    logItem: { padding: '16px', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: '8px' }
  };

  const filteredShipments = shipments.filter(s => 
    s.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.cargo_type || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={s.container}>
      <div style={s.header}>
        <div>
          <h1 style={s.title}>COMMAND CENTER</h1>
          <p style={{ fontSize: '14px', color: '#64748b', marginTop: '4px' }}>Strategic oversight for <b style={{ color: '#00E5A0' }}>{currentUser?.company_id || 'Global'}</b></p>
        </div>
        <div style={{ position: 'relative', width: '300px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
          <input style={s.input} placeholder="Search network assets..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        </div>
      </div>

      <div style={s.grid}>
        {stats.map((stat, i) => (
          <div key={i} style={s.statCard}>
            <div style={{ color: stat.color, backgroundColor: `${stat.color}15`, padding: '12px', borderRadius: '10px' }}>{stat.icon}</div>
            <div>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>{stat.label}</div>
              <div style={{ fontSize: '22px', fontWeight: '900' }}>{stat.value}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={s.mainContent}>
        {/* Shipments & Operations */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={s.panel}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '16px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Package size={20} style={{ color: '#00B4D8' }} /> ACTIVE OPERATIONS
              </h2>
              <span style={{ fontSize: '11px', color: '#64748b', backgroundColor: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: '4px' }}>LIVE UPDATES</span>
            </div>
            
            <div style={{ overflowX: 'auto' }}>
              <table style={s.table}>
                <thead>
                  <tr>
                    <th style={s.th}>Shipment</th>
                    <th style={s.th}>Path</th>
                    <th style={s.th}>Status</th>
                    <th style={s.th}>Cargo</th>
                    <th style={s.th}>Priority</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredShipments.slice(0, 8).map(shp => (
                    <tr key={shp.id}>
                      <td style={s.td}>
                        <div style={{ fontWeight: '800', color: '#fff' }}>{shp.id}</div>
                        <div style={{ fontSize: '10px', color: '#64748b' }}>{new Date(shp.departure_time).toLocaleDateString()}</div>
                      </td>
                      <td style={s.td}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                          <span style={{ color: '#00E5A0', fontWeight: '600' }}>{shp.origin}</span>
                          <ArrowRight size={12} style={{ color: '#64748b' }} />
                          <span style={{ color: '#EF476F', fontWeight: '600' }}>{shp.destination}</span>
                        </div>
                      </td>
                      <td style={s.td}><span style={s.status(shp.status)}>{shp.status}</span></td>
                      <td style={s.td}>{shp.cargo_type}</td>
                      <td style={s.td}>
                         <div style={{ fontSize: '11px', fontWeight: '700', color: shp.priority === 'critical' ? '#EF476F' : '#e2e8f0' }}>{shp.priority?.toUpperCase()}</div>
                      </td>
                    </tr>
                  ))}
                  {filteredShipments.length === 0 && (
                    <tr>
                      <td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>No shipments found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div style={s.panel}>
            <h2 style={{ fontSize: '16px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Settings size={20} style={{ color: '#EF476F' }} /> MANUAL INTERVENTION
            </h2>
            <form onSubmit={handleReroute} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '16px', alignItems: 'flex-end' }}>
              <div>
                <label style={s.label}>Shipment</label>
                <select style={s.input} value={selectedShipment} onChange={e => setSelectedShipment(e.target.value)}>
                  <option value="">Select ID...</option>
                  {shipments.filter(s => s.status !== 'completed').map(s => (
                    <option key={s.id} value={s.id}>{s.id}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={s.label}>New Path (Comma Sep)</label>
                <input style={s.input} placeholder="e.g. N01, N04" value={newRoute} onChange={e => setNewRoute(e.target.value)} />
              </div>
              <div>
                <label style={s.label}>Reasoning</label>
                <input style={s.input} placeholder="Strategic bypass..." value={reason} onChange={e => setReason(e.target.value)} />
              </div>
              <button type="submit" style={s.btn}><Save size={18} /> APPLY</button>
            </form>
            {statusMsg.text && (
              <div style={{ fontSize: '13px', color: statusMsg.type === 'error' ? '#EF476F' : '#00E5A0', backgroundColor: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '6px', textAlign: 'center' }}>
                {statusMsg.text}
              </div>
            )}
          </div>
        </div>

        {/* Audit Trail */}
        <div style={s.panel}>
          <h2 style={{ fontSize: '16px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <History size={20} style={{ color: '#BB86FC' }} /> AUDIT TRAIL
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '600px', overflowY: 'auto', paddingRight: '8px' }}>
            {logs.map((log, i) => (
              <div key={i} style={s.logItem}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '11px', fontWeight: '900', color: log.action_type?.includes('MANUAL') ? '#EF476F' : '#00B4D8' }}>{log.action_type}</span>
                  <span style={{ fontSize: '10px', color: '#64748b' }}>{new Date(log.timestamp).toLocaleTimeString()}</span>
                </div>
                <div style={{ fontSize: '14px', fontWeight: '800' }}>{log.shipment_id}</div>
                <div style={{ fontSize: '12px', color: '#94a3b8', backgroundColor: 'rgba(0,0,0,0.2)', padding: '8px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.03)' }}>
                  <MessageSquare size={12} style={{ display: 'inline', marginRight: '6px' }} />
                  {log.reasoning}
                </div>
                <div style={{ fontSize: '10px', color: '#64748b', alignSelf: 'flex-end', textTransform: 'uppercase', fontWeight: '700' }}>Auth: {log.performed_by}</div>
              </div>
            ))}
            {logs.length === 0 && (
              <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>No audit records</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
