import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useNetwork } from '../context/NetworkContext';
import { ChevronLeft, Info, AlertTriangle, Clock, Package, MapPin, Truck, Calendar } from 'lucide-react';
import { MapContainer, TileLayer, Polyline, Marker, Popup } from 'react-leaflet';
import { useTheme } from '../context/ThemeContext';

export default function ShipmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { shipments, nodes } = useNetwork();
  const { theme } = useTheme();
  
  const shipment = shipments.find(s => s.id === id);

  if (!shipment) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        <AlertTriangle size={48} style={{ marginBottom: '1rem', color: 'var(--status-warning)' }} />
        <h2 style={{ color: 'var(--text-main)' }}>Shipment Data Link Terminated</h2>
        <p>The requested shipment ID ({id}) could not be located in the current telemetry stream.</p>
        <Link to="/shipments" style={{ color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: 600 }}>Return to Logistics Hub</Link>
      </div>
    );
  }

  const originNode = nodes.find(n => n.id === shipment.origin);
  const destNode = nodes.find(n => n.id === shipment.destination);
  const routeNodes = (shipment.planned_route || []).map(rid => nodes.find(n => n.id === rid)).filter(Boolean);
  
  const polylinePositions = routeNodes.map(n => [n.location?.lat || 0, n.location?.lng || 0]);

  const DARK_TILE = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
  const LIGHT_TILE = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
  const tileUrl = theme === 'light' ? LIGHT_TILE : DARK_TILE;

  // Calculate real progress
  const progressPercent = shipment.planned_route?.length 
    ? Math.round(((shipment.route_taken?.length || 0) / shipment.planned_route.length) * 100)
    : 0;

  return (
    <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)', background: 'var(--bg-main)' }}>
      <header style={{ 
        padding: '1rem 2rem', 
        borderBottom: '1px solid var(--glass-border)', 
        background: 'rgba(255,255,255,0.02)', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between' 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <button 
            onClick={() => navigate('/shipments')} 
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          >
            <ChevronLeft size={20} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', margin: 0, fontFamily: 'var(--font-mono)' }}>{shipment.id}</h1>
            <div style={{ width: '1px', height: '20px', background: 'var(--glass-border)' }}></div>
            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{shipment.cargo_type}</span>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem' }}>
          <div style={{ 
            padding: '0.4rem 1rem', 
            borderRadius: '4px', 
            fontSize: '0.75rem', 
            fontWeight: 800, 
            background: 'rgba(255,255,255,0.05)', 
            color: 'var(--accent-primary)',
            border: '1px solid var(--accent-primary)',
            textTransform: 'uppercase'
          }}>
            {shipment.status?.replace('_', ' ')}
          </div>
        </div>
      </header>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left Map Section */}
        <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--glass-border)' }}>
          <div style={{ flex: 1, background: '#111' }}>
            <MapContainer 
              center={originNode?.location ? [originNode.location.lat, originNode.location.lng] : [20, 85]} 
              zoom={4} 
              style={{ width: '100%', height: '100%' }}
              zoomControl={false}
            >
              <TileLayer url={tileUrl} />
              <Polyline positions={polylinePositions} color="var(--accent-primary)" weight={3} dashArray="8 12" opacity={0.6} />
              {routeNodes.map(n => (
                <Marker key={n.id} position={[n.location?.lat || 0, n.location?.lng || 0]}>
                  <Popup>
                    <div style={{ padding: '0.5rem' }}>
                      <strong style={{ display: 'block', marginBottom: '0.25rem' }}>{n.name}</strong>
                      <span style={{ fontSize: '0.7rem', color: '#666' }}>ID: {n.id} | TYPE: {n.type.toUpperCase()}</span>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
          
          {/* Timeline Strip */}
          <div style={{ height: '180px', background: 'rgba(0,0,0,0.3)', borderTop: '1px solid var(--glass-border)', padding: '2rem 3rem' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Transit Vector Progress</h3>
                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--accent-primary)', fontFamily: 'var(--font-mono)' }}>{progressPercent}% COMPLETE</span>
             </div>
             
             <div style={{ position: 'relative', height: '2px', background: 'rgba(255,255,255,0.05)', borderRadius: '1px' }}>
                <div style={{ width: `${progressPercent}%`, height: '100%', background: 'var(--accent-primary)', boxShadow: '0 0 10px var(--accent-primary)' }}></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', position: 'absolute', top: '-7px', width: '100%' }}>
                   {(shipment.planned_route || []).map((rid, i) => {
                     const n = nodes.find(node => node.id === rid);
                     const isPast = i < (shipment.route_taken?.length || 0);
                     const isCurrent = shipment.current_node === rid;
                     
                     return (
                       <div key={rid} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '14px' }}>
                         <div style={{ 
                           width: '14px', height: '14px', borderRadius: '50%', 
                           background: isCurrent ? 'var(--accent-primary)' : isPast ? 'var(--accent-primary)' : 'var(--bg-card)',
                           border: `2px solid ${isCurrent || isPast ? 'var(--accent-primary)' : 'rgba(255,255,255,0.1)'}`,
                           zIndex: 2,
                           transition: 'all 0.3s'
                         }}></div>
                         <div style={{ position: 'absolute', top: '24px', textAlign: 'center', minWidth: '80px' }}>
                           <div style={{ fontSize: '0.65rem', fontWeight: 800, color: isCurrent ? 'var(--text-main)' : 'var(--text-muted)' }}>{n?.id}</div>
                           <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', opacity: 0.7, whiteSpace: 'nowrap' }}>{n?.name.split(' ')[0]}</div>
                         </div>
                       </div>
                     );
                   })}
                </div>
             </div>
          </div>
        </div>

        {/* Right Detail Panel */}
        <div className="custom-scrollbar" style={{ width: '450px', padding: '2rem', overflowY: 'auto', background: 'rgba(0,0,0,0.1)' }}>
          
          {/* Core Telemetry */}
          <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
             <h3 style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Package size={14} /> Unit Specifications
             </h3>
             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div>
                   <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Weight Metrics</div>
                   <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-main)' }}>{shipment.weight_kg?.toLocaleString()} KG</div>
                </div>
                <div>
                   <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Priority Class</div>
                   <div style={{ fontWeight: 700, fontSize: '1rem', color: shipment.priority === 'critical' ? 'var(--status-critical)' : 'var(--text-main)' }}>
                      {shipment.priority?.toUpperCase()}
                   </div>
                </div>
                <div>
                   <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Departure Ref</div>
                   <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{new Date(shipment.departure_time).toLocaleDateString()}</div>
                </div>
                <div>
                   <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Target Arrival</div>
                   <div style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>{new Date(shipment.estimated_arrival).toLocaleDateString()}</div>
                </div>
             </div>
          </div>

          {/* Node Vectors */}
          <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
             <h3 style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <MapPin size={14} /> Deployment Path
             </h3>
             <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                   <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--status-live)' }}></div>
                   <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>ORIGIN NODE</div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{originNode?.name || shipment.origin}</div>
                   </div>
                </div>
                <div style={{ height: '20px', width: '2px', background: 'var(--glass-border)', marginLeft: '3px' }}></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                   <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--status-critical)' }}></div>
                   <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>DESTINATION NODE</div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{destNode?.name || shipment.destination}</div>
                   </div>
                </div>
             </div>
          </div>

          {/* Active Disruption Log */}
          <div className="glass-panel" style={{ padding: '1.5rem', borderLeft: shipment.disruptions?.length ? '4px solid var(--status-critical)' : '1px solid var(--glass-border)' }}>
             <h3 style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertTriangle size={14} /> Active Disruptions
             </h3>
             {shipment.disruptions?.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                   {shipment.disruptions.map((d, i) => (
                      <div key={i} style={{ padding: '0.75rem', background: 'rgba(255,20,50,0.05)', borderRadius: '4px', border: '1px solid rgba(255,20,50,0.1)' }}>
                         <div style={{ fontWeight: 700, color: 'var(--status-critical)', fontSize: '0.75rem', marginBottom: '0.25rem' }}>{d.type.toUpperCase()} · +{d.delay_hrs}H DELAY</div>
                         <div style={{ fontSize: '0.75rem', color: 'var(--text-main)' }}>{d.description}</div>
                      </div>
                   ))}
                </div>
             ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--status-live)' }}>
                   <Info size={16} />
                   <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Transit route stable. No active impediments.</span>
                </div>
             )}
          </div>

        </div>
      </div>
    </div>
  );
}
