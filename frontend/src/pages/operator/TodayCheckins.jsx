import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { fetchNodeCheckins } from '../../services/api';
import { Clock, RefreshCw, FileText } from 'lucide-react';

export default function TodayCheckins() {
  const { user, getAuthHeaders } = useAuth();
  const [checkins, setCheckins] = useState([]);
  const [loading, setLoading] = useState(true);

  const nodeId = user?.assigned_node_ids?.[0];

  const loadData = useCallback(async () => {
    if (!nodeId) return;
    try {
      const headers = getAuthHeaders();
      const data = await fetchNodeCheckins(nodeId, headers);
      setCheckins(data);
    } catch (err) {
      console.error('Load failed:', err);
    } finally {
      setLoading(false);
    }
  }, [nodeId, getAuthHeaders]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const styles = {
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '24px',
    },
    title: {
      fontSize: '18px',
      fontWeight: '800',
    },
    badge: {
      padding: '2px 8px',
      borderRadius: '4px',
      fontSize: '11px',
      fontWeight: '800',
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      color: 'var(--text-muted)',
    },
    list: {
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
    },
    entry: {
      backgroundColor: 'var(--bg-surface)',
      border: '1px solid var(--glass-border)',
      borderRadius: '12px',
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
    },
    entryHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    shipmentId: {
      fontWeight: '800',
      fontSize: '14px',
      fontFamily: 'var(--font-mono)',
    },
    time: {
      fontSize: '11px',
      color: 'var(--text-muted)',
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
    },
    eventType: (type) => ({
      fontSize: '10px',
      fontWeight: '800',
      padding: '2px 6px',
      borderRadius: '4px',
      backgroundColor: type === 'arrived' ? 'rgba(6, 214, 160, 0.15)' : 
                       type === 'departed' ? 'rgba(17, 138, 178, 0.15)' : 
                       'rgba(239, 71, 111, 0.15)',
      color: type === 'arrived' ? 'var(--status-live)' : 
             type === 'departed' ? 'var(--status-info)' : 
             'var(--status-critical)',
      textTransform: 'uppercase',
    }),
    details: {
      fontSize: '13px',
      color: 'var(--text-muted)',
    },
    notes: {
      fontSize: '12px',
      fontStyle: 'italic',
      color: 'var(--text-muted)',
      padding: '8px',
      backgroundColor: 'rgba(0,0,0,0.1)',
      borderRadius: '4px',
      display: 'flex',
      gap: '8px',
      alignItems: 'flex-start',
    }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '40px' }}>Loading log...</div>;

  return (
    <div>
      <div style={styles.header}>
        <div style={styles.title}>
          TODAY'S LOG 
          <span style={{ marginLeft: '8px', fontSize: '14px', color: 'var(--text-muted)', fontWeight: '500' }}>
            {new Date().toLocaleDateString([], { month: 'short', day: 'numeric' })}
          </span>
        </div>
        <button 
          onClick={loadData}
          style={{ background: 'none', border: 'none', color: 'var(--accent-primary)' }}
        >
          <RefreshCw size={18} />
        </button>
      </div>

      <div style={styles.list}>
        {checkins.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
            <FileText size={40} style={{ opacity: 0.3 }} />
            <span>No check-ins recorded for today yet.</span>
          </div>
        ) : (
          checkins.map(c => (
            <div key={c.id} style={styles.entry}>
              <div style={styles.entryHeader}>
                <span style={styles.shipmentId}>{c.shipment_id}</span>
                <span style={styles.time}>
                  <Clock size={12} />
                  {new Date(c.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={styles.eventType(c.event_type)}>{c.event_type}</span>
                <span style={{ fontSize: '12px', fontWeight: '600' }}>{c.condition}</span>
              </div>

              {c.notes && (
                <div style={styles.notes}>
                  <Info size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span>{c.notes}</span>
                </div>
              )}
              
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'right' }}>
                Op: {c.operator_name || 'System'}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

const Info = ({ size, style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
);
