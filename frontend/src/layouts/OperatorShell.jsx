import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LogOut, Package, CheckSquare, AlertTriangle, 
  MapPin, Cloud, LayoutDashboard, Menu, X, ChevronRight, User, ChevronDown
} from 'lucide-react';
import FloatingManualButton from '../components/common/FloatingManualButton';

export default function OperatorShell() {
  const { user, logout, activeNodeId, setActiveNodeId } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const assignedNodes = user?.assigned_node_ids || [];
  const currentStationName = activeNodeId || 'Global Network';

  const styles = {
    layout: { height: '100vh', width: '100vw', backgroundColor: 'var(--bg-canvas)', display: 'flex', overflow: 'hidden', color: 'var(--text-primary)', fontFamily: "'Inter', sans-serif" },
    sidebar: { width: sidebarOpen ? '260px' : '0px', height: '100%', backgroundColor: 'var(--bg-surface)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)', position: 'relative', zIndex: 50, overflow: 'hidden' },
    sidebarHeader: { padding: '24px', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid var(--border)' },
    logoIcon: { width: '32px', height: '32px', background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: '900', fontSize: '18px', fontFamily: "'Space Grotesk', sans-serif" },
    logoText: { fontSize: '16px', fontWeight: '800', letterSpacing: '1px', fontFamily: "'Space Grotesk', sans-serif", color: 'var(--text-primary)' },
    navSection: { padding: '24px 12px', flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' },
    navItem: (isActive) => ({ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '8px', textDecoration: 'none', color: isActive ? 'var(--info)' : 'var(--text-secondary)', backgroundColor: isActive ? 'var(--info-dim)' : 'transparent', fontSize: '14px', fontWeight: '600', transition: 'all 0.2s' }),
    sidebarFooter: { padding: '16px', borderTop: '1px solid var(--border)' },
    userCard: { padding: '12px', borderRadius: '12px', backgroundColor: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' },
    userAvatar: { width: '32px', height: '32px', borderRadius: '16px', backgroundColor: 'var(--info-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--info)' },
    logoutBtn: { width: '100%', background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '12px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', fontWeight: '700', borderRadius: '8px', transition: 'background 0.2s' },
    main: { flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' },
    header: { height: '72px', padding: '0 32px', backgroundColor: 'var(--bg-surface)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 },
    breadcrumb: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'var(--text-muted)' },
    content: { flex: 1, overflowY: 'auto', padding: '32px', backgroundColor: 'var(--bg-canvas)' },
    toggleBtn: { background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    stationDropdown: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      backgroundColor: 'var(--info-dim)',
      color: 'var(--info)',
      padding: '6px 12px',
      borderRadius: '8px',
      fontSize: '12px',
      fontWeight: '700',
      border: '1px solid rgba(59, 130, 246, 0.2)',
      cursor: 'pointer',
      outline: 'none',
      appearance: 'none',
      fontFamily: 'inherit'
    }
  };

  const getPageTitle = () => {
    if (location.pathname === '/operator') return 'Expected Shipments';
    if (location.pathname === '/operator/today') return 'Daily Check-ins';
    if (location.pathname === '/operator/flag') return 'Issue Reporting';
    if (location.pathname === '/operator/nodes') return 'Node Management';
    if (location.pathname === '/operator/weather') return 'Node Weather';
    return 'Operator Portal';
  };

  return (
    <div style={styles.layout}>
      <aside style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <div style={styles.logoIcon}>N</div>
          <div style={styles.logoText}>OPERATOR</div>
        </div>

        <nav style={styles.navSection}>
          <NavLink to="/operator" end style={({ isActive }) => styles.navItem(isActive)}>
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </NavLink>
          <NavLink to="/operator/today" style={({ isActive }) => styles.navItem(isActive)}>
            <CheckSquare size={18} />
            <span>Daily Check-ins</span>
          </NavLink>
          <NavLink to="/operator/nodes" style={({ isActive }) => styles.navItem(isActive)}>
            <MapPin size={18} />
            <span>Node Manager</span>
          </NavLink>
          <NavLink to="/operator/weather" style={({ isActive }) => styles.navItem(isActive)}>
            <Cloud size={18} />
            <span>Weather Monitoring</span>
          </NavLink>
          <NavLink to="/operator/flag" style={({ isActive }) => styles.navItem(isActive)}>
            <AlertTriangle size={18} />
            <span>Report Issue</span>
          </NavLink>
        </nav>

        <div style={styles.sidebarFooter}>
          <div style={styles.userCard}>
            <div style={styles.userAvatar}><User size={18} /></div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div style={{ fontSize: '13px', fontWeight: '700', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.full_name || 'Operator'}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{currentStationName}</div>
            </div>
          </div>
          <button style={styles.logoutBtn} onClick={handleLogout}><LogOut size={18} /><span>Sign Out</span></button>
        </div>
      </aside>

      <div style={styles.main}>
        <header style={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <button style={styles.toggleBtn} onClick={() => setSidebarOpen(!sidebarOpen)}>{sidebarOpen ? <X size={20} /> : <Menu size={20} />}</button>
            <div style={styles.breadcrumb}>
              <span>Operations</span>
              <ChevronRight size={14} />
              <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>{getPageTitle()}</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
             <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
               <select 
                 style={styles.stationDropdown} 
                 value={activeNodeId || ''} 
                 onChange={(e) => setActiveNodeId(e.target.value)}
                >
                 {assignedNodes.map(nodeId => (
                   <option key={nodeId} value={nodeId}>STATION: {nodeId}</option>
                 ))}
                 {assignedNodes.length === 0 && <option value="">NO ASSIGNED STATIONS</option>}
               </select>
               <ChevronDown size={14} style={{ position: 'absolute', right: '8px', pointerEvents: 'none' }} />
             </div>
          </div>
        </header>

        <main style={styles.content}>
          <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
            <Outlet />
          </div>
        </main>
      </div>
      <FloatingManualButton />
    </div>
  );
}
