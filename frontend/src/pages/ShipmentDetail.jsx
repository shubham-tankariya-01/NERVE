import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useNetwork } from '../context/NetworkContext';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { ChevronLeft, Info, AlertTriangle, Clock, Package, MapPin, Truck, Calendar } from 'lucide-react';
import { MapContainer, TileLayer, Polyline, Marker, Popup } from 'react-leaflet';
import { useTheme } from '../context/ThemeContext';

export default function ShipmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { shipments, nodes } = useNetwork();
  const { theme } = useTheme();
  const { isMobile, isTablet } = useBreakpoint();
  
  const shipment = shipments.find(s => s.id === id);

  if (!shipment) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        <AlertTriangle size={48} style={{ marginBottom: '1rem', color: 'var(--status-warning)' }} />
        <h2 style={{ color: 'var(--text-main)' }}>Shipment Link Terminated</h2>
        <p>The requested shipment ID ({id}) could not be located.</p>
        <Link to="/shipments" style={{ color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: 600 }}>Logistics Hub</Link>
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

  const progressPercent = shipment.planned_route?.length 
    ? Math.round(((shipment.route_taken?.length || 0) / shipment.planned_route.length) * 100)
    : 0;

  return (
    <div className="animate-slide-up" style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: isMobile ? 'auto' : 'calc(100vh - 64px)', 
      background: 'var(--bg-main)',
      overflowY: isMobile ? 'auto' : 'hidden'
    }}>
      <header style={{ 
        padding: isMobile ? '1rem' : '1rem 2rem', 
        borderBottom: '1px solid var(--glass-border)', 
        background: 'rgba(255,255,255,0.02)', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '0.75rem' : '1.5rem' }}>
          <button 
            onClick={() => navigate('/shipments')} 
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '8px' }}
          >
            <ChevronLeft size={20} />
          </button>
          <div style={{ display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '2px' : '1rem' }}>
            <h1 style={{ fontSize: isMobile ? '1rem' : '1.25rem', fontWeight: 800, color: 'var(--text-main)', margin: 0, fontFamily: 'var(--font-mono)' }}>{shipment.id}</h1>
            {!isMobile && <div style={{ width: '1px', height: '20px', background: 'var(--glass-border)' }}></div>}
            <span style={{ fontSize: isMobile ? '0.7rem' : '0.9rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{shipment.cargo_type}</span>
          </div>
        </div>
        
        <div style={{ 
          padding: '0.4rem 0.8rem', 
          borderRadius: '4px', 
          fontSize: '0.7rem', 
          fontWeight: 800, 
          background: 'rgba(255,255,255,0.05)', 
          color: 'var(--accent-primary)',
          border: '1px solid var(--accent-primary)',
          textTransform: 'uppercase'
        }}>
          {shipment.status?.replace('_', ' ')}
        </div>
      </header>

      <div style={{ display: 'flex', flex: 1, flexDirection: isMobile ? 'column' : 'row', overflow: isMobile ? 'visible' : 'hidden' }}>
        {/* Map Section */}
        <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', borderRight: isMobile ? 'none' : '1px solid var(--glass-border)', minHeight: isMobile ? '300px' : 'auto' }}>
          <div style={{ flex: 1, background: '#111', minHeight: isMobile ? '300px' : 'auto' }}>
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
                      <span style={{ fontSize: '0.7rem', color: '#666' }}>ID: {n.id}</span>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
          
          {/* Timeline Strip */}
          <div style={{ height: isMobile ? 'auto' : '180px', background: 'rgba(0,0,0,0.3)', borderTop: '1px solid var(--glass-border)', padding: isMobile ? '1.5rem' : '2rem 3rem' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: isMobile ? '1rem' : '1.5rem' }}>
                <h3 style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Transit Progress</h3>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent-primary)', fontFamily: 'var(--font-mono)' }}>{progressPercent}%</span>
             </div>
             
             <div style={{ position: 'relative', height: '2px', background: 'rgba(255,255,255,0.05)', borderRadius: '1px', marginBottom: isMobile ? '2.5rem' : '0' }}>
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
                           zIndex: 2
                         }}></div>
                         {!isMobile && (
                           <div style={{ position: 'absolute', top: '24px', textAlign: 'center', minWidth: '80px' }}>
                             <div style={{ fontSize: '0.6rem', fontWeight: 800, color: isCurrent ? 'var(--text-main)' : 'var(--text-muted)' }}>{n?.id}</div>
                           </div>
                         )}
                       </div>
                     );
                   })}
                </div>
             </div>
          </div>
        </div>

        {/* Detail Panel */}
        <div 
          className="custom-scrollbar" 
          style={{ 
            width: isMobile ? '100%' : '450px', 
            padding: isMobile ? '1.5rem' : '2rem', 
            overflowY: isMobile ? 'visible' : 'auto', 
            background: 'rgba(0,0,0,0.15)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem'
          }}
        >
          {/* Unit Specs */}
          <div className="glass-panel" style={{ padding: '1.5rem', flexShrink: 0 }}>
             <h3 style={{ fontSize: '0.75rem', fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.6rem', letterSpacing: '0.1em' }}>
                <Package size={16} /> LOGISTICS SPECIFICATIONS
             </h3>
             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                   <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem', fontWeight: 800 }}>Payload Weight</div>
                   <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>{shipment.weight_kg?.toLocaleString()} <span style={{fontSize: '0.7rem'}}>KG</span></div>
                </div>
                <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                   <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem', fontWeight: 800 }}>Priority Vector</div>
                   <div style={{ fontWeight: 800, fontSize: '1rem', color: shipment.priority === 'critical' ? 'var(--status-critical)' : 'var(--accent-primary)', textShadow: shipment.priority === 'critical' ? '0 0 10px var(--status-critical-glow)' : 'none' }}>
                      {shipment.priority?.toUpperCase()}
                   </div>
                </div>
                <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                   <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem', fontWeight: 800 }}>Departure Log</div>
                   <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-main)' }}>{new Date(shipment.departure_time).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                </div>
                <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                   <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem', fontWeight: 800 }}>ETA Window</div>
                   <div style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--accent-primary)' }}>{new Date(shipment.estimated_arrival).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                </div>
             </div>
          </div>
 
          {/* Deployment Path */}
          <div className="glass-panel" style={{ padding: '1.5rem', flexShrink: 0 }}>
             <h3 style={{ fontSize: '0.75rem', fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.6rem', letterSpacing: '0.1em' }}>
                <MapPin size={16} /> GEOSPATIAL DEPLOYMENT
             </h3>
             <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                   <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--status-live)', boxShadow: '0 0 10px var(--status-live)' }}></div>
                   <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)', fontWeight: 800 }}>ORIGIN POINT</div>
                      <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-main)' }}>{originNode?.name || shipment.origin}</div>
                   </div>
                </div>
                <div style={{ height: '24px', width: '2px', background: 'linear-gradient(to bottom, var(--status-live), var(--status-critical))', marginLeft: '4px' }}></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                   <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--status-critical)', boxShadow: '0 0 10px var(--status-critical)' }}></div>
                   <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)', fontWeight: 800 }}>TERMINAL DESTINATION</div>
                      <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-main)' }}>{destNode?.name || shipment.destination}</div>
                   </div>
                </div>
             </div>
          </div>
 
          {/* Active Disruptions */}
          <div className="glass-panel" style={{ 
            padding: '1.5rem', 
            borderLeft: shipment.disruptions?.length ? '4px solid var(--status-critical)' : '1px solid var(--glass-border)',
            flexShrink: 0 
          }}>
             <h3 style={{ fontSize: '0.75rem', fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.6rem', letterSpacing: '0.1em' }}>
                <AlertTriangle size={16} /> ACTIVE ANOMALIES
             </h3>
             {shipment.disruptions?.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                   {shipment.disruptions.map((d, i) => (
                      <div key={i} style={{ padding: '1rem', background: 'rgba(255,20,50,0.05)', borderRadius: '8px', border: '1px solid rgba(255,20,50,0.2)' }}>
                         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <div style={{ fontWeight: 900, color: 'var(--status-critical)', fontSize: '0.75rem', letterSpacing: '0.05em' }}>{d.type.toUpperCase()}</div>
                            <div style={{ fontSize: '0.75rem', fontWeight: 900, color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>+{d.delay_hrs}H</div>
                         </div>
                         <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{d.description}</div>
                      </div>
                   ))}
                </div>
             ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--status-live)', background: 'rgba(6,214,160,0.05)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(6,214,160,0.1)' }}>
                   <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--status-live)', boxShadow: '0 0 10px var(--status-live)' }}></div>
                   <span style={{ fontSize: '0.8rem', fontWeight: 800, letterSpacing: '0.05em' }}>VECTOR STABLE · NO DELAYS</span>
                </div>
             )}
          </div>
        </div>
      </div>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.2); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: var(--glass-border); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
      `}</style>
    </div>
  );
}
