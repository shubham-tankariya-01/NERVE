import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, Building2, Users, Activity, LogOut, ArrowLeft } from 'lucide-react';

export default function AdminShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const styles = {
    layout: {
      display: 'flex',
      height: '100vh',
      width: '100vw',
      backgroundColor: 'var(--bg-main)',
      color: 'var(--text-main)',
      fontFamily: 'var(--font-sans)',
    },
    sidebar: {
      width: '280px',
      backgroundColor: 'var(--bg-secondary)',
      borderRight: '1px solid var(--glass-border)',
      display: 'flex',
      flexDirection: 'column',
      padding: '24px 0',
      flexShrink: 0,
    },
    header: {
      padding: '0 24px',
      marginBottom: '32px',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
    },
    title: {
      fontSize: '20px',
      fontWeight: '900',
      letterSpacing: '1px',
      color: 'var(--status-critical)', // Use red for admin
    },
    nav: {
      flex: 1,
      padding: '0 12px',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
    },
    navItem: (isActive) => ({
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '12px 16px',
      borderRadius: '8px',
      textDecoration: 'none',
      color: isActive ? '#fff' : 'var(--text-muted)',
      backgroundColor: isActive ? 'rgba(239, 71, 111, 0.15)' : 'transparent',
      borderLeft: isActive ? '3px solid var(--status-critical)' : '3px solid transparent',
      fontSize: '14px',
      fontWeight: '600',
      transition: 'all 0.2s',
    }),
    footer: {
      padding: '24px',
      borderTop: '1px solid var(--glass-border)',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
    },
    adminInfo: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
    },
    avatar: {
      width: '32px',
      height: '32px',
      borderRadius: '8px',
      backgroundColor: 'var(--status-critical)',
      color: '#000',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: '800',
      fontSize: '12px',
    },
    logoutBtn: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      background: 'none',
      border: 'none',
      color: 'var(--text-muted)',
      fontSize: '13px',
      fontWeight: '600',
      cursor: 'pointer',
      padding: '4px 0',
    },
    main: {
      flex: 1,
      overflowY: 'auto',
      position: 'relative',
    }
  };

  return (
    <div style={styles.layout}>
      <aside style={styles.sidebar}>
        <div style={styles.header}>
          <Shield size={28} color="var(--status-critical)" />
          <div style={styles.title}>NERVE ADMIN</div>
        </div>

        <nav style={styles.nav}>
          <NavLink to="/admin" end style={({ isActive }) => styles.navItem(isActive)}>
            <Building2 size={18} />
            <span>COMPANIES</span>
          </NavLink>
          <NavLink to="/admin/system" style={({ isActive }) => styles.navItem(isActive)}>
            <Activity size={18} />
            <span>SYSTEM STATUS</span>
          </NavLink>
          <NavLink to="/" style={() => styles.navItem(false)}>
            <ArrowLeft size={18} />
            <span>BACK TO APP</span>
          </NavLink>
        </nav>

        <div style={styles.footer}>
          <div style={styles.adminInfo}>
            <div style={styles.avatar}>AD</div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '13px', fontWeight: '700' }}>{user?.full_name || 'Admin'}</span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Platform Admin</span>
            </div>
          </div>
          <button style={styles.logoutBtn} onClick={handleLogout}>
            <LogOut size={16} />
            LOGOUT
          </button>
        </div>
      </aside>

      <main style={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
