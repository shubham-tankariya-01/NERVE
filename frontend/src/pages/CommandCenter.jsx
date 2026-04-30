import React, { useState } from 'react';
import NetworkMap from '../components/map/NetworkMap';
import { RiskyNodesPanel, RiskHorizonPanel } from '../components/panels/LeftPanels';
import { ShipmentTrackerPanel, DisruptionAlertsPanel, WeatherOverviewPanel } from '../components/panels/RightPanels';
import AgentLogBar from '../components/layout/AgentLogBar';
import { ChevronRight, ChevronLeft, PanelRight, X, Activity, Package, CloudRain, AlertTriangle, Menu } from 'lucide-react';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { useNetwork } from '../context/NetworkContext';

export default function CommandCenter() {
  const { isMobile, isTablet } = useBreakpoint();
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [selectedNode, setSelectedNode] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('Risk');
  const { networkHealth, alerts, shipments } = useNetwork();

  const handleNodeClick = (node) => {
    setSelectedNode(node);
  };

  // On mobile, the map should take all available space minus the topbar and bottom nav
  const containerHeight = isMobile ? 'calc(100vh - 64px - 64px)' : 'calc(100vh - 64px)';

  return (
    <div style={{ height: containerHeight, position: 'relative', display: 'flex', overflow: 'hidden', background: 'var(--bg-canvas)' }}>
      {/* Left Panels - Desktop Only */}
      {!isMobile && !isTablet && (
        <div style={{ width: '320px', padding: '1rem', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto', background: 'rgba(10, 17, 40, 0.4)', backdropFilter: 'blur(10px)', zIndex: 10 }}>
          <RiskyNodesPanel onSelectNode={handleNodeClick} />
          <RiskHorizonPanel selectedNode={selectedNode} />
        </div>
      )}

      {/* Main Map Area */}
      <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', transition: 'all 0.3s ease' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <NetworkMap 
            onNodeClick={handleNodeClick} 
            rightPanelOpen={(!isMobile && !isTablet) ? rightPanelOpen : false} 
            isMobile={isMobile}
            isTablet={isTablet}
          />
          
          {/* Right Panel Toggle Button - Desktop Only */}
          {!isMobile && !isTablet && (
            <button 
              onClick={() => setRightPanelOpen(!rightPanelOpen)}
              style={{ 
                position: 'absolute', right: '1rem', top: '1rem', zIndex: 1000,
                background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', color: 'var(--text-main)',
                padding: '0.6rem', borderRadius: '10px', cursor: 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s',
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)', backdropFilter: 'blur(10px)'
              }}
            >
              {rightPanelOpen ? <ChevronRight size={18} /> : <PanelRight size={18} />}
            </button>
          )}

          {/* Mobile/Tablet Action Button */}
          {(isMobile || isTablet) && (
            <button 
              onClick={() => setIsDrawerOpen(true)}
              style={{ 
                position: 'absolute', left: '1rem', bottom: isMobile ? '70px' : '1.5rem', zIndex: 1000,
                background: 'var(--accent-primary)', color: '#000', padding: '0.75rem 1.25rem',
                borderRadius: '12px', border: 'none', boxShadow: '0 8px 24px rgba(0,180,216,0.4)',
                display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer',
                fontWeight: 900, fontSize: '0.75rem', letterSpacing: '0.05em'
              }}
            >
              <Menu size={18} /> COMMANDS
            </button>
          )}

          {/* Mobile Summary Strip */}
          {isMobile && (
            <div 
              onClick={() => setIsDrawerOpen(true)}
              style={{
                position: 'absolute', bottom: 0, left: 0, right: 0, height: '60px',
                background: 'rgba(10, 17, 40, 0.9)', backdropFilter: 'blur(12px)',
                borderTop: '1px solid var(--glass-border)', zIndex: 1000,
                display: 'flex', alignItems: 'center', justifyContent: 'space-around',
                padding: '0 1rem'
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 900, color: 'var(--status-live)' }}>
                  <Activity size={14} /> {networkHealth}%
                </div>
                <div style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Health</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 900, color: 'var(--status-critical)' }}>
                  <AlertTriangle size={14} /> {alerts.length}
                </div>
                <div style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Alerts</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 900, color: 'var(--accent-primary)' }}>
                  <Package size={14} /> {shipments.length}
                </div>
                <div style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Cargo</div>
              </div>
            </div>
          )}
        </div>
        {!isMobile && <AgentLogBar />}
      </div>

      {/* Right Panels - Desktop Only */}
      {!isMobile && !isTablet && (
        <div style={{ 
          width: rightPanelOpen ? '320px' : '0', 
          minWidth: rightPanelOpen ? '320px' : '0',
          opacity: rightPanelOpen ? 1 : 0,
          padding: rightPanelOpen ? '1rem' : '0', 
          borderLeft: rightPanelOpen ? '1px solid var(--border)' : 'none', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '1rem',
          overflowY: 'auto', 
          background: 'rgba(10, 17, 40, 0.4)', 
          backdropFilter: 'blur(10px)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          zIndex: 10
        }}>
          <ShipmentTrackerPanel />
          <DisruptionAlertsPanel />
          <WeatherOverviewPanel />
        </div>
      )}

      {/* Mobile/Tablet Drawer */}
      {(isMobile || isTablet) && isDrawerOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 2000 }}>
          <div onClick={() => setIsDrawerOpen(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }} />
          <div style={{ 
            position: 'absolute', bottom: 0, left: 0, right: 0, height: '70vh', 
            background: 'var(--bg-secondary)', borderRadius: '24px 24px 0 0', 
            borderTop: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column',
            boxShadow: '0 -10px 40px rgba(0,0,0,0.5)', overflow: 'hidden'
          }}>
            <div style={{ width: '40px', height: '4px', background: 'var(--glass-border)', borderRadius: '2px', margin: '12px auto' }} />
            
            <div style={{ display: 'flex', borderBottom: '1px solid var(--glass-border)', padding: '0 1rem' }}>
              {['Risk', 'Shipments', 'Weather'].map(tab => (
                <button 
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{ 
                    flex: 1, padding: '16px 0', background: 'none', border: 'none', 
                    color: activeTab === tab ? 'var(--accent-primary)' : 'var(--text-muted)',
                    fontWeight: 900, fontSize: '12px', letterSpacing: '0.05em',
                    borderBottom: activeTab === tab ? '2px solid var(--accent-primary)' : 'none',
                    transition: 'all 0.2s'
                  }}
                >
                  {tab.toUpperCase()}
                </button>
              ))}
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }} className="custom-scrollbar">
              {activeTab === 'Risk' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <RiskyNodesPanel onSelectNode={node => { handleNodeClick(node); setIsDrawerOpen(false); }} />
                  <RiskHorizonPanel selectedNode={selectedNode} />
                </div>
              )}
              {activeTab === 'Shipments' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <ShipmentTrackerPanel />
                  <DisruptionAlertsPanel />
                </div>
              )}
              {activeTab === 'Weather' && <WeatherOverviewPanel />}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
