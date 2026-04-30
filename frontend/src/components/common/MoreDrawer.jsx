import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useAgent } from '../../context/AgentContext';
import { useAppWebSocket } from '../../context/WebSocketContext';
import { 
  Box, CloudRain, PlusCircle, Zap, GitBranch, Shield, Settings, LogOut, BookOpen, Bot, LayoutDashboard, MapPin, AlertTriangle, Bell, RefreshCw
} from 'lucide-react';
import { restoreDemoData } from '../../services/api';

export default function MoreDrawer({ isOpen, onClose }) {
  const { user, logout } = useAuth();
  const { unreadCount } = useAgent();
  const { pendingRerouteCount } = useAppWebSocket();
  const navigate = useNavigate();
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => setAnimate(true), 10);
    } else {
      setAnimate(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const role = user?.role;

  const handleNavigate = (to) => {
    setAnimate(false);
    setTimeout(() => {
      navigate(to);
      onClose();
    }, 250);
  };

  const handleLogout = () => {
    onClose();
    setTimeout(() => {
      logout();
      navigate('/login');
    }, 300);
  };

  const handleReinit = async () => {
    if (window.confirm('Re-initialize entire network data? This will reset all current manifests.')) {
      try {
        await restoreDemoData(useAuth().getAuthHeaders());
        window.location.reload();
      } catch (err) {
        alert('Sync failed: ' + err.message);
      }
    }
  };

  const items = [];
  if (role === 'logistics_manager') {
    items.push(
      { to: '/app/dashboard', icon: <Box size={20} />, label: 'Dashboard' },
      { to: '/app/nodes', icon: <Box size={20} />, label: 'Nodes' },
      { to: '/app/weather', icon: <CloudRain size={20} />, label: 'Weather' },
      { to: '/app/book', icon: <PlusCircle size={20} />, label: 'Book Shipment' },
      { to: '/app/simulate', icon: <Zap size={20} />, label: 'Simulate', color: 'var(--danger)' },
      { to: '/app/rerouting-center', icon: <GitBranch size={20} />, label: 'Rerouting', badge: pendingRerouteCount },
      { to: '/app/agents', icon: <Bot size={20} />, label: 'Neural Agents', badge: unreadCount },
      { to: '/?manual=true', icon: <BookOpen size={20} />, label: 'User Manual' },
      { to: '/app/mission-control', icon: <Shield size={20} />, label: 'Mission Control' }
    );
  } else if (role === 'company_owner') {
    items.push(
      { to: '/owner/nodes', icon: <PlusCircle size={20} />, label: 'Node Management' },
      { to: '/app/simulate', icon: <Zap size={20} />, label: 'Simulate', color: 'var(--danger)' },
      { to: '/app/rerouting-center', icon: <GitBranch size={20} />, label: 'Rerouting', badge: pendingRerouteCount },
      { to: '/app/nodes', icon: <Box size={20} />, label: 'Nodes' },
      { to: '/app/weather', icon: <CloudRain size={20} />, label: 'Weather' },
      { to: '/?manual=true', icon: <BookOpen size={20} />, label: 'User Manual' }
    );
  } else if (role === 'node_operator') {
    items.push(
      { to: '/operator', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
      { to: '/operator/nodes', icon: <MapPin size={20} />, label: 'Station Nodes' },
      { to: '/operator/weather', icon: <CloudRain size={20} />, label: 'Weather' },
      { to: '/operator/flag', icon: <AlertTriangle size={20} />, label: 'Report Issue' },
      { to: '/?manual=true', icon: <BookOpen size={20} />, label: 'User Manual' }
    );
  } else if (role === 'customer') {
    items.push(
      { to: '/customer', icon: <Package size={20} />, label: 'My Shipments' },
      { to: '/customer/alerts', icon: <Bell size={20} />, label: 'Active Alerts' },
      { to: '/?manual=true', icon: <BookOpen size={20} />, label: 'User Manual' }
    );
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 2000,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'flex-end'
    }}>
      {/* Overlay */}
      <div 
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,0.6)',
          opacity: animate ? 1 : 0,
          transition: 'opacity 0.3s ease-out'
        }}
      />

      {/* Sheet */}
      <div style={{
        position: 'relative',
        background: 'var(--bg-secondary)',
        borderRadius: '20px 20px 0 0',
        borderTop: '1px solid var(--glass-border)',
        padding: '0 20px 40px 20px',
        transform: animate ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 0.3s ease-out',
        maxHeight: '80vh',
        overflowY: 'auto'
      }}>
        <div style={{
          width: '40px',
          height: '4px',
          background: 'var(--glass-border)',
          borderRadius: '2px',
          margin: '12px auto'
        }} />
        
        <div style={{ 
          fontSize: '10px', 
          fontWeight: 700, 
          color: 'var(--text-muted)', 
          letterSpacing: '1px',
          marginBottom: '20px',
          textAlign: 'center'
        }}>
          MORE OPTIONS
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {items.map((item, i) => (
            <div 
              key={i}
              onClick={() => handleNavigate(item.to)}
              style={{
                height: '56px',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                cursor: 'pointer',
                color: item.color || 'var(--text-main)',
                backgroundColor: 'transparent',
                border: 'none',
                width: '100%',
                padding: 0,
                textAlign: 'left',
                fontFamily: 'inherit'
              }}
            >
              {item.icon}
              <span style={{ fontSize: '14px', fontWeight: 700, flex: 1 }}>{item.label}</span>
              {item.badge > 0 && (
                <span style={{ 
                  background: 'var(--status-critical)', 
                  color: '#000', 
                  fontSize: '10px', 
                  fontWeight: 900,
                  padding: '2px 8px',
                  borderRadius: '10px'
                }}>
                  {item.badge}
                </span>
              )}
            </div>
          ))}
          
          <div 
            onClick={handleReinit}
            style={{
              height: '56px',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              cursor: 'pointer',
              color: 'var(--info)',
              marginTop: '8px'
            }}
          >
            <RefreshCw size={20} />
            <span style={{ fontSize: '14px', fontWeight: 700 }}>RE-INITIALIZE NETWORK</span>
          </div>

          <div 
            onClick={handleLogout}
            style={{
              height: '56px',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              cursor: 'pointer',
              color: 'var(--status-critical)',
              marginTop: '8px',
              borderTop: '1px solid var(--glass-border)'
            }}
          >
            <LogOut size={20} />
            <span style={{ fontSize: '14px', fontWeight: 700 }}>SIGN OUT</span>
          </div>
        </div>
      </div>
    </div>
  );
}
