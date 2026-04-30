import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { fetchPendingCheckins, createCheckin } from '../../services/api';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import { 
  Package, MapPin, Clock, ArrowRight, CheckCircle, 
  Search, Loader, AlertCircle, Inbox, TrendingUp
} from 'lucide-react';

export default function ExpectedShipments() {
  const { user, getAuthHeaders, activeNodeId } = useAuth();
  const { isMobile } = useBreakpoint();
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [processing, setProcessing] = useState(null);
  const [error, setError] = useState(null);

  const loadShipments = async () => {
    if (!activeNodeId) return;
    try {
      setLoading(true);
      setError(null);
      // Use the dedicated pending endpoint for high-fidelity manifest synchronization
      const data = await fetchPendingCheckins(activeNodeId, getAuthHeaders());
      setShipments(data || []);
    } catch (err) {
      console.error('Failed to fetch expected shipments:', err);
      setError('Failed to synchronize inbound manifests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadShipments();
  }, [activeNodeId, getAuthHeaders]);

  const filteredShipments = useMemo(() => {
    return shipments.filter(s => 
      s.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.cargo_type?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [shipments, searchQuery]);

  const stats = useMemo(() => {
    return {
      expected: shipments.length,
      delayed: shipments.filter(s => s.status === 'delayed').length,
      atRisk: shipments.filter(s => s.status === 'flagged').length
    };
  }, [shipments]);

  const handleUpdateStatus = async (shipmentId, type) => {
    setProcessing(shipmentId);
    try {
      await createCheckin({
        shipment_id: shipmentId,
        node_id: activeNodeId,
        event_type: type,
        condition: type === 'flagged' ? 'damaged' : 'good',
        notes: `Operator status update: ${type}`
      }, getAuthHeaders());
      await loadShipments();
    } catch (err) {
      alert('Update failed: ' + err.message);
    } finally {
      setProcessing(null);
    }
  };

  const styles = {
    header: { marginBottom: isMobile ? '24px' : '32px' },
    title: { fontSize: isMobile ? '20px' : '24px', fontWeight: '900', fontFamily: "'Space Grotesk', sans-serif" },
    statsGrid: { 
      display: 'grid', 
      gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(240px, 1fr))', 
      gap: isMobile ? '12px' : '20px', 
      marginBottom: isMobile ? '24px' : '32px' 
    },
    statCard: { backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: isMobile ? '16px' : '24px', display: 'flex', alignItems: 'center', gap: isMobile ? '12px' : '20px' },
    statIcon: (color) => ({ width: isMobile ? '40px' : '48px', height: isMobile ? '40px' : '48px', borderRadius: '10px', backgroundColor: `${color}11`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: color }),
    toolbar: { 
      display: 'flex', 
      flexDirection: isMobile ? 'column' : 'row',
      justifyContent: 'space-between', 
      alignItems: isMobile ? 'stretch' : 'center', 
      marginBottom: '24px', 
      gap: isMobile ? '12px' : '20px' 
    },
    searchBox: { position: 'relative', flex: 1, maxWidth: isMobile ? '100%' : '400px' },
    input: { width: '100%', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px 16px 12px 40px', color: 'var(--text-primary)', fontSize: '14px', outline: 'none' },
    grid: { display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(350px, 1fr))', gap: '16px' },
    card: { backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', transition: 'all 0.2s' },
    btnAction: (bg, color) => ({ padding: '10px 12px', backgroundColor: bg || 'var(--info)', color: color || '#000', border: 'none', borderRadius: '8px', fontSize: '10px', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', flex: 1, justifyContent: 'center', letterSpacing: '0.05em' })
  };

  if (error) {
    return (
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding: isMobile ? '60px 20px' : '100px 20px', color:'var(--danger)', gap:'12px' }}>
        <AlertCircle size={40} />
        <div style={{ fontSize: '16px', fontWeight: '900' }}>MANIFEST ERROR</div>
        <button onClick={loadShipments} style={{ padding: '8px 16px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', fontWeight: '800', cursor: 'pointer', fontSize: '12px' }}>RETRY</button>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding: isMobile ? '80px 20px' : '120px 20px', color:'var(--text-muted)', gap:'12px' }}>
        <Loader size={32} style={{ animation:'spin 1s linear infinite' }} />
        <div style={{ fontSize: '12px', fontWeight: '800', letterSpacing: '1px' }}>SYNCING MANIFESTS...</div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div>
      <div style={styles.header}>
        <h1 style={styles.title}>INBOUND MANIFEST</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: '600' }}>Processing station: <span style={{ color: 'var(--info)' }}>{activeNodeId}</span></p>
      </div>

      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statIcon('var(--info)')}><Inbox size={isMobile ? 18 : 24} /></div>
          <div>
            <div style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase' }}>Expected</div>
            <div style={{ fontSize: isMobile ? '18px' : '24px', fontWeight: '900' }}>{stats.expected}</div>
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statIcon('var(--warning)')}><Clock size={isMobile ? 18 : 24} /></div>
          <div>
            <div style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase' }}>Delayed</div>
            <div style={{ fontSize: isMobile ? '18px' : '24px', fontWeight: '900' }}>{stats.delayed}</div>
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statIcon('#ef476f')}><AlertCircle size={isMobile ? 18 : 24} /></div>
          <div>
            <div style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase' }}>Flags</div>
            <div style={{ fontSize: isMobile ? '18px' : '24px', fontWeight: '900' }}>{stats.atRisk}</div>
          </div>
        </div>
      </div>

      <div style={styles.toolbar}>
        <div style={styles.searchBox}>
          <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input style={styles.input} placeholder="Filter inbound cargo..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        </div>
      </div>

      {filteredShipments.length === 0 ? (
        <div style={{ padding: '60px 20px', textAlign: 'center', backgroundColor: 'var(--bg-surface)', borderRadius: '16px', border: '1px dashed var(--border)', color: 'var(--text-muted)' }}>
          <Package size={40} style={{ opacity: 0.1, marginBottom: '12px' }} />
          <div style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-primary)' }}>No expected units detected</div>
        </div>
      ) : (
        <div style={styles.grid}>
          {filteredShipments.map(s => {
            const isDelayed = s.status === 'delayed';
            const isFlagged = s.status === 'flagged';
            return (
              <div key={s.id} style={styles.card} onMouseOver={e => e.currentTarget.style.borderColor = 'var(--info)'} onMouseOut={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>MANIFEST: {s.id}</div>
                    <div style={{ fontSize: '15px', fontWeight: '850', color: 'var(--text-primary)' }}>{s.cargo_type}</div>
                  </div>
                  <div style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '9px', fontWeight: '900', textTransform: 'uppercase', backgroundColor: isFlagged ? 'rgba(239, 68, 111, 0.1)' : isDelayed ? 'rgba(255, 209, 102, 0.1)' : 'var(--bg-elevated)', color: isFlagged ? '#ef476f' : isDelayed ? '#ffd166' : 'var(--text-secondary)' }}>
                    {s.status?.replace('_', ' ')}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px', backgroundColor: 'var(--bg-canvas)', borderRadius: '8px' }}>
                   <div style={{ flex: 1 }}>
                     <div style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: '800' }}>ORIGIN</div>
                     <div style={{ fontSize: '11px', fontWeight: '800', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.origin}</div>
                   </div>
                   <ArrowRight size={12} color="var(--text-muted)" />
                   <div style={{ flex: 1, textAlign: 'right' }}>
                     <div style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: '800' }}>DEST</div>
                     <div style={{ fontSize: '11px', fontWeight: '800', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.destination}</div>
                   </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                   <button onClick={() => handleUpdateStatus(s.id, 'arrived')} disabled={!!processing} style={styles.btnAction('var(--brand)', '#000')}>
                     {processing === s.id ? '...' : 'CHECK-IN'}
                   </button>
                   <button onClick={() => handleUpdateStatus(s.id, 'flagged')} disabled={!!processing} style={styles.btnAction('rgba(239, 68, 111, 0.1)', '#ef476f')}>FLAG ISSUE</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
