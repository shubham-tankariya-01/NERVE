import React, { useState, useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import { useAgent } from '../../context/AgentContext';
import { useAppWebSocket } from '../../context/WebSocketContext';
import { useAuth } from '../../context/AuthContext';
import { 
  LayoutDashboard, Map, Package, Box, GitBranch,
  AlertTriangle, Bot, BarChart2, CloudRain, PlusCircle, Settings, ChevronLeft, ChevronRight, Shield, ArrowLeft
} from 'lucide-react';

const NavItem = React.memo(({ item, collapsed }) => (
  <NavLink 
    to={item.to}
    style={({ isActive }) => ({
      display: 'flex',
      alignItems: 'center',
      gap: '1rem',
      padding: '0.75rem',
      borderRadius: '10px',
      color: isActive ? 'var(--accent-primary)' : 'var(--text-muted)',
      background: isActive ? 'rgba(0, 180, 216, 0.08)' : 'transparent',
      textDecoration: 'none',
      fontSize: '0.85rem',
      fontWeight: isActive ? 600 : 500,
      justifyContent: collapsed ? 'center' : 'flex-start',
      transition: 'background 0.2s ease, color 0.2s ease',
      border: isActive ? '1px solid rgba(0, 180, 216, 0.2)' : '1px solid transparent',
      minWidth: collapsed ? '44px' : 'auto'
    })}
  >
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: '20px' }}>
      {item.icon}
    </div>
    {!collapsed && <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden' }}>{item.label}</span>}
    {!collapsed && item.badge && (
      <span style={{ 
        background: item.color || 'var(--bg-glass)', 
        color: '#fff', 
        fontSize: '0.65rem', 
        padding: '2px 6px', 
        borderRadius: '4px',
        fontWeight: 700
      }}>
        {item.badge}
      </span>
    )}
  </NavLink>
));

// ← NEW: Dynamic user chip in sidebar footer
const UserChip = ({ collapsed }) => {
  const { user } = useAuth();
  if (!user) return null;
  const initials = (user.full_name || user.username || '?')
    .split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const roleLabel = (user.role || 'user').replace(/_/g, ' ');

  return (
    <div style={{ 
      display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem', 
      background: 'rgba(255,255,255,0.03)', borderRadius: '10px',
      border: '1px solid var(--glass-border)',
      justifyContent: collapsed ? 'center' : 'flex-start', transition: 'all 0.2s'
    }}>
      <div style={{ 
        width: '24px', height: '24px', borderRadius: '4px', 
        background: 'linear-gradient(135deg, #A855F7, #6366F1)', 
        color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', 
        fontSize: '0.7rem', fontWeight: 'bold', flexShrink: 0
      }}>{initials}</div>
      {!collapsed && (
        <div style={{ display: 'flex', flexDirection: 'column', whiteSpace: 'nowrap', overflow: 'hidden' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)' }}>{user.full_name || user.username}</span>
          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{roleLabel}</span>
        </div>
      )}
    </div>
  );
};

export default function Sidebar() {
  const [isHovered, setIsHovered] = useState(false);
  const { unreadCount } = useAgent();
  const { pendingRerouteCount } = useAppWebSocket();
  const { user } = useAuth();
  const collapsed = !isHovered;

  const navItems = useMemo(() => {
    const role = user?.role;

    if (role === 'logistics_manager') {
      return [
        { to: '/',                  icon: <Map size={20} />,          label: 'Command Center' },
        { to: '/dashboard',         icon: <LayoutDashboard size={20} />, label: 'Executive Dashboard' },
        { to: '/shipments',         icon: <Package size={20} />,      label: 'Shipments' },
        { to: '/nodes',             icon: <Box size={20} />,          label: 'Nodes' },
        { to: '/disruptions',       icon: <AlertTriangle size={20} />, label: 'Disruptions' },
        {
          to: '/manager/rerouting',
          icon: <GitBranch size={20} />,
          label: 'Rerouting Queue',
          badge: pendingRerouteCount > 0 ? pendingRerouteCount : null,
          color: 'var(--danger)',
        },
        {
          to: '/agents',
          icon: <Bot size={20} />,
          label: 'Agent Control',
          badge: unreadCount > 0 ? unreadCount : null,
          color: 'var(--warning)',
        },
        { to: '/weather',           icon: <CloudRain size={20} />,    label: 'Weather' },
        { to: '/book',              icon: <PlusCircle size={20} />,   label: 'Book Shipment' },
      ];
    }

    if (role === 'platform_admin') {
      return [
        { to: '/', icon: <ArrowLeft size={20} />, label: 'Back to App' },
      ];
    }

    // node_operator and customer use their own shells — nothing to show here
    return [];
  }, [user?.role, unreadCount, pendingRerouteCount]);

  return (
    <aside 
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ 
        width: collapsed ? '72px' : '260px', 
        background: 'var(--bg-secondary)', 
        borderRight: '1px solid var(--glass-border)', 
        display: 'flex', 
        flexDirection: 'column', 
        transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        zIndex: 100,
        boxShadow: collapsed ? 'none' : '4px 0 24px rgba(0,0,0,0.2)',
        position: 'relative',
        willChange: 'width'
      }}
    >
      <div style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '64px' }}>
        <div style={{ 
          width: '32px', height: '32px', background: 'var(--accent-primary)', borderRadius: '8px', 
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', 
          fontSize: '1.1rem', fontWeight: 800 
        }}>
          N
        </div>
        {!collapsed && (
          <span style={{ 
            marginLeft: '0.75rem', fontWeight: 800, fontSize: '1.25rem', 
            letterSpacing: '-0.03em', color: 'var(--text-main)',
            whiteSpace: 'nowrap'
          }}>
            NERVE
          </span>
        )}
      </div>

      <nav style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '1rem 0.5rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        {navItems.length > 0 ? (
          navItems.map((item, i) => (
            <NavItem key={i} item={item} collapsed={collapsed} />
          ))
        ) : (
          !collapsed && (
            <div style={{ padding: '1rem 0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.6 }}>
              Use the dedicated app for your role.
            </div>
          )
        )}
      </nav>

      <div style={{ padding: '1rem 0.5rem', borderTop: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <NavLink to="/settings" style={({ isActive }) => ({
          display: 'flex', 
          alignItems: 'center', 
          gap: '1rem', 
          padding: '0.75rem', 
          borderRadius: '10px',
          color: 'var(--text-muted)', 
          textDecoration: 'none', 
          fontSize: '0.85rem', 
          fontWeight: 500,
          justifyContent: collapsed ? 'center' : 'flex-start',
          background: collapsed ? 'rgba(255,255,255,0.03)' : 'transparent',
          border: collapsed ? '1px solid var(--glass-border)' : '1px solid transparent',
          transition: 'all 0.2s'
        })}>
          <Settings size={20} />
          {!collapsed && <span style={{ whiteSpace: 'nowrap' }}>Settings</span>}
        </NavLink>
        
        <UserChip collapsed={collapsed} />
      </div>
    </aside>
  );
}
