import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import { fetchCompanyDetails } from '../../services/api';
import { useAppWebSocket } from '../../context/WebSocketContext';
import { API_BASE } from '../../config';
import { 
  Building2, Users, Package, MapPin, ChevronLeft, 
  Mail, Calendar, Shield, Trash2, Edit3, 
  Truck, Loader, AlertTriangle, Activity
} from 'lucide-react';

export default function CompanyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getAuthHeaders } = useAuth();
  const { isMobile, isTablet } = useBreakpoint();
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [newUser, setNewUser] = useState({ username: '', email: '', full_name: '', role: 'node_operator', password: '' });
  const [isProcessing, setIsProcessing] = useState(false);

  const { data: wsData } = useAppWebSocket();

  useEffect(() => {
    loadData();
  }, [id, getAuthHeaders]);

  useEffect(() => {
    if (wsData && wsData.type === 'admin_user_created' && wsData.company_id === id) {
      loadData();
    }
  }, [wsData, id]);

  const [userSearch, setUserSearch] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/companies/${id}/full-data`, {
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

  const handleDeactivate = async () => {
    if (!window.confirm("Are you sure you want to update status?")) return;
    setIsProcessing(true);
    try {
      const response = await fetch(`${API_BASE}/companies/${id}`, {
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
    container: { padding: isMobile ? '1rem' : '2.5rem', maxWidth: '1600px', margin: '0 auto', background: 'var(--bg-main)', minHeight: '100%' },
    header: { display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', marginBottom: isMobile ? '1.5rem' : '3rem', gap: '1rem' },
    grid: { display: 'grid', gridTemplateColumns: (isMobile || isTablet) ? '1fr' : '1.2fr 2fr', gap: isMobile ? '1rem' : '2rem' },
    card: { background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: isMobile ? '1.25rem' : '2rem', height: '100%', display: 'flex', flexDirection: 'column' },
    subTitle: { fontSize: '0.65rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' },
    table: { width: '100%', borderCollapse: 'collapse' },
    th: { textAlign: 'left', padding: '12px', fontSize: '0.6rem', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)' },
    td: { padding: '12px', fontSize: '0.75rem', borderBottom: '1px solid var(--glass-border)', color: 'var(--text-main)' },
    btnNoGlow: (color) => ({
      background: color || '#ef476f',
      color: '#fff',
      border: 'none',
      borderRadius: '10px',
      padding: '0.6rem 1.2rem',
      fontSize: '0.75rem',
      fontWeight: 700,
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      minHeight: '44px'
    }),
    searchInput: {
      background: 'rgba(0,0,0,0.2)',
      border: '1px solid var(--border)',
      borderRadius: '8px',
      padding: '0.5rem 1rem',
      color: 'var(--text-main)',
      fontSize: '0.75rem',
      outline: 'none',
      width: isMobile ? '100%' : '200px'
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
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        <AlertTriangle size={48} style={{ marginBottom: '1.5rem', color: '#ef476f' }} />
        <h2 style={{ color: 'var(--text-main)', fontSize: '1.25rem' }}>ERROR</h2>
        <p style={{ fontSize: '0.85rem' }}>{error}</p>
        <button onClick={() => navigate('/admin')} style={{ ...styles.btnNoGlow(), margin: '1rem auto' }}>BACK</button>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '0.75rem' : '1.5rem' }}>
          <button onClick={() => navigate(-1)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '8px' }}>
            <ChevronLeft size={24} />
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', gap: isMobile ? '0.5rem' : '1rem', flexDirection: isMobile ? 'column' : 'row' }}>
              <h1 style={{ fontSize: isMobile ? '1.5rem' : '2.5rem', fontWeight: 900, margin: 0, letterSpacing: '-0.02em', color: 'var(--text-main)' }}>{data.company.name}</h1>
              <div style={{ 
                padding: '4px 10px', 
                background: data.company.is_active ? 'rgba(6, 214, 160, 0.1)' : 'rgba(255, 63, 108, 0.1)', 
                color: data.company.is_active ? '#06d6a0' : '#ef476f', 
                borderRadius: '20px', 
                fontSize: '0.6rem', 
                fontWeight: 800 
              }}>
                {data.company.is_active ? 'ACTIVE' : 'DEACTIVATED'}
              </div>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', width: isMobile ? '100%' : 'auto' }}>
           <button 
             onClick={handleDeactivate}
             style={{ ...styles.btnNoGlow(data.company.is_active ? 'rgba(255, 63, 108, 0.1)' : 'rgba(6, 214, 160, 0.1)'), flex: isMobile ? 1 : 'none', justifyContent: 'center' }} 
           >
             {data.company.is_active ? (
               <>
                 <Trash2 size={16} style={{ color: '#ef476f' }} /> <span style={{ color: '#ef476f' }}>DEACTIVATE</span>
               </>
             ) : (
               <>
                 <Shield size={16} style={{ color: '#06d6a0' }} /> <span style={{ color: '#06d6a0' }}>REACTIVATE</span>
               </>
             )}
           </button>
        </div>
      </header>

      <div style={styles.grid}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={styles.card}>
            <h3 style={styles.subTitle}><Shield size={14} style={{ color: '#ef476f' }} /> PROFILE</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 700 }}>OWNER</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '2px', color: 'var(--text-main)', wordBreak: 'break-all' }}>
                  <Mail size={14} style={{ color: '#ef476f' }} /> {data.company.owner_email}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 700 }}>PLAN</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#ef476f', textTransform: 'uppercase' }}>{data.company.plan}</div>
              </div>
            </div>
          </div>

          <div style={styles.card}>
             <h3 style={styles.subTitle}><Activity size={14} style={{ color: '#ef476f' }} /> RESOURCES</h3>
             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                   <div style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--text-main)' }}>{data.users.filter(u => u.role !== 'customer').length}</div>
                   <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 700 }}>STAFF</div>
                </div>
                <div>
                   <div style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--text-main)' }}>{data.shipments.length}</div>
                   <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 700 }}>UNITS</div>
                </div>
                <div>
                   <div style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--text-main)' }}>{data.nodes.length}</div>
                   <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 700 }}>NODES</div>
                </div>
                <div>
                   <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#ef476f' }}>{data.nodes.filter(n => n.status !== 'operational').length}</div>
                   <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 700 }}>ALERTS</div>
                </div>
             </div>
          </div>
        </div>

        <div style={styles.card}>
            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', marginBottom: '1.5rem', gap: '1rem' }}>
              <h3 style={{ ...styles.subTitle, marginBottom: 0 }}><Users size={14} style={{ color: '#ef476f' }} /> WORKERS</h3>
              <input 
                placeholder="Search..." 
                style={styles.searchInput}
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
              />
            </div>
            <div style={{ flex: 1, overflowX: 'auto' }}>
              <table style={{ ...styles.table, minWidth: isMobile ? '400px' : 'auto' }}>
                <thead>
                  <tr>
                    <th style={styles.th}>WORKER</th>
                    <th style={styles.th}>ROLE</th>
                    <th style={styles.th}>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredWorkers.map(u => (
                    <tr key={u.username}>
                      <td style={styles.td}>
                         <div style={{ fontWeight: 700 }}>{u.full_name || u.username}</div>
                         <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{u.email}</div>
                      </td>
                      <td style={styles.td}>
                         <span style={{ fontSize: '0.6rem', fontWeight: 800, color: '#ef476f' }}>{u.role.replace('_', ' ').toUpperCase()}</span>
                      </td>
                      <td style={styles.td}>
                         <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: u.is_active ? '#06d6a0' : 'var(--text-muted)' }}>
                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: u.is_active ? '#06d6a0' : 'var(--text-muted)' }}></div>
                            {u.is_active ? 'ACTIVE' : 'OFF'}
                         </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
        </div>
      </div>

      <div style={{ marginTop: '1rem' }}>
        <div style={styles.card}>
          <h3 style={styles.subTitle}><Package size={14} style={{ color: '#ef476f' }} /> LOGISTICS</h3>
          <div style={{ display: 'grid', gridTemplateColumns: (isMobile || isTablet) ? '1fr' : '1fr 1fr', gap: '1rem' }}>
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border)', overflow: 'hidden' }}>
               <div style={styles.subTitle}><Truck size={14} style={{ color: '#ef476f' }} /> SHIPMENTS</div>
               <div style={{ overflowX: 'auto' }}>
                 <table style={{ ...styles.table, minWidth: '350px' }}>
                   <thead>
                     <tr>
                       <th style={styles.th}>ID</th>
                       <th style={styles.th}>STATUS</th>
                     </tr>
                   </thead>
                   <tbody>
                     {data.shipments.slice(0, 5).map(s => (
                       <tr key={s.id}>
                         <td style={styles.td}><span style={{ fontWeight: 700, color: '#ef476f' }}>{s.id}</span></td>
                         <td style={styles.td}><span style={{ fontSize: '0.65rem', fontWeight: 800 }}>{s.status.toUpperCase()}</span></td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border)', overflow: 'hidden' }}>
               <div style={styles.subTitle}><MapPin size={14} style={{ color: '#ef476f' }} /> NODES</div>
               <div style={{ overflowX: 'auto' }}>
                 <table style={{ ...styles.table, minWidth: '350px' }}>
                    <thead>
                      <tr>
                        <th style={styles.th}>NAME</th>
                        <th style={styles.th}>STATUS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.nodes.slice(0, 5).map(n => (
                        <tr key={n.id}>
                          <td style={styles.td}><span style={{ fontWeight: 700 }}>{n.name}</span></td>
                          <td style={styles.td}>
                             <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: n.status === 'operational' ? '#06d6a0' : '#ef476f' }}>
                                {n.status.toUpperCase()}
                             </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                 </table>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
