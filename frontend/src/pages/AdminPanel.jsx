import React, { useState, useEffect } from 'react';
import { fetchDecisionLogs, fetchShipments, manualReroute } from '../services/api';
import { Shield, Activity, Settings, MessageSquare, Save, History, AlertCircle, TrendingUp } from 'lucide-react';

export default function AdminPanel() {
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
        fetchDecisionLogs(),
        fetchShipments()
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
      });
      setStatusMsg({ text: 'Reroute applied successfully', type: 'success' });
      setNewRoute('');
      setReason('');
      loadData();
    } catch (err) {
      setStatusMsg({ text: 'Failed to apply reroute', type: 'error' });
    }
  };

  const styles = {
    title: { fontSize: '2rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '0.75rem', letterSpacing: '-0.02em', color: 'var(--text-main)' },
    btnNoGlow: {
      background: '#ef476f',
      color: '#fff',
      border: 'none',
      borderRadius: '10px',
      padding: '1rem',
      fontSize: '0.85rem',
      fontWeight: 800,
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '0.5rem',
      boxShadow: 'none',
      transition: 'background 0.2s'
    }
  };

  return (
    <div className="admin-container animate-fade-in" style={{ padding: '2.5rem 3rem', maxWidth: '1400px', margin: '0 auto', width: '100%', minHeight: '100vh', color: 'var(--text-main)' }}>
      <header style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        background: 'var(--bg-elevated)', 
        padding: '1.25rem 2rem', 
        borderLeft: '4px solid #ef476f',
        borderRadius: '0 8px 8px 0',
        marginBottom: '2.5rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '0.05em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Shield style={{ color: '#ef476f' }} size={24} />
              MISSION CONTROL
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.25rem', fontWeight: 600 }}>High-level override and institutional audit trail</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <div className="glass-panel" style={{ padding: '0.75rem 1.25rem', textAlign: 'center', borderBottom: '2px solid #ef476f' }}>
             <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase' }}>Command Authority</div>
             <div style={{ color: '#ef476f', fontWeight: 700, fontSize: '1rem' }}>ACTIVE</div>
          </div>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '2rem' }}>
        {/* Left Column: Manual Intervention */}
        <section className="glass-panel" style={{ padding: '2rem', height: 'fit-content' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Settings size={20} style={{ color: '#ef476f' }} />
            MANUAL OVERRIDE
          </h2>
          
          <form onSubmit={handleReroute} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)' }}>SELECT SHIPMENT</label>
              <select 
                value={selectedShipment}
                onChange={(e) => setSelectedShipment(e.target.value)}
                style={{ width: '100%', padding: '0.75rem', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-main)', fontSize: '0.9rem', outline: 'none' }}
              >
                <option value="">Choose a shipment...</option>
                {shipments.map(s => (
                  <option key={s.id} value={s.id}>{s.id} ({s.origin} → {s.destination})</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)' }}>NEW ROUTE PATH (COMMA SEPARATED NODES)</label>
              <input 
                type="text"
                placeholder="e.g. N01, N04, N07"
                value={newRoute}
                onChange={(e) => setNewRoute(e.target.value)}
                style={{ width: '100%', padding: '0.75rem', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-main)', fontSize: '0.9rem', outline: 'none' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)' }}>JUSTIFICATION / REASON</label>
              <textarea 
                rows="3"
                placeholder="Enter reasoning for manual override..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                style={{ width: '100%', padding: '0.75rem', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-main)', fontSize: '0.9rem', resize: 'none', outline: 'none' }}
              />
            </div>

            <button 
              type="submit"
              style={styles.btnNoGlow}
              onMouseOver={e => e.currentTarget.style.background = '#d93d5f'}
              onMouseOut={e => e.currentTarget.style.background = '#ef476f'}
            >
              <Save size={18} />
              APPLY OVERRIDE
            </button>

            {statusMsg.text && (
              <div style={{ 
                padding: '1rem', 
                borderRadius: '8px', 
                background: statusMsg.type === 'error' ? 'rgba(255, 63, 108, 0.1)' : 'rgba(6, 214, 160, 0.1)',
                color: statusMsg.type === 'error' ? 'var(--status-critical)' : 'var(--status-live)',
                fontSize: '0.85rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <AlertCircle size={16} />
                {statusMsg.text}
              </div>
            )}
          </form>
        </section>

        {/* Right Column: Audit Logs */}
        <section className="glass-panel" style={{ padding: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <History size={20} style={{ color: '#ef476f' }} />
            DECISION AUDIT TRAIL
          </h2>

          <div style={{ maxHeight: '600px', overflowY: 'auto', paddingRight: '0.5rem' }}>
            {logs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
                <Activity size={48} style={{ opacity: 0.1, marginBottom: '1rem' }} />
                <p>No decision logs found in the database.</p>
              </div>
            ) : (
              logs.map((log, i) => (
                <div key={log.id} style={{ 
                  background: 'rgba(255,255,255,0.02)', 
                  padding: '1.25rem', 
                  borderRadius: '12px', 
                  border: '1px solid var(--glass-border)', 
                  marginBottom: '1rem',
                  borderLeft: `4px solid ${log.action_type?.includes('MANUAL') ? '#ef476f' : 'var(--accent-secondary)'}`
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <div style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '0.9rem' }}>{log.action_type}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>{new Date(log.timestamp).toLocaleString()}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 800 }}>SHIPMENT:</span>
                    <span style={{ fontSize: '0.8rem', color: '#ef476f', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{log.shipment_id}</span>
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '6px', fontSize: '0.85rem', color: 'var(--text-muted)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <MessageSquare size={14} style={{ display: 'inline', marginRight: '0.5rem', verticalAlign: 'middle', opacity: 0.5 }} />
                    {log.reasoning}
                  </div>
                  <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'flex-end' }}>
                    <span style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', padding: '0.2rem 0.6rem', borderRadius: '4px' }}>BY: {log.performed_by?.toUpperCase()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {/* Stats Footer */}
      <footer style={{ marginTop: '3rem', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem' }}>
         {[
           { label: 'DB Shipments', value: shipments.length, icon: <TrendingUp size={20} /> },
           { label: 'Admin Actions', value: logs.filter(l => l.performed_by !== 'AGENT').length, icon: <Shield size={20} /> },
           { label: 'Agent Interventions', value: logs.filter(l => l.performed_by === 'AGENT').length, icon: <Activity size={20} /> },
           { label: 'Pending Audits', value: '0', icon: <MessageSquare size={20} /> }
         ].map((stat, i) => (
           <div key={i} className="glass-panel" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ color: '#ef476f', opacity: 0.8 }}>{stat.icon}</div>
              <div>
                <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{stat.label}</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 900 }}>{stat.value}</div>
              </div>
           </div>
         ))}
      </footer>
    </div>
  );
}
