import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { fetchPendingCheckins, createCheckin } from '../../services/api';
import { Search, RefreshCw, Package, CheckCircle, ChevronUp, X, Info, AlertTriangle } from 'lucide-react';

const CheckinSheet = ({ shipment, onClose, onComplete }) => {
  const { user, getAuthHeaders } = useAuth();
  const [condition, setCondition] = useState('GOOD');
  const [weight, setWeight] = useState(shipment?.weight_kg || 0);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const headers = getAuthHeaders();
      await createCheckin({
        shipment_id: shipment.id,
        node_id: user.assigned_node_ids[0],
        event_type: 'arrived',
        condition,
        weight_verified: parseFloat(weight),
        notes
      }, headers);
      onComplete(shipment.id);
    } catch (err) {
      console.error('Checkin failed:', err);
      alert('Failed to process arrival: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const styles = {
    overlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.8)',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'center',
    },
    sheet: {
      width: '100%',
      maxWidth: '480px',
      backgroundColor: 'var(--bg-secondary)',
      borderTopLeftRadius: '20px',
      borderTopRightRadius: '20px',
      padding: '24px',
      animation: 'slideUp 0.3s ease-out',
      display: 'flex',
      flexDirection: 'column',
      gap: '24px',
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    shipmentId: {
      fontSize: '20px',
      fontWeight: '800',
      fontFamily: 'var(--font-mono)',
    },
    section: {
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
    },
    label: {
      fontSize: '12px',
      fontWeight: '700',
      color: 'var(--text-muted)',
      textTransform: 'uppercase',
    },
    conditionGrid: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr 1fr',
      gap: '10px',
    },
    condBtn: (active, color) => ({
      padding: '16px 8px',
      borderRadius: '12px',
      border: active ? `2px solid ${color}` : '2px solid transparent',
      backgroundColor: active ? `${color}22` : 'var(--bg-glass)',
      color: active ? color : 'var(--text-muted)',
      fontSize: '12px',
      fontWeight: '700',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '8px',
      cursor: 'pointer',
      transition: 'all 0.2s',
    }),
    input: {
      width: '100%',
      padding: '16px',
      backgroundColor: 'rgba(0,0,0,0.3)',
      border: '1px solid var(--glass-border)',
      borderRadius: '12px',
      color: 'var(--text-main)',
      fontSize: '16px',
      outline: 'none',
    },
    footer: {
      display: 'grid',
      gridTemplateColumns: '1fr 2fr',
      gap: '12px',
      marginTop: '8px',
    },
    btnCancel: {
      padding: '16px',
      borderRadius: '12px',
      border: '1px solid var(--glass-border)',
      background: 'none',
      color: 'var(--text-muted)',
      fontWeight: '700',
    },
    btnConfirm: {
      padding: '16px',
      borderRadius: '12px',
      border: 'none',
      backgroundColor: 'var(--status-live)',
      color: '#000',
      fontWeight: '800',
      fontSize: '14px',
      textTransform: 'uppercase',
    }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.sheet} onClick={e => e.stopPropagation()}>
        <div style={styles.header}>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>CHECK-IN ARRIVAL</div>
            <div style={styles.shipmentId}>{shipment.id}</div>
          </div>
          <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)' }} onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div style={styles.section}>
          <label style={styles.label}>Cargo Condition</label>
          <div style={styles.conditionGrid}>
            <div style={styles.condBtn(condition === 'GOOD', 'var(--status-live)')} onClick={() => setCondition('GOOD')}>
              <CheckCircle size={20} />
              GOOD
            </div>
            <div style={styles.condBtn(condition === 'PARTIAL', 'var(--status-warning)')} onClick={() => setCondition('PARTIAL')}>
              <Info size={20} />
              PARTIAL
            </div>
            <div style={styles.condBtn(condition === 'DAMAGED', 'var(--status-critical)')} onClick={() => setCondition('DAMAGED')}>
              <XCircle size={20} />
              DAMAGED
            </div>
          </div>
        </div>

        <div style={styles.section}>
          <label style={styles.label}>Verified Weight (kg)</label>
          <input 
            type="number" 
            style={styles.input} 
            value={weight} 
            onChange={e => setWeight(e.target.value)}
          />
        </div>

        <div style={styles.section}>
          <label style={styles.label}>Notes (optional)</label>
          <textarea 
            style={{...styles.input, height: '80px', resize: 'none'}} 
            placeholder="e.g. Seal intact, slightly late"
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
        </div>

        <div style={styles.footer}>
          <button style={styles.btnCancel} onClick={onClose}>CANCEL</button>
          <button style={styles.btnConfirm} onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'PROCESSING...' : 'CONFIRM ARRIVAL'}
          </button>
        </div>
      </div>
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

