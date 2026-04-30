import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useAuth } from '../../context/AuthContext';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import { fetchOperatorNodes, requestNodeAction } from '../../services/api';
import { 
  Plus, Trash2, MapPin, Navigation, Info, 
  Search, Loader, Save, X, ChevronRight, Globe,
  PlusCircle, AlertCircle, ChevronUp
} from 'lucide-react';

// Fix for default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const NODE_TYPES = [
  { value: 'warehouse', label: 'Warehouse' },
  { value: 'port', label: 'Sea Port' },
  { value: 'distribution_center', label: 'Distribution Center' },
  { value: 'air_terminal', label: 'Air Terminal' },
  { value: 'rail_hub', label: 'Rail Hub' }
];

function LocationSelector({ onLocationSelect, selectedLoc }) {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng);
    },
  });
  return selectedLoc ? <Marker position={selectedLoc} /> : null;
}

export default function NodeManager() {
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mapMaximized, setMapMaximized] = useState(false);
  const [newNode, setNewNode] = useState({ name: '', type: 'warehouse', lat: 20.0, lng: 77.0 });
  const [selectedLocation, setSelectedLocation] = useState(null);
  const { getAuthHeaders, user } = useAuth();
  const { isMobile } = useBreakpoint();

  const loadNodes = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchOperatorNodes(getAuthHeaders());
      setNodes(data.nodes || []);
    } catch (err) {
      console.error('Failed to load nodes:', err);
    } finally { setLoading(false); }
  }, [getAuthHeaders]);

  useEffect(() => { loadNodes(); }, [loadNodes]);

  const handleCreate = async () => {
    if (!newNode.name || !selectedLocation) {
      alert("Please enter a name and select a location on the map.");
      return;
    }
    try {
      await requestNodeAction({
        action: 'create',
        node_data: {
          ...newNode,
          lat: selectedLocation.lat,
          lng: selectedLocation.lng
        }
      }, getAuthHeaders());
      alert("Node creation request submitted to company owner.");
      setIsAdding(false);
      setNewNode({ name: '', type: 'warehouse', lat: 20.0, lng: 77.0 });
      setSelectedLocation(null);
    } catch (err) {
      alert("Failed to submit request: " + err.message);
    }
  };

  const handleDelete = async (nodeId) => {
    if (!window.confirm("Submit a request to decommission this node?")) return;
    try {
      await requestNodeAction({
        action: 'delete',
        node_id: nodeId
      }, getAuthHeaders());
      alert("Node deletion request submitted to company owner.");
    } catch (err) {
      alert("Failed to submit request: " + err.message);
    }
  };

  const styles = {
    container: {
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      height: isMobile ? 'calc(100vh - 64px)' : 'calc(100vh - 160px)',
      gap: isMobile ? '0' : '24px',
      position: 'relative',
      overflowX: 'hidden',
      overflowY: isMobile ? 'auto' : 'hidden'
    },
    mapCard: {
      backgroundColor: 'var(--bg-surface)',
      border: isMobile ? 'none' : '1px solid var(--border)',
      borderRadius: isMobile ? '0' : '16px',
      overflow: 'hidden',
      position: 'relative',
      height: isMobile ? (mapMaximized ? '400px' : '220px') : '100%',
      transition: 'height 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      flexShrink: 0,
      margin: isMobile ? '0' : '0'
    },
    panel: {
      width: isMobile ? '100%' : '380px',
      flex: isMobile ? 'none' : '1',
      backgroundColor: 'var(--bg-surface)',
      border: isMobile ? 'none' : '1px solid var(--border)',
      borderTop: isMobile ? '1px solid var(--border)' : 'none',
      borderRadius: isMobile ? '0' : '16px',
      display: 'flex',
      flexDirection: 'column',
      position: isMobile ? 'static' : 'relative',
      zIndex: 10,
    },
    drawerHandle: {
      height: '32px',
      display: isMobile ? 'flex' : 'none',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
    },
    handleBar: {
      width: '40px',
      height: '4px',
      backgroundColor: 'var(--border)',
      borderRadius: '2px',
    },
    panelHeader: {
      padding: '16px 20px',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    nodeList: {
      flex: 1,
      overflowY: 'auto',
      padding: '12px',
    },
    nodeItem: {
      padding: '12px',
      borderRadius: '10px',
      backgroundColor: 'var(--bg-elevated)',
      marginBottom: '10px',
      border: '1px solid var(--border)',
    },
    mapOverlay: {
      position: 'absolute',
      top: '16px',
      left: '16px',
      zIndex: 1000,
      backgroundColor: 'rgba(15, 23, 42, 0.95)',
      backdropFilter: 'blur(8px)',
      padding: '10px 16px',
      borderRadius: '8px',
      border: '1px solid var(--border)',
      color: 'white',
      pointerEvents: 'none',
    },
    modalOverlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.9)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000,
    },
    modalContent: {
      width: isMobile ? '100%' : '900px',
      height: isMobile ? '100%' : '650px',
      backgroundColor: 'var(--bg-surface)',
      borderRadius: isMobile ? '0' : '20px',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
    },
    modalBody: {
      flex: 1,
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : '1fr 320px',
      overflowY: 'auto'
    },
    input: {
      width: '100%',
      backgroundColor: 'var(--bg-canvas)',
      border: '1px solid var(--border)',
      borderRadius: '8px',
      padding: '10px 14px',
      color: 'var(--text-primary)',
      fontSize: '14px',
      outline: 'none',
    },
    label: {
      fontSize: '9px',
      color: 'var(--text-muted)',
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: '1px',
      marginBottom: '4px',
      display: 'block',
    }
  };

  return (
    <div style={styles.container}>
      {/* Map Section */}
      <div style={styles.mapCard}>
        {isMobile && (
          <button 
            onClick={() => setMapMaximized(!mapMaximized)}
            style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              zIndex: 1000,
              backgroundColor: 'rgba(15, 23, 42, 0.9)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '8px',
              color: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '10px',
              fontWeight: '900'
            }}
          >
            {mapMaximized ? <X size={14} /> : <Globe size={14} />}
            {mapMaximized ? 'MINIMIZE' : 'MAXIMIZE'}
          </button>
        )}
        {isAdding && (
          <div style={styles.mapOverlay}>
            <div style={{ display:'flex', alignItems:'center', gap:'8px', fontSize:'11px', fontWeight:'900' }}>
               <Navigation size={14} color="var(--info)" />
               SET NODE COORDINATES
            </div>
            {selectedLocation && (
              <div style={{ fontSize:'9px', color:'var(--text-muted)', marginTop:'2px' }}>
                {selectedLocation.lat.toFixed(4)}, {selectedLocation.lng.toFixed(4)}
              </div>
            )}
          </div>
        )}
        <MapContainer 
          center={[20.0, 78.0]} 
          zoom={isMobile ? 4 : 5} 
          style={{ height: '100%', width: '100%', filter: 'grayscale(0.8) invert(1) contrast(0.9)' }}
          zoomControl={false}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {nodes.map(n => (
            <Marker 
              key={n.id} 
              position={[n.lat, n.lng]} 
              icon={L.divIcon({
                className: 'custom-div-icon',
                html: `<div style="background-color: var(--info); width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 10px var(--info);"></div>`,
                iconSize: [12, 12],
                iconAnchor: [6, 6]
              })}
            />
          ))}
          {isAdding && <LocationSelector onLocationSelect={(loc) => { setSelectedLocation(loc); if(isMobile) setMapMaximized(false); }} selectedLoc={selectedLocation} />}
        </MapContainer>
      </div>

      {/* Sidebar Panel */}
      <div style={styles.panel}>
        {!isMobile && (
          <div style={styles.drawerHandle} onClick={() => setDrawerOpen(!drawerOpen)}>
            <div style={styles.handleBar} />
          </div>
        )}

        <div style={styles.panelHeader}>
          <div style={{ fontSize: '14px', fontWeight: '900' }}>Assigned Nodes</div>
          <button 
            onClick={() => setIsAdding(true)}
            style={{ background: 'var(--info)', border: 'none', color: '#000', padding: '6px 12px', borderRadius: '6px', fontWeight: '900', fontSize: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Plus size={14} /> REQUEST NEW
          </button>
        </div>
        
        <div style={styles.nodeList}>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <Loader size={20} style={{ animation: 'spin 1s linear infinite' }} />
            </div>
          ) : nodes.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <Globe size={32} style={{ marginBottom: '12px', opacity: 0.2 }} />
              <div style={{ fontSize: '12px', fontWeight: '700' }}>No nodes assigned.</div>
            </div>
          ) : (
            nodes.map(n => (
              <div key={n.id} style={styles.nodeItem}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Link to={`/operator/node/${n.id}`} style={{ textDecoration: 'none', color: 'inherit', flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: '850', color: 'var(--text-primary)' }}>{n.name}</div>
                    <div style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700', marginTop: '2px' }}>{n.type} • {n.id}</div>
                  </Link>
                  <button 
                    onClick={(e) => { e.preventDefault(); handleDelete(n.id); }}
                    style={{ background: 'none', border: 'none', color: 'var(--status-critical)', cursor: 'pointer', padding: '4px' }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal for Adding Node (Request) */}
      {isAdding && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--text-primary)', margin: 0 }}>REQUEST STATION</h3>
                <p style={{ fontSize: '8px', color: 'var(--text-muted)', fontWeight: 800, margin: '2px 0 0 0' }}>GEOSPATIAL COORDINATE ASSIGNMENT</p>
              </div>
              <button onClick={() => setIsAdding(false)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', padding: '8px', borderRadius: '50%', color: 'var(--text-muted)' }}>
                <X size={18} />
              </button>
            </div>
            
            <div style={styles.modalBody}>
              <div style={{ height: isMobile ? '250px' : '100%', borderRight: isMobile ? 'none' : '1px solid var(--border)', borderBottom: isMobile ? '1px solid var(--border)' : 'none' }}>
                <MapContainer 
                  center={[20.0, 78.0]} 
                  zoom={5} 
                  style={{ height: '100%', width: '100%', filter: 'grayscale(0.8) invert(1) contrast(0.9)' }}
                  zoomControl={!isMobile}
                >
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <LocationSelector onLocationSelect={setSelectedLocation} selectedLoc={selectedLocation} />
                </MapContainer>
              </div>

              <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={styles.label}>Station Name</label>
                  <input 
                    style={styles.input} 
                    placeholder="e.g. ALPHA_HUB" 
                    value={newNode.name}
                    onChange={e => setNewNode({...newNode, name: e.target.value})}
                  />
                </div>

                <div>
                  <label style={styles.label}>Classification</label>
                  <select 
                    style={{ ...styles.input, appearance: 'none' }}
                    value={newNode.type}
                    onChange={e => setNewNode({...newNode, type: e.target.value})}
                  >
                    {NODE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={styles.label}>Latitude</label>
                    <input style={{ ...styles.input, opacity: selectedLocation ? 1 : 0.5, fontSize: '11px' }} readOnly value={selectedLocation?.lat.toFixed(6) || 'NOT SET'} />
                  </div>
                  <div>
                    <label style={styles.label}>Longitude</label>
                    <input style={{ ...styles.input, opacity: selectedLocation ? 1 : 0.5, fontSize: '11px' }} readOnly value={selectedLocation?.lng.toFixed(6) || 'NOT SET'} />
                  </div>
                </div>

                <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '9px', fontWeight: 800, background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '8px' }}>
                      <AlertCircle size={14} color="var(--info)" />
                      <span>REQUEST WILL BE SENT FOR OWNER APPROVAL</span>
                   </div>
                   <button 
                    onClick={handleCreate}
                    style={{ width: '100%', padding: '14px', background: 'var(--info)', color: '#000', border: 'none', borderRadius: '12px', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                   >
                     <Save size={16} />
                     SUBMIT REQUEST
                   </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
