import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { fetchCompanyDetails } from '../../services/api';
import { 
  Building2, Users, Package, MapPin, ChevronLeft, 
  Settings, Mail, Calendar, Shield, Trash2, Edit3, 
  Truck, Loader, AlertTriangle, Activity
} from 'lucide-react';

export default function CompanyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getAuthHeaders } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [newUser, setNewUser] = useState({ username: '', email: '', full_name: '', role: 'node_operator', password: '' });
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    loadData();
  }, [id, getAuthHeaders]);

  const [userSearch, setUserSearch] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/companies/${id}/full-data`, {
        headers: getAuthHeaders()
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Failed to fetch details');
      }
      const res = await response.json();
      setData(res);
    } catch (err) {
      console.error('Failed to fetch details:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/companies/${id}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify(newUser)
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Failed to create user');
      }
      
      setIsUserModalOpen(false);
      setNewUser({ username: '', email: '', full_name: '', role: 'node_operator', password: '' });
      loadData();
    } catch (err) {
      alert(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeactivate = async () => {
    if (!window.confirm("Are you sure you want to deactivate this entire organization?")) return;
    setIsProcessing(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/companies/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({ is_active: !data.company.is_active })
      });
      if (!response.ok) throw new Error('Failed to update status');
      loadData();
    } catch (err) {
      alert(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredWorkers = data?.users?.filter(u => 
    u.role !== 'customer' && 
    (u.full_name?.toLowerCase().includes(userSearch.toLowerCase()) || 
     u.username?.toLowerCase().includes(userSearch.toLowerCase()) ||
     u.email?.toLowerCase().includes(userSearch.toLowerCase()))
  ) || [];

  const styles = {
    container: { padding: '2.5rem', maxWidth: '1600px', margin: '0 auto', background: 'var(--bg-main)', minHeight: '100%' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '3rem' },
    grid: { display: 'grid', gridTemplateColumns: '1.2fr 2fr', gap: '2rem', alignItems: 'stretch' },
    card: { background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '2rem', height: '100%', display: 'flex', flexDirection: 'column' },
    subTitle: { fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' },
    table: { width: '100%', borderCollapse: 'collapse', marginTop: '1rem' },
    th: { textAlign: 'left', padding: '12px', fontSize: '0.7rem', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, background: 'var(--bg-surface)', zIndex: 1 },
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
    }),
    modal: {
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      backdropFilter: 'blur(8px)'
    },
    modalContent: {
      background: 'var(--bg-surface)',
      padding: '2.5rem',
      borderRadius: '20px',
      width: '100%',
      maxWidth: '500px',
      border: '1px solid var(--border)'
    },
    searchInput: {
      background: 'rgba(0,0,0,0.2)',
      border: '1px solid var(--border)',
      borderRadius: '8px',
      padding: '0.5rem 1rem',
      color: 'var(--text-main)',
      fontSize: '0.8rem',
      outline: 'none',
      width: '200px'
    }
  };

  if (loading && !data) {
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
              <div style={{ 
                padding: '4px 12px', 
                background: data.company.is_active ? 'rgba(6, 214, 160, 0.1)' : 'rgba(255, 63, 108, 0.1)', 
                color: data.company.is_active ? '#06d6a0' : '#ef476f', 
                borderRadius: '20px', 
                fontSize: '0.65rem', 
                fontWeight: 800 
              }}>
                {data.company.is_active ? 'ACTIVE ACCOUNT' : 'DEACTIVATED'}
              </div>
            </div>
            <p style={{ color: 'var(--text-muted)', fontWeight: 600, marginTop: '0.25rem' }}>Institutional ID: <span style={{ color: '#ef476f', fontFamily: 'var(--font-mono)' }}>{data.company.id}</span></p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
           <button 
             onClick={handleDeactivate}
             style={styles.btnNoGlow(data.company.is_active ? 'rgba(255, 63, 108, 0.1)' : 'rgba(6, 214, 160, 0.1)')} 
             onMouseOver={e => e.currentTarget.style.opacity = 0.8} 
             onMouseOut={e => e.currentTarget.style.opacity = 1}
           >
             {data.company.is_active ? (
               <>
                 <Trash2 size={18} style={{ color: '#ef476f' }} /> <span style={{ color: '#ef476f' }}>DEACTIVATE</span>
               </>
             ) : (
               <>
                 <Shield size={18} style={{ color: '#06d6a0' }} /> <span style={{ color: '#06d6a0' }}>REACTIVATE</span>
               </>
             )}
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
             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', flex: 1, alignContent: 'center' }}>
                <div>
                   <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-main)' }}>{data.users.filter(u => u.role !== 'customer').length}</div>
                   <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700 }}>STAFF WORKERS</div>
                </div>
                <div>
                   <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-main)' }}>{data.shipments.length}</div>
                   <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700 }}>ACTIVE UNITS</div>
                </div>
                <div>
                   <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-main)' }}>{data.nodes.length}</div>
                   <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700 }}>PRIVATE INFRA</div>
                </div>
                <div>
                   <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#ef476f' }}>{data.nodes.filter(n => n.status !== 'operational').length}</div>
                   <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700 }}>INCIDENTS</div>
                </div>
             </div>
          </div>
        </div>

        <div style={styles.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ ...styles.subTitle, marginBottom: 0 }}><Users size={14} style={{ color: '#ef476f' }} /> INSTITUTIONAL WORKERS</h3>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <input 
                  placeholder="Search workers..." 
                  style={styles.searchInput}
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                />
              </div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', maxHeight: '500px', paddingRight: '0.5rem' }}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>WORKER</th>
                    <th style={styles.th}>ROLE</th>
                    <th style={styles.th}>EMAIL</th>
                    <th style={styles.th}>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredWorkers.map(u => (
                    <tr key={u.username}>
                      <td style={styles.td}>
                         <div style={{ fontWeight: 700 }}>{u.full_name || u.username}</div>
                      </td>
                      <td style={styles.td}>
                         <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#ef476f' }}>{u.role.replace('_', ' ').toUpperCase()}</span>
                      </td>
                      <td style={styles.td}>{u.email}</td>
                      <td style={styles.td}>
                         <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#06d6a0' }}>
                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#06d6a0' }}></div>
                            {u.is_active ? 'ACTIVE' : 'INACTIVE'}
                         </div>
                      </td>
                    </tr>
                  ))}
                  {filteredWorkers.length === 0 && (
                    <tr>
                      <td colSpan="4" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        No workers found matching your query.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
        </div>
      </div>

      <div style={{ marginTop: '2rem' }}>
        <div style={styles.card}>
          <h3 style={styles.subTitle}><Package size={14} style={{ color: '#ef476f' }} /> INVENTORY & LOGISTICS</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
               <div style={styles.subTitle}><Truck size={14} style={{ color: '#ef476f' }} /> RECENT SHIPMENTS</div>
               <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                 <table style={styles.table}>
                   <thead>
                     <tr>
                       <th style={styles.th}>ID</th>
                       <th style={styles.th}>ORIGIN</th>
                       <th style={styles.th}>DEST</th>
                       <th style={styles.th}>STATUS</th>
                     </tr>
                   </thead>
                   <tbody>
                     {data.shipments.map(s => (
                       <tr key={s.id}>
                         <td style={styles.td}><span style={{ fontWeight: 700, color: '#ef476f' }}>{s.id}</span></td>
                         <td style={styles.td}>{s.origin}</td>
                         <td style={styles.td}>{s.destination}</td>
                         <td style={styles.td}><span style={{ fontSize: '0.7rem', fontWeight: 800 }}>{s.status.toUpperCase()}</span></td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
                 {data.shipments.length === 0 && <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>No units recorded.</div>}
               </div>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
               <div style={styles.subTitle}><MapPin size={14} style={{ color: '#ef476f' }} /> ASSIGNED NODES</div>
               <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                 <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>NAME</th>
                        <th style={styles.th}>TYPE</th>
                        <th style={styles.th}>STATUS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.nodes.map(n => (
                        <tr key={n.id}>
                          <td style={styles.td}><span style={{ fontWeight: 700 }}>{n.name}</span></td>
                          <td style={styles.td}><span style={{ fontSize: '0.7rem', color: '#ef476f', fontWeight: 800 }}>{n.type.toUpperCase()}</span></td>
                          <td style={styles.td}>
                             <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: n.status === 'operational' ? '#06d6a0' : '#ef476f' }}>
                                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: n.status === 'operational' ? '#06d6a0' : '#ef476f' }}></div>
                                {n.status.toUpperCase()}
                             </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                 </table>
                 {data.nodes.length === 0 && <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>No private nodes.</div>}
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
