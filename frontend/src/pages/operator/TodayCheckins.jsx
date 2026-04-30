import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { fetchShipments, fetchNodeCheckins } from '../../services/api';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import { 
  CheckCircle, Clock, Package, MapPin, 
  Search, Loader, Calendar, ArrowRight, Activity, ChevronRight, Filter
} from 'lucide-react';

export default function TodayCheckins() {
  const { user, getAuthHeaders, activeNodeId } = useAuth();
  const { isMobile } = useBreakpoint();
  
  const [shipments, setShipments] = useState([]);
  const [recentLogs, setRecentLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [view, setView] = useState('active'); // 'active' or 'history'

  const loadData = async () => {
    if (!activeNodeId) return;
    try {
      setLoading(true);
      const [shipData, logsData] = await Promise.all([
        fetchShipments(getAuthHeaders(), activeNodeId),
        fetchNodeCheckins(activeNodeId, getAuthHeaders())
      ]);
      
      // Shipments currently at this station
      const atNode = (shipData.shipments || []).filter(s => s.current_node === activeNodeId);
      setShipments(atNode);
      
      // Recent event logs
      setRecentLogs(logsData || []);
    } catch (err) {
      console.error('Failed to sync station logbook:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [getAuthHeaders, activeNodeId]);

  const filteredShipments = shipments.filter(s => 
    s.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.cargo_type?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredLogs = recentLogs.filter(l => 
    l.shipment_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.event_type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const styles = {
    container: { padding: isMobile ? '16px' : '24px', display: 'flex', flexDirection: 'column', gap: '24px' },
    header: { display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', gap: '16px' },
    title: { fontSize: isMobile ? '20px' : '24px', fontWeight: '900', fontFamily: "'Space Grotesk', sans-serif" },
    tabs: { display: 'flex', gap: '8px', backgroundColor: 'var(--bg-surface)', padding: '4px', borderRadius: '10px', border: '1px solid var(--border)' },
    tab: (active) => ({ padding: '8px 16px', borderRadius: '8px', fontSize: '11px', fontWeight: '900', cursor: 'pointer', border: 'none', backgroundColor: active ? 'var(--bg-elevated)' : 'transparent', color: active ? 'var(--brand)' : 'var(--text-muted)', transition: 'all 0.2s' }),
    grid: { display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(350px, 1fr))', gap: '16px' },
    card: { backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' },
    logItem: { display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '12px' },
    statusPill: (type) => ({ padding: '3px 8px', borderRadius: '4px', fontSize: '9px', fontWeight: '900', textTransform: 'uppercase', backgroundColor: type === 'arrived' ? 'var(--brand-dim)' : 'var(--info-dim)', color: type === 'arrived' ? 'var(--brand)' : 'var(--info)' })
  };

  if (loading) {
    return (
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding: isMobile ? '100px 20px' : '150px 20px', color:'var(--text-muted)', gap:'16px' }}>
        <Loader size={32} style={{ animation: 'spin 1s linear infinite' }} />
        <div style={{ fontSize: '12px', fontWeight: '800' }}>SYNCHRONIZING STATION LOGS...</div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>STATION LOGBOOK</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: '600', marginTop: '4px' }}>
            Operational Node: <span style={{ color: 'var(--brand)' }}>{activeNodeId}</span>
          </p>
        </div>
        <div style={styles.tabs}>
          <button style={styles.tab(view === 'active')} onClick={() => setView('active')}>ACTIVE UNITS</button>
          <button style={styles.tab(view === 'history')} onClick={() => setView('history')}>RECENT ACTIVITY</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: isMobile ? '100%' : '400px' }}>
          <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            style={{ width: '100%', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px 16px 12px 40px', color: 'var(--text-primary)', fontSize: '14px', outline: 'none' }} 
            placeholder="Search manifests..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <button onClick={loadData} style={{ padding: '12px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text-muted)', cursor: 'pointer' }}>
          <Activity size={18} />
        </button>
      </div>

      {view === 'active' ? (
        <>
          {filteredShipments.length === 0 ? (
            <div style={{ padding: '80px 20px', textAlign: 'center', backgroundColor: 'var(--bg-surface)', borderRadius: '16px', border: '1px dashed var(--border)', color: 'var(--text-muted)' }}>
              <Package size={40} style={{ opacity: 0.1, marginBottom: '16px' }} />
              <div style={{ fontSize: '14px', fontWeight: '900', color: 'var(--text-primary)' }}>No units currently at station</div>
              <p style={{ fontSize: '11px', marginTop: '8px' }}>Check Expected Shipments to process inbound cargo.</p>
            </div>
          ) : (
            <div style={styles.grid}>
              {filteredShipments.map(s => (
                <div key={s.id} style={styles.card}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>MANIFEST: {s.id}</div>
                      <div style={{ fontSize: '15px', fontWeight: '850', color: 'var(--text-primary)' }}>{s.cargo_type}</div>
                    </div>
                    <div style={styles.statusPill('arrived')}>STATIONED</div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px', backgroundColor: 'var(--bg-canvas)', borderRadius: '10px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: '800' }}>FROM</div>
                      <div style={{ fontSize: '11px', fontWeight: '800' }}>{s.origin}</div>
                    </div>
                    <ArrowRight size={12} color="var(--text-muted)" />
                    <div style={{ flex: 1, textAlign: 'right' }}>
                      <div style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: '800' }}>TO</div>
                      <div style={{ fontSize: '11px', fontWeight: '800' }}>{s.destination}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700' }}>
                     <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Clock size={12} />
                        <span>Status: {s.status.toUpperCase()}</span>
                     </div>
                     <span style={{ color: s.priority === 'critical' ? 'var(--status-critical)' : 'inherit' }}>{s.priority.toUpperCase()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filteredLogs.length === 0 ? (
            <div style={{ padding: '80px 20px', textAlign: 'center', backgroundColor: 'var(--bg-surface)', borderRadius: '16px', border: '1px dashed var(--border)', color: 'var(--text-muted)' }}>
              <Calendar size={40} style={{ opacity: 0.1, marginBottom: '16px' }} />
              <div style={{ fontSize: '14px', fontWeight: '900', color: 'var(--text-primary)' }}>No activity recorded today</div>
            </div>
          ) : (
            filteredLogs.map(log => (
              <div key={log.id} style={styles.logItem}>
                <div style={{ padding: '10px', backgroundColor: 'var(--bg-canvas)', borderRadius: '8px' }}>
                  <Activity size={18} color={log.event_type === 'arrived' ? 'var(--brand)' : 'var(--info)'} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', fontWeight: '900' }}>{log.shipment_id}</span>
                    <span style={styles.statusPill(log.event_type)}>{log.event_type}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700' }}>{log.notes || 'Routine check-in'}</span>
                    <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: '800' }}>{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
                <ChevronRight size={16} color="var(--text-muted)" />
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
