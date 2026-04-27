import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { fetchShipments } from '../../services/api';
import { 
  CheckCircle, Clock, Package, MapPin, 
  Search, Loader, Calendar, ArrowRight, User 
} from 'lucide-react';

export default function TodayCheckins() {
  const { user, getAuthHeaders } = useAuth();
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const assignedNodes = user?.assigned_node_ids || [];

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchShipments(getAuthHeaders());
        // Filter shipments that have visited our nodes today (simulated)
        const relevant = (data.shipments || []).filter(s => {
          const lastCheckin = s.route_taken?.[s.route_taken.length - 1];
          return assignedNodes.includes(lastCheckin);
        });
        setShipments(relevant);
      } catch (err) {
        console.error('Failed to fetch check-ins:', err);
      } finally { setLoading(false); }
    })();
  }, [getAuthHeaders, assignedNodes]);

  const filtered = shipments.filter(s => 
    s.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.cargo_type?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const styles = {
    header: { marginBottom: '32px' },
    title: { fontSize: '24px', fontWeight: '800', fontFamily: "'Space Grotesk', sans-serif" },
    tableContainer: {
      backgroundColor: 'var(--bg-surface)',
      border: '1px solid var(--border)',
      borderRadius: '16px',
      overflow: 'hidden',
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
      fontSize: '14px',
    },
    th: {
      textAlign: 'left',
      padding: '16px 24px',
      backgroundColor: 'var(--bg-elevated)',
      color: 'var(--text-muted)',
      fontSize: '11px',
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: '1px',
      borderBottom: '1px solid var(--border)',
    },
    td: {
      padding: '16px 24px',
      borderBottom: '1px solid var(--border)',
      color: 'var(--text-primary)',
    },
    statusPill: {
      padding: '4px 12px',
      borderRadius: '6px',
      fontSize: '11px',
      fontWeight: '700',
      textTransform: 'uppercase',
      backgroundColor: 'var(--brand-dim)',
      color: 'var(--brand)',
      display: 'inline-block',
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '100px', textAlign: 'center' }}>
        <Loader size={32} style={{ animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div>
      <div style={styles.header}>
        <h1 style={styles.title}>DAILY LOGBOOK</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Historical record of units processed during the current shift</p>
      </div>

      <div style={{ marginBottom: '24px', position: 'relative', maxWidth: '400px' }}>
        <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input 
          style={{ width: '100%', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px 16px 12px 44px', color: 'var(--text-primary)', fontSize: '14px', outline: 'none' }} 
          placeholder="Search logbook..." 
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
      </div>

      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Manifest ID</th>
              <th style={styles.th}>Cargo Type</th>
              <th style={styles.th}>Origin / Destination</th>
              <th style={styles.th}>Timestamp</th>
              <th style={styles.th}>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ ...styles.td, textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
                  <Calendar size={32} style={{ opacity: 0.2, marginBottom: '12px' }} />
                  <div>No entries found for the current shift.</div>
                </td>
              </tr>
            ) : (
              filtered.map(s => (
                <tr key={s.id} style={{ transition: 'background 0.2s' }} onMouseOver={e => e.currentTarget.style.backgroundColor = 'var(--bg-canvas)'} onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                  <td style={{ ...styles.td, fontWeight: '700', fontFamily: "'JetBrains Mono', monospace" }}>{s.id}</td>
                  <td style={styles.td}>{s.cargo_type}</td>
                  <td style={styles.td}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                      <span style={{ fontWeight: '600' }}>{s.origin}</span>
                      <ArrowRight size={12} color="var(--text-muted)" />
                      <span style={{ fontWeight: '600' }}>{s.destination}</span>
                    </div>
                  </td>
                  <td style={{ ...styles.td, fontSize: '13px', color: 'var(--text-muted)' }}>
                    {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td style={styles.td}>
                    <div style={styles.statusPill}>CLEARED</div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
