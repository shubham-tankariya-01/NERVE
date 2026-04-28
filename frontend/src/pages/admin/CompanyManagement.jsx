import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { fetchCompanies } from '../../services/api';
import { 
  Building2, Users, Package, Search, 
  Plus, ChevronRight, Filter, Loader 
} from 'lucide-react';

export default function CompanyManagement() {
  const navigate = useNavigate();
  const { getAuthHeaders } = useAuth();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [planFilter, setPlanFilter] = useState('all');

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchCompanies(getAuthHeaders());
        setCompanies(data || []);
      } catch (err) {
        console.error('Failed to load companies:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [getAuthHeaders]);

  const filtered = companies.filter(c => {
    const matchesSearch = c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        c.owner_email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPlan = planFilter === 'all' || c.plan === planFilter;
    return matchesSearch && matchesPlan;
  });

  const styles = {
    container: { padding: '2.5rem', maxWidth: '1600px', margin: '0 auto', background: 'var(--bg-primary)', minHeight: '100%' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' },
    title: { fontSize: '2rem', fontWeight: '900', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-primary)' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' },
    card: {
      background: 'var(--bg-surface)',
      border: '1px solid var(--border)',
      borderRadius: '16px',
      padding: '1.5rem',
      cursor: 'pointer',
      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
      position: 'relative',
      overflow: 'hidden'
    },
    planBadge: (plan) => ({
      fontSize: '0.65rem',
      fontWeight: '900',
      padding: '4px 10px',
      borderRadius: '20px',
      background: plan === 'enterprise' ? 'rgba(168, 85, 247, 0.1)' : 'rgba(0, 180, 216, 0.1)',
      color: plan === 'enterprise' ? '#a855f7' : '#00b4d8',
      textTransform: 'uppercase'
    }),
    stat: { display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' },
    filterBar: { marginBottom: '2.5rem', display: 'flex', gap: '1rem', alignItems: 'center' },
    statsRow: { marginBottom: '2.5rem', display: 'flex', gap: '1.5rem' },
    btnNoGlow: {
      background: '#22E6A3', // Brand green for admin
      color: '#000',
      border: 'none',
      borderRadius: '10px',
      padding: '0.75rem 1.5rem',
      fontSize: '0.85rem',
      fontWeight: 800,
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      boxShadow: 'none', // Remove glow
      transition: 'background 0.2s'
    }
  };

  if (loading) {
    return (
      <div style={{ height: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader className="animate-spin" size={32} color="#22E6A3" />
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}><Building2 size={32} style={{ color: '#22E6A3' }} /> ORGANIZATION REGISTRY</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', fontWeight: 600 }}>Institutional oversight and multi-tenant management</p>
        </div>
        <button 
          style={styles.btnNoGlow}
          onMouseOver={e => e.currentTarget.style.background = '#1cc088'}
          onMouseOut={e => e.currentTarget.style.background = '#22E6A3'}
        >
          <Plus size={18} /> REGISTER NEW ENTITY
        </button>
      </header>

      <div style={styles.filterBar}>
        <div style={{ position: 'relative', flex: 1, maxWidth: '500px' }}>
          <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
          <input 
            style={{ width: '100%', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '12px 16px 12px 48px', color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none' }}
            placeholder="Search organizations..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <select 
          value={planFilter}
          onChange={e => setPlanFilter(e.target.value)}
          style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '0 1rem', height: '48px', color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 700, outline: 'none' }}
        >
          <option value="all">ALL PLANS</option>
          <option value="starter">STARTER</option>
          <option value="professional">PROFESSIONAL</option>
          <option value="enterprise">ENTERPRISE</option>
        </select>
      </div>

      <div style={styles.statsRow}>
         <div className="glass-panel" style={{ padding: '1rem 1.5rem', minWidth: '180px' }}>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 800 }}>TOTAL ENTITIES</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-primary)' }}>{companies.length}</div>
         </div>
         <div className="glass-panel" style={{ padding: '1rem 1.5rem', minWidth: '180px' }}>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 800 }}>FILTERED RESULTS</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#22E6A3' }}>{filtered.length}</div>
         </div>
      </div>

      <div style={styles.grid}>
        {filtered.map(company => (
          <div 
            key={company.id} 
            style={styles.card}
            onMouseOver={e => { e.currentTarget.style.borderColor = '#22E6A3'; e.currentTarget.style.transform = 'translateY(-4px)'; }}
            onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'none'; }}
            onClick={() => navigate(`/admin/companies/${company.id}`)}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
              <div style={{ width: '48px', height: '48px', background: 'rgba(34, 230, 163, 0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#22E6A3' }}>
                <Building2 size={24} />
              </div>
              <div style={styles.planBadge(company.plan)}>{company.plan}</div>
            </div>

            <h3 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '0.25rem', color: 'var(--text-primary)' }}>{company.name}</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>{company.owner_email}</p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
               <div style={styles.stat}><Users size={14} /> ID: {company.id.slice(0, 8)}...</div>
               <div style={styles.stat}><Package size={14} /> View Details</div>
            </div>

            <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 700 }}>ACTIVE SINCE {new Date(company.created_at).getFullYear()}</span>
               <ChevronRight size={18} color="#22E6A3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
