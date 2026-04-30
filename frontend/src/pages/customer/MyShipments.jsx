import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { fetchCustomerShipments } from '../../services/api';
import { useBreakpoint } from '../../hooks/useBreakpoint';
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
  const { isMobile } = useBreakpoint();
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

  const filteredShipments = useMemo(() => {
    return shipments.filter(s => {
      const matchesSearch = s.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            s.origin.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            s.destination.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [shipments, searchQuery]);

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
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding: isMobile ? '80px 20px' : '120px 20px', color:'var(--text-muted)', gap:'16px' }}>
        <Loader size={32} style={{ animation:'spin 1s linear infinite' }} />
        <span style={{ fontSize:'13px', fontWeight:'700', letterSpacing:'1px' }}>SYNCHRONIZING FLEET...</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const styles = {
    statsGrid: {
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(240px, 1fr))',
      gap: isMobile ? '12px' : '20px',
      marginBottom: isMobile ? '24px' : '32px',
    },
    statCard: {
      backgroundColor: 'var(--bg-surface)',
      border: '1px solid var(--border)',
      borderRadius: '12px',
      padding: isMobile ? '16px' : '24px',
      display: 'flex',
      alignItems: 'center',
      gap: isMobile ? '12px' : '20px',
    },
    statIcon: (color) => ({
      width: isMobile ? '40px' : '48px',
      height: isMobile ? '40px' : '48px',
      borderRadius: '8px',
      backgroundColor: `${color}11`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: color,
    }),
    toolbar: {
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      justifyContent: 'space-between',
      alignItems: isMobile ? 'stretch' : 'center',
      marginBottom: '24px',
      gap: isMobile ? '16px' : '20px',
    },
    searchContainer: {
      position: 'relative',
      flex: 1,
      minWidth: isMobile ? '100%' : '300px',
    },
    searchInput: {
      width: '100%',
      backgroundColor: 'var(--bg-surface)',
      border: '1px solid var(--border)',
      borderRadius: '10px',
      padding: '12px 16px 12px 40px',
      color: 'var(--text-primary)',
      fontSize: '14px',
      outline: 'none',
      transition: 'border-color 0.2s',
    },
    shipmentGrid: {
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(350px, 1fr))',
      gap: isMobile ? '16px' : '20px',
    },
    shipmentCard: {
      backgroundColor: 'var(--bg-surface)',
      border: '1px solid var(--border)',
      borderRadius: '14px',
      padding: '16px',
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
          <div style={styles.statIcon('var(--info)')}><TrendingUp size={isMobile ? 18 : 24} /></div>
          <div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Active</div>
            <div style={{ fontSize: isMobile ? '18px' : '24px', fontWeight: '800' }}>{stats.active}</div>
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statIcon('var(--warning)')}><AlertTriangle size={isMobile ? 18 : 24} /></div>
          <div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Delayed</div>
            <div style={{ fontSize: isMobile ? '18px' : '24px', fontWeight: '800' }}>{stats.delayed}</div>
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statIcon('var(--brand)')}><CheckCircle size={isMobile ? 18 : 24} /></div>
          <div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Delivered</div>
            <div style={{ fontSize: isMobile ? '18px' : '24px', fontWeight: '800' }}>{stats.delivered}</div>
          </div>
        </div>
        {!isMobile && (
          <div style={styles.statCard}>
            <div style={styles.statIcon('var(--text-secondary)')}><Package size={24} /></div>
            <div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Total Managed</div>
              <div style={{ fontSize: '24px', fontWeight: '800' }}>{stats.total}</div>
            </div>
          </div>
        )}
      </div>

      {/* Toolbar */}
      <div style={styles.toolbar}>
        <div style={styles.searchContainer}>
          <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            placeholder="Search manifests..." 
            style={styles.searchInput}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div style={{ display:'flex', gap:'6px', overflowX:'auto', paddingBottom:'4px', WebkitOverflowScrolling: 'touch' }}>
          {FILTERS.map(f => (
            <button key={f} onClick={() => setActiveFilter(f)} style={{
              padding:'8px 14px', borderRadius:'8px', border:`1px solid ${activeFilter === f ? 'var(--brand)' : 'var(--border)'}`,
              backgroundColor: activeFilter === f ? 'var(--brand-dim)' : 'var(--bg-surface)', color: activeFilter === f ? 'var(--brand)' : 'var(--text-secondary)',
              fontSize:'11px', fontWeight:'800', cursor:'pointer', whiteSpace:'nowrap', transition:'all 0.2s', letterSpacing:'0.5px',
            }}>{f.replace('_',' ')}</button>
          ))}
        </div>
      </div>

      {/* Shipments List */}
      {filteredShipments.length === 0 ? (
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'60px 20px', backgroundColor: 'var(--bg-surface)', borderRadius: '12px', border: '1px dashed var(--border)', color:'var(--text-muted)', gap:'12px' }}>
          <Package size={40} strokeWidth={1} />
          <div style={{ fontSize:'15px', fontWeight:'700', color: 'var(--text-primary)' }}>No manifests found</div>
          <button 
            onClick={() => { setSearchQuery(''); setActiveFilter('ALL'); }}
            style={{ padding: '8px 16px', backgroundColor: 'var(--brand-dim)', color: 'var(--brand)', border: 'none', borderRadius: '6px', fontWeight: '800', fontSize: '12px', cursor: 'pointer' }}
          >
            Clear Filters
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
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'12px' }}>
                <div>
                  <div style={{ fontSize:'9px', color:'var(--text-muted)', fontWeight:'800', textTransform:'uppercase', letterSpacing:'1px', marginBottom: '2px' }}>ID: {s.id}</div>
                  <div style={{ fontSize:'15px', fontWeight:'850', color: 'var(--text-primary)' }}>{s.cargo_type}</div>
                </div>
                <div style={{ padding:'3px 8px', borderRadius:'4px', fontSize:'9px', fontWeight:'900', textTransform:'uppercase', backgroundColor: STATUS_BG[s.status] || 'var(--bg-elevated)', color: STATUS_COLORS[s.status] || 'var(--text-secondary)' }}>
                  {s.status?.replace('_',' ')}
                </div>
              </div>

              <div style={{ display:'flex', alignItems:'center', gap: '8px', padding: '10px', backgroundColor: 'var(--bg-canvas)', borderRadius: '8px', marginBottom: '12px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: '700' }}>ORIGIN</div>
                  <div style={{ fontSize: '11px', fontWeight: '800', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.origin}</div>
                </div>
                <ArrowRight size={14} color="var(--text-muted)" />
                <div style={{ flex: 1, textAlign: 'right' }}>
                  <div style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: '700' }}>DEST</div>
                  <div style={{ fontSize: '11px', fontWeight: '800', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.destination}</div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)' }}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Clock size={12} />
                    <span>ETA: {s.estimated_arrival ? new Date(s.estimated_arrival).toLocaleDateString() : 'TBD'}</span>
                 </div>
                 <ChevronRight size={14} color="var(--brand)" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
