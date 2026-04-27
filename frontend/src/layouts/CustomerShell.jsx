import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LogOut, Package, MapPin, Bell, LayoutDashboard, 
  Settings, HelpCircle, User, ChevronRight, Menu, X 
} from 'lucide-react';

export default function CustomerShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const displayName = user?.full_name || user?.email || 'Customer';

  const styles = {
    layout: {
      height: '100vh',
      width: '100vw',
      backgroundColor: 'var(--bg-canvas)',
      display: 'flex',
      overflow: 'hidden',
      color: 'var(--text-primary)',
      fontFamily: "'Inter', sans-serif",
    },
    sidebar: {
      width: sidebarOpen ? '260px' : '0px',
      height: '100%',
      backgroundColor: 'var(--bg-surface)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      position: 'relative',
      zIndex: 50,
      overflow: 'hidden',
    },
    sidebarHeader: {
      padding: '24px',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      borderBottom: '1px solid var(--border)',
    },
    logoIcon: {
      width: '32px',
      height: '32px',
      backgroundColor: 'var(--brand)',
      borderRadius: '6px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#000',
      fontWeight: '900',
      fontSize: '20px',
      fontFamily: "'Space Grotesk', sans-serif",
    },
    logoText: {
      fontSize: '18px',
      fontWeight: '800',
      letterSpacing: '1px',
      fontFamily: "'Space Grotesk', sans-serif",
      color: 'var(--brand)',
    },
    navSection: {
      padding: '24px 12px',
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      gap: '4px',
    },
    navItem: (isActive) => ({
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '12px 16px',
      borderRadius: '8px',
      textDecoration: 'none',
      color: isActive ? 'var(--brand)' : 'var(--text-secondary)',
      backgroundColor: isActive ? 'var(--brand-dim)' : 'transparent',
      fontSize: '14px',
      fontWeight: '600',
      transition: 'all 0.2s',
    }),
    sidebarFooter: {
      padding: '16px',
      borderTop: '1px solid var(--border)',
    },
    userCard: {
      padding: '12px',
      borderRadius: '12px',
      backgroundColor: 'var(--bg-elevated)',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      marginBottom: '12px',
    },
    userAvatar: {
      width: '32px',
      height: '32px',
      borderRadius: '16px',
      backgroundColor: 'var(--brand-dim)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'var(--brand)',
    },
    logoutBtn: {
      width: '100%',
      background: 'none',
      border: 'none',
      color: 'var(--danger)',
      cursor: 'pointer',
      padding: '12px',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      fontSize: '13px',
      fontWeight: '700',
      borderRadius: '8px',
      transition: 'background 0.2s',
    },
    main: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      overflow: 'hidden',
    },
    header: {
      height: '72px',
      padding: '0 32px',
      backgroundColor: 'var(--bg-surface)',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexShrink: 0,
    },
    breadcrumb: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontSize: '14px',
      color: 'var(--text-muted)',
    },
    content: {
      flex: 1,
      overflowY: 'auto',
      padding: '32px',
      backgroundColor: 'var(--bg-canvas)',
    },
    toggleBtn: {
      background: 'none',
      border: 'none',
      color: 'var(--text-muted)',
      cursor: 'pointer',
      padding: '8px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }
  };

  const getPageTitle = () => {
    if (location.pathname === '/customer') return 'My Shipments';
    if (location.pathname.includes('/track/')) return 'Shipment Tracking';
    if (location.pathname === '/customer/alerts') return 'Disruption Alerts';
    return 'Customer Portal';
  };

  return (
    <div style={styles.layout}>
      {/* Sidebar */}
      <aside style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <div style={styles.logoIcon}>N</div>
          <div style={styles.logoText}>NERVE</div>
        </div>

        <nav style={styles.navSection}>
          <NavLink to="/customer" end style={({ isActive }) => styles.navItem(isActive)}>
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </NavLink>
          <NavLink to="/customer" style={({ isActive }) => styles.navItem(isActive && location.pathname === '/customer')}>
            <Package size={18} />
            <span>My Shipments</span>
          </NavLink>
          <NavLink to="/customer/alerts" style={({ isActive }) => styles.navItem(isActive)}>
            <Bell size={18} />
            <span>Active Alerts</span>
          </NavLink>
          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <NavLink to="#" style={styles.navItem(false)}>
              <Settings size={18} />
              <span>Settings</span>
            </NavLink>
            <NavLink to="#" style={styles.navItem(false)}>
              <HelpCircle size={18} />
              <span>Support</span>
            </NavLink>
          </div>
        </nav>

        <div style={styles.sidebarFooter}>
          <div style={styles.userCard}>
            <div style={styles.userAvatar}>
              <User size={18} />
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div style={{ fontSize: '13px', fontWeight: '700', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {displayName}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {user?.role?.replace('_', ' ')}
              </div>
            </div>
          </div>
          <button 
            style={styles.logoutBtn} 
            onClick={handleLogout}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <LogOut size={18} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div style={styles.main}>
        <header style={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <button style={styles.toggleBtn} onClick={() => setSidebarOpen(!sidebarOpen)}>
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <div style={styles.breadcrumb}>
              <span>Customer Portal</span>
              <ChevronRight size={14} />
              <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>{getPageTitle()}</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
             <div style={{ 
               backgroundColor: 'var(--brand-dim)', 
               color: 'var(--brand)', 
               padding: '6px 12px', 
               borderRadius: '6px', 
               fontSize: '12px', 
               fontWeight: '700',
               border: '1px solid rgba(0, 229, 160, 0.2)'
             }}>
               {user?.company_id || 'DEMO_CORP'}
             </div>
          </div>
        </header>

        <main style={styles.content}>
          <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
