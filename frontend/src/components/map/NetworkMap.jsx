import React from 'react';
import { useNetwork } from '../../context/NetworkContext';
import { MapContainer, TileLayer, CircleMarker, Polyline, Popup, useMap } from 'react-leaflet';
import { useTheme } from '../../hooks/useTheme';

function MapResizer({ rightPanelOpen }) {
  const map = useMap();
  React.useEffect(() => {
    setTimeout(() => {
      map.invalidateSize({ animate: true });
    }, 300); // match transition duration
  }, [rightPanelOpen, map]);
  return null;
}

export default function NetworkMap({ height = '100%', showPanels = true, onNodeClick, rightPanelOpen }) {
  const { nodes, routes, shipments } = useNetwork();
  const { theme } = useTheme();

  // Dark tile URL: CartoDB DarkMatter
  const DARK_TILE = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
  // Light tile URL: CartoDB Positron
  const LIGHT_TILE = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

  const tileUrl = theme === 'dark' ? DARK_TILE : LIGHT_TILE;

  const getNodeColor = (type, status) => {
    if (status === 'alert') return 'var(--danger)';
    if (status === 'congested') return 'var(--warning)';
    switch (type) {
      case 'factory': return 'var(--node-factory)';
      case 'port': return 'var(--node-port)';
      case 'warehouse': return 'var(--node-warehouse)';
      case 'retail': return 'var(--node-retail)';
      default: return 'var(--info)';
    }
  };

  return (
    <div style={{ width: '100%', height, position: 'relative' }}>
      <MapContainer 
        center={[20, 85]} 
        zoom={3} 
        minZoom={2} 
        maxZoom={8} 
        zoomControl={false}
        style={{ width: '100%', height: '100%', background: 'var(--map-bg)' }}
        key={theme} // Force remount on theme change
      >
        <MapResizer rightPanelOpen={rightPanelOpen} />
        <TileLayer
          url={tileUrl}
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />
        
        {/* Draw Routes */}
        {routes.map(r => {
          const originNode = nodes.find(n => n.id === r.from);
          const destNode = nodes.find(n => n.id === r.to);
          if (!originNode || !destNode) return null;
          
          const originPos = [
            originNode.lat ?? originNode.location?.lat, 
            originNode.lng ?? originNode.location?.lng
          ];
          const destPos = [
            destNode.lat ?? destNode.location?.lat, 
            destNode.lng ?? destNode.location?.lng
          ];

          if (originPos[0] === undefined || destPos[0] === undefined) return null;

          return (
            <Polyline 
              key={r.id} 
              positions={[originPos, destPos]} 
              color="rgba(0, 180, 216, 0.3)" 
              weight={1.5} 
              opacity={0.8}
            />
          );
        })}

        {/* Draw Nodes */}
        {nodes.map(node => {
          const pos = [
            node.lat ?? node.location?.lat, 
            node.lng ?? node.location?.lng
          ];
          if (pos[0] === undefined) return null;

          const isCritical = node.status === 'alert' || node.risk_level === 'critical';
          const isWarning = node.status === 'congested' || node.risk_level === 'high';

          return (
          <CircleMarker
            key={node.id}
            center={pos}
            radius={isCritical ? 7 : 5}
            fillColor={getNodeColor(node.type, node.status)}
            color={isCritical ? 'var(--status-critical)' : isWarning ? 'var(--status-warning)' : 'rgba(255,255,255,0.2)'}
            weight={isCritical ? 2 : 1}
            fillOpacity={1}
            className={`custom-marker ${isCritical ? 'blink-red' : ''}`}
            eventHandlers={{
              click: () => onNodeClick && onNodeClick(node)
            }}
          >
            <Popup className="custom-popup">
              <div style={{ padding: '1rem', minWidth: '220px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{node.id}</span>
                  <span className="badge" style={{ backgroundColor: 'var(--bg-hover)' }}>{node.type}</span>
                </div>
                <h3 style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{node.name}</h3>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.8rem', marginBottom: '1rem' }}>
                  <div>
                    <div style={{ color: 'var(--text-muted)' }}>Status</div>
                    <div style={{ color: isCritical ? 'var(--status-critical)' : node.status === 'congested' ? 'var(--status-warning)' : 'var(--brand)', textTransform: 'uppercase' }}>{node.status}</div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-muted)' }}>Risk</div>
                    <div>{node.risk_level || 'Low'}</div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-muted)' }}>Load</div>
                    <div>{node.current_load}/{node.capacity}</div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-muted)' }}>Proc. Time</div>
                    <div>{node.processing_time_hrs}h</div>
                  </div>
                </div>

                {node.weather && (
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.5rem', fontSize: '0.8rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>{node.weather.condition || 'Clear'}</span>
                      <span style={{ fontWeight: 'bold' }}>{node.weather.temperature_c || node.weather.temp || 0}°C</span>
                    </div>
                    <div style={{ color: 'var(--text-muted)' }}>Wind: {node.weather.wind_speed_kmh || node.weather.wind || 0} km/h</div>
                  </div>
                )}
              </div>
            </Popup>
          </CircleMarker>
          );
        })}
      </MapContainer>
      
      {showPanels && (
        <div style={{ position: 'absolute', top: '1rem', left: '1rem', zIndex: 1000, display: 'flex', gap: '0.5rem' }}>
          <button style={{ background: 'var(--bg-surface)', padding: '0.5rem 1rem', borderRadius: '4px', border: '1px solid var(--border)', fontSize: '0.875rem' }}>+ Zoom</button>
          <button style={{ background: 'var(--bg-surface)', padding: '0.5rem 1rem', borderRadius: '4px', border: '1px solid var(--border)', fontSize: '0.875rem' }}>- Zoom</button>
        </div>
      )}
    </div>
  );
}
