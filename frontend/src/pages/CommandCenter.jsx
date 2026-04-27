import React, { useState } from 'react';
import NetworkMap from '../components/map/NetworkMap';
import { RiskyNodesPanel, RiskHorizonPanel } from '../components/panels/LeftPanels';
import { ShipmentTrackerPanel, DisruptionAlertsPanel, WeatherOverviewPanel } from '../components/panels/RightPanels';
import AgentLogBar from '../components/layout/AgentLogBar';
import { ChevronRight, ChevronLeft, PanelRight } from 'lucide-react';

export default function CommandCenter() {
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [selectedNode, setSelectedNode] = useState(null);

  return (
    <div style={{ height: 'calc(100vh - 64px)', position: 'relative', display: 'flex', overflow: 'hidden', background: 'var(--bg-canvas)' }}>
      {/* Left Panels */}
      <div style={{ width: '320px', padding: '1rem', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto', background: 'rgba(10, 17, 40, 0.4)', backdropFilter: 'blur(10px)', zIndex: 10 }}>
        <RiskyNodesPanel onSelectNode={setSelectedNode} />
        <RiskHorizonPanel selectedNode={selectedNode} />
      </div>

      {/* Main Map Area */}
      <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <NetworkMap onNodeClick={setSelectedNode} rightPanelOpen={rightPanelOpen} />
          
          {/* Right Panel Toggle Button */}
          <button 
            onClick={() => setRightPanelOpen(!rightPanelOpen)}
            style={{ 
              position: 'absolute', 
              right: '1rem', 
              top: '1rem', 
              zIndex: 1000,
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              color: 'var(--text-main)',
              padding: '0.5rem',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s',
              boxShadow: 'var(--shadow-lg)'
            }}
          >
            {rightPanelOpen ? <ChevronRight size={18} /> : <PanelRight size={18} />}
          </button>
        </div>
        <AgentLogBar />
      </div>

      {/* Right Panels (Collapsible) */}
      <div style={{ 
        width: rightPanelOpen ? '300px' : '0', 
        minWidth: rightPanelOpen ? '300px' : '0',
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
        <div style={{ width: '268px' }}>
          <ShipmentTrackerPanel />
          <DisruptionAlertsPanel />
          <WeatherOverviewPanel />
        </div>
      </div>
    </div>
  );
}
