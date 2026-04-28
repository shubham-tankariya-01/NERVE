import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, Building2, Users, Activity, LogOut, ArrowLeft } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';

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
      backgroundColor: 'var(--bg-canvas)',
      color: 'var(--text-primary)',
      fontFamily: 'var(--font-sans)',
    },
    sidebar: {
      width: '280px',
      backgroundColor: 'var(--bg-surface)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      padding: '24px 0',
      flexShrink: 0,
    },
    header: {
      padding: '0 24px',
      marginBottom: '32px',
      display: 'flex',
      flexDirection: 'column',
      gap: '20px',
    },
    title: {
      fontSize: '20px',
      fontWeight: '900',
      letterSpacing: '1px',
      color: '#22E6A3',
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
      color: isActive ? '#000' : 'var(--text-secondary)',
      backgroundColor: isActive ? '#22E6A3' : 'transparent',
      fontSize: '14px',
      fontWeight: '600',
      transition: 'all 0.2s',
      cursor: 'pointer',
    }),
    footer: {
      padding: '24px',
      borderTop: '1px solid var(--border)',
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
      backgroundColor: '#22E6A3',
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
      color: 'var(--text-secondary)',
      fontSize: '13px',
      fontWeight: '600',
      cursor: 'pointer',
      padding: '4px 0',
      transition: 'color 0.2s',
    },
    main: {
      flex: 1,
      overflowY: 'auto',
      position: 'relative',
      backgroundColor: 'var(--bg-canvas)'
    }
  };

  return (
    <div style={styles.layout}>
      <aside style={styles.sidebar}>
        <div style={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '28px', height: '28px', backgroundColor: '#22E6A3', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontWeight: '900' }}>N</div>
            <div style={styles.title}>NERVE ADMIN</div>
          </div>
        </div>

        <nav style={styles.nav}>
          <NavLink to="/admin" end style={({ isActive }) => styles.navItem(isActive)}>
            <Building2 size={18} />
            <span>ORGANIZATIONS</span>
          </NavLink>
          <NavLink to="/admin/mission-control" style={({ isActive }) => styles.navItem(isActive)}>
            <Shield size={18} />
            <span>MISSION CONTROL</span>
          </NavLink>
          <NavLink to="/" style={() => styles.navItem(false)}>
            <ArrowLeft size={18} />
            <span>BACK TO PLATFORM</span>
          </NavLink>
        </nav>

        <div style={styles.footer}>
          <div style={styles.adminInfo}>
            <div style={styles.avatar}>AD</div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '13px', fontWeight: '700' }}>{user?.full_name || 'Admin'}</span>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Platform Admin</span>
            </div>
          </div>
          <button style={styles.logoutBtn} onClick={handleLogout}>
            <LogOut size={16} />
            LOGOUT
          </button>
        </div>
      </aside>

      <main style={styles.main}>
        <div style={{ position: 'absolute', top: '24px', right: '32px', zIndex: 100 }}>
          <ThemeToggle />
        </div>
        <div style={{ padding: '32px' }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
