import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { fetchCompanies, createCompany, fetchCompanyUsers, createCompanyUser } from '../../services/api';
import { Building2, Plus, UserPlus, Users, ChevronDown, ChevronRight, Eye, ShieldAlert, X, Mail, Lock, User } from 'lucide-react';

const OnboardingDrawer = ({ isOpen, onClose, onComplete }) => {
  const { getAuthHeaders } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    plan: 'professional',
    owner_email: '',
    owner_name: '',
    password: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const headers = getAuthHeaders();
      // Backend handles both company and initial manager creation
      await createCompany(formData, headers);
      onComplete();
    } catch (err) {
      alert('Failed to onboard company: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, right: 0, bottom: 0, left: 0,
      backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 2000,
      display: 'flex', justifyContent: 'flex-end'
    }} onClick={onClose}>
      <div style={{
        width: '100%', maxWidth: '450px', backgroundColor: 'var(--bg-secondary)',
        padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px',
        animation: 'slideInRight 0.3s ease-out'
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '900' }}>ONBOARD NEW COMPANY</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)' }}><X size={24} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)' }}>COMPANY NAME</label>
            <input 
              required
              style={{ padding: '12px', backgroundColor: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', borderRadius: '8px', color: '#fff' }}
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)' }}>SERVICE PLAN</label>
            <select 
              style={{ padding: '12px', backgroundColor: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', borderRadius: '8px', color: '#fff' }}
              value={formData.plan}
              onChange={e => setFormData({...formData, plan: e.target.value})}
            >
              <option value="starter">Starter</option>
              <option value="professional">Professional</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--glass-border)', margin: '10px 0' }} />
          <div style={{ fontSize: '12px', fontWeight: '800', color: 'var(--status-live)' }}>INITIAL ADMINISTRATOR</div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)' }}>OWNER NAME</label>
            <input 
              required
              style={{ padding: '12px', backgroundColor: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', borderRadius: '8px', color: '#fff' }}
              value={formData.owner_name}
              onChange={e => setFormData({...formData, owner_name: e.target.value})}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)' }}>OWNER EMAIL</label>
            <input 
              required
              type="email"
              style={{ padding: '12px', backgroundColor: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', borderRadius: '8px', color: '#fff' }}
              value={formData.owner_email}
              onChange={e => setFormData({...formData, owner_email: e.target.value})}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)' }}>TEMPORARY PASSWORD</label>
            <input 
              required
              type="password"
              minLength={8}
              style={{ padding: '12px', backgroundColor: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', borderRadius: '8px', color: '#fff' }}
              value={formData.password}
              onChange={e => setFormData({...formData, password: e.target.value})}
            />
          </div>

          <button 
            type="submit"
            disabled={isSubmitting}
            style={{ 
              marginTop: '12px', padding: '16px', backgroundColor: 'var(--status-critical)', 
              color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '900',
              textTransform: 'uppercase', cursor: 'pointer', opacity: isSubmitting ? 0.6 : 1
            }}
          >
            {isSubmitting ? 'ONBOARDING...' : 'CREATE COMPANY + ADMIN USER'}
          </button>
        </form>
      </div>
      <style>{`
        @keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
      `}</style>
    </div>
  );
};

const CompanyRow = ({ company }) => {
  const [expanded, setExpanded] = useState(false);
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const { getAuthHeaders } = useAuth();

  const toggleExpand = async () => {
    if (!expanded && users.length === 0) {
      setLoadingUsers(true);
      try {
        const headers = getAuthHeaders();
        const data = await fetchCompanyUsers(company.id, headers);
        setUsers(data);
      } catch (err) {
        console.error('Failed to fetch users:', err);
      } finally {
        setLoadingUsers(false);
      }
    }
    setExpanded(!expanded);
  };

  const planColors = {
    starter: 'var(--text-muted)',
    professional: 'var(--accent-primary)',
    enterprise: '#FFB020'
  };

  return (
    <>
      <tr>
        <td style={{ padding: '16px', borderBottom: '1px solid var(--glass-border)' }}>
          <div style={{ fontWeight: '700' }}>{company.name}</div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{company.id}</div>
        </td>
        <td style={{ padding: '16px', borderBottom: '1px solid var(--glass-border)' }}>
          <span style={{ 
            fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', 
            color: planColors[company.plan], border: `1px solid ${planColors[company.plan]}44`,
            padding: '2px 8px', borderRadius: '4px'
          }}>
            {company.plan}
          </span>
        </td>
        <td style={{ padding: '16px', borderBottom: '1px solid var(--glass-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }} onClick={toggleExpand}>
            <Users size={14} color="var(--text-muted)" />
            <span style={{ fontWeight: '600' }}>{users.length || company.user_count || '?'}</span>
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </div>
        </td>
        <td style={{ padding: '16px', borderBottom: '1px solid var(--glass-border)' }}>
          <span style={{ 
            fontSize: '10px', fontWeight: '800', color: company.is_active ? 'var(--status-live)' : 'var(--status-critical)',
            display: 'flex', alignItems: 'center', gap: '4px'
          }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: company.is_active ? 'var(--status-live)' : 'var(--status-critical)' }} />
            {company.is_active ? 'ACTIVE' : 'INACTIVE'}
          </span>
        </td>
        <td style={{ padding: '16px', borderBottom: '1px solid var(--glass-border)', fontSize: '12px', color: 'var(--text-muted)' }}>
          {new Date(company.created_at).toLocaleDateString()}
        </td>
        <td style={{ padding: '16px', borderBottom: '1px solid var(--glass-border)' }}>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer' }}><Eye size={16} /></button>
            <button style={{ background: 'none', border: 'none', color: 'var(--status-critical)', cursor: 'pointer' }}><ShieldAlert size={16} /></button>
          </div>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan="6" style={{ padding: '0', backgroundColor: 'rgba(0,0,0,0.1)' }}>
            <div style={{ padding: '24px', borderLeft: '4px solid var(--status-critical)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h4 style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)' }}>COMPANY USERS</h4>
                <button style={{ fontSize: '11px', background: 'none', border: '1px solid var(--glass-border)', color: '#fff', padding: '4px 12px', borderRadius: '4px', cursor: 'pointer' }}>
                  + ADD USER
                </button>
              </div>
              {loadingUsers ? (
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Loading team members...</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--glass-border)' }}>
                      <th style={{ padding: '8px', fontSize: '10px', color: 'var(--text-muted)' }}>NAME</th>
                      <th style={{ padding: '8px', fontSize: '10px', color: 'var(--text-muted)' }}>EMAIL</th>
                      <th style={{ padding: '8px', fontSize: '10px', color: 'var(--text-muted)' }}>ROLE</th>
                      <th style={{ padding: '8px', fontSize: '10px', color: 'var(--text-muted)' }}>STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                        <td style={{ padding: '8px', fontSize: '12px', fontWeight: '600' }}>{u.full_name}</td>
                        <td style={{ padding: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>{u.email}</td>
                        <td style={{ padding: '8px', fontSize: '11px' }}>
                          <span style={{ backgroundColor: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px' }}>{u.role}</span>
                        </td>
                        <td style={{ padding: '8px', fontSize: '11px', color: u.is_active ? 'var(--status-live)' : 'var(--status-critical)' }}>
                          {u.is_active ? 'ACTIVE' : 'DISABLED'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

export default function Companies() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const { getAuthHeaders } = useAuth();

  const loadData = useCallback(async () => {
    try {
      const headers = getAuthHeaders();
      const data = await fetchCompanies(headers);
      setCompanies(data);
    } catch (err) {
      console.error('Failed to load companies:', err);
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const styles = {
    container: {
      padding: '40px',
      maxWidth: '1200px',
      margin: '0 auto',
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '40px',
    },
    title: {
      fontSize: '28px',
      fontWeight: '900',
      letterSpacing: '-1px',
    },
    btnOnboard: {
      padding: '12px 24px',
      backgroundColor: 'var(--status-critical)',
      color: '#fff',
      border: 'none',
      borderRadius: '8px',
      fontWeight: '800',
      fontSize: '13px',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      cursor: 'pointer',
      boxShadow: '0 4px 20px rgba(239, 71, 111, 0.3)',
    },
    tableWrapper: {
      backgroundColor: 'var(--bg-secondary)',
      borderRadius: '16px',
      border: '1px solid var(--glass-border)',
      overflow: 'hidden',
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
      textAlign: 'left',
    },
    th: {
      padding: '16px',
      fontSize: '11px',
      fontWeight: '800',
      color: 'var(--text-muted)',
      textTransform: 'uppercase',
      borderBottom: '1px solid var(--glass-border)',
      backgroundColor: 'rgba(0,0,0,0.1)',
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>ONBOARDED COMPANIES</h1>
        <button style={styles.btnOnboard} onClick={() => setIsDrawerOpen(true)}>
          <Plus size={20} />
          ONBOARD COMPANY
        </button>
      </div>

      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Company Name</th>
              <th style={styles.th}>Plan</th>
              <th style={styles.th}>Users</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Created</th>
              <th style={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {companies.map(company => (
              <CompanyRow key={company.id} company={company} />
            ))}
            {companies.length === 0 && !loading && (
              <tr>
                <td colSpan="6" style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No companies found. Click "Onboard Company" to start.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <OnboardingDrawer 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)} 
        onComplete={() => { setIsDrawerOpen(false); loadData(); }}
      />
    </div>
  );
}
