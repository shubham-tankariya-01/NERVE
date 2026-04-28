import React from 'react';
import { 
  Package, Truck, CheckCircle, AlertTriangle, 
  ArrowRight, Clock, MapPin 
} from 'lucide-react';

export default function CustomerDashboard() {
  const stats = [
    { label: 'Total Orders', value: '12', icon: Package, color: 'var(--brand)' },
    { label: 'In Transit', value: '4', icon: Truck, color: 'var(--info)' },
    { label: 'Delivered', value: '8', icon: CheckCircle, color: 'var(--status-live)' },
    { label: 'Alerts', value: '1', icon: AlertTriangle, color: 'var(--danger)' },
  ];

  const recentShipments = [
    { id: 'SHP-9021', origin: 'Mumbai', destination: 'Singapore', status: 'IN_TRANSIT', eta: '2 days' },
    { id: 'SHP-8842', origin: 'Chennai', destination: 'Dubai', status: 'DELIVERED', eta: 'Today' },
  ];

  const styles = {
    container: { padding: '24px' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '32px' },
    card: { 
      backgroundColor: 'var(--bg-surface)', 
      border: '1px solid var(--border)', 
      borderRadius: '12px', 
      padding: '20px',
      display: 'flex',
      alignItems: 'center',
      gap: '16px'
    },
    iconWrap: (color) => ({
      width: '48px',
      height: '48px',
      borderRadius: '10px',
      backgroundColor: `${color}15`,
      color: color,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }),
    section: {
      backgroundColor: 'var(--bg-surface)',
      border: '1px solid var(--border)',
      borderRadius: '16px',
      padding: '24px',
      marginBottom: '24px'
    },
    shipmentRow: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '16px 0',
      borderBottom: '1px solid var(--border)'
    }
  };

  return (
    <div style={styles.container}>
      <header style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '4px' }}>Welcome back, Sumit</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Here is what's happening with your supply chain today.</p>
      </header>

      <div style={styles.grid}>
        {stats.map(s => (
          <div key={s.label} style={styles.card}>
            <div style={styles.iconWrap(s.color)}>
              <s.icon size={24} />
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase' }}>{s.label}</div>
              <div style={{ fontSize: '24px', fontWeight: '800' }}>{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        <div style={styles.section}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '700' }}>Active Shipments</h2>
            <button style={{ background: 'none', border: 'none', color: 'var(--brand)', fontWeight: '600', cursor: 'pointer', fontSize: '14px' }}>View all →</button>
          </div>
          {recentShipments.map(shp => (
            <div key={shp.id} style={styles.shipmentRow}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ padding: '8px', backgroundColor: 'var(--bg-canvas)', borderRadius: '8px' }}>
                  <Truck size={20} color="var(--text-secondary)" />
                </div>
                <div>
                  <div style={{ fontWeight: '700', fontSize: '14px' }}>{shp.id}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{shp.origin} → {shp.destination}</div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '12px', fontWeight: '700', color: shp.status === 'DELIVERED' ? 'var(--status-live)' : 'var(--info)' }}>{shp.status}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>ETA: {shp.eta}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={styles.section}>
          <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '20px' }}>Quick Tracking</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <input 
              style={{ 
                width: '100%', padding: '12px', backgroundColor: 'var(--bg-canvas)', 
                border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)' 
              }} 
              placeholder="Enter Shipment ID..." 
            />
            <button style={{ 
              width: '100%', padding: '12px', backgroundColor: 'var(--brand)', 
              color: '#000', border: 'none', borderRadius: '8px', fontWeight: '700' 
            }}>
              TRACK NOW
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
