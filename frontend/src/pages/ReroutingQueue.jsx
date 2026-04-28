import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAppWebSocket } from '../context/WebSocketContext';
import { fetchPendingReroutes, fetchRerouteHistory, approveReroute, rejectReroute } from '../services/api';
import { CheckCircle, XCircle, Clock, Info, ChevronDown, ChevronUp, History, ListFilter, AlertTriangle } from 'lucide-react';

const Toast = ({ message, type, onClose }) => (
  <div style={{
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    padding: '16px 24px',
    backgroundColor: type === 'error' ? 'var(--danger)' : 'var(--brand)',
    color: '#000',
    borderRadius: '4px',
    fontWeight: '700',
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    zIndex: 10000,
    animation: 'slideInRight 0.3s ease-out forwards',
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  }}>
    {type === 'error' ? <XCircle size={20} /> : <CheckCircle size={20} />}
    {message}
    <style>{`
      @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    `}</style>
  </div>
);

const ExpiryTimer = ({ expiresAt }) => {
  const [timeLeft, setTimeLeft] = useState('');
  const [urgency, setUrgency] = useState('normal'); // normal, warning, critical, expired

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

  const colors = {
    normal: 'var(--brand)',
    warning: 'var(--warning)',
    critical: 'var(--danger)',
    expired: 'var(--text-secondary)'
  };

  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: '6px', 
      color: colors[urgency],
      fontWeight: '700',
      fontSize: '13px',
      animation: urgency === 'critical' ? 'blink 1s infinite' : 'none'
    }}>
      <Clock size={14} />
      <span>{timeLeft}</span>
      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
};

