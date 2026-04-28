import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { fetchShipments, createCheckin } from '../../services/api';
import { 
  Package, MapPin, Clock, ArrowRight, CheckCircle, 
  Search, Loader, AlertCircle, Inbox 
} from 'lucide-react';

export default function ExpectedShipments() {
  const { user, getAuthHeaders, activeNodeId } = useAuth();
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
      const data = await fetchShipments(getAuthHeaders(), activeNodeId);
      // Only show shipments that are NOT arrived at this node yet
      // A shipment is "expected" if it's currently at a previous node or in transit to this node
      const expected = data.shipments.filter(s => s.current_node !== activeNodeId);
      setShipments(expected);
    } catch (err) {
      console.error('Failed to fetch shipments:', err);
      setError('Failed to synchronize manifests. Please try again.');
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
      
      // Refresh list
      await loadShipments();
    } catch (err) {
      alert('Update failed: ' + err.message);
    } finally {
      setProcessing(null);
    }
  };

  const styles = {
    header: { marginBottom: '32px' },
    title: { fontSize: '24px', fontWeight: '800', fontFamily: "'Space Grotesk', sans-serif" },
    statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '32px' },
    statCard: { backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px', display: 'flex', alignItems: 'center', gap: '20px' },
    statIcon: (color) => ({ width: '48px', height: '48px', borderRadius: '10px', backgroundColor: `${color}11`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: color }),
    toolbar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', gap: '20px' },
    searchBox: { position: 'relative', flex: 1, maxWidth: '400px' },
    input: { width: '100%', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px 16px 12px 44px', color: 'var(--text-primary)', fontSize: '14px', outline: 'none' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '20px' },
    card: { backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', transition: 'border-color 0.2s' },
    btnAction: (bg, color) => ({ padding: '8px 12px', backgroundColor: bg || 'var(--info)', color: color || '#000', border: 'none', borderRadius: '8px', fontSize: '11px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', flex: 1, justifyContent: 'center' })
  };

  if (error) {
    return (
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'120px 20px', color:'var(--danger)', gap:'16px' }}>
        <AlertCircle size={48} />
        <div style={{ fontSize: '18px', fontWeight: '800' }}>MANIFEST SYNC ERROR</div>
        <div style={{ fontSize: '14px', color: 'var(--text-muted)', textAlign: 'center', maxWidth: '400px' }}>{error}</div>
        <button onClick={loadShipments} style={{ marginTop: '1rem', padding: '0.75rem 1.5rem', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', fontWeight: '700', cursor: 'pointer' }}>RETRY CONNECTION</button>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'120px 20px', color:'var(--text-muted)', gap:'16px' }}>
        <Loader size={32} style={{ animation:'spin 1s linear infinite' }} />
        <div style={{ fontSize: '14px', fontWeight: '700', letterSpacing: '1px' }}>SYNCING MANIFESTS...</div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div>
      <div style={styles.header}>
        <h1 style={styles.title}>STATION MANIFEST</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Inbound units for: <span style={{ color: 'var(--info)', fontWeight: '700' }}>{activeNodeId}</span></p>
      </div>

      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statIcon('var(--info)')}><Inbox size={24} /></div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Inbound Units</div>
            <div style={{ fontSize: '24px', fontWeight: '800' }}>{stats.expected}</div>
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statIcon('var(--warning)')}><Clock size={24} /></div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Reported Delayed</div>
            <div style={{ fontSize: '24px', fontWeight: '800' }}>{stats.delayed}</div>
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statIcon('#ef476f')}><AlertCircle size={24} /></div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Flagged Incidents</div>
            <div style={{ fontSize: '24px', fontWeight: '800' }}>{stats.atRisk}</div>
          </div>
        </div>
      </div>

      <div style={styles.toolbar}>
        <div style={styles.searchBox}>
          <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input style={styles.input} placeholder="Filter inbound cargo..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        </div>
        <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '600' }}>
          Manifest contains {filteredShipments.length} units
        </div>
      </div>

      {filteredShipments.length === 0 ? (
        <div style={{ padding: '80px', textAlign: 'center', backgroundColor: 'var(--bg-surface)', borderRadius: '16px', border: '1px dashed var(--border)' }}>
          <Package size={48} style={{ opacity: 0.1, marginBottom: '16px' }} />
          <div style={{ fontSize: '16px', fontWeight: '700' }}>Clear Horizon</div>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No shipments under this node is being executing.</div>
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
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>MANIFEST ID: {s.id}</div>
                    <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)' }}>{s.cargo_type}</div>
                  </div>
                  <div style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', backgroundColor: isFlagged ? 'rgba(239, 68, 111, 0.1)' : isDelayed ? 'rgba(255, 209, 102, 0.1)' : 'var(--bg-elevated)', color: isFlagged ? '#ef476f' : isDelayed ? '#ffd166' : 'var(--text-secondary)', border: `1px solid ${isFlagged ? '#ef476f' : 'transparent'}` }}>
                    {s.status?.replace('_', ' ')}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', backgroundColor: 'var(--bg-canvas)', borderRadius: '10px' }}>
                   <div style={{ flex: 1 }}>
                     <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700' }}>ORIGIN</div>
                     <div style={{ fontSize: '12px', fontWeight: '700' }}>{s.origin}</div>
                   </div>
                   <ArrowRight size={14} color="var(--text-muted)" />
                   <div style={{ flex: 1 }}>
                     <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700' }}>DESTINATION</div>
                     <div style={{ fontSize: '12px', fontWeight: '700' }}>{s.destination}</div>
                   </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
                   <button onClick={() => handleUpdateStatus(s.id, 'arrived')} disabled={!!processing} style={styles.btnAction('var(--info)', '#000')}>
                     {processing === s.id ? '...' : <CheckCircle size={14} />} ARRIVED
                   </button>
                   <button onClick={() => handleUpdateStatus(s.id, 'delayed')} disabled={!!processing} style={styles.btnAction('rgba(255, 209, 102, 0.1)', '#ffd166')}>DELAYED</button>
                   <button onClick={() => handleUpdateStatus(s.id, 'flagged')} disabled={!!processing} style={styles.btnAction('rgba(239, 68, 111, 0.1)', '#ef476f')}>FLAG</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
