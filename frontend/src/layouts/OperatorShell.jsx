import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, Package, CheckSquare, AlertTriangle } from 'lucide-react';

export default function OperatorShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const nodeName = user?.assigned_node_ids?.[0] || 'Unassigned Node';

  const styles = {
    container: {
      height: '100vh',
      width: '100vw',
      maxWidth: '480px',
      margin: '0 auto',
      backgroundColor: 'var(--bg-main)',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      fontFamily: 'var(--font-sans)',
      color: 'var(--text-main)',
      borderLeft: '1px solid var(--glass-border)',
      borderRight: '1px solid var(--glass-border)',
    },
    topbar: {
      height: '64px',
      padding: '0 16px',
      backgroundColor: 'var(--bg-glass)',
      backdropFilter: 'blur(10px)',
      borderBottom: '1px solid var(--glass-border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexShrink: 0,
    },
    topbarLeft: {
      display: 'flex',
      flexDirection: 'column',
    },
    title: {
      fontSize: '14px',
      fontWeight: '800',
      letterSpacing: '1px',
      color: 'var(--accent-primary)',
    },
    nodeName: {
      fontSize: '12px',
      color: 'var(--text-muted)',
      fontWeight: '600',
    },
    logoutBtn: {
      background: 'none',
      border: 'none',
      color: 'var(--status-critical)',
      cursor: 'pointer',
      padding: '8px',
    },
    content: {
      flex: 1,
      overflowY: 'auto',
      padding: '16px',
      paddingBottom: '80px', // Space for bottom nav
    },
    bottomNav: {
      height: '72px',
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: 'var(--bg-secondary)',
      borderTop: '1px solid var(--glass-border)',
      display: 'flex',
      justifyContent: 'space-around',
      alignItems: 'center',
      paddingBottom: 'env(safe-area-inset-bottom)',
    },
    navItem: (isActive) => ({
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '4px',
      textDecoration: 'none',
      color: isActive ? 'var(--accent-primary)' : 'var(--text-muted)',
      fontSize: '10px',
      fontWeight: '700',
      transition: 'color 0.2s',
    })
  };

  return (
    <div style={styles.container}>
      <header style={styles.topbar}>
        <div style={styles.topbarLeft}>
          <div style={styles.title}>NERVE OPERATOR</div>
          <div style={styles.nodeName}>{nodeName}</div>
        </div>
        <button style={styles.logoutBtn} onClick={handleLogout}>
          <LogOut size={20} />
        </button>
      </header>

      <main style={styles.content}>
        <Outlet />
      </main>

      <nav style={styles.bottomNav}>
        <NavLink to="/operator" end style={({ isActive }) => styles.navItem(isActive)}>
          <Package size={24} />
          <span>EXPECTED</span>
        </NavLink>
        <NavLink to="/operator/today" style={({ isActive }) => styles.navItem(isActive)}>
          <CheckSquare size={24} />
          <span>TODAY</span>
        </NavLink>
        <NavLink to="/operator/flag" style={({ isActive }) => styles.navItem(isActive)}>
          <AlertTriangle size={24} />
          <span>FLAG</span>
        </NavLink>
      </nav>
    </div>
  );
}
