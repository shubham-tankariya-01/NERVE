import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAppWebSocket } from '../context/WebSocketContext';
import { useNetwork } from '../context/NetworkContext';
import { 
  fetchPendingReroutes, 
  fetchRerouteHistory, 
  approveReroute, 
  rejectReroute,
  createManualDisruption,
  fetchDecisionLogs
} from '../services/api';
import { 
  GitBranch, 
  Zap, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Info, 
  Search, 
  AlertTriangle, 
  ArrowRight, 
  History,
  MessageSquare,
  Filter,
  RefreshCw,
  PlusCircle,
  Truck,
  Box,
  Bot,
  X
} from 'lucide-react';

const ExpiryTimer = ({ expiresAt }) => {
  const [timeLeft, setTimeLeft] = useState('');
  const [urgency, setUrgency] = useState('normal');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const expiry = new Date(expiresAt);
      const diff = expiry - now;

      if (diff <= 0) {
        setTimeLeft('EXPIRED');
        setUrgency('expired');
        return;
      }

      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${mins}:${secs.toString().padStart(2, '0')}`);

      if (mins < 2) setUrgency('critical');
      else if (mins < 10) setUrgency('warning');
      else setUrgency('normal');
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  const color = {
    normal: 'var(--brand)',
    warning: 'var(--warning)',
    critical: 'var(--danger)',
    expired: 'var(--text-muted)'
  }[urgency];

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color, fontWeight: '800', fontSize: '12px' }}>
      <Clock size={14} /> {timeLeft}
    </div>
  );
};

export default function ReroutingCenter() {
  const { getAuthHeaders, user } = useAuth();
  const { data: wsData, pendingRerouteCount } = useAppWebSocket();
  const { shipments: allShipments } = useNetwork();

  // Left Panel State
  const [pending, setPending] = useState([]);
  const [history, setHistory] = useState([]);
  const [pendingLoading, setPendingLoading] = useState(true);
  const [manualLogs, setManualLogs] = useState([]);
  const [actionLoading, setActionLoading] = useState(null);
  const [selectedReroute, setSelectedReroute] = useState(null);
  const [refreshCountdown, setRefreshCountdown] = useState(15);
  const [historyExpanded, setHistoryExpanded] = useState(false);

  // Right Panel State
  const [shipmentSearch, setShipmentSearch] = useState('');
  const [showShipmentDropdown, setShowShipmentDropdown] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [disruptionType, setDisruptionType] = useState('');
  const [delayHours, setDelayHours] = useState(0);
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Load Suggestion Data
  const loadSuggestions = useCallback(async () => {
    try {
      const headers = getAuthHeaders();
      const [pendingRes, historyRes] = await Promise.all([
        fetchPendingReroutes(headers),
        fetchRerouteHistory('', 20, headers)
      ]);
      setPending(pendingRes);
      setHistory(historyRes);
    } catch (err) {
      console.error('Failed to load suggestions:', err);
    } finally {
      setPendingLoading(false);
    }
  }, [getAuthHeaders]);

  // Load Manual Logs
  const loadManualLogs = useCallback(async () => {
    try {
      const logs = await fetchDecisionLogs(getAuthHeaders());
      // Filter for MANUAL_DISRUPTION_REPORTED
      setManualLogs(logs.filter(l => l.action_type === 'MANUAL_DISRUPTION_REPORTED').slice(0, 10));
    } catch (err) {
      console.error('Failed to load logs:', err);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    loadSuggestions();
    loadManualLogs();
  }, [loadSuggestions, loadManualLogs]);

  // Refresh Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setRefreshCountdown(prev => {
        if (prev <= 1) {
          loadSuggestions();
          return 15;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [loadSuggestions]);

  // WS trigger
  useEffect(() => {
    if (wsData && wsData.type === 'reroute_approval_update') {
      loadSuggestions();
    }
  }, [wsData, loadSuggestions]);

  const handleAction = async (id, type, notes = '') => {
    setActionLoading(id);
    try {
      const headers = getAuthHeaders();
      if (type === 'approve') {
        await approveReroute(id, notes, headers);
        alert('Reroute approved and applied to shipment.');
      } else {
        await rejectReroute(id, notes || 'Rejected by user', headers);
        alert('Reroute suggestion rejected.');
      }
      await loadSuggestions();
      await loadManualLogs();
    } catch (err) {
      alert('Action failed: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleBulkAction = async (type) => {
    if (pending.length === 0) return;
    if (!window.confirm(`Are you sure you want to ${type} ALL ${pending.length} suggestions?`)) return;
    
    setActionLoading('bulk');
    try {
      const headers = getAuthHeaders();
      const promises = pending.map(item => 
        type === 'approve' 
          ? approveReroute(item.id, 'Bulk approval', headers)
          : rejectReroute(item.id, 'Bulk rejection', headers)
      );
      await Promise.all(promises);
      alert(`Successfully ${type}d all pending suggestions.`);
      await loadSuggestions();
      await loadManualLogs();
    } catch (err) {
      alert('Bulk action failed: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!selectedShipment || !disruptionType || reason.length < 20) return;
    
    setSubmitting(true);
    try {
      await createManualDisruption({
        shipment_id: selectedShipment.id,
        disruption_type: disruptionType,
        delay_hrs: delayHours,
        reason,
        notes
      }, getAuthHeaders());
      
      setSubmitSuccess(true);
      setTimeout(() => {
        setSubmitSuccess(false);
        setSelectedShipment(null);
        setDisruptionType('');
        setDelayHours(0);
        setReason('');
        setNotes('');
        setShipmentSearch('');
        loadManualLogs();
      }, 3000);
    } catch (err) {
      alert('Failed to report disruption: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredShipmentSuggestions = allShipments.filter(s => 
    s.id.toLowerCase().includes(shipmentSearch.toLowerCase()) ||
    s.cargo_type.toLowerCase().includes(shipmentSearch.toLowerCase())
  ).slice(0, 5);

  const disruptionTypes = [
    { id: 'port_congestion', label: 'Port Congestion', icon: '🌊', color: 'var(--info)' },
    { id: 'customs_hold', label: 'Customs Hold', icon: '🛃', color: 'var(--warning)' },
    { id: 'mechanical', label: 'Mechanical Failure', icon: '⚙️', color: 'var(--danger)' },
    { id: 'infrastructure', label: 'Infrastructure Issue', icon: '🚧', color: 'var(--danger)' },
    { id: 'safety', label: 'Safety Incident', icon: '🦺', color: 'var(--danger)' },
    { id: 'other', label: 'Other', icon: '📋', color: 'var(--text-muted)' }
  ];

  return (
    <div style={{ maxWidth: '1600px', margin: '0 auto', padding: '2rem' }}>
      <header style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 900, letterSpacing: '-1px', marginBottom: '4px' }}>REROUTING CENTER</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 500 }}>
          Manage AI-suggested reroutes and log manual service disruptions
        </p>
      </header>

      {/* Stats Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px', marginBottom: '3rem' }}>
        {[
          { label: 'Pending AI Reroutes', value: pending.length, color: 'var(--danger)', icon: <GitBranch size={18} /> },
          { label: 'Approved Today', value: history.filter(h => h.status === 'approved').length, color: 'var(--brand)', icon: <CheckCircle size={18} /> },
          { label: 'Rejected Today', value: history.filter(h => h.status === 'rejected').length, color: 'var(--danger)', icon: <XCircle size={18} /> },
          { label: 'Manual Reports', value: manualLogs.length, color: 'var(--warning)', icon: <AlertTriangle size={18} /> }
        ].map((stat, i) => (
          <div key={i} className="card" style={{ 
            padding: '24px', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '16px',
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid var(--border)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{ 
              position: 'absolute', 
              top: '-10px', 
              right: '-10px', 
              fontSize: '48px', 
              opacity: 0.05, 
              color: stat.color,
              pointerEvents: 'none'
            }}>
              {stat.icon}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ 
                width: '36px', height: '36px', borderRadius: '10px', 
                background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: stat.color,
                boxShadow: `0 0 15px ${stat.color}22`
              }}>
                {stat.icon}
              </div>
              <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{stat.label}</div>
            </div>
            <div style={{ fontSize: '32px', fontWeight: 950, color: 'var(--text-main)', letterSpacing: '-1px' }}>{stat.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
        {/* LEFT PANEL: AI Suggestions */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 800 }}>AI REROUTE SUGGESTIONS</h2>
              <div style={{ 
                width: '10px', height: '10px', borderRadius: '50%', 
                background: pending.length > 0 ? 'var(--danger)' : 'var(--text-muted)',
                boxShadow: pending.length > 0 ? '0 0 10px var(--danger)' : 'none',
                animation: pending.length > 0 ? 'pulse 2s infinite' : 'none'
              }} />
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <RefreshCw size={12} /> REFRESHING IN {refreshCountdown}S
            </div>
          </div>

          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '8px', 
            maxHeight: '620px', 
            overflowY: 'auto', 
            paddingRight: '8px',
            background: 'rgba(0,0,0,0.1)',
            padding: '12px',
            borderRadius: '16px',
            border: '1px solid var(--border)'
          }} className="custom-scrollbar">
            {pending.length > 0 && (
              <div style={{ display: 'flex', gap: '8px', marginBottom: '4px' }}>
                <button 
                  onClick={() => handleBulkAction('reject')}
                  disabled={actionLoading === 'bulk'}
                  style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid var(--danger)', color: 'var(--danger)', fontSize: '11px', fontWeight: 900, background: 'transparent', cursor: actionLoading ? 'default' : 'pointer', opacity: actionLoading ? 0.5 : 1 }}
                >
                  REJECT ALL
                </button>
                <button 
                  onClick={() => handleBulkAction('approve')}
                  disabled={actionLoading === 'bulk'}
                  style={{ flex: 1, padding: '10px', borderRadius: '8px', background: 'var(--brand)', color: '#000', fontSize: '11px', fontWeight: 900, border: 'none', cursor: actionLoading ? 'default' : 'pointer', opacity: actionLoading ? 0.5 : 1 }}
                >
                  {actionLoading === 'bulk' ? '...' : 'APPROVE ALL'}
                </button>
              </div>
            )}
            {pendingLoading ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Analyzing queue...</div>
            ) : pending.length === 0 ? (
              <div className="card" style={{ padding: '60px 40px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                <CheckCircle size={48} style={{ color: 'var(--brand)', opacity: 0.5 }} />
                <div style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>All clear! No pending AI suggestions.</div>
              </div>
            ) : (
              pending.map(item => (
                <div 
                  key={item.id} 
                  className="card" 
                  onClick={() => setSelectedReroute(item)}
                  style={{ 
                    padding: '12px 16px', 
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border)',
                    borderRadius: '10px',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseOver={e => e.currentTarget.style.borderColor = 'var(--brand)'}
                  onMouseOut={e => e.currentTarget.style.borderColor = 'var(--border)'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Truck size={14} style={{ color: 'var(--brand)' }} />
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '14px', color: 'var(--text-main)' }}>{item.shipment_id}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '10px', fontWeight: 900, color: 'var(--danger)' }}>+{item.estimated_delay_hrs}H IMPACT</span>
                    <ExpiryTimer expiresAt={item.expires_at} />
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Modal for Full Card */}
          {selectedReroute && (
            <div style={{ 
              position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', 
              background: 'rgba(0,0,0,0.8)', zIndex: 1000, 
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backdropFilter: 'blur(8px)'
            }} onClick={() => setSelectedReroute(null)}>
              <div style={{ 
                width: '500px', background: 'var(--bg-surface)', borderRadius: '24px', 
                border: '1px solid var(--border)', overflow: 'hidden',
                boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
              }} onClick={e => e.stopPropagation()}>
                <div style={{ padding: '24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Truck size={24} style={{ color: 'var(--brand)' }} />
                    </div>
                    <div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 950, fontSize: '20px', color: 'var(--text-main)' }}>{selectedReroute.shipment_id}</div>
                      <span style={{ fontSize: '10px', fontWeight: 900, color: 'var(--brand)', textTransform: 'uppercase' }}>AI Optimized Suggestion</span>
                    </div>
                  </div>
                  <button onClick={() => setSelectedReroute(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                    <X size={24} />
                  </button>
                </div>

                <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div style={{ 
                    padding: '16px', background: 'rgba(255, 77, 77, 0.08)', borderRadius: '12px', 
                    border: '1px solid rgba(255, 77, 77, 0.2)', color: 'var(--danger)',
                    display: 'flex', alignItems: 'center', gap: '12px' 
                  }}>
                    <AlertTriangle size={20} />
                    <span style={{ fontWeight: 800 }}>BLOCKED AT {selectedReroute.disrupted_node} (+{selectedReroute.estimated_delay_hrs}h)</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <span style={{ fontSize: '10px', fontWeight: 900, color: 'var(--text-muted)' }}>SUGGESTED OPTIMIZED PATH</span>
                    <div style={{ 
                      padding: '12px', background: 'rgba(0, 180, 216, 0.05)', borderRadius: '10px', 
                      border: '1px dashed var(--brand)', fontFamily: 'var(--font-mono)', fontSize: '13px'
                    }}>
                      {selectedReroute.suggested_route.join(' → ')}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <span style={{ fontSize: '10px', fontWeight: 900, color: 'var(--text-muted)' }}>NEURAL AGENT REASONING</span>
                    <div style={{ 
                      fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6, 
                      maxHeight: '120px', overflowY: 'auto' 
                    }} className="custom-scrollbar">
                      {selectedReroute.agent_reasoning}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '32px', padding: '16px 0', borderTop: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '9px', fontWeight: 900, color: 'var(--text-muted)' }}>EFFICIENCY</span>
                      <span style={{ fontSize: '16px', fontWeight: 950, color: 'var(--brand)' }}>High Effort</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '9px', fontWeight: 900, color: 'var(--text-muted)' }}>TIME IMPACT</span>
                      <span style={{ fontSize: '16px', fontWeight: 950, color: '#fff' }}>+{selectedReroute.estimated_delay_hrs}h Saved</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                    <button 
                      onClick={() => { handleAction(selectedReroute.id, 'reject'); setSelectedReroute(null); }}
                      style={{ flex: 1, padding: '16px', borderRadius: '12px', border: '1px solid var(--danger)', color: 'var(--danger)', fontSize: '14px', fontWeight: 900, background: 'transparent' }}
                    >
                      REJECT
                    </button>
                    <button 
                      onClick={() => { handleAction(selectedReroute.id, 'approve'); setSelectedReroute(null); }}
                      style={{ flex: 2, padding: '16px', borderRadius: '12px', background: 'var(--brand)', color: '#000', fontSize: '14px', fontWeight: 950, border: 'none' }}
                    >
                      APPROVE & APPLY
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div style={{ marginTop: '32px' }}>
            <button 
              onClick={() => setHistoryExpanded(!historyExpanded)}
              style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', borderRadius: '8px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', fontSize: '13px', fontWeight: 700 }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><History size={16} /> DECISION HISTORY</div>
              <span>{historyExpanded ? 'Collapse' : 'Expand'}</span>
            </button>
            {historyExpanded && (
              <div className="card" style={{ marginTop: '12px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border)' }}>
                    <tr>
                      <th style={{ textAlign: 'left', padding: '12px 16px', color: 'var(--text-muted)' }}>SHIPMENT</th>
                      <th style={{ textAlign: 'left', padding: '12px 16px', color: 'var(--text-muted)' }}>DECISION</th>
                      <th style={{ textAlign: 'left', padding: '12px 16px', color: 'var(--text-muted)' }}>TIME</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map(h => (
                      <tr key={h.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)' }}>{h.shipment_id}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ 
                            fontSize: '10px', fontWeight: 800, padding: '2px 6px', borderRadius: '4px', 
                            background: h.status === 'approved' ? 'var(--brand-dim)' : 'var(--danger-dim)',
                            color: h.status === 'approved' ? 'var(--brand)' : 'var(--danger)',
                            textTransform: 'uppercase'
                          }}>{h.status}</span>
                        </td>
                        <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>{new Date(h.reviewed_at || h.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {/* RIGHT PANEL: Manual Disruption */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 800 }}>REPORT DISRUPTION</h2>
            <div style={{ padding: '2px 8px', borderRadius: '4px', background: 'var(--warning-dim)', color: 'var(--warning)', fontSize: '10px', fontWeight: 900 }}>MANUAL OVERRIDE</div>
          </div>

          <div className="card" style={{ padding: '24px' }}>
            <form onSubmit={handleManualSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ position: 'relative' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>Shipment ID</label>
                <div style={{ position: 'relative' }}>
                  <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input 
                    type="text" 
                    className="input-control" 
                    placeholder="Search active shipments..." 
                    style={{ width: '100%', paddingLeft: '36px' }}
                    value={shipmentSearch}
                    onChange={(e) => {
                      setShipmentSearch(e.target.value);
                      setShowShipmentDropdown(true);
                    }}
                    onFocus={() => setShowShipmentDropdown(true)}
                  />
                  {showShipmentDropdown && shipmentSearch.length > 0 && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '8px', marginTop: '8px', zFiles: 100, boxShadow: 'var(--shadow-card)', overflow: 'hidden' }}>
                      {filteredShipmentSuggestions.map(s => (
                        <div 
                          key={s.id}
                          onClick={() => {
                            setSelectedShipment(s);
                            setShipmentSearch(s.id);
                            setShowShipmentDropdown(false);
                          }}
                          style={{ padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}
                          onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                          onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                        >
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '13px' }}>{s.id}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{s.cargo_type}</div>
                          </div>
                          <div style={{ fontSize: '10px', color: 'var(--text-secondary)', textAlign: 'right' }}>
                            {s.origin} → {s.destination}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {selectedShipment && (
                <div style={{ padding: '12px', background: 'var(--bg-elevated)', borderRadius: '8px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--info-dim)', color: 'var(--info)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Truck size={16} /></div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 800 }}>{selectedShipment.cargo_type} Package</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Current Location: {selectedShipment.current_node || 'In Transit'}</div>
                  </div>
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '12px', textTransform: 'uppercase' }}>Disruption Type</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                  {disruptionTypes.map(t => (
                    <div 
                      key={t.id}
                      onClick={() => setDisruptionType(t.id)}
                      style={{
                        padding: '12px 8px', borderRadius: '8px', background: disruptionType === t.id ? 'var(--bg-hover)' : 'var(--bg-elevated)',
                        border: `1px solid ${disruptionType === t.id ? t.color : 'var(--border)'}`,
                        cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s'
                      }}
                    >
                      <div style={{ fontSize: '18px', marginBottom: '4px' }}>{t.icon}</div>
                      <div style={{ fontSize: '10px', fontWeight: 800, color: disruptionType === t.id ? t.color : 'var(--text-secondary)' }}>{t.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>Est. Delay (Hours)</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button type="button" onClick={() => setDelayHours(Math.max(0, delayHours - 1))} style={{ width: '36px', height: '36px', borderRadius: '6px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', fontSize: '20px' }}>-</button>
                    <input 
                      type="number" 
                      className="input-control" 
                      style={{ flex: 1, textAlign: 'center', fontWeight: 800 }} 
                      value={delayHours}
                      onChange={(e) => setDelayHours(parseInt(e.target.value) || 0)}
                    />
                    <button type="button" onClick={() => setDelayHours(delayHours + 1)} style={{ width: '36px', height: '36px', borderRadius: '6px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', fontSize: '20px' }}>+</button>
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>Severity</label>
                  <div style={{ 
                    height: '36px', borderRadius: '6px', background: delayHours > 24 ? 'var(--danger-dim)' : (delayHours > 6 ? 'var(--warning-dim)' : 'var(--brand-dim)'),
                    border: `1px solid ${delayHours > 24 ? 'var(--danger)' : (delayHours > 6 ? 'var(--warning)' : 'var(--brand)')}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 900, color: delayHours > 24 ? 'var(--danger)' : (delayHours > 6 ? 'var(--warning)' : 'var(--brand)')
                  }}>
                    {delayHours > 24 ? 'CRITICAL' : (delayHours > 6 ? 'HIGH' : 'MODERATE')}
                  </div>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>Reason & Description</label>
                <textarea 
                  className="input-control" 
                  placeholder="Describe the incident in detail (min 20 characters)..." 
                  style={{ width: '100%', height: '80px', resize: 'none' }}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
                <div style={{ fontSize: '10px', textAlign: 'right', marginTop: '4px', color: reason.length < 20 ? 'var(--danger)' : 'var(--text-muted)' }}>{reason.length}/500</div>
              </div>

              <button 
                type="submit"
                disabled={submitting || !selectedShipment || !disruptionType || reason.length < 20}
                style={{
                  width: '100%', padding: '16px', borderRadius: '8px', background: submitSuccess ? 'var(--brand)' : 'var(--warning)',
                  color: '#000', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                  opacity: (submitting || !selectedShipment || !disruptionType || reason.length < 20) && !submitSuccess ? 0.5 : 1,
                  cursor: submitting ? 'default' : 'pointer', transition: 'all 0.3s'
                }}
              >
                {submitSuccess ? <><CheckCircle size={18} /> DISRUPTION LOGGED</> : (submitting ? 'REPORTING...' : 'LOG DISRUPTION')}
              </button>
            </form>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '8px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>RECENT MANUAL REPORTS</h3>
            {manualLogs.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px', fontStyle: 'italic' }}>No recent manual reports</div>
            ) : (
              manualLogs.map(log => (
                <div key={log._id || log.timestamp} className="card" style={{ padding: '16px', display: 'flex', gap: '12px' }}>
                  <div style={{ width: '4px', height: '40px', background: 'var(--warning)', borderRadius: '2px' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 800, fontSize: '13px', fontFamily: 'var(--font-mono)' }}>{log.shipment_id}</span>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{new Date(log.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <p style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{log.reasoning}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <style>{`
        @keyframes pulse { 0% { opacity: 0.5; } 50% { opacity: 1; } 100% { opacity: 0.5; } }
        details summary::-webkit-details-marker { display:none; }
      `}</style>
    </div>
  );
}
