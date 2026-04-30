import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { Shield, Building2, Users, Activity, LogOut, ArrowLeft, Menu } from 'lucide-react';
import FloatingManualButton from '../components/common/FloatingManualButton';
import BottomNav from '../components/layout/BottomNav';

export default function AdminShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { isMobile } = useBreakpoint();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const styles = {
    layout: {
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
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
      display: isMobile ? 'none' : 'flex',
      flexDirection: 'column',
      padding: '24px 0',
      flexShrink: 0,
    },
    mobileHeader: {
      display: isMobile ? 'flex' : 'none',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '16px 20px',
      backgroundColor: 'var(--bg-surface)',
      borderBottom: '1px solid var(--border)',
      zIndex: 100,
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
      color: 'var(--status-critical)',
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
      backgroundColor: isActive ? 'var(--status-critical-dim)' : 'transparent',
      borderLeft: isActive ? '3px solid var(--status-critical)' : '3px solid transparent',
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
      backgroundColor: 'var(--status-critical)',
      color: '#fff',
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
      transition: 'color 0.2s',
    },
    main: {
      flex: 1,
      overflowY: 'auto',
      position: 'relative',
      paddingBottom: isMobile ? '64px' : '0px',
    }
  };

  return (
    <div style={styles.layout}>
      {/* Mobile Header */}
      <header style={styles.mobileHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Shield size={24} color="var(--status-critical)" />
          <span style={{ fontSize: '16px', fontWeight: '900', letterSpacing: '0.5px' }}>NERVE ADMIN</span>
        </div>
        <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: 'var(--text-muted)' }}>
          <LogOut size={20} />
        </button>
      </header>

      {/* Desktop Sidebar */}
      <aside style={styles.sidebar}>
        <div style={styles.header}>
          <Shield size={28} color="var(--status-critical)" />
          <div style={styles.title}>NERVE ADMIN</div>
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
          <NavLink to="/app" style={() => styles.navItem(false)}>
            <ArrowLeft size={18} />
            <span>BACK TO PLATFORM</span>
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

      {isMobile && <BottomNav />}
      <FloatingManualButton />
    </div>
  );
}
