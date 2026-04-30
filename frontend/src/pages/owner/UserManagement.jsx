import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import { UserPlus, Shield, MapPin, Key, Trash2, X, Check, RefreshCw, Phone, Users, AlertCircle, Loader, ChevronRight } from 'lucide-react';
import { fetchOwnerUsers, createOwnerUser, deleteOwnerUser, updateOwnerUserPassword, fetchOperatorNodes } from '../../services/api';
import { Link, useNavigate } from 'react-router-dom';

export default function UserManagement() {
  const { user: currentUser, getAuthHeaders } = useAuth();
  const navigate = useNavigate();
  const { isMobile } = useBreakpoint();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showConstraintModal, setShowConstraintModal] = useState(false);

  const [newUser, setNewUser] = useState({
    username: '', email: '', mobile: '', password: '', full_name: '', role: 'logistics_manager', assigned_node_ids: ''
  });
  const [newPassword, setNewPassword] = useState('');
  const [nodeCount, setNodeCount] = useState(0);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const [usersData, nodesData] = await Promise.all([
        fetchOwnerUsers(),
        fetchOperatorNodes(getAuthHeaders())
      ]);
      setUsers(usersData.users || []);
      setNodeCount(nodesData.nodes?.length || 0);
    } catch (err) {
      setError(err.message || "Failed to load directory");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const payload = {
        ...newUser,
        assigned_node_ids: newUser.assigned_node_ids.split(',').map(s => s.trim()).filter(Boolean)
      };
      
      if (payload.role === 'node_operator' && nodeCount === 0) {
        setShowConstraintModal(true);
        return;
      }

      await createOwnerUser(payload);
      setSuccess('Team member provisioned');
      setShowAddModal(false);
      setNewUser({ username: '', email: '', mobile: '', password: '', full_name: '', role: 'logistics_manager', assigned_node_ids: '' });
      loadUsers();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (username) => {
    if (!window.confirm(`Terminate access for @${username}?`)) return;
    setError('');
    try {
      await deleteOwnerUser(username);
      setSuccess('Access terminated');
      loadUsers();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError(err.message);
    }
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await updateOwnerUserPassword(showPasswordModal, newPassword);
      setSuccess('Credentials updated');
      setShowPasswordModal(null);
      setNewPassword('');
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError(err.message);
    }
  };

  const styles = {
    container: { padding: isMobile ? '16px' : '24px', display: 'flex', flexDirection: 'column', gap: isMobile ? '16px' : '24px', backgroundColor: 'var(--bg-canvas)', minHeight: '100vh', color: 'var(--text-primary)', fontFamily: "'Inter', sans-serif" },
    header: { display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center', gap: isMobile ? '16px' : '0' },
    title: { fontSize: isMobile ? '20px' : '24px', fontWeight: '900', letterSpacing: '-0.5px' },
    btn: { padding: isMobile ? '10px 14px' : '10px 18px', background: 'var(--brand)', color: '#000', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' },
    refreshBtn: { padding: '10px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: '10px', cursor: 'pointer' },
    grid: { display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(320px, 1fr))', gap: isMobile ? '16px' : '20px' },
    userCard: { backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: isMobile ? '20px' : '24px', display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative' },
    cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
    roleBadge: (r) => ({ fontSize: '9px', fontWeight: '900', padding: '4px 8px', borderRadius: '6px', textTransform: 'uppercase', backgroundColor: r === 'logistics_manager' ? 'var(--info-dim)' : 'var(--status-warning-dim)', color: r === 'logistics_manager' ? 'var(--info)' : 'var(--status-warning)', border: `1px solid ${r === 'logistics_manager' ? 'rgba(59,130,246,0.2)' : 'rgba(255,209,102,0.2)'}` }),
    modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
    modal: { backgroundColor: 'var(--bg-surface)', border: isMobile ? 'none' : '1px solid var(--border)', borderRadius: isMobile ? '0' : '20px', padding: isMobile ? '20px' : '32px', width: '100%', maxWidth: '480px', height: isMobile ? '100%' : 'auto', display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto' },
    inputGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
    input: { width: '100%', padding: '12px 14px', backgroundColor: 'var(--bg-canvas)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text-primary)', fontSize: '14px', outline: 'none' },
    label: { fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' },
    alert: (type) => ({ padding: '12px', borderRadius: '10px', fontSize: '12px', fontWeight: '800', textAlign: 'center', backgroundColor: type === 'error' ? 'var(--status-critical-dim)' : 'var(--brand-dim)', color: type === 'error' ? 'var(--status-critical)' : 'var(--brand)', border: `1px solid ${type === 'error' ? 'rgba(239,71,111,0.2)' : 'rgba(0,229,160,0.2)'}` })
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>TEAM DIRECTORY</h1>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600' }}>Workforce management for <span style={{ color: 'var(--brand)' }}>{currentUser?.company_id || 'Global'}</span></p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button style={styles.refreshBtn} onClick={loadUsers} title="Sync">
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
          <button style={styles.btn} onClick={() => setShowAddModal(true)}>
            <UserPlus size={18} /> PROVISION
          </button>
        </div>
      </div>

      {success && <div style={styles.alert('success')}>{success.toUpperCase()}</div>}
      {error && <div style={styles.alert('error')}>{error.toUpperCase()}</div>}

      {loading && users.length === 0 ? (
        <div style={{ padding: '80px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <Loader size={32} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
          <div style={{ fontSize: '12px', fontWeight: '800' }}>SYNCHRONIZING DIRECTORY...</div>
        </div>
      ) : (
        <div style={styles.grid}>
          {users.map(u => (
            <div key={u.username} style={styles.userCard}>
              <div style={styles.cardHeader}>
                <span style={styles.roleBadge(u.role)}>{(u.role || '').replace('_', ' ')}</span>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button onClick={() => setShowPasswordModal(u.username)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><Key size={16} /></button>
                  <button onClick={() => handleDelete(u.username)} style={{ background: 'none', border: 'none', color: 'var(--status-critical)', cursor: 'pointer' }}><Trash2 size={16} /></button>
                </div>
              </div>
              <div>
                <div style={{ fontSize: '18px', fontWeight: '900', color: 'var(--text-primary)' }}>{u.full_name}</div>
                <div style={{ fontSize: '12px', color: 'var(--brand)', fontWeight: '800' }}>@{u.username}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                <div style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: '600' }}>
                  <Shield size={14} color="var(--text-muted)" />
                  {u.email}
                </div>
                {u.mobile && (
                  <div style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: '600' }}>
                    <Phone size={14} color="var(--text-muted)" />
                    {u.mobile}
                  </div>
                )}
                {u.role === 'node_operator' && (
                  <div style={{ fontSize: '11px', color: 'var(--info)', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', backgroundColor: 'var(--info-dim)', padding: '8px', borderRadius: '8px', fontWeight: '700' }}>
                    <MapPin size={14} />
                    <span>Station: {u.assigned_node_ids?.join(', ') || 'GLOBAL'}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
          {users.length === 0 && !loading && (
            <div style={{ gridColumn: '1 / -1', padding: '60px 20px', textAlign: 'center', backgroundColor: 'var(--bg-surface)', borderRadius: '16px', border: '1px dashed var(--border)' }}>
              <Users size={40} style={{ opacity: 0.1, margin: '0 auto 16px' }} />
              <div style={{ fontSize: '14px', fontWeight: '900' }}>No team members detected</div>
            </div>
          )}
        </div>
      )}

      {showAddModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '900' }}>PROVISION ACCOUNT</h2>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={24} /></button>
            </div>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Full Name</label>
                <input style={styles.input} placeholder="e.g. Sarah Connor" value={newUser.full_name} onChange={e => setNewUser({...newUser, full_name: e.target.value})} required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px' }}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Username</label>
                  <input style={styles.input} placeholder="sconnor" value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value.toLowerCase().replace(/\s/g, '')})} required />
                </div>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Role</label>
                  <select 
                    style={{...styles.input, opacity: nodeCount === 0 && newUser.role === 'node_operator' ? 0.7 : 1}} 
                    value={newUser.role} 
                    onChange={e => setNewUser({...newUser, role: e.target.value})}
                  >
                    <option value="logistics_manager">Logistics Manager</option>
                    <option value="node_operator" disabled={nodeCount === 0}>
                      Node Operator {nodeCount === 0 ? '(Nodes Required)' : ''}
                    </option>
                  </select>
                </div>
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Email Address</label>
                <input style={styles.input} type="email" placeholder="sarah@nerve.com" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} required />
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Temporary Password</label>
                <input style={styles.input} type="password" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} required />
              </div>
              {newUser.role === 'node_operator' && (
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Station Assignment (IDs)</label>
                  <input style={styles.input} placeholder="N01, N02" value={newUser.assigned_node_ids} onChange={e => setNewUser({...newUser, assigned_node_ids: e.target.value})} />
                </div>
              )}
              <button type="submit" style={{ ...styles.btn, width: '100%', marginTop: '10px' }}>PROVISION TEAM MEMBER</button>
            </form>
          </div>
        </div>
      )}

      {showPasswordModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '900' }}>RESET CREDENTIALS</h2>
              <button onClick={() => setShowPasswordModal(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600' }}>Resetting @{showPasswordModal}</div>
            <form onSubmit={handlePasswordUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>New Secure Password</label>
                <input style={styles.input} type="password" placeholder="••••••••" value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
              </div>
              <button type="submit" style={{ ...styles.btn, width: '100%' }}>UPDATE ACCESS</button>
            </form>
          </div>
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } .animate-spin { animation: spin 1s linear infinite; }`}</style>
    </div>
  );
}
