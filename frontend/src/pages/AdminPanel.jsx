import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { fetchDecisionLogs, fetchShipments, manualReroute } from '../services/api';
import { Shield, Activity, Terminal, MessageSquare, Save, History, AlertCircle, TrendingUp } from 'lucide-react';

export default function AdminPanel() {
  const { getAuthHeaders } = useAuth();
  const { isMobile, isTablet } = useBreakpoint();
  const [logs, setLogs] = useState([]);
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedShipment, setSelectedShipment] = useState('');
  const [newRoute, setNewRoute] = useState('');
  const [reason, setReason] = useState('');
  const [statusMsg, setStatusMsg] = useState({ text: '', type: '' });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [logsData, shipmentsData] = await Promise.all([
        fetchDecisionLogs(getAuthHeaders()),
        fetchShipments(getAuthHeaders())
      ]);
      setLogs(logsData.logs || []);
      setShipments(shipmentsData.shipments || []);
    } catch (err) {
      console.error("Failed to load admin data", err);
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
      const routeArray = newRoute.split(',').map(s => s.trim());
      await manualReroute({
        shipment_id: selectedShipment,
        new_route: routeArray,
        reason: reason
      }, getAuthHeaders());
      setStatusMsg({ text: 'Reroute applied successfully', type: 'success' });
      setNewRoute('');
      setReason('');
      loadData();
    } catch (err) {
      setStatusMsg({ text: 'Failed to apply reroute', type: 'error' });
    }
  };

  const styles = {
    title: { fontSize: isMobile ? '1.5rem' : '2rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '0.75rem', letterSpacing: '-0.02em', color: 'var(--text-main)' },
    btnNoGlow: {
      background: '#ef476f',
      color: '#fff',
      border: 'none',
      borderRadius: '10px',
      padding: '0.75rem 1rem',
      fontSize: '0.8rem',
      fontWeight: 800,
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '0.5rem',
      minHeight: '44px',
      transition: 'background 0.2s'
    }
  };

  return (
    <div className="admin-container animate-fade-in" style={{ padding: isMobile ? '1rem' : '2rem', background: 'var(--bg-main)', minHeight: '100vh', color: 'var(--text-main)' }}>
      <header style={{ 
        marginBottom: isMobile ? '1.5rem' : '3rem', 
        borderBottom: '1px solid var(--glass-border)', 
        paddingBottom: '1.5rem', 
        display: 'flex', 
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: 'space-between', 
        alignItems: isMobile ? 'flex-start' : 'center',
        gap: '1rem'
      }}>
        <div>
          <h1 style={styles.title}>
            <Shield style={{ color: '#ef476f' }} size={isMobile ? 24 : 32} />
            MISSION CONTROL
          </h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem', fontWeight: 600, fontSize: '0.75rem' }}>Manual override and audit trail</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', width: isMobile ? '100%' : 'auto' }}>
          <div className="glass-panel" style={{ padding: '0.5rem 1rem', textAlign: 'center', borderBottom: '2px solid #ef476f', flex: 1 }}>
             <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 800 }}>AUTHORITY</div>
             <div style={{ color: '#ef476f', fontWeight: 700, fontSize: '0.85rem' }}>ACTIVE</div>
          </div>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: (isMobile || isTablet) ? '1fr' : '1fr 1.5fr', gap: isMobile ? '1rem' : '2rem' }}>
        {/* Left Column: Manual Intervention */}
        <section className="glass-panel" style={{ padding: isMobile ? '1.25rem' : '2rem', height: 'fit-content' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Terminal size={18} style={{ color: '#ef476f' }} />
            MANUAL OVERRIDE
          </h2>
          
          <form onSubmit={handleReroute} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)' }}>SELECT SHIPMENT</label>
              <select 
                value={selectedShipment}
                onChange={(e) => setSelectedShipment(e.target.value)}
                style={{ width: '100%', padding: '0.75rem', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-main)', fontSize: '0.8rem', outline: 'none' }}
              >
                <option value="">Choose a shipment...</option>
                {shipments.map(s => (
                  <option key={s.id} value={s.id}>{s.id} ({s.origin} → {s.destination})</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)' }}>NEW ROUTE PATH</label>
              <input 
                type="text"
                placeholder="e.g. N01, N04, N07"
                value={newRoute}
                onChange={(e) => setNewRoute(e.target.value)}
                style={{ width: '100%', padding: '0.75rem', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-main)', fontSize: '0.8rem', outline: 'none' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)' }}>REASONING</label>
              <textarea 
                rows="3"
                placeholder="Enter reasoning..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                style={{ width: '100%', padding: '0.75rem', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-main)', fontSize: '0.8rem', resize: 'none', outline: 'none' }}
              />
            </div>

            <button type="submit" style={styles.btnNoGlow}>
              <Save size={16} /> APPLY OVERRIDE
            </button>

            {statusMsg.text && (
              <div style={{ 
                padding: '0.75rem', 
                borderRadius: '8px', 
                background: statusMsg.type === 'error' ? 'rgba(255, 63, 108, 0.1)' : 'rgba(6, 214, 160, 0.1)',
                color: statusMsg.type === 'error' ? 'var(--status-critical)' : 'var(--status-live)',
                fontSize: '0.75rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <AlertCircle size={14} /> {statusMsg.text}
              </div>
            )}
          </form>
        </section>

        {/* Right Column: Audit Logs */}
        <section className="glass-panel" style={{ padding: isMobile ? '1.25rem' : '2rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <History size={18} style={{ color: '#ef476f' }} />
            AUDIT TRAIL
          </h2>

          <div style={{ maxHeight: isMobile ? '400px' : '600px', overflowY: 'auto' }}>
            {logs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                <Activity size={32} style={{ opacity: 0.1, marginBottom: '1rem' }} />
                <p style={{ fontSize: '0.8rem' }}>No logs found.</p>
              </div>
            ) : (
              logs.map((log) => (
                <div key={log.id} style={{ 
                  background: 'rgba(255,255,255,0.02)', 
                  padding: '1rem', 
                  borderRadius: '12px', 
                  border: '1px solid var(--glass-border)', 
                  marginBottom: '0.75rem',
                  borderLeft: `3px solid ${log.action_type?.includes('MANUAL') ? '#ef476f' : 'var(--accent-secondary)'}`
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', flexDirection: isMobile ? 'column' : 'row', gap: '4px' }}>
                    <div style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '0.75rem' }}>{log.action_type}</div>
                    <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>{new Date(log.timestamp).toLocaleString()}</div>
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                    UNIT: <span style={{ color: '#ef476f', fontWeight: 700 }}>{log.shipment_id}</span>
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.5rem', borderRadius: '6px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {log.reasoning}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {/* Stats Footer */}
      <footer style={{ 
        marginTop: isMobile ? '1.5rem' : '3rem', 
        display: 'grid', 
        gridTemplateColumns: isMobile ? '1fr' : (isTablet ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)'), 
        gap: '1rem' 
      }}>
         {[
           { label: 'Units', value: shipments.length, icon: <TrendingUp size={18} /> },
           { label: 'Admin', value: logs.filter(l => l.performed_by !== 'AGENT').length, icon: <Shield size={18} /> },
           { label: 'Agent', value: logs.filter(l => l.performed_by === 'AGENT').length, icon: <Activity size={18} /> },
           { label: 'Pending', value: '0', icon: <MessageSquare size={18} /> }
         ].map((stat, i) => (
           <div key={i} className="glass-panel" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ color: '#ef476f', opacity: 0.8 }}>{stat.icon}</div>
              <div>
                <div style={{ fontSize: '0.6rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{stat.label}</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 900 }}>{stat.value}</div>
              </div>
           </div>
         ))}
      </footer>
    </div>
  );
}
