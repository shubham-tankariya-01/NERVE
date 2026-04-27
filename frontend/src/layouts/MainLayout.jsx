import React from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Activity, Box, LayoutDashboard, Map, Settings, Truck } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function MainLayout() {
  const { theme, setTheme } = useTheme();
  const location = useLocation();

  const getPageTitle = () => {
    if (location.pathname === '/') return 'Supply Chain Dashboard';
    if (location.pathname.startsWith('/shipments')) return 'Shipment Management';
    if (location.pathname === '/network') return 'Network Topology';
    if (location.pathname === '/alerts') return 'Alerts & Disruptions';
    return 'Nerve Platform';
  };

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo">
            <div className="logo-icon">N</div>
            <span>Nerve.io</span>
          </div>
        </div>

        <nav className="nav-links">
          <NavLink to="/" end className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <LayoutDashboard size={20} />
            Dashboard
          </NavLink>
          <NavLink to="/shipments" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Truck size={20} />
            Shipments
          </NavLink>
          <NavLink to="/network" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Map size={20} />
            Network Map
          </NavLink>
          <NavLink to="/alerts" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Activity size={20} />
            Alerts & Control
          </NavLink>
        </nav>

        <div className="sidebar-footer">
           <div className="input-group" style={{ marginBottom: 0 }}>
             <label className="input-label" style={{ fontSize: '0.75rem' }}>Interface Theme</label>
             <select 
               className="input-control" 
               value={theme}
               onChange={(e) => setTheme(e.target.value)}
               style={{ padding: '0.5rem', fontSize: '0.875rem' }}
             >
               <option value="dark">Syntho Dark</option>
               <option value="light">Syntho Light</option>
               <option value="aviation">Aviation Pro</option>
             </select>
           </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="topbar-left">
            <h1 className="page-title">{getPageTitle()}</h1>
          </div>
          <div className="topbar-right">
             {/* Health Badge or connection status can be rendered here via global context if we want, or left to pages */}
             <div className="badge badge-live">
                <div className="dot live dot-pulse"></div>
                System Operational
             </div>
          </div>
        </header>
        
        <div className="content-area">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
