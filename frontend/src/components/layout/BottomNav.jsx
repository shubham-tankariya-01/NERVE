import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useAgent } from '../../context/AgentContext';
import { useAppWebSocket } from '../../context/WebSocketContext';
import { 
  Map, Package, AlertTriangle, Bot, Menu, LayoutDashboard, Users, CheckSquare, MapPin, Cloud, Bell, BookOpen
} from 'lucide-react';
import MoreDrawer from '../common/MoreDrawer';

export default function BottomNav() {
  const { user } = useAuth();
  const { unreadCount } = useAgent();
  const { alerts } = useAgent(); // Assuming alerts count comes from here or similar
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const role = user?.role;
  const alertCount = alerts?.length || 0;

  const NavItem = ({ to, icon, label, badge, onClick, end }) => {
    const content = (
      <div style={{
        flex: 1,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '3px',
        height: '64px',
        cursor: 'pointer',
        position: 'relative'
      }}>
        <div style={{ position: 'relative' }}>
          {React.cloneElement(icon, { size: 22 })}
          {badge > 0 && (
            <div style={{
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              background: 'var(--status-critical)',
              color: '#000',
              fontSize: '9px',
              fontWeight: 900,
              position: 'absolute',
              top: '-4px',
              right: '-8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {badge}
            </div>
          )}
        </div>
        <span style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase' }}>{label}</span>
      </div>
    );

    if (onClick) {
      return (
        <button 
          onClick={onClick}
          style={{ 
            flex: 1, border: 'none', background: 'transparent', padding: 0,
            color: 'var(--text-muted)'
          }}
        >
          {content}
        </button>
      );
    }

    return (
      <NavLink 
        to={to} 
        end={end}
        style={({ isActive }) => ({
          flex: 1,
          textDecoration: 'none',
          color: isActive ? 'var(--accent-primary)' : 'var(--text-muted)'
        })}
      >
        {content}
      </NavLink>
    );
  };

  const renderItems = () => {
    if (role === 'logistics_manager') {
      return (
        <>
          <NavItem to="/app" icon={<Map />} label="Map" />
          <NavItem to="/app/shipments" icon={<Package />} label="Cargo" />
          <NavItem to="/app/disruptions" icon={<AlertTriangle />} label="Alerts" badge={alertCount} />
          <NavItem to="/?manual=true" icon={<BookOpen />} label="Manual" />
          <NavItem onClick={() => setIsMoreOpen(true)} icon={<Menu />} label="More" />
        </>
      );
    }
    if (role === 'company_owner') {
      return (
        <>
          <NavItem to="/owner" icon={<LayoutDashboard />} label="Home" />
          <NavItem to="/app" icon={<Map />} label="Map" />
          <NavItem to="/owner/users" icon={<Users />} label="Team" />
          <NavItem to="/app/shipments" icon={<Package />} label="Cargo" />
          <NavItem onClick={() => setIsMoreOpen(true)} icon={<Menu />} label="More" />
        </>
      );
    }
    if (role === 'node_operator') {
      return (
        <>
          <NavItem to="/operator" icon={<LayoutDashboard />} label="Dashboard" end />
          <NavItem to="/operator/today" icon={<CheckSquare />} label="Check-in" />
          <NavItem to="/operator/nodes" icon={<MapPin />} label="Nodes" />
          <NavItem to="/operator/flag" icon={<AlertTriangle />} label="Flag" />
          <NavItem onClick={() => setIsMoreOpen(true)} icon={<Menu />} label="More" />
        </>
      );
    }
    if (role === 'customer') {
      return (
        <>
          <NavItem to="/customer" icon={<Package />} label="Shipments" />
          <NavItem to="/customer/alerts" icon={<Bell />} label="Alerts" />
          <NavItem onClick={() => setIsMoreOpen(true)} icon={<Menu />} label="More" />
        </>
      );
    }
    return null;
  };

  return (
    <>
      <nav style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '64px',
        background: 'var(--bg-surface)',
        borderTop: '1px solid var(--glass-border)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        display: 'flex',
        zIndex: 1000
      }}>
        {renderItems()}
      </nav>
      <MoreDrawer isOpen={isMoreOpen} onClose={() => setIsMoreOpen(false)} />
    </>
  );
}
