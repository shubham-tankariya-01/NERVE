import React, { useState, useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import { useAgent } from '../../context/AgentContext';
import { 
  LayoutDashboard, Map, Package, Box, Route as RouteIcon, 
  AlertTriangle, Bot, BarChart2, CloudRain, PlusCircle, Settings, ChevronLeft, ChevronRight, Shield
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

export default function Sidebar() {
  const [isHovered, setIsHovered] = useState(false);
  const { unreadCount } = useAgent();
  const collapsed = !isHovered;

  const navItems = useMemo(() => [
    { to: '/', icon: <Map size={20} />, label: 'Command Center' },
    { to: '/dashboard', icon: <LayoutDashboard size={20} />, label: 'Executive Dashboard' },
    { to: '/shipments', icon: <Package size={20} />, label: 'Shipments' },
    { to: '/nodes', icon: <Box size={20} />, label: 'Nodes', color: 'var(--info)' },
    { to: '/disruptions', icon: <AlertTriangle size={20} />, label: 'Disruptions', color: 'var(--danger)' },
    { to: '/agents', icon: <Bot size={20} />, label: 'Agent Control', badge: unreadCount, color: 'var(--warning)' },
    { to: '/weather', icon: <CloudRain size={20} />, label: 'Weather' },
    { to: '/book', icon: <PlusCircle size={20} />, label: 'Book Shipment' },
    { to: '/admin', icon: <Shield size={20} />, label: 'Admin Mission Control', color: 'var(--accent-primary)' },
  ], [unreadCount]);

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
        {navItems.map((item, i) => (
          <NavItem key={i} item={item} collapsed={collapsed} />
        ))}
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
        
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '1rem', 
          padding: '0.75rem', 
          background: 'rgba(255,255,255,0.03)',
          borderRadius: '10px',
          border: '1px solid var(--glass-border)',
          justifyContent: collapsed ? 'center' : 'flex-start',
          transition: 'all 0.2s'
        }}>
          <div style={{ 
            width: '24px', height: '24px', borderRadius: '4px', 
            background: 'linear-gradient(135deg, #A855F7, #6366F1)', 
            color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', 
            fontSize: '0.7rem', fontWeight: 'bold'
          }}>ST</div>
          {!collapsed && (
            <div style={{ display: 'flex', flexDirection: 'column', whiteSpace: 'nowrap' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)' }}>Shubham T.</span>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Admin</span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
