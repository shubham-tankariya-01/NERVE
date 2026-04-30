import React from 'react';
import { useNetwork } from '../../context/NetworkContext';
import { MapContainer, TileLayer, CircleMarker, Polyline, Popup, useMap } from 'react-leaflet';
import { useTheme } from '../../hooks/useTheme';

function MapResizer({ rightPanelOpen, isMobile, isTablet }) {
  const map = useMap();
  React.useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 400); 
    return () => clearTimeout(timer);
  }, [rightPanelOpen, isMobile, isTablet, map]);
  return null;
}

function ZoomControls() {
  const map = useMap();
  return (
    <div style={{ position: 'absolute', top: '1rem', right: '1rem', zIndex: 1000, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <button 
        onClick={(e) => { e.stopPropagation(); map.zoomIn(); }}
        style={{ width: '36px', height: '36px', background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', color: 'var(--text-main)', borderRadius: '8px', cursor: 'pointer', fontWeight: 900, fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}
      >+</button>
      <button 
        onClick={(e) => { e.stopPropagation(); map.zoomOut(); }}
        style={{ width: '36px', height: '36px', background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', color: 'var(--text-main)', borderRadius: '8px', cursor: 'pointer', fontWeight: 900, fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}
      >-</button>
    </div>
  );
}

export default function NetworkMap({ height = '100%', onNodeClick, rightPanelOpen, isMobile, isTablet }) {
  const { nodes, routes } = useNetwork();
  const { theme } = useTheme();

  const DARK_TILE = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
  const LIGHT_TILE = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

  const getNodeColor = (type, status) => {
    if (status === 'alert') return 'var(--status-critical)';
    if (status === 'congested') return 'var(--status-warning)';
    switch (type) {
      case 'factory': return 'var(--node-factory)';
      case 'port': return 'var(--node-port)';
      case 'warehouse': return 'var(--node-warehouse)';
      case 'retail': return 'var(--node-retail)';
      default: return 'var(--accent-primary)';
    }
  };

  return (
    <div style={{ width: '100%', height, position: 'relative' }}>
      <MapContainer 
        center={[20, 85]} 
        zoom={isMobile ? 2 : 3} 
        minZoom={2} 
        maxZoom={10} 
        zoomControl={false}
        style={{ width: '100%', height: '100%', background: 'var(--bg-canvas)' }}
        key={`${theme}-${isMobile}`} 
      >
        <MapResizer rightPanelOpen={rightPanelOpen} isMobile={isMobile} isTablet={isTablet} />
        <ZoomControls />
        <TileLayer
          url={theme === 'dark' ? DARK_TILE : LIGHT_TILE}
        />
        
        {routes.map(r => {
          const originNode = nodes.find(n => n.id === r.from);
          const destNode = nodes.find(n => n.id === r.to);
          if (!originNode || !destNode) return null;
          
          const originPos = [originNode.lat ?? originNode.location?.lat, originNode.lng ?? originNode.location?.lng];
          const destPos = [destNode.lat ?? destNode.location?.lat, destNode.lng ?? destNode.location?.lng];

          if (originPos[0] === undefined || destPos[0] === undefined) return null;

          return (
            <Polyline 
              key={r.id} 
              positions={[originPos, destPos]} 
              color="var(--accent-primary)" 
              weight={isMobile ? 1 : 1.5} 
              opacity={0.15}
            />
          );
        })}

        {nodes.map(node => {
          const pos = [node.lat ?? node.location?.lat, node.lng ?? node.location?.lng];
          if (pos[0] === undefined) return null;

          const isCritical = node.status === 'alert' || node.risk_level === 'critical';
          const isWarning = node.status === 'congested' || node.risk_level === 'high';

          return (
            <CircleMarker
              key={node.id}
              center={pos}
              radius={isCritical ? (isMobile ? 6 : 8) : (isMobile ? 4 : 5)}
              fillColor={getNodeColor(node.type, node.status)}
              color={isCritical ? 'var(--status-critical)' : isWarning ? 'var(--status-warning)' : 'rgba(255,255,255,0.1)'}
              weight={isCritical ? 2 : 1}
              fillOpacity={0.9}
              className={`custom-marker ${isCritical ? 'blink-red' : ''}`}
              eventHandlers={{
                click: () => onNodeClick && onNodeClick(node)
              }}
            >
              <Popup className="custom-popup">
                <div style={{ padding: '0.75rem', minWidth: '200px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <span style={{ fontWeight: 900, fontSize: '0.8rem', letterSpacing: '0.05em' }}>{node.id}</span>
                    <span style={{ fontSize: '0.6rem', fontWeight: 900, background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase' }}>{node.type}</span>
                  </div>
                  <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '0.85rem', fontWeight: 800 }}>{node.name}</h3>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.7rem' }}>
                    <div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.6rem', textTransform: 'uppercase', marginBottom: '2px' }}>Status</div>
                      <div style={{ color: isCritical ? 'var(--status-critical)' : node.status === 'congested' ? 'var(--status-warning)' : 'var(--status-live)', fontWeight: 800 }}>{node.status.toUpperCase()}</div>
                    </div>
                    <div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.6rem', textTransform: 'uppercase', marginBottom: '2px' }}>Risk</div>
                      <div style={{ fontWeight: 800 }}>{node.risk_level?.toUpperCase() || 'LOW'}</div>
                    </div>
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
