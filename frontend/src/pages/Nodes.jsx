import React, { useState } from 'react';
import { useNetwork } from '../context/NetworkContext';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { Search, MapPin, Box, Zap, Activity, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Nodes() {
  const { nodes } = useNetwork();
  const { isMobile, isTablet } = useBreakpoint();
  const [filterType, setFilterType] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const nodeTypes = ['ALL', ...new Set(nodes.map(n => n.type))];

  const filteredNodes = nodes.filter(node => {
    const matchesType = filterType === 'ALL' || node.type === filterType;
    const matchesSearch = node.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         node.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'operational': return 'var(--status-live)';
      case 'congested': return 'var(--status-warning)';
      case 'alert': return 'var(--status-critical)';
      default: return 'var(--accent-primary)';
    }
  };

  return (
    <div className="animate-slide-up" style={{ padding: isMobile ? '1rem' : '2rem', maxWidth: '1600px', margin: '0 auto', background: 'var(--bg-main)' }}>
      <header style={{ 
        display: 'flex', 
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: isMobile ? 'flex-start' : 'space-between', 
        alignItems: isMobile ? 'flex-start' : 'flex-end', 
        marginBottom: isMobile ? '1.5rem' : '3rem', 
        borderLeft: '4px solid var(--accent-primary)', 
        paddingLeft: '1.5rem',
        gap: isMobile ? '0.5rem' : '0'
      }}>
        <div>
          <h1 style={{ fontSize: isMobile ? '1.25rem' : '1.75rem', fontWeight: 900, color: 'var(--text-main)', margin: 0, letterSpacing: '-0.02em' }}>
            {isMobile ? 'NETWORK INFRA' : 'NETWORK INFRASTRUCTURE'}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.25rem', fontWeight: 600 }}>Active Node Telemetry · Global Distribution</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ textAlign: isMobile ? 'left' : 'right' }}>
            <div style={{ fontSize: isMobile ? '1.25rem' : '1.5rem', fontWeight: 900, color: 'var(--text-main)', lineHeight: 1 }}>{nodes.length}</div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 800 }}>TOTAL NODES</div>
          </div>
        </div>
      </header>

      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '1.5rem', marginBottom: isMobile ? '1.5rem' : '2.5rem', alignItems: isMobile ? 'stretch' : 'center' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: isMobile ? '100%' : '400px' }}>
          <Search size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            placeholder="SEARCH BY ID OR NAME..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ 
              width: '100%', 
              background: 'rgba(255,255,255,0.02)', 
              border: '1px solid var(--glass-border)', 
              padding: '0.8rem 1rem 0.8rem 3rem',
              color: 'var(--text-main)',
              fontSize: '0.75rem',
              fontWeight: 700,
              borderRadius: '4px',
              fontFamily: 'var(--font-mono)',
              minHeight: '44px'
            }} 
          />
        </div>
        <div style={{ 
          display: 'flex', 
          gap: '0.5rem', 
          overflowX: 'auto', 
          paddingBottom: isMobile ? '4px' : '0',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none'
        }}>
          {nodeTypes.map(t => (
            <button 
              key={t} 
              onClick={() => setFilterType(t)}
              style={{ 
                padding: '0.5rem 1rem',
                fontSize: '0.65rem',
                fontWeight: 900,
                borderRadius: '4px',
                cursor: 'pointer',
                background: filterType === t ? 'var(--accent-primary)' : 'rgba(255,255,255,0.02)',
                color: filterType === t ? '#000' : 'var(--text-muted)',
                border: `1px solid ${filterType === t ? 'var(--accent-primary)' : 'var(--glass-border)'}`,
                transition: 'all 0.2s',
                textTransform: 'uppercase',
                whiteSpace: 'nowrap',
                flexShrink: 0
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: isMobile ? '1fr' : (isTablet ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(380px, 1fr))'), 
        gap: isMobile ? '1rem' : '1.5rem' 
      }}>
        {filteredNodes.map(node => {
          const loadRatio = node.current_load / node.capacity;
          const statusColor = getStatusColor(node.status);
          
          return (
            <Link 
              key={node.id} 
              to={`/app/node/${node.id}`}
              className="glass-panel" 
              style={{ 
                padding: isMobile ? '1rem' : '1.5rem', 
                textDecoration: 'none',
                borderLeft: `4px solid ${statusColor}`,
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                transition: 'transform 0.2s, background 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--bg-card)';
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ padding: '0.2rem 0.6rem', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', fontSize: '0.6rem', fontWeight: 900, color: 'var(--text-muted)', border: '1px solid var(--glass-border)' }}>
                      {node.type?.toUpperCase()}
                    </div>
                    <span style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>{node.id}</span>
                 </div>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: statusColor }}></div>
                    <span style={{ fontSize: '0.65rem', fontWeight: 900, color: statusColor, textTransform: 'uppercase' }}>{node.status}</span>
                 </div>
              </div>
              
              <div>
                <h3 style={{ fontSize: isMobile ? '1rem' : '1.1rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.25rem' }}>{node.name}</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.7rem' }}>
                   <MapPin size={12} /> {node.location?.lat.toFixed(2)}, {node.location?.lng.toFixed(2)}
                </div>
              </div>
              
              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '4px' }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 800 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                       <Zap size={10} /> UTILIZATION
                    </div>
                    <span>{Math.round(loadRatio * 100)}%</span>
                 </div>
                 <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ 
                      width: `${loadRatio * 100}%`, 
                      height: '100%', 
                      background: loadRatio > 0.8 ? 'var(--status-critical)' : loadRatio > 0.6 ? 'var(--status-warning)' : 'var(--accent-primary)',
                      boxShadow: `0 0 10px ${loadRatio > 0.8 ? 'var(--status-critical)' : 'var(--accent-primary)'}`
                    }}></div>
                 </div>
                 <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.6rem', color: 'var(--text-muted)' }}>
                    <span>{node.current_load} CUR</span>
                    <span>{node.capacity} CAP</span>
                 </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.5rem', borderTop: '1px solid var(--glass-border)' }}>
                 <div style={{ display: 'flex', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                       <Activity size={12} style={{ color: 'var(--accent-primary)' }} />
                       <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-main)' }}>{node.processing_time_hrs}H</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                       <Box size={12} style={{ color: 'var(--accent-primary)' }} />
                       <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-main)' }}>STABLE</span>
                    </div>
                 </div>
                 <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
