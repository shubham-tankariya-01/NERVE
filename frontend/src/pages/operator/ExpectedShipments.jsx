import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { fetchShipments, createCheckin } from '../../services/api';
import { 
  Package, MapPin, Clock, ArrowRight, CheckCircle, 
  Search, Filter, Loader, AlertCircle, TrendingUp, Inbox 
} from 'lucide-react';

export default function ExpectedShipments() {
  const { user, getAuthHeaders } = useAuth();
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [processing, setProcessing] = useState(null);

  const assignedNodes = user?.assigned_node_ids || [];

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchShipments(getAuthHeaders());
        // Filter shipments where the next planned node is one of our assigned nodes
        // OR current_node is one of our nodes
        const relevant = (data.shipments || []).filter(s => {
          const nextIdx = s.route_taken?.length || 0;
          const nextNode = s.planned_route?.[nextIdx];
          return assignedNodes.includes(nextNode) || assignedNodes.includes(s.current_node);
        });
        setShipments(relevant);
      } catch (err) {
        console.error('Failed to fetch shipments:', err);
      } finally { setLoading(false); }
    })();
  }, [getAuthHeaders, assignedNodes]);

  const filteredShipments = useMemo(() => {
    return shipments.filter(s => 
      s.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.cargo_type?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [shipments, searchQuery]);

  const stats = useMemo(() => {
    return {
      expected: shipments.filter(s => s.status !== 'delivered').length,
      delayed: shipments.filter(s => s.status === 'delayed').length,
      arrivedToday: shipments.filter(s => {
         const lastCheckin = s.route_taken?.[s.route_taken.length - 1];
         return assignedNodes.includes(lastCheckin) && s.status !== 'delivered';
      }).length
    };
  }, [shipments, assignedNodes]);

  const handleCheckin = async (shipmentId) => {
    setProcessing(shipmentId);
    try {
      const node = assignedNodes[0]; // Assume first node for simplicity
      await createCheckin({
        shipment_id: shipmentId,
        node_id: node,
        event_type: 'arrival',
        condition: 'good',
        notes: 'Operator confirmed arrival via dashboard'
      }, getAuthHeaders());
      
      // Update local state
      setShipments(prev => prev.map(s => {
        if (s.id === shipmentId) {
          return { ...s, route_taken: [...(s.route_taken || []), node], current_node: node };
        }
        return s;
      }));
    } catch (err) {
      alert('Check-in failed: ' + err.message);
    } finally {
      setProcessing(null);
    }
  };

  const styles = {
    header: { marginBottom: '32px' },
    title: { fontSize: '24px', fontWeight: '800', fontFamily: "'Space Grotesk', sans-serif" },
    statsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
      gap: '20px',
      marginBottom: '32px',
    },
    statCard: {
      backgroundColor: 'var(--bg-surface)',
      border: '1px solid var(--border)',
      borderRadius: '12px',
      padding: '24px',
      display: 'flex',
      alignItems: 'center',
      gap: '20px',
    },
    statIcon: (color) => ({
      width: '48px',
      height: '48px',
      borderRadius: '10px',
      backgroundColor: `${color}11`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: color,
    }),
    toolbar: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '24px',
      gap: '20px',
    },
    searchBox: {
      position: 'relative',
      flex: 1,
      maxWidth: '400px',
    },
    input: {
      width: '100%',
      backgroundColor: 'var(--bg-surface)',
      border: '1px solid var(--border)',
      borderRadius: '10px',
      padding: '12px 16px 12px 44px',
      color: 'var(--text-primary)',
      fontSize: '14px',
      outline: 'none',
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
      gap: '20px',
    },
    card: {
      backgroundColor: 'var(--bg-surface)',
      border: '1px solid var(--border)',
      borderRadius: '14px',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      transition: 'border-color 0.2s',
    }
  };

  if (loading) {
    return (
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'120px 20px', color:'var(--text-secondary)', gap:'16px' }}>
        <Loader size={32} style={{ animation:'spin 1s linear infinite' }} />
        <div style={{ fontSize: '14px', fontWeight: '700', letterSpacing: '1px' }}>LOADING MANIFESTS...</div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div>
      <div style={styles.header}>
        <h1 style={styles.title}>INBOUND LOGISTICS</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Monitor and process shipments arriving at your station</p>
      </div>

      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statIcon('var(--info)')}><Inbox size={24} /></div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase' }}>Inbound Units</div>
            <div style={{ fontSize: '24px', fontWeight: '800' }}>{stats.expected}</div>
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statIcon('var(--warning)')}><Clock size={24} /></div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase' }}>At Risk / Delayed</div>
            <div style={{ fontSize: '24px', fontWeight: '800' }}>{stats.delayed}</div>
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statIcon('var(--brand)')}><CheckCircle size={24} /></div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase' }}>Processed Today</div>
            <div style={{ fontSize: '24px', fontWeight: '800' }}>{stats.arrivedToday}</div>
          </div>
        </div>
      </div>

      <div style={styles.toolbar}>
        <div style={styles.searchBox}>
          <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
          <input 
            style={styles.input} 
            placeholder="Search manifests..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '600' }}>
          Showing {filteredShipments.length} of {shipments.length} relevant units
        </div>
      </div>

      {filteredShipments.length === 0 ? (
        <div style={{ padding: '80px', textAlign: 'center', backgroundColor: 'var(--bg-surface)', borderRadius: '16px', border: '1px dashed var(--border)' }}>
          <Package size={48} style={{ opacity: 0.1, marginBottom: '16px' }} />
          <div style={{ fontSize: '16px', fontWeight: '700' }}>Clear Manifest</div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>No inbound shipments detected for the current query.</div>
        </div>
      ) : (
        <div style={styles.grid}>
          {filteredShipments.map(s => {
            const isDelayed = s.status === 'delayed';
            return (
              <div key={s.id} style={styles.card} onMouseOver={e => e.currentTarget.style.borderColor = 'var(--info)'} onMouseOut={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>ID: {s.id}</div>
                    <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)' }}>{s.cargo_type}</div>
                  </div>
                  <div style={{ 
                    padding: '4px 10px', 
                    borderRadius: '6px', 
                    fontSize: '10px', 
                    fontWeight: '800', 
                    textTransform: 'uppercase',
                    backgroundColor: isDelayed ? 'var(--danger-dim)' : 'var(--bg-elevated)',
                    color: isDelayed ? 'var(--danger)' : 'var(--text-secondary)',
                    border: `1px solid ${isDelayed ? 'rgba(239, 68, 68, 0.2)' : 'transparent'}`
                  }}>
                    {s.status?.replace('_', ' ')}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', backgroundColor: 'var(--bg-canvas)', borderRadius: '10px' }}>
                   <div style={{ flex: 1 }}>
                     <div style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: '700' }}>ORIGIN</div>
                     <div style={{ fontSize: '12px', fontWeight: '700' }}>{s.origin}</div>
                   </div>
                   <ArrowRight size={14} color="var(--text-secondary)" />
                   <div style={{ flex: 1 }}>
                     <div style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: '700' }}>DESTINATION</div>
                     <div style={{ fontSize: '12px', fontWeight: '700' }}>{s.destination}</div>
                   </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Clock size={14} color="var(--text-secondary)" />
                      <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                        {s.estimated_arrival ? new Date(s.estimated_arrival).toLocaleDateString() : 'ETA TBD'}
                      </span>
                   </div>
                   <button 
                    onClick={() => handleCheckin(s.id)}
                    disabled={processing === s.id}
                    style={{ 
                      padding: '8px 16px', 
                      backgroundColor: 'var(--info)', 
                      color: '#000', 
                      border: 'none', 
                      borderRadius: '8px', 
                      fontSize: '12px', 
                      fontWeight: '800', 
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                   >
                     {processing === s.id ? 'PROCESSING...' : (
                       <>
                        <CheckCircle size={14} />
                        CONFIRM ARRIVAL
                       </>
                     )}
                   </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
