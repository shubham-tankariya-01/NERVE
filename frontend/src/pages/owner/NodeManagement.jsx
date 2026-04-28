import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useAuth } from '../../context/AuthContext';
import { 
  fetchOperatorNodes, createNode, deleteNode, 
  fetchNodeRequests, approveNodeRequest, rejectNodeRequest 
} from '../../services/api';
import { 
  Plus, Trash2, MapPin, Navigation, Check, X, 
  Loader, Save, Globe, Clock, AlertCircle, PlusCircle
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

export default function NodeManagement() {
  const [nodes, setNodes] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newNode, setNewNode] = useState({ name: '', type: 'warehouse', lat: 20.0, lng: 77.0 });
  const [selectedLocation, setSelectedLocation] = useState(null);
  const { getAuthHeaders } = useAuth();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [nodesData, requestsData] = await Promise.all([
        fetchOperatorNodes(getAuthHeaders()),
        fetchNodeRequests(getAuthHeaders())
      ]);
      setNodes(nodesData.nodes || []);
      setRequests(requestsData.requests || []);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally { setLoading(false); }
  }, [getAuthHeaders]);

  useEffect(() => { loadData(); }, [loadData]);

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
      loadData();
    } catch (err) {
      alert("Failed to create node: " + err.message);
    }
  };

  const handleDelete = async (nodeId) => {
    if (!window.confirm("Are you sure you want to decommission this node?")) return;
    try {
      await deleteNode(nodeId, getAuthHeaders());
      loadData();
    } catch (err) {
      alert("Failed to delete node: " + err.message);
    }
  };

  const handleApprove = async (requestId) => {
    try {
      await approveNodeRequest(requestId, getAuthHeaders());
      loadData();
    } catch (err) {
      alert("Failed to approve request: " + err.message);
    }
  };

  const handleReject = async (requestId) => {
    const reason = window.prompt("Reason for rejection:");
    if (reason === null) return;
    try {
      await rejectNodeRequest(requestId, reason, getAuthHeaders());
      loadData();
    } catch (err) {
      alert("Failed to reject request: " + err.message);
    }
  };

  const styles = {
    container: {
      display: 'flex',
      height: 'calc(100vh - 64px)',
      background: 'var(--bg-main)',
      overflow: 'hidden',
    },
    mainMap: {
      flex: 1,
      position: 'relative',
      background: '#0a0a0a',
    },
    sidebar: {
      width: '400px',
      height: '100%',
      backgroundColor: 'var(--bg-secondary)',
      borderLeft: '1px solid var(--glass-border)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 10,
    },
    requestsSection: {
      height: '80%',
      overflowY: 'auto',
      padding: '24px',
      display: 'flex',
      flexDirection: 'column',
      gap: '24px',
    },
    addSection: {
      height: '20%',
      borderTop: '1px solid var(--glass-border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      background: 'rgba(255,255,255,0.01)',
    },
    modalOverlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.85)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    },
    modalContent: {
      width: '900px',
      height: '650px',
      backgroundColor: 'var(--bg-secondary)',
      borderRadius: '20px',
      border: '1px solid var(--glass-border)',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
    },
    modalHeader: {
      padding: '20px 24px',
      borderBottom: '1px solid var(--glass-border)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    modalBody: {
      flex: 1,
      display: 'grid',
      gridTemplateColumns: '1fr 320px',
    },
    modalMap: {
      height: '100%',
      width: '100%',
      borderRight: '1px solid var(--glass-border)',
    },
    modalForm: {
      padding: '24px',
      display: 'flex',
      flexDirection: 'column',
      gap: '20px',
    },
    requestItem: {
      padding: '16px',
      borderRadius: '12px',
      backgroundColor: 'var(--bg-elevated)',
      border: '1px solid var(--glass-border)',
      transition: 'all 0.2s ease',
      position: 'relative',
    },
    nodeItem: {
      padding: '12px 16px',
      borderRadius: '12px',
      backgroundColor: 'rgba(255,255,255,0.02)',
      border: '1px solid var(--glass-border)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    input: {
      width: '100%',
      backgroundColor: 'rgba(255,255,255,0.03)',
      border: '1px solid var(--glass-border)',
      borderRadius: '12px',
      padding: '12px 16px',
      color: 'var(--text-main)',
      fontSize: '14px',
      outline: 'none',
      fontFamily: 'var(--font-mono)',
    },
    label: {
      fontSize: '11px',
      color: 'var(--text-muted)',
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: '1px',
      marginBottom: '8px',
      display: 'block',
    }
  };

  return (
    <div style={styles.container}>
      {/* Main Map Background */}
      <div style={styles.mainMap}>
        <MapContainer 
          center={[20.0, 78.0]} 
          zoom={5} 
          style={{ height: '100%', width: '100%', filter: 'grayscale(0.9) invert(1) contrast(0.8)' }}
          zoomControl={false}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {nodes.map(n => (
            <Marker 
              key={n.id} 
              position={[n.lat, n.lng]} 
              icon={L.divIcon({
                className: 'custom-div-icon',
                html: `<div style="background-color: var(--accent-primary); width: 14px; height: 14px; border-radius: 50%; border: 3px solid #000; box-shadow: 0 0 15px var(--accent-primary);"></div>`,
                iconSize: [14, 14],
                iconAnchor: [7, 7]
              })}
            />
          ))}
        </MapContainer>

        {/* Float Header on Map */}
        <div style={{ position: 'absolute', top: '24px', left: '24px', zIndex: 100, display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#fff', margin: 0, textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>NETWORK ARCHITECT</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--status-live)', boxShadow: '0 0 10px var(--status-live)' }}></div>
            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Global Infrastructure Active</span>
          </div>
        </div>
      </div>

      {/* Right Sidebar */}
      <aside style={styles.sidebar}>
        {/* Top 80%: Requests */}
        <div className="custom-scrollbar" style={styles.requestsSection}>
          {/* Requests Part */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '11px', fontWeight: 900, color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase' }}>Pending Approvals</h3>
              <span style={{ fontSize: '10px', fontWeight: 900, background: 'var(--accent-primary)', color: '#000', padding: '2px 8px', borderRadius: '20px' }}>{requests.length}</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {requests.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', opacity: 0.3, border: '1px dashed var(--glass-border)', borderRadius: '12px' }}>
                  <p style={{ fontSize: '11px', fontWeight: 700, margin: 0 }}>No pending requests</p>
                </div>
              ) : (
                requests.map(req => (
                  <div key={req.id} style={styles.requestItem}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ 
                            fontSize: '9px', 
                            fontWeight: 900, 
                            color: req.action === 'create' ? 'var(--status-live)' : 'var(--status-critical)',
                            textTransform: 'uppercase'
                          }}>
                            {req.action}
                          </span>
                          <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-main)' }}>
                            {req.action === 'create' ? req.node_data.name : req.node_id}
                          </span>
                        </div>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>
                          By: <span style={{ color: 'var(--accent-primary)' }}>{req.requester_id}</span>
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button onClick={() => handleApprove(req.id)} style={{ padding: '4px', background: 'var(--accent-primary)', border: 'none', borderRadius: '6px', cursor: 'pointer', color: '#000' }}><Check size={14} /></button>
                        <button onClick={() => handleReject(req.id)} style={{ padding: '4px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', borderRadius: '6px', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={14} /></button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Active Nodes Part */}
          <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '11px', fontWeight: 900, color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase' }}>Active Infrastructure</h3>
              <span style={{ fontSize: '10px', fontWeight: 900, color: 'var(--text-secondary)' }}>{nodes.length} NODES</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {nodes.map(n => (
                <div key={n.id} style={styles.nodeItem}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-main)' }}>{n.name}</span>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>{n.id} • {n.type}</span>
                  </div>
                  <button onClick={() => handleDelete(n.id)} style={{ background: 'none', border: 'none', color: 'var(--status-critical)', cursor: 'pointer', opacity: 0.6 }} onMouseEnter={e => e.currentTarget.style.opacity=1} onMouseLeave={e => e.currentTarget.style.opacity=0.6}>
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom 20%: Add Button */}
        <div style={styles.addSection}>
          <button 
            onClick={() => setIsAdding(true)}
            style={{ 
              width: '100%', 
              height: '56px', 
              background: 'var(--accent-primary)', 
              color: '#000', 
              border: 'none', 
              borderRadius: '16px', 
              fontWeight: 900, 
              fontSize: '13px', 
              cursor: 'pointer', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '12px',
              boxShadow: '0 10px 20px rgba(0, 180, 216, 0.2)',
              transition: 'transform 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <PlusCircle size={20} />
            REGISTER NEW NETWORK NODE
          </button>
        </div>
      </aside>

      {/* Modal for Adding Node */}
      {isAdding && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--text-main)', margin: 0 }}>INFRASTRUCTURE REGISTRATION</h3>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, margin: '4px 0 0 0' }}>POINT ON MAP TO ASSIGN GEOSPATIAL COORDINATES</p>
              </div>
              <button onClick={() => setIsAdding(false)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', padding: '8px', borderRadius: '50%', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>
            
            <div style={styles.modalBody}>
              <div style={styles.modalMap}>
                <MapContainer 
                  center={[20.0, 78.0]} 
                  zoom={5} 
                  style={{ height: '100%', width: '100%', filter: 'grayscale(0.8) invert(1) contrast(0.9)' }}
                  zoomControl={true}
                >
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <LocationSelector onLocationSelect={setSelectedLocation} selectedLoc={selectedLocation} />
                </MapContainer>
              </div>

              <div style={styles.modalForm}>
                <div>
                  <label style={styles.label}>Station Name</label>
                  <input 
                    style={styles.input} 
                    placeholder="e.g. MUMBAI_DIST_ALPHA" 
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

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={styles.label}>Latitude</label>
                    <input style={{ ...styles.input, opacity: selectedLocation ? 1 : 0.5 }} readOnly value={selectedLocation?.lat.toFixed(6) || 'NOT SET'} />
                  </div>
                  <div>
                    <label style={styles.label}>Longitude</label>
                    <input style={{ ...styles.input, opacity: selectedLocation ? 1 : 0.5 }} readOnly value={selectedLocation?.lng.toFixed(6) || 'NOT SET'} />
                  </div>
                </div>

                <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '11px', fontWeight: 700, background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '10px' }}>
                      <AlertCircle size={16} color="var(--accent-primary)" />
                      <span>NODE ID WILL BE AUTO-GENERATED UPON COMMIT</span>
                   </div>
                   <button 
                    onClick={handleCreate}
                    style={{ width: '100%', padding: '16px', background: 'var(--accent-primary)', color: '#000', border: 'none', borderRadius: '12px', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                   >
                     <Save size={18} />
                     COMMIT TO NETWORK
                   </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); borderRadius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: var(--accent-primary); }
      `}</style>
    </div>
  );
}