const RerouteCard = ({ item, onAction }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [mode, setMode] = useState('view'); // view, approving, rejecting
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const priorityColors = {
    critical: 'var(--danger)',
    high: 'var(--warning)',
    medium: 'var(--info)',
    low: 'var(--text-secondary)'
  };

  const isExpired = new Date(item.expires_at) < new Date();

  const handleConfirm = async () => {
    if (mode === 'rejecting' && !notes) return;
    setIsSubmitting(true);
    try {
      if (mode === 'approving') {
        await onAction('approve', item.id, notes);
      } else {
        await onAction('reject', item.id, notes);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      backgroundColor: 'var(--bg-surface)',
      border: '1px solid var(--border)',
      borderLeft: `4px solid ${priorityColors[item.priority] || 'var(--border)'}`,
      borderRadius: '8px',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      opacity: isExpired ? 0.6 : 1,
      transition: 'transform 0.2s, box-shadow 0.2s',
      boxShadow: 'var(--shadow-card)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ 
            backgroundColor: priorityColors[item.priority], 
            color: '#000', 
            fontSize: '10px', 
            fontWeight: '900', 
            padding: '2px 6px', 
            borderRadius: '2px',
            textTransform: 'uppercase'
          }}>
            {item.priority}
          </span>
          <span style={{ fontWeight: '800', fontSize: '16px', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
            {item.shipment_id}
          </span>
        </div>
        <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600' }}>
          {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      {/* Disruption Context */}
      <div style={{ 
        padding: '10px 12px', 
        backgroundColor: 'rgba(255, 77, 77, 0.05)', 
        border: '1px solid rgba(255, 77, 77, 0.1)',
        borderRadius: '4px',
        fontSize: '13px',
        color: 'var(--danger)',
        fontWeight: '600',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <AlertTriangle size={14} />
        DISRUPTION: {item.disrupted_node} (+{item.estimated_delay_hrs}h delay)
      </div>

      {/* Route Comparison */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ fontSize: '12px', display: 'flex', gap: '8px', fontFamily: 'var(--font-mono)' }}>
          <span style={{ color: 'var(--text-secondary)', width: '70px' }}>ORIGINAL:</span>
          <span style={{ color: 'var(--text-secondary)' }}>{item.original_route.join(' → ')}</span>
        </div>
        <div style={{ fontSize: '12px', display: 'flex', gap: '8px', fontFamily: 'var(--font-mono)' }}>
          <span style={{ color: 'var(--text-secondary)', width: '70px' }}>SUGGESTED:</span>
          <span style={{ color: 'var(--text-primary)' }}>
            {item.suggested_route.map((node, idx) => {
              const isDifferent = !item.original_route.includes(node);
              return (
                <React.Fragment key={idx}>
                  <span style={{ color: isDifferent ? 'var(--brand)' : 'inherit', fontWeight: isDifferent ? '800' : 'inherit' }}>
                    {node}
                  </span>
                  {idx < item.suggested_route.length - 1 && ' → '}
                </React.Fragment>
              );
            })}
          </span>
          <span style={{ color: 'var(--brand)', fontSize: '10px', fontWeight: '900', marginLeft: '4px' }}>NEW</span>
        </div>
      </div>

      {/* Reasoning Collapsible */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div 
          onClick={() => setIsExpanded(!isExpanded)}
          style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: '700' }}
        >
          AI REASONING {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
        <div style={{ 
          fontSize: '13px', 
          color: 'var(--text-secondary)', 
          lineHeight: '1.5',
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: isExpanded ? 'unset' : '3',
          WebkitBoxOrient: 'vertical',
          backgroundColor: 'rgba(0,0,0,0.2)',
          padding: '8px',
          borderRadius: '4px',
          border: '1px solid var(--border)'
        }}>
          {item.agent_reasoning}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
        <ExpiryTimer expiresAt={item.expires_at} />
        
        {mode === 'view' ? (
          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              disabled={isExpired}
              onClick={() => setMode('rejecting')}
              style={{
                background: 'none',
                border: '1px solid var(--danger)',
                color: 'var(--danger)',
                padding: '8px 16px',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: '700',
                cursor: isExpired ? 'default' : 'pointer',
                opacity: isExpired ? 0.5 : 1
              }}
            >
              REJECT
            </button>
            <button 
              disabled={isExpired}
              onClick={() => setMode('approving')}
              style={{
                background: 'var(--brand)',
                border: 'none',
                color: '#000',
                padding: '8px 16px',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: '700',
                cursor: isExpired ? 'default' : 'pointer',
                opacity: isExpired ? 0.5 : 1
              }}
            >
              APPROVE →
            </button>
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px', marginLeft: '24px', animation: 'fadeIn 0.2s' }}>
            <textarea
              placeholder={mode === 'approving' ? 'Add notes for audit trail (optional)...' : 'Reason for rejection (required)...'}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={200}
              style={{
                width: '100%',
                height: '60px',
                backgroundColor: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                borderRadius: '4px',
                color: 'var(--text-primary)',
                padding: '8px',
                fontSize: '12px',
                outline: 'none',
                resize: 'none'
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button 
                onClick={() => { setMode('view'); setNotes(''); }}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}
              >
                CANCEL
              </button>
              <button 
                onClick={handleConfirm}
                disabled={isSubmitting || (mode === 'rejecting' && !notes)}
                style={{
                  background: mode === 'approving' ? 'var(--brand)' : 'var(--danger)',
                  border: 'none',
                  color: '#000',
                  padding: '6px 12px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  opacity: (isSubmitting || (mode === 'rejecting' && !notes)) ? 0.6 : 1
                }}
              >
                {isSubmitting ? 'PROCESSING...' : `CONFIRM ${mode === 'approving' ? 'APPROVAL' : 'REJECTION'}`}
              </button>
            </div>
          </div>
        )}
      </div>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>
  );
};

export default function ReroutingQueue() {
  const [activeTab, setActiveTab] = useState('pending');
  const [pending, setPending] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  
  const { getAuthHeaders } = useAuth();
  const { pendingRerouteCount } = useAppWebSocket();

  const loadData = useCallback(async () => {
    try {
      const headers = getAuthHeaders();
      const [pendingRes, historyRes] = await Promise.all([
        fetchPendingReroutes(headers),
        fetchRerouteHistory('', 50, headers)
      ]);
      setPending(pendingRes);
      setHistory(historyRes);
    } catch (err) {
      console.error('Failed to load queue:', err);
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 15000); // 15s auto-refresh
    return () => clearInterval(interval);
  }, [loadData]);

  const handleAction = async (type, id, notes) => {
    try {
      const headers = getAuthHeaders();
      if (type === 'approve') {
        await approveReroute(id, notes, headers);
        setToast({ message: `Reroute approved for shipment`, type: 'success' });
      } else {
        await rejectReroute(id, notes, headers);
        setToast({ message: `Suggestion rejected`, type: 'success' });
      }
      setTimeout(() => setToast(null), 3000);
      await loadData();
    } catch (err) {
      setToast({ message: err.message, type: 'error' });
      setTimeout(() => setToast(null), 3000);
    }
  };

  const styles = {
    container: {
      padding: '32px',
      maxWidth: '1200px',
      margin: '0 auto',
      color: 'var(--text-primary)',
      fontFamily: 'var(--font-sans)',
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: '32px',
    },
    title: {
      fontSize: '28px',
      fontWeight: '900',
      letterSpacing: '-0.5px',
      margin: '0 0 4px 0',
    },
    subtitle: {
      fontSize: '14px',
      color: 'var(--text-secondary)',
    },
    badge: {
      padding: '4px 12px',
      borderRadius: '20px',
      fontSize: '12px',
      fontWeight: '800',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    tabs: {
      display: 'flex',
      gap: '32px',
      borderBottom: '1px solid var(--border)',
      marginBottom: '32px',
    },
    tab: (active) => ({
      padding: '12px 0',
      fontSize: '14px',
      fontWeight: '700',
      cursor: 'pointer',
      color: active ? 'var(--brand)' : 'var(--text-secondary)',
      borderBottom: active ? '2px solid var(--brand)' : '2px solid transparent',
      transition: 'all 0.2s',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    }),
    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(450px, 1fr))',
      gap: '24px',
    },
    empty: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '100px 0',
      color: 'var(--text-secondary)',
      gap: '16px'
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
      fontSize: '13px',
    },
    th: {
      textAlign: 'left',
      padding: '12px',
      color: 'var(--text-secondary)',
      fontSize: '11px',
      fontWeight: '700',
      textTransform: 'uppercase',
      borderBottom: '1px solid var(--border)',
    },
    td: {
      padding: '16px 12px',
      borderBottom: '1px solid rgba(255,255,255,0.03)',
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>REROUTING APPROVAL QUEUE</h1>
          <div style={styles.subtitle}>Review and action AI-generated reroute suggestions</div>
        </div>
        <div style={{
          ...styles.badge,
          backgroundColor: pending.length > 0 ? 'rgba(255, 77, 77, 0.1)' : 'rgba(0, 229, 160, 0.1)',
          color: pending.length > 0 ? 'var(--danger)' : 'var(--brand)',
          border: `1px solid ${pending.length > 0 ? 'rgba(255, 77, 77, 0.2)' : 'rgba(0, 229, 160, 0.2)'}`
        }}>
          <div style={{ 
            width: '8px', height: '8px', borderRadius: '50%', 
            backgroundColor: pending.length > 0 ? 'var(--danger)' : 'var(--brand)',
            boxShadow: `0 0 10px ${pending.length > 0 ? 'var(--danger)' : 'var(--brand)'}`
          }} />
          {pending.length} PENDING
        </div>
      </div>

      <div style={styles.tabs}>
        <div style={styles.tab(activeTab === 'pending')} onClick={() => setActiveTab('pending')}>
          PENDING ACTIONS
          {pending.length > 0 && (
            <span style={{ fontSize: '10px', background: 'var(--danger)', color: '#000', padding: '1px 5px', borderRadius: '10px' }}>
              {pending.length}
            </span>
          )}
        </div>
        <div style={styles.tab(activeTab === 'history')} onClick={() => setActiveTab('history')}>
          DECISION HISTORY
        </div>
      </div>

      {activeTab === 'pending' ? (
        loading ? (
          <div style={styles.empty}>Loading active suggestions...</div>
        ) : pending.length === 0 ? (
          <div style={styles.empty}>
            <CheckCircle size={48} style={{ color: 'var(--brand)' }} />
            <span style={{ fontWeight: '600' }}>All caught up — no pending suggestions</span>
          </div>
        ) : (
          <div style={styles.grid}>
            {pending.map(item => (
              <RerouteCard key={item.id} item={item} onAction={handleAction} />
            ))}
          </div>
        )
      ) : (
        <div style={{ 
          backgroundColor: 'var(--bg-surface)', 
          border: '1px solid var(--border)', 
          borderRadius: '8px',
          overflow: 'hidden'
        }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Shipment</th>
                <th style={styles.th}>Priority</th>
                <th style={styles.th}>Decision</th>
                <th style={styles.th}>Decided By</th>
                <th style={styles.th}>Decided At</th>
                <th style={styles.th}>Reasoning</th>
              </tr>
            </thead>
            <tbody>
              {history.map(item => (
                <tr key={item.id}>
                  <td style={{...styles.td, fontWeight: '700', fontFamily: 'var(--font-mono)'}}>{item.shipment_id}</td>
                  <td style={styles.td}>
                    <span style={{ color: ({critical: 'var(--danger)', high: 'var(--warning)', medium: 'var(--info)'}[item.priority] || 'var(--text-secondary)'), textTransform: 'uppercase', fontWeight: '800', fontSize: '11px' }}>
                      {item.priority}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <span style={{
                      backgroundColor: item.status === 'approved' ? 'rgba(0, 229, 160, 0.1)' : 'rgba(255, 77, 77, 0.1)',
                      color: item.status === 'approved' ? 'var(--brand)' : 'var(--danger)',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: '800',
                      textTransform: 'uppercase'
                    }}>
                      {item.status}
                    </span>
                  </td>
                  <td style={styles.td}>{item.reviewed_by}</td>
                  <td style={{...styles.td, color: 'var(--text-secondary)'}}>{new Date(item.reviewed_at).toLocaleDateString()}</td>
                  <td style={{...styles.td, color: 'var(--text-secondary)', maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>
                    {item.review_reason || item.agent_reasoning}
                  </td>
                </tr>
              ))}
              {history.length === 0 && (
                <tr>
                  <td colSpan="6" style={{...styles.td, textAlign: 'center', padding: '40px', color: 'var(--text-secondary)'}}>No decision history found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {toast && <Toast {...toast} />}
    </div>
  );
}