const XCircle = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>
);

export default function ExpectedShipments() {
  const { user, getAuthHeaders } = useAuth();
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [successId, setSuccessId] = useState(null);

  const nodeId = user?.assigned_node_ids?.[0];

  const loadData = useCallback(async () => {
    if (!nodeId) return;
    try {
      const headers = getAuthHeaders();
      const data = await fetchPendingCheckins(nodeId, headers);
      setShipments(data);
    } catch (err) {
      console.error('Load failed:', err);
    } finally {
      setLoading(false);
    }
  }, [nodeId, getAuthHeaders]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onComplete = (id) => {
    setSelectedShipment(null);
    setSuccessId(id);
    setTimeout(() => {
      setShipments(prev => prev.filter(s => s.id !== id));
      setSuccessId(null);
    }, 1000);
  };

  const filtered = shipments.filter(s => 
    s.id.toLowerCase().includes(search.toLowerCase()) ||
    s.cargo_type.toLowerCase().includes(search.toLowerCase())
  );

  const styles = {
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '20px',
    },
    title: {
      fontSize: '18px',
      fontWeight: '800',
    },
    search: {
      position: 'relative',
      marginBottom: '24px',
    },
    searchInput: {
      width: '100%',
      padding: '14px 14px 14px 44px',
      backgroundColor: 'var(--bg-secondary)',
      border: '1px solid var(--glass-border)',
      borderRadius: '12px',
      color: 'var(--text-main)',
      fontSize: '14px',
      outline: 'none',
    },
    searchIcon: {
      position: 'absolute',
      left: '14px',
      top: '50%',
      transform: 'translateY(-50%)',
      color: 'var(--text-muted)',
    },
    list: {
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
    },
    card: (isSuccess) => ({
      backgroundColor: isSuccess ? 'rgba(6, 214, 160, 0.1)' : 'var(--bg-surface)',
      border: isSuccess ? '1px solid var(--status-live)' : '1px solid var(--glass-border)',
      borderRadius: '16px',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      transition: 'all 0.3s',
      transform: isSuccess ? 'scale(0.95)' : 'scale(1)',
      opacity: isSuccess ? 0.5 : 1,
    }),
    cardHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    priority: (p) => ({
      fontSize: '10px',
      fontWeight: '900',
      padding: '2px 8px',
      borderRadius: '4px',
      backgroundColor: p === 'critical' ? 'rgba(239, 71, 111, 0.2)' : 'rgba(255, 255, 255, 0.05)',
      color: p === 'critical' ? 'var(--status-critical)' : 'var(--text-muted)',
      textTransform: 'uppercase',
    }),
    cardAction: {
      width: '100%',
      padding: '14px',
      backgroundColor: 'rgba(0, 229, 160, 0.1)',
      color: 'var(--status-live)',
      border: '1px solid rgba(0, 229, 160, 0.2)',
      borderRadius: '10px',
      fontWeight: '700',
      fontSize: '12px',
      cursor: 'pointer',
      marginTop: '4px',
    }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '40px' }}>Loading shipments...</div>;

  return (
    <div>
      <div style={styles.header}>
        <div style={styles.title}>EXPECTED SHIPMENTS</div>
        <button 
          onClick={loadData}
          style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: '700' }}
        >
          <RefreshCw size={14} /> REFRESH
        </button>
      </div>

      <div style={styles.search}>
        <Search size={18} style={styles.searchIcon} />
        <input 
          style={styles.searchInput} 
          placeholder="Filter by ID or cargo..." 
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div style={styles.list}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No expected shipments found</div>
        ) : (
          filtered.map(s => (
            <div key={s.id} style={styles.card(successId === s.id)}>
              <div style={styles.cardHeader}>
                <span style={{ fontWeight: '800', fontFamily: 'var(--font-mono)' }}>{s.id}</span>
                <span style={styles.priority(s.priority)}>{s.priority}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', fontWeight: '600' }}>{s.cargo_type}</span>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{s.weight_kg} kg</span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                From: {s.origin}
              </div>
              <button style={styles.cardAction} onClick={() => setSelectedShipment(s)}>
                MARK ARRIVED
              </button>
            </div>
          ))
        )}
      </div>

      {selectedShipment && (
        <CheckinSheet 
          shipment={selectedShipment} 
          onClose={() => setSelectedShipment(null)}
          onComplete={onComplete}
        />
      )}
    </div>
  );
}
