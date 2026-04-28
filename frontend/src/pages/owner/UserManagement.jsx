import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { UserPlus, Shield, MapPin, Key, Trash2, X, Check, RefreshCw, Phone, Users, AlertCircle } from 'lucide-react';
import { fetchOwnerUsers, createOwnerUser, deleteOwnerUser, updateOwnerUserPassword, fetchOperatorNodes } from '../../services/api';
import { Link, useNavigate } from 'react-router-dom';

export default function UserManagement() {
  const { user: currentUser, getAuthHeaders } = useAuth();
  const navigate = useNavigate();
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
      setError(err.message || "Failed to load organizational directory");
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
      
      setSuccess('Team member provisioned successfully');
      setShowAddModal(false);
      setNewUser({ username: '', email: '', mobile: '', password: '', full_name: '', role: 'logistics_manager', assigned_node_ids: '' });
      loadUsers();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (username) => {
    if (!window.confirm(`Are you sure you want to terminate access for @${username}?`)) return;
    setError('');
    try {
      await deleteOwnerUser(username);
      setSuccess('User access terminated');
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
      setSuccess('Credentials updated successfully');
      setShowPasswordModal(null);
      setNewPassword('');
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError(err.message);
    }
  };

  const s = {
    container: { padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px', backgroundColor: '#060b19', minHeight: '100vh', color: '#e2e8f0', fontFamily: "'Inter', sans-serif" },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    title: { fontSize: '24px', fontWeight: '800', letterSpacing: '-0.5px' },
    btn: { padding: '10px 18px', background: 'linear-gradient(135deg, #00E5A0, #00b4d8)', color: '#000', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'transform 0.2s' },
    refreshBtn: { padding: '8px', background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', cursor: 'pointer' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' },
    userCard: { backgroundColor: '#0a1128', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative', overflow: 'hidden' },
    cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
    roleBadge: (r) => ({ fontSize: '10px', fontWeight: '800', padding: '4px 8px', borderRadius: '6px', textTransform: 'uppercase', backgroundColor: r === 'logistics_manager' ? 'rgba(0, 180, 216, 0.15)' : 'rgba(255, 209, 102, 0.15)', color: r === 'logistics_manager' ? '#00B4D8' : '#FFD166', letterSpacing: '0.5px' }),
    modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
    modal: { backgroundColor: '#0a1128', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '440px', display: 'flex', flexDirection: 'column', gap: '24px', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' },
    inputGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
    input: { width: '100%', padding: '12px 14px', backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#e2e8f0', fontSize: '14px', outline: 'none', transition: 'border-color 0.2s' },
    label: { fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' },
    alert: (type) => ({ padding: '14px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', textAlign: 'center', backgroundColor: type === 'error' ? 'rgba(239, 71, 111, 0.1)' : 'rgba(0, 229, 160, 0.1)', color: type === 'error' ? '#EF476F' : '#00E5A0', border: `1px solid ${type === 'error' ? 'rgba(239, 71, 111, 0.3)' : 'rgba(0, 229, 160, 0.3)'}` })
  };

  return (
    <div style={s.container}>
      <div style={s.header}>
        <div>
          <h1 style={s.title}>TEAM ADMINISTRATION</h1>
          <p style={{ fontSize: '14px', color: '#64748b', marginTop: '4px' }}>Managing workforce for <b style={{ color: '#00E5A0' }}>{currentUser?.company_id || 'your company'}</b></p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button style={s.refreshBtn} onClick={loadUsers} title="Refresh List">
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
          <button style={s.btn} onClick={() => setShowAddModal(true)}>
            <UserPlus size={18} /> ADD MEMBER
          </button>
        </div>
      </div>

      {success && <div style={s.alert('success')}>{success}</div>}
      {error && (
        <div style={s.alert('error')}>
          <p>{error}</p>
          <button onClick={loadUsers} style={{ background: 'none', border: 'none', color: 'inherit', textDecoration: 'underline', cursor: 'pointer', fontSize: '11px', marginTop: '4px' }}>Try again</button>
        </div>
      )}

      {loading && users.length === 0 ? (
        <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
          <RefreshCw size={32} className="animate-spin" style={{ margin: '0 auto 16px' }} />
          <p>Syncing organizational directory...</p>
        </div>
      ) : (
        <div style={s.grid}>
          {users.map(u => (
            <div key={u.username} style={s.userCard}>
              <div style={s.cardHeader}>
                <span style={s.roleBadge(u.role)}>{(u.role || '').replace('_', ' ')}</span>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button onClick={() => setShowPasswordModal(u.username)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }} title="Reset Password"><Key size={16} /></button>
                  <button onClick={() => handleDelete(u.username)} style={{ background: 'none', border: 'none', color: '#EF476F', cursor: 'pointer' }} title="Remove User"><Trash2 size={16} /></button>
                </div>
              </div>
              <div>
                <div style={{ fontSize: '18px', fontWeight: '800', color: '#fff' }}>{u.full_name}</div>
                <div style={{ fontSize: '13px', color: '#00E5A0', fontWeight: '600' }}>@{u.username}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '16px' }}>
                <div style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Shield size={14} style={{ color: '#64748b' }} />
                  {u.email}
                </div>
                {u.mobile && (
                  <div style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Phone size={14} style={{ color: '#64748b' }} />
                    {u.mobile}
                  </div>
                )}
                {u.role === 'node_operator' && (
                  <div style={{ fontSize: '12px', color: '#00B4D8', display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px', backgroundColor: 'rgba(0,180,216,0.05)', padding: '8px', borderRadius: '6px' }}>
                    <MapPin size={14} />
                    <span>Assigned: {u.assigned_node_ids?.join(', ') || 'Global'}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
          {users.length === 0 && !loading && (
            <div style={{ gridColumn: '1 / -1', padding: '80px', textAlign: 'center', backgroundColor: '#0a1128', borderRadius: '16px', border: '1px dashed rgba(255,255,255,0.1)' }}>
              <Users size={48} style={{ color: 'rgba(255,255,255,0.05)', margin: '0 auto 16px' }} />
              <h3 style={{ color: '#fff' }}>No team members found</h3>
              <p style={{ color: '#64748b', maxWidth: '300px', margin: '8px auto' }}>Start building your company workforce by adding your first manager or operator.</p>
            </div>
          )}
        </div>
      )}

      {showAddModal && (
        <div style={s.modalOverlay}>
          <div style={s.modal}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '900' }}>NEW TEAM MEMBER</h2>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}><X size={24} /></button>
            </div>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={s.inputGroup}>
                <label style={s.label}>Full Name</label>
                <input style={s.input} placeholder="e.g. John Smith" value={newUser.full_name} onChange={e => setNewUser({...newUser, full_name: e.target.value})} required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={s.inputGroup}>
                  <label style={s.label}>Username</label>
                  <input style={s.input} placeholder="jsmith" value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value.toLowerCase().replace(/\s/g, '')})} required />
                </div>
                <div style={s.inputGroup}>
                  <label style={s.label}>Role</label>
                  <select 
                    style={{...s.input, opacity: nodeCount === 0 && newUser.role === 'node_operator' ? 0.7 : 1}} 
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

              {nodeCount === 0 && (
                <div style={{ padding: '12px', backgroundColor: 'rgba(255, 209, 102, 0.05)', border: '1px solid rgba(255, 209, 102, 0.2)', borderRadius: '8px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <AlertCircle size={18} color="#FFD166" />
                  <span style={{ fontSize: '11px', color: '#FFD166', fontWeight: '600' }}>
                    Note: To register Node Operators, you must first create company nodes.
                  </span>
                </div>
              )}
              <div style={s.inputGroup}>
                <label style={s.label}>Email Address</label>
                <input style={s.input} type="email" placeholder="john@company.com" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} required />
              </div>
              <div style={s.inputGroup}>
                <label style={s.label}>Mobile Number</label>
                <input style={s.input} placeholder="+1 234 567 890" value={newUser.mobile} onChange={e => setNewUser({...newUser, mobile: e.target.value})} required />
              </div>
              <div style={s.inputGroup}>
                <label style={s.label}>Initial Password</label>
                <input style={s.input} type="password" placeholder="Min 8 characters" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} required />
              </div>
              {newUser.role === 'node_operator' && (
                <div style={s.inputGroup}>
                  <label style={s.label}>Assigned Nodes (Comma Separated)</label>
                  <input style={s.input} placeholder="e.g. N01, N02" value={newUser.assigned_node_ids} onChange={e => setNewUser({...newUser, assigned_node_ids: e.target.value})} />
                </div>
              )}
              <button type="submit" style={{ ...s.btn, width: '100%', marginTop: '8px' }}><Check size={18} /> PROVISION ACCOUNT</button>
            </form>
          </div>
        </div>
      )}

      {showPasswordModal && (
        <div style={s.modalOverlay}>
          <div style={s.modal}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '900' }}>RESET PASSWORD</h2>
              <button onClick={() => setShowPasswordModal(null)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}><X size={24} /></button>
            </div>
            <p style={{ fontSize: '13px', color: '#64748b' }}>Provisioning new credentials for <b>@{showPasswordModal}</b></p>
            <form onSubmit={handlePasswordUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={s.inputGroup}>
                <label style={s.label}>New Secure Password</label>
                <input style={s.input} type="password" placeholder="••••••••" value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
              </div>
              <button type="submit" style={{ ...s.btn, width: '100%' }}>UPDATE PASSWORD</button>
            </form>
          </div>
        </div>
      )}

      {showConstraintModal && (
        <div style={s.modalOverlay}>
          <div style={{ ...s.modal, textAlign: 'center', maxWidth: '400px' }}>
            <div style={{ background: 'rgba(255, 209, 102, 0.1)', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: '#FFD166' }}>
              <AlertCircle size={32} />
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: '900', color: '#fff' }}>INFRASTRUCTURE REQUIRED</h2>
            <p style={{ fontSize: '14px', color: '#64748b', lineHeight: '1.6' }}>
              Your company does not have any network nodes registered yet. You must establish at least one node before you can provision Node Operators.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
              <button 
                onClick={() => navigate('/owner/nodes')}
                style={{ ...s.btn, width: '100%', justifyContent: 'center' }}
              >
                INITIALIZE NETWORK NODES
              </button>
              <button 
                onClick={() => setShowConstraintModal(false)}
                style={{ background: 'none', border: '1px solid rgba(255,255,255,0.1)', color: '#64748b', padding: '12px', borderRadius: '8px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}
              >
                GO BACK
              </button>
            </div>
          </div>
        </div>
      )}
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin { animation: spin 1s linear infinite; }
        input:focus, select:focus { border-color: #00E5A0 !important; background-color: rgba(255,255,255,0.06) !important; }
      `}</style>
    </div>
  );
}
