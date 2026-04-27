import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { fetchCompanyDetails } from '../../services/api';
import { 
  Building2, Users, Package, MapPin, ChevronLeft, 
  Settings, Mail, Calendar, Shield, Trash2, Edit3, 
  Truck, Loader, AlertTriangle
} from 'lucide-react';

export default function CompanyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getAuthHeaders } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    console.log("Loading Company Detail for ID:", id);
    (async () => {
      try {
        const res = await fetchCompanyDetails(id, getAuthHeaders());
        console.log("Company Data received:", res);
        setData(res);
      } catch (err) {
        console.error('Failed to fetch details:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [id, getAuthHeaders]);

  const styles = {
    container: { padding: '2.5rem', maxWidth: '1600px', margin: '0 auto', background: 'var(--bg-main)', minHeight: '100%' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '3rem' },
    grid: { display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' },
    card: { background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '2rem' },
    subTitle: { fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' },
    table: { width: '100%', borderCollapse: 'collapse', marginTop: '1rem' },
    th: { textAlign: 'left', padding: '12px', fontSize: '0.7rem', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' },
    td: { padding: '12px', fontSize: '0.85rem', borderBottom: '1px solid var(--glass-border)', color: 'var(--text-main)' },
    btnNoGlow: (color) => ({
      background: color || '#ef476f',
      color: '#fff',
      border: 'none',
      borderRadius: '10px',
      padding: '0.75rem 1.5rem',
      fontSize: '0.85rem',
      fontWeight: 700,
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      boxShadow: 'none',
      transition: 'opacity 0.2s'
    })
  };

  if (loading) {
    return (
      <div style={{ height: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader className="animate-spin" size={32} color="#ef476f" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        <AlertTriangle size={48} style={{ marginBottom: '1.5rem', color: '#ef476f' }} />
        <h2 style={{ color: 'var(--text-main)', marginBottom: '1rem' }}>ERROR: {error || 'Company not found'}</h2>
        <p style={{ marginBottom: '2rem' }}>The requested organization ID (<b>{id}</b>) could not be retrieved from the neural registry.</p>
        <button onClick={() => navigate('/admin')} style={styles.btnNoGlow()}>BACK TO REGISTRY</button>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <button onClick={() => navigate(-1)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <ChevronLeft size={24} />
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <h1 style={{ fontSize: '2.5rem', fontWeight: 900, margin: 0, letterSpacing: '-0.02em', color: 'var(--text-main)' }}>{data.company.name}</h1>
              <div style={{ padding: '4px 12px', background: 'rgba(6, 214, 160, 0.1)', color: '#06d6a0', borderRadius: '20px', fontSize: '0.65rem', fontWeight: 800 }}>ACTIVE ACCOUNT</div>
            </div>
            <p style={{ color: 'var(--text-muted)', fontWeight: 600, marginTop: '0.25rem' }}>Institutional ID: <span style={{ color: '#ef476f', fontFamily: 'var(--font-mono)' }}>{data.company.id}</span></p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
           <button style={styles.btnNoGlow('rgba(255, 63, 108, 0.1)')} onMouseOver={e => e.currentTarget.style.opacity = 0.8} onMouseOut={e => e.currentTarget.style.opacity = 1}>
             <Trash2 size={18} style={{ color: '#ef476f' }} /> <span style={{ color: '#ef476f' }}>DEACTIVATE</span>
           </button>
           <button style={styles.btnNoGlow()} onMouseOver={e => e.currentTarget.style.background = '#d93d5f'} onMouseOut={e => e.currentTarget.style.background = '#ef476f'}>
             <Settings size={18} /> ACCOUNT SETTINGS
           </button>
        </div>
      </header>

      <div style={styles.grid}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={styles.card}>
            <h3 style={styles.subTitle}><Shield size={14} style={{ color: '#ef476f' }} /> ACCOUNT PROFILE</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700 }}>OWNER EMAIL</div>
                <div style={{ fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem', color: 'var(--text-main)' }}>
                  <Mail size={16} style={{ color: '#ef476f' }} /> {data.company.owner_email}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700 }}>SUBSCRIPTION PLAN</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#ef476f', textTransform: 'uppercase', marginTop: '0.25rem' }}>{data.company.plan}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700 }}>MEMBER SINCE</div>
                <div style={{ fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem', color: 'var(--text-main)' }}>
                  <Calendar size={16} style={{ color: '#ef476f' }} /> {new Date(data.company.created_at).toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>

          <div style={styles.card}>
             <h3 style={styles.subTitle}><Activity size={14} style={{ color: '#ef476f' }} /> RESOURCE SUMMARY</h3>
             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div>
                   <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-main)' }}>{data.users.length}</div>
                   <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700 }}>TOTAL USERS</div>
                </div>
                <div>
                   <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-main)' }}>{data.shipments.length}</div>
                   <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700 }}>ACTIVE UNITS</div>
                </div>
                <div>
                   <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-main)' }}>{data.nodes.length}</div>
                   <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700 }}>PRIVATE INFRA</div>
                </div>
             </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={styles.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ ...styles.subTitle, marginBottom: 0 }}><Users size={14} style={{ color: '#ef476f' }} /> USER ACCOUNTS</h3>
              <button style={{ color: '#ef476f', fontSize: '0.75rem', fontWeight: 700, background: 'transparent', border: 'none', cursor: 'pointer' }}>ADD USER</button>
            </div>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>USER</th>
                  <th style={styles.th}>ROLE</th>
                  <th style={styles.th}>EMAIL</th>
                  <th style={styles.th}>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {data.users.map(u => (
                  <tr key={u.username}>
                    <td style={styles.td}>
                       <div style={{ fontWeight: 700 }}>{u.full_name || u.username}</div>
                    </td>
                    <td style={styles.td}>
                       <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#ef476f' }}>{u.role.toUpperCase()}</span>
                    </td>
                    <td style={styles.td}>{u.email}</td>
                    <td style={styles.td}>
                       <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#06d6a0' }}>
                          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#06d6a0' }}></div>
                          VERIFIED
                       </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={styles.card}>
             <h3 style={styles.subTitle}><Package size={14} style={{ color: '#ef476f' }} /> INVENTORY & LOGISTICS</h3>
             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
                   <div style={styles.subTitle}><Truck size={14} style={{ color: '#ef476f' }} /> RECENT SHIPMENTS</div>
                   {data.shipments.slice(0, 3).map(s => (
                     <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '0.8rem' }}>
                       <span style={{ fontWeight: 700, color: '#ef476f' }}>{s.id}</span>
                       <span style={{ color: 'var(--text-muted)' }}>{s.status}</span>
                     </div>
                   ))}
                   {data.shipments.length === 0 && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No units recorded.</div>}
                </div>
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
                   <div style={styles.subTitle}><MapPin size={14} style={{ color: '#ef476f' }} /> ASSIGNED NODES</div>
                   {data.nodes.slice(0, 3).map(n => (
                     <div key={n.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '0.8rem' }}>
                       <span style={{ fontWeight: 700 }}>{n.name}</span>
                       <span style={{ fontSize: '0.7rem', color: '#ef476f' }}>{n.type.toUpperCase()}</span>
                     </div>
                   ))}
                   {data.nodes.length === 0 && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No private nodes.</div>}
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
