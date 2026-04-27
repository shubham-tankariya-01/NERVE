import React, { useState } from 'react';
import { useNetwork } from '../context/NetworkContext';
import { Search, MapPin, Box, Zap, Activity, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Nodes() {
  const { nodes } = useNetwork();
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
    <div className="animate-slide-up" style={{ padding: '2.5rem 3rem', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
      <header style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        background: 'var(--bg-elevated)', 
        padding: '1.25rem 2rem', 
        borderLeft: '4px solid var(--brand)',
        borderRadius: '0 8px 8px 0',
        marginBottom: '2.5rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              NETWORK INFRASTRUCTURE
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.25rem', fontWeight: 600 }}>Active Node Telemetry • Global Distribution</p>
          </div>
          <div style={{ background: 'var(--brand)', color: '#000', padding: '0.3rem 0.8rem', borderRadius: '4px', fontWeight: 900, fontSize: '0.75rem', letterSpacing: '0.05em' }}>
            {nodes.length} TOTAL NODES
          </div>
        </div>
      </header>

      <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '2.5rem', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
          <Search size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            placeholder="FILTER BY NODE_ID OR LOCATION..." 
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
              fontFamily: 'var(--font-mono)'
            }} 
          />
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
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
                textTransform: 'uppercase'
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '1.5rem' }}>
        {filteredNodes.map(node => {
          const loadRatio = node.current_load / node.capacity;
          const statusColor = getStatusColor(node.status);
          
          return (
            <Link 
              key={node.id} 
              to={`/node/${node.id}`}
              className="glass-panel" 
              style={{ 
                padding: '1.5rem', 
                textDecoration: 'none',
                borderLeft: `4px solid ${statusColor}`,
                display: 'flex',
                flexDirection: 'column',
                gap: '1.25rem',
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
                    <span style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>{node.id}</span>
                 </div>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: statusColor }}></div>
                    <span style={{ fontSize: '0.65rem', fontWeight: 900, color: statusColor, textTransform: 'uppercase' }}>{node.status}</span>
                 </div>
              </div>
              
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.25rem' }}>{node.name}</h3>
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
                 <div style={{ display: 'flex', gap: '1.25rem' }}>
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
