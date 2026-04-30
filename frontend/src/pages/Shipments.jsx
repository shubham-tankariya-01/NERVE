import React, { useState } from 'react';
import { useNetwork } from '../context/NetworkContext';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { Search, Filter, ChevronRight, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const FilterButton = ({ label, active, onClick, color }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        padding: '0.6rem 1.2rem',
        borderRadius: '4px',
        fontSize: '0.7rem',
        fontWeight: 800,
        cursor: 'pointer',
        background: active ? color : 'rgba(255,255,255,0.02)',
        color: active ? '#000' : isHovered ? color : 'var(--text-muted)',
        border: `1px solid ${active ? color : isHovered ? color : 'rgba(255,255,255,0.1)'}`,
        transition: 'all 0.2s ease',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        minWidth: '110px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        whiteSpace: 'nowrap',
        flexShrink: 0
      }}
    >
      {label.replace('_', ' ')}
    </button>
  );
};

export default function Shipments() {
  const { shipments } = useNetwork();
  const navigate = useNavigate();
  const { isMobile, isTablet } = useBreakpoint();
  const [filter, setFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const stats = {
    total: shipments.length,
    inTransit: shipments.filter(s => s.status === 'in_transit').length,
    delayed: shipments.filter(s => s.status === 'delayed').length,
    flagged: shipments.filter(s => s.status === 'flagged').length,
    completed: shipments.filter(s => s.status === 'completed' || s.status === 'delivered').length
  };

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'in_transit': return 'var(--status-info)';
      case 'completed': return 'var(--status-live)';
      case 'flagged': return 'var(--status-critical)';
      case 'delayed': return 'var(--status-warning)';
      case 'delivered': return 'var(--status-live)';
      case 'all': return 'var(--accent-primary)';
      default: return 'var(--text-muted)';
    }
  };

  const filteredShipments = shipments.filter(s => {
    const matchesFilter = filter === 'ALL' || (s.status || '').toUpperCase() === filter;
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch =
      (s.id || '').toLowerCase().includes(searchLower) ||
      (s.origin || '').toLowerCase().includes(searchLower) ||
      (s.destination || '').toLowerCase().includes(searchLower) ||
      (s.cargo_type || '').toLowerCase().includes(searchLower);

    return matchesFilter && matchesSearch;
  });

  return (
    <div className="animate-slide-up" style={{ padding: isMobile ? '1rem' : '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <header style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: 'space-between',
        alignItems: isMobile ? 'flex-start' : 'center',
        marginBottom: isMobile ? '1.5rem' : '2.5rem',
        padding: '1.5rem',
        background: 'rgba(255,255,255,0.02)',
        borderLeft: '4px solid var(--accent-primary)',
        borderRadius: '0 8px 8px 0',
        gap: isMobile ? '1rem' : '0'
      }}>
        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'center', gap: isMobile ? '0.5rem' : '1.5rem' }}>
          <h1 style={{ fontSize: isMobile ? '1.1rem' : '1.5rem', fontWeight: 800, color: 'var(--text-main)', margin: 0, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            {isMobile ? 'Shipment Intelligence' : 'Shipment Intelligence Center'}
          </h1>
          <div style={{ background: 'var(--accent-primary)', color: '#000', padding: '0.3rem 0.8rem', borderRadius: '2px', fontWeight: 900, fontSize: '0.7rem', letterSpacing: '0.05em' }}>
            {shipments.length} UNITS
          </div>
        </div>
      </header>

      {/* Stats Strip */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', 
        gap: isMobile ? '0.75rem' : '1.5rem', 
        marginBottom: isMobile ? '1.5rem' : '2.5rem' 
      }}>
        {[
          { label: 'In Transit', value: stats.inTransit, color: 'var(--status-info)' },
          { label: 'Delayed', value: stats.delayed, color: 'var(--status-warning)' },
          { label: 'Flagged', value: stats.flagged, color: 'var(--status-critical)' },
          { label: 'Completed', value: stats.completed, color: 'var(--status-live)' }
        ].map((stat, i) => (
          <div key={i} className="glass-panel" style={{ padding: isMobile ? '1rem' : '1.5rem', borderBottom: `3px solid ${stat.color}`, background: 'rgba(255,255,255,0.02)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginBottom: '0.25rem', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.1em' }}>{stat.label}</div>
            <div style={{ fontSize: isMobile ? '1.5rem' : '2.25rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1 }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="glass-panel" style={{ 
        padding: '0.75rem 1rem', 
        marginBottom: '1.5rem', 
        display: 'flex', 
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: 'space-between', 
        alignItems: isMobile ? 'stretch' : 'center', 
        background: 'rgba(0,0,0,0.2)',
        gap: isMobile ? '1rem' : '0'
      }}>
        <div style={{ position: 'relative', width: isMobile ? '100%' : '400px' }}>
          <Search size={14} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="SEARCH BY ID, ORIGIN OR CARGO..."
            className="input-control"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: '100%', paddingLeft: '2.5rem', background: 'transparent', border: 'none', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-main)', minHeight: '44px' }}
          />
        </div>

        <div style={{ 
          display: 'flex', 
          gap: '0.5rem', 
          overflowX: isMobile ? 'auto' : 'visible',
          paddingBottom: isMobile ? '4px' : '0',
          msOverflowStyle: 'none',
          scrollbarWidth: 'none'
        }}>
          {['ALL', 'IN_TRANSIT', 'COMPLETED', 'DELAYED', 'FLAGGED'].map(s => (
            <FilterButton
              key={s}
              label={s}
              active={filter === s}
              onClick={() => setFilter(s)}
              color={getStatusColor(s)}
            />
          ))}
        </div>
      </div>

      {/* Shipments List/Table */}
      {isMobile ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {filteredShipments.map(s => {
            const statusColor = getStatusColor(s.status);
            const prog = s.status === 'completed' || s.status === 'delivered' ? 100 : 
                       (s.planned_route && s.planned_route.length > 0 ? 
                        Math.round(((s.route_taken?.length || 0) / s.planned_route.length) * 100) : 0);
            
            return (
              <div 
                key={s.id} 
                onClick={() => navigate(`/app/shipment/${s.id}`)}
                style={{ 
                  background: 'var(--bg-surface)', border: '1px solid var(--glass-border)', borderRadius: '8px', padding: '12px 16px',
                  display: 'flex', flexDirection: 'column', gap: '8px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--accent-primary)', fontSize: '0.9rem' }}>{s.id}</span>
                  <div style={{ 
                    fontSize: '0.65rem', fontWeight: 900, color: statusColor, border: `1px solid ${statusColor}`,
                    padding: '2px 8px', borderRadius: '2px', textTransform: 'uppercase'
                  }}>
                    {s.status.replace('_', ' ')}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: 'var(--text-main)' }}>
                  <span>{s.origin}</span>
                  <ArrowRight size={12} color="var(--text-muted)" />
                  <span>{s.destination}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)' }}>{s.cargo_type.toUpperCase()}</span>
                  <div style={{ background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.6rem', fontWeight: 700 }}>
                    {s.priority.toUpperCase()}
                  </div>
                </div>
                <div style={{ width: '100%', height: '3px', background: 'rgba(255,255,255,0.05)', borderRadius: '1px', marginTop: '4px' }}>
                  <div style={{ width: `${prog}%`, height: '100%', background: statusColor }}></div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="glass-panel" style={{ overflow: 'auto', padding: '0', borderRadius: '4px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8rem', minWidth: '1000px' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--glass-border)' }}>
                <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: 800, letterSpacing: '0.05em' }}>UNIT_ID</th>
                <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: 800, letterSpacing: '0.05em' }}>CARGO_SPEC</th>
                <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: 800, letterSpacing: '0.05em' }}>VECTOR_PATH</th>
                <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: 800, letterSpacing: '0.05em' }}>ETA_SCHEDULE</th>
                <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: 800, letterSpacing: '0.05em', textAlign: 'center' }}>OP_STATUS</th>
                <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: 800, letterSpacing: '0.05em' }}>PROGRESS</th>
                <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: 800, letterSpacing: '0.05em' }}>TELEMETRY</th>
              </tr>
            </thead>
            <tbody>
              {filteredShipments.map(s => {
                const estArrival = new Date(s.estimated_arrival);
                const isCompleted = s.status === 'completed' || s.status === 'delivered';
                const isLate = estArrival < new Date() && !isCompleted;
                const statusColor = getStatusColor(s.status);

                return (
                  <tr key={s.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)', transition: 'background 0.2s' }} className="hover-bg-glow">
                    <td style={{ padding: '1rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--accent-primary)' }}>{s.id}</td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{s.cargo_type.toUpperCase()}</div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{s.priority.toUpperCase()} PRIORITY</div>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ color: 'var(--text-main)' }}>{s.origin} → {s.destination}</div>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ color: isLate ? 'var(--status-critical)' : 'var(--text-main)', fontWeight: 700 }}>
                        {estArrival.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' })}
                      </div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{isLate ? 'SCHEDULE_OVERDUE' : 'ON_SCHEDULE'}</div>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <div style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center', width: '110px', height: '24px', borderRadius: '2px', fontSize: '0.7rem', fontWeight: 900, background: 'rgba(255,255,255,0.03)', color: statusColor, border: `1px solid ${statusColor}`, textTransform: 'uppercase', letterSpacing: '0.05em'
                        }}>
                          {s.status.replace('_', ' ')}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '1rem', width: '140px' }}>
                      {s.planned_route && s.planned_route.length > 0 ? (() => {
                        const isCompleted = s.status === 'completed' || s.status === 'delivered';
                        const prog = isCompleted ? 100 : Math.round(((s.route_taken?.length || 0) / s.planned_route.length) * 100);
                        return (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ flex: 1, height: '3px', background: 'rgba(255,255,255,0.05)', borderRadius: '1px', overflow: 'hidden' }}>
                              <div style={{ width: `${prog}%`, height: '100%', background: statusColor, transition: 'width 0.5s ease-out' }}></div>
                            </div>
                            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>{prog}%</span>
                          </div>
                        );
                      })() : (
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>0%</span>
                      )}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate(`/app/shipment/${s.id}`); }}
                        className="btn-details-hover"
                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-muted)', padding: '0.4rem 0.8rem', borderRadius: '2px', fontSize: '0.65rem', fontWeight: 800, cursor: 'pointer', letterSpacing: '0.05em' }}
                      >
                        VIEW_DATA
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
