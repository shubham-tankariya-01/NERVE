import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { fetchCustomerShipments } from '../../services/api';
import { 
  Package, MapPin, ArrowRight, Clock, Loader, 
  Search, Filter, TrendingUp, AlertTriangle, CheckCircle, ChevronRight
} from 'lucide-react';

const FILTERS = ['ALL', 'IN_TRANSIT', 'DELAYED', 'DELIVERED'];
const STATUS_COLORS = { 
  in_transit: 'var(--info)', 
  delayed: 'var(--warning)', 
  delivered: 'var(--brand)', 
  blocked: 'var(--danger)' 
};
const STATUS_BG = { 
  in_transit: 'var(--info-dim)', 
  delayed: 'var(--warning-dim)', 
  delivered: 'var(--brand-dim)', 
  blocked: 'var(--danger-dim)' 
};

export default function MyShipments() {
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const { getAuthHeaders } = useAuth();
  const navigate = useNavigate();

  const loadShipments = useCallback(async () => {
    setLoading(true);
    try {
      const statusParam = activeFilter === 'ALL' ? undefined : activeFilter.toLowerCase();
      const data = await fetchCustomerShipments(statusParam, getAuthHeaders());
      setShipments(data.shipments || []);
    } catch (err) {
      console.error('Failed to load shipments:', err);
      setShipments([]);
    } finally { setLoading(false); }
  }, [activeFilter, getAuthHeaders]);

  useEffect(() => { loadShipments(); }, [loadShipments]);

  // Client-side search and additional filtering
  const filteredShipments = useMemo(() => {
    return shipments.filter(s => {
      const matchesSearch = s.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            s.origin.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            s.destination.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [shipments, searchQuery]);

  // Statistics Calculation
  const stats = useMemo(() => {
    return {
      total: shipments.length,
      active: shipments.filter(s => s.status === 'in_transit').length,
      delayed: shipments.filter(s => s.status === 'delayed').length,
      delivered: shipments.filter(s => s.status === 'delivered').length,
    };
  }, [shipments]);

  if (loading && shipments.length === 0) {
    return (
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'120px 20px', color:'var(--text-secondary)', gap:'16px' }}>
        <Loader size={32} style={{ animation:'spin 1s linear infinite' }} />
        <span style={{ fontSize:'15px', fontWeight:'600', letterSpacing:'1px' }}>SYNCHRONIZING LOGISTICS DATA...</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const styles = {
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
      backgroundColor: `${color}-dim` || 'var(--bg-elevated)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: color || 'var(--text-primary)',
    }),
    toolbar: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '24px',
      gap: '20px',
      flexWrap: 'wrap',
    },
    searchContainer: {
      position: 'relative',
      flex: 1,
      minWidth: '300px',
    },
    searchInput: {
      width: '100%',
      backgroundColor: 'var(--bg-surface)',
      border: '1px solid var(--border)',
      borderRadius: '10px',
      padding: '12px 16px 12px 44px',
      color: 'var(--text-primary)',
      fontSize: '14px',
      outline: 'none',
      transition: 'border-color 0.2s',
    },
    shipmentGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
      gap: '20px',
    },
    shipmentCard: {
      backgroundColor: 'var(--bg-surface)',
      border: '1px solid var(--border)',
      borderRadius: '12px',
      padding: '20px',
      transition: 'all 0.2s',
      cursor: 'pointer',
      position: 'relative',
      overflow: 'hidden',
    }
  };

  return (
    <div>
      {/* Statistics Section */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statIcon('var(--info)')}><TrendingUp size={24} /></div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase' }}>Active Shipments</div>
            <div style={{ fontSize: '24px', fontWeight: '800' }}>{stats.active}</div>
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statIcon('var(--warning)')}><AlertTriangle size={24} /></div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase' }}>Delayed</div>
            <div style={{ fontSize: '24px', fontWeight: '800' }}>{stats.delayed}</div>
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statIcon('var(--brand)')}><CheckCircle size={24} /></div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase' }}>Delivered</div>
            <div style={{ fontSize: '24px', fontWeight: '800' }}>{stats.delivered}</div>
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statIcon('var(--text-secondary)')}><Package size={24} /></div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase' }}>Total Managed</div>
            <div style={{ fontSize: '24px', fontWeight: '800' }}>{stats.total}</div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div style={styles.toolbar}>
        <div style={styles.searchContainer}>
          <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
          <input 
            type="text" 
            placeholder="Search by Shipment ID, Origin, or Destination..." 
            style={styles.searchInput}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={(e) => e.target.style.borderColor = 'var(--brand)'}
            onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
          />
        </div>

        <div style={{ display:'flex', gap:'8px', overflowX:'auto', paddingBottom:'4px' }}>
          {FILTERS.map(f => (
            <button key={f} onClick={() => setActiveFilter(f)} style={{
              padding:'10px 18px', borderRadius:'8px', border:`1px solid ${activeFilter === f ? 'var(--brand)' : 'var(--border)'}`,
              backgroundColor: activeFilter === f ? 'var(--brand-dim)' : 'var(--bg-surface)', color: activeFilter === f ? 'var(--brand)' : 'var(--text-secondary)',
              fontSize:'12px', fontWeight:'700', cursor:'pointer', whiteSpace:'nowrap', transition:'all 0.2s', letterSpacing:'0.5px',
            }}>{f.replace('_',' ')}</button>
          ))}
        </div>
      </div>

      {/* Shipments List */}
      {filteredShipments.length === 0 ? (
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'100px 20px', backgroundColor: 'var(--bg-surface)', borderRadius: '12px', border: '1px dashed var(--border)', color:'var(--text-secondary)', gap:'16px' }}>
          <Package size={48} strokeWidth={1} />
          <div style={{ fontSize:'16px', fontWeight:'700', color: 'var(--text-primary)' }}>No matching shipments found</div>
          <div style={{ fontSize:'14px', textAlign:'center', maxWidth: '400px' }}>
            We couldn't find any shipments matching your current filters or search query. Try adjusting your search term.
          </div>
          <button 
            onClick={() => { setSearchQuery(''); setActiveFilter('ALL'); }}
            style={{ padding: '10px 20px', backgroundColor: 'var(--brand-dim)', color: 'var(--brand)', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}
          >
            Clear All Filters
          </button>
        </div>
      ) : (
        <div style={styles.shipmentGrid}>
          {filteredShipments.map(s => (
            <div 
              key={s.id} 
              onClick={() => navigate(`/customer/track/${s.id}`)}
              style={styles.shipmentCard}
              onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--brand)'}
              onMouseOut={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'16px' }}>
                <div>
                  <div style={{ fontSize:'11px', color:'var(--text-secondary)', fontWeight:'700', textTransform:'uppercase', letterSpacing:'1px', marginBottom: '4px' }}>Shipment ID</div>
                  <div style={{ fontSize:'16px', fontWeight:'800', fontFamily:"'JetBrains Mono', monospace", color: 'var(--brand)' }}>{s.id}</div>
                </div>
                <div style={{ padding:'4px 12px', borderRadius:'6px', fontSize:'11px', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.5px', backgroundColor: STATUS_BG[s.status] || 'var(--bg-elevated)', color: STATUS_COLORS[s.status] || 'var(--text-secondary)' }}>
                  {s.status?.replace('_',' ')}
                </div>
              </div>

              <div style={{ display:'flex', alignItems:'center', gap:'12px', padding: '12px', backgroundColor: 'var(--bg-canvas)', borderRadius: '8px', marginBottom: '16px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600' }}>Origin</div>
                  <div style={{ fontSize: '13px', fontWeight: '700' }}>{s.origin}</div>
                </div>
                <ArrowRight size={16} color="var(--text-secondary)" />
                <div style={{ flex: 1, textAlign: 'right' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600' }}>Destination</div>
                  <div style={{ fontSize: '13px', fontWeight: '700' }}>{s.destination}</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                   <div style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                     <Package size={14} color="var(--text-secondary)" />
                   </div>
                   <div style={{ fontSize: '12px', fontWeight: '600' }}>{s.cargo_type || 'General'}</div>
                </div>
                {s.estimated_arrival && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Clock size={14} color="var(--text-secondary)" />
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: '600' }}>
                      {new Date(s.estimated_arrival).toLocaleDateString('en-US', { month:'short', day:'numeric' })}
                    </div>
                  </div>
                )}
              </div>

              <div style={{ 
                borderTop: '1px solid var(--border)', 
                paddingTop: '12px', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center' 
              }}>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600' }}>View live tracking details</span>
                <ChevronRight size={16} color="var(--brand)" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
