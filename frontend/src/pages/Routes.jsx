import React from 'react';
import { useNetwork } from '../hooks/useNetwork';
import { Search } from 'lucide-react';

export default function RoutesPage() {
  const { routes, nodes } = useNetwork();

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 700 }}>Network Routes</h1>
          <span className="badge blue" style={{ fontSize: '1rem' }}>{routes.length}</span>
        </div>
      </header>

      <div className="card" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)' }}>
              <th style={{ padding: '1rem' }}>Route ID</th>
              <th style={{ padding: '1rem' }}>Origin</th>
              <th style={{ padding: '1rem' }}>Destination</th>
              <th style={{ padding: '1rem' }}>Mode</th>
              <th style={{ padding: '1rem' }}>Distance</th>
              <th style={{ padding: '1rem' }}>Transit</th>
              <th style={{ padding: '1rem' }}>Cost/Unit</th>
              <th style={{ padding: '1rem' }}>Risk</th>
              <th style={{ padding: '1rem' }}>Ships</th>
              <th style={{ padding: '1rem' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {routes.map(r => {
              const origin = nodes.find(n => n.id === r.from);
              const dest = nodes.find(n => n.id === r.to);
              return (
                <tr key={r.id} style={{ borderBottom: '1px solid var(--border)' }} className="hover-bg">
                  <td style={{ padding: '1rem', fontWeight: 600 }}>{r.id}</td>
                  <td style={{ padding: '1rem' }}>{origin?.name || r.from}</td>
                  <td style={{ padding: '1rem' }}>{dest?.name || r.to}</td>
                  <td style={{ padding: '1rem' }}>{r.transport_mode || r.mode}</td>
                  <td style={{ padding: '1rem' }}>{r.distance_km || 0} km</td>
                  <td style={{ padding: '1rem' }}>{r.base_transit_time_hrs || 0}h</td>
                  <td style={{ padding: '1rem' }}>${r.cost_per_unit || 0}</td>
                  <td style={{ padding: '1rem', color: (r.risk_factor || 0) > 0.15 ? 'var(--danger)' : 'var(--text-primary)' }}>
                    {Math.round((r.risk_factor || 0) * 100)}%
                  </td>
                  <td style={{ padding: '1rem' }}>{r.activeShips || 0}</td>
                  <td style={{ padding: '1rem' }}>
                    <span className={`badge ${(r.status || 'ACTIVE').toUpperCase() === 'ACTIVE' ? 'green' : 'red'}`}>
                      {r.status || 'ACTIVE'}
                    </span>
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
