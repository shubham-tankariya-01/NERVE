import React, { useState } from 'react';
import { useNetwork } from '../context/NetworkContext';
import { Search, Filter, ChevronRight } from 'lucide-react';
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
        justifyContent: 'center'
      }}
    >
      {label.replace('_', ' ')}
    </button>
  );
};

export default function Shipments() {
  const { shipments } = useNetwork();
  const navigate = useNavigate();
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
    <div className="animate-slide-up" style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2.5rem',
        padding: '1.5rem',
        background: 'rgba(255,255,255,0.02)',
        borderLeft: '4px solid var(--accent-primary)',
        borderRadius: '0 8px 8px 0'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', margin: 0, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Shipment Intelligence Center
          </h1>
          <div style={{ background: 'var(--accent-primary)', color: '#000', padding: '0.3rem 0.8rem', borderRadius: '2px', fontWeight: 900, fontSize: '0.75rem', letterSpacing: '0.05em' }}>
            {shipments.length} ACTIVE UNITS
          </div>
        </div>
      </header>

      {/* Stats Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '2.5rem' }}>
        {[
          { label: 'In Transit', value: stats.inTransit, color: 'var(--status-info)' },
          { label: 'Delayed', value: stats.delayed, color: 'var(--status-warning)' },
          { label: 'Flagged', value: stats.flagged, color: 'var(--status-critical)' },
          { label: 'Completed', value: stats.completed, color: 'var(--status-live)' }
        ].map((stat, i) => (
          <div key={i} className="glass-panel" style={{ padding: '1.5rem', borderBottom: `3px solid ${stat.color}`, background: 'rgba(255,255,255,0.02)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.1em' }}>{stat.label}</div>
            <div style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1 }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="glass-panel" style={{ padding: '0.75rem 1rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)' }}>
        <div style={{ position: 'relative', width: '400px' }}>
          <Search size={14} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="FILTER BY ID, ORIGIN OR DESTINATION..."
            className="input-control"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: '100%', paddingLeft: '2.5rem', background: 'transparent', border: 'none', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-main)' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
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

      {/* Table Container */}
      <div className="glass-panel" style={{ overflow: 'hidden', padding: '0', borderRadius: '4px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8rem' }}>
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
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '110px',
                        height: '24px',
                        borderRadius: '2px',
                        fontSize: '0.7rem',
                        fontWeight: 900,
                        background: 'rgba(255,255,255,0.03)',
                        color: statusColor,
                        border: `1px solid ${statusColor}`,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
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
                      onClick={(e) => { e.stopPropagation(); navigate(`/shipment/${s.id}`); }}
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
    </div>
  );
}
