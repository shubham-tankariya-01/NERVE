import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useAuth } from '../../context/AuthContext';
import { fetchOperatorNodes, createNode, deleteNode } from '../../services/api';
import { 
  Plus, Trash2, MapPin, Navigation, Info, 
  Search, Loader, Save, X, ChevronRight, Globe 
} from 'lucide-react';

// Fix for default marker icons in Leaflet
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

function MapFlyTo({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.flyTo(center, 5);
  }, [center, map]);
  return null;
}

export default function NodeManager() {
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newNode, setNewNode] = useState({ name: '', type: 'warehouse', lat: 20.0, lng: 77.0 });
  const [selectedLocation, setSelectedLocation] = useState(null);
  const { getAuthHeaders } = useAuth();

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
      await createNode({
        ...newNode,
        lat: selectedLocation.lat,
        lng: selectedLocation.lng
      }, getAuthHeaders());
      setIsAdding(false);
      setNewNode({ name: '', type: 'warehouse', lat: 20.0, lng: 77.0 });
      setSelectedLocation(null);
      loadNodes();
    } catch (err) {
      alert("Failed to create node: " + err.message);
    }
  };

  const handleDelete = async (nodeId) => {
    if (!window.confirm("Are you sure you want to decommission this node? This action cannot be undone.")) return;
    try {
      await deleteNode(nodeId, getAuthHeaders());
      loadNodes();
    } catch (err) {
      alert("Failed to delete node: " + err.message);
    }
  };

  const styles = {
    container: {
      display: 'grid',
      gridTemplateColumns: '1fr 380px',
      gap: '24px',
      height: 'calc(100vh - 160px)',
    },
    mapCard: {
      backgroundColor: 'var(--bg-surface)',
      border: '1px solid var(--border)',
      borderRadius: '16px',
      overflow: 'hidden',
      position: 'relative',
    },
    panel: {
      backgroundColor: 'var(--bg-surface)',
      border: '1px solid var(--border)',
      borderRadius: '16px',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    },
    panelHeader: {
      padding: '20px',
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
      padding: '16px',
      borderRadius: '12px',
      backgroundColor: 'var(--bg-elevated)',
      marginBottom: '12px',
      border: '1px solid var(--border)',
      transition: 'all 0.2s',
    },
    form: {
      padding: '24px',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
    },
    input: {
      width: '100%',
      backgroundColor: 'var(--bg-canvas)',
      border: '1px solid var(--border)',
      borderRadius: '8px',
      padding: '10px 12px',
      color: 'var(--text-primary)',
      fontSize: '14px',
      outline: 'none',
    },
    label: {
      fontSize: '11px',
      color: 'var(--text-muted)',
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      marginBottom: '6px',
      display: 'block',
    },
    mapOverlay: {
      position: 'absolute',
      top: '20px',
      left: '20px',
      zIndex: 1000,
      backgroundColor: 'rgba(15, 23, 42, 0.9)',
      backdropFilter: 'blur(8px)',
      padding: '12px 20px',
      borderRadius: '10px',
      border: '1px solid var(--border)',
      color: 'white',
      pointerEvents: 'none',
    }
  };

  return (
    <div style={styles.container}>
      {/* Map Section */}
      <div style={styles.mapCard}>
        {isAdding && (
          <div style={styles.mapOverlay}>
            <div style={{ display:'flex', alignItems:'center', gap:'8px', fontSize:'13px', fontWeight:'700' }}>
               <Navigation size={16} color="var(--info)" />
               CLICK ON MAP TO SET NODE COORDINATES
            </div>
            {selectedLocation && (
              <div style={{ fontSize:'11px', color:'var(--text-muted)', marginTop:'4px' }}>
                Selected: {selectedLocation.lat.toFixed(4)}, {selectedLocation.lng.toFixed(4)}
              </div>
            )}
          </div>
        )}
        <MapContainer 
          center={[20.0, 78.0]} 
          zoom={5} 
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
          {isAdding && <LocationSelector onLocationSelect={setSelectedLocation} selectedLoc={selectedLocation} />}
        </MapContainer>
      </div>

      {/* Sidebar Panel */}
      <div style={styles.panel}>
        <div style={styles.panelHeader}>
          <div style={{ fontSize: '16px', fontWeight: '800' }}>{isAdding ? 'Register New Node' : 'Network Nodes'}</div>
          <button 
            onClick={() => setIsAdding(!isAdding)}
            style={{ 
              background: 'none', 
              border: 'none', 
              color: isAdding ? 'var(--danger)' : 'var(--info)', 
              cursor: 'pointer' 
            }}
          >
            {isAdding ? <X size={20} /> : <Plus size={20} />}
          </button>
        </div>

        {isAdding ? (
          <div style={styles.form}>
             <div>
               <label style={styles.label}>Station Name</label>
               <input 
                 style={styles.input} 
                 placeholder="e.g. Mumbai Logistics Hub" 
                 value={newNode.name}
                 onChange={e => setNewNode({...newNode, name: e.target.value})}
               />
             </div>
             <div>
               <label style={styles.label}>Node Classification</label>
               <select 
                 style={styles.input}
                 value={newNode.type}
                 onChange={e => setNewNode({...newNode, type: e.target.value})}
               >
                 {NODE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
               </select>
             </div>
             <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
                <div>
                   <label style={styles.label}>Latitude</label>
                   <input style={{...styles.input, backgroundColor:'var(--bg-elevated)'}} readOnly value={selectedLocation?.lat.toFixed(6) || ''} placeholder="Click map" />
                </div>
                <div>
                   <label style={styles.label}>Longitude</label>
                   <input style={{...styles.input, backgroundColor:'var(--bg-elevated)'}} readOnly value={selectedLocation?.lng.toFixed(6) || ''} placeholder="Click map" />
                </div>
             </div>
             
             <button 
              onClick={handleCreate}
              style={{ 
                marginTop: '12px',
                padding: '12px', 
                backgroundColor: 'var(--info)', 
                color: '#000', 
                border: 'none', 
                borderRadius: '8px', 
                fontWeight: '800', 
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
             >
               <Save size={18} />
               CONFIRM REGISTRATION
             </button>
          </div>
        ) : (
          <div style={styles.nodeList}>
            {loading ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <Loader size={24} style={{ animation: 'spin 1s linear infinite', marginBottom: '12px' }} />
                <div style={{ fontSize: '12px' }}>Updating network graph...</div>
              </div>
            ) : nodes.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <Globe size={32} style={{ marginBottom: '12px', opacity: 0.3 }} />
                <div style={{ fontSize: '13px' }}>No nodes registered yet.</div>
              </div>
            ) : (
              nodes.map(n => (
                <div key={n.id} style={styles.nodeItem}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: '700' }}>{n.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: '2px' }}>{n.type} • {n.id}</div>
                    </div>
                    <button 
                      onClick={() => handleDelete(n.id)}
                      style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '4px' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', marginTop: '12px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <MapPin size={12} /> {n.lat.toFixed(3)}, {n.lng.toFixed(3)}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Plus size={12} /> Cap: {n.capacity}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
