import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useAuth } from '../../context/AuthContext';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import { 
  fetchOperatorNodes, createNode, deleteNode, 
  fetchNodeRequests, approveNodeRequest, rejectNodeRequest 
} from '../../services/api';
import { 
  Plus, Trash2, MapPin, Navigation, Check, X, 
  Loader, Save, Globe, Clock, AlertCircle, PlusCircle, ChevronUp, ChevronDown
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
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mapMaximized, setMapMaximized] = useState(false);
  const [newNode, setNewNode] = useState({ name: '', type: 'warehouse', lat: 20.0, lng: 77.0 });
  const [selectedLocation, setSelectedLocation] = useState(null);
  const { getAuthHeaders } = useAuth();
  const { isMobile } = useBreakpoint();

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
      flexDirection: isMobile ? 'column' : 'row',
      height: isMobile ? 'calc(100vh - 64px)' : 'calc(100vh - 64px)',
      background: 'var(--bg-canvas)',
      position: 'relative',
      overflowX: 'hidden',
      overflowY: isMobile ? 'auto' : 'hidden'
    },
    mainMap: {
      flex: isMobile ? 'none' : '1',
      position: 'relative',
      background: '#0a0a0a',
      height: isMobile ? (mapMaximized ? '400px' : '220px') : 'auto',
      transition: 'height 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      flexShrink: 0
    },
    sidebar: {
      width: isMobile ? '100%' : '400px',
      flex: isMobile ? 'none' : '1',
      backgroundColor: 'var(--bg-surface)',
      borderLeft: isMobile ? 'none' : '1px solid var(--border)',
      borderTop: isMobile ? '1px solid var(--border)' : 'none',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 100,
      position: isMobile ? 'static' : 'relative',
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
    requestsSection: {
      flex: 1,
      overflowY: 'auto',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '20px',
    },
    addSection: {
      padding: '20px',
      borderTop: '1px solid var(--border)',
      background: 'rgba(255,255,255,0.01)',
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
      border: isMobile ? 'none' : '1px solid var(--border)',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
    },
    modalHeader: {
      padding: '16px 20px',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    modalBody: {
      flex: 1,
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : '1fr 320px',
      overflowY: 'auto',
    },
    modalMap: {
      height: isMobile ? '300px' : '100%',
      width: '100%',
      borderRight: isMobile ? 'none' : '1px solid var(--border)',
      borderBottom: isMobile ? '1px solid var(--border)' : 'none',
    },
    modalForm: {
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
    },
    requestItem: {
      padding: '12px',
      borderRadius: '10px',
      backgroundColor: 'var(--bg-elevated)',
      border: '1px solid var(--border)',
    },
    nodeItem: {
      padding: '10px 14px',
      borderRadius: '10px',
      backgroundColor: 'rgba(255,255,255,0.02)',
      border: '1px solid var(--border)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
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
      fontSize: '10px',
      color: 'var(--text-muted)',
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      marginBottom: '4px',
      display: 'block',
    }
  };

  return (
    <div style={styles.container}>
      {/* Main Map Background */}
      <div style={styles.mainMap}>
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
        <MapContainer 
          center={[20.0, 78.0]} 
          zoom={isMobile ? 4 : 5} 
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
        {!isMobile && (
          <div style={{ position: 'absolute', top: '24px', left: '24px', zIndex: 100, display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#fff', margin: 0 }}>NETWORK ARCHITECT</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--status-live)', boxShadow: '0 0 10px var(--status-live)' }}></div>
              <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Active Infrastructure</span>
            </div>
          </div>
        )}
      </div>

      {/* Right Sidebar / Bottom Drawer */}
      <aside style={styles.sidebar}>
        {!isMobile && (
          <div style={styles.drawerHandle} onClick={() => setDrawerOpen(!drawerOpen)}>
            <div style={styles.handleBar} />
          </div>
        )}

        {(drawerOpen || !isMobile || isMobile) && (
          <>
            <div className="custom-scrollbar" style={styles.requestsSection}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <h3 style={{ fontSize: '10px', fontWeight: 900, color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase' }}>Approvals</h3>
                  <span style={{ fontSize: '9px', fontWeight: 900, background: 'var(--accent-primary)', color: '#000', padding: '2px 8px', borderRadius: '20px' }}>{requests.length}</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {requests.length === 0 ? (
                    <div style={{ padding: '16px', textAlign: 'center', opacity: 0.3, border: '1px dashed var(--border)', borderRadius: '10px' }}>
                      <p style={{ fontSize: '10px', fontWeight: 800, margin: 0 }}>No pending requests</p>
                    </div>
                  ) : (
                    requests.map(req => (
                      <div key={req.id} style={styles.requestItem}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontSize: '8px', fontWeight: 900, color: req.action === 'create' ? 'var(--status-live)' : 'var(--status-critical)' }}>{req.action.toUpperCase()}</span>
                              <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-primary)' }}>{req.action === 'create' ? req.node_data.name : req.node_id}</span>
                            </div>
                            <div style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: 700 }}>Requester: {req.requester_id}</div>
                          </div>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button onClick={() => handleApprove(req.id)} style={{ padding: '4px', background: 'var(--accent-primary)', border: 'none', borderRadius: '6px', cursor: 'pointer', color: '#000' }}><Check size={14} /></button>
                            <button onClick={() => handleReject(req.id)} style={{ padding: '4px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: '6px', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={14} /></button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <h3 style={{ fontSize: '10px', fontWeight: 900, color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase' }}>Active Nodes</h3>
                  <span style={{ fontSize: '9px', fontWeight: 800, color: 'var(--text-muted)' }}>{nodes.length} UNITS</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {nodes.map(n => (
                    <div key={n.id} style={styles.nodeItem}>
                      <Link to={`/owner/node/${n.id}`} style={{ textDecoration: 'none', color: 'inherit', flex: 1 }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)' }}>{n.name}</span>
                          <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: 700 }}>{n.id} • {n.type}</span>
                        </div>
                      </Link>
                      <button 
                        onClick={(e) => { e.preventDefault(); handleDelete(n.id); }} 
                        style={{ background: 'none', border: 'none', color: 'var(--status-critical)', cursor: 'pointer', padding: '4px' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={styles.addSection}>
              <button 
                onClick={() => setIsAdding(true)}
                style={{ 
                  width: '100%', 
                  height: '48px', 
                  background: 'var(--accent-primary)', 
                  color: '#000', 
                  border: 'none', 
                  borderRadius: '12px', 
                  fontWeight: 900, 
                  fontSize: '12px', 
                  cursor: 'pointer', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  gap: '8px',
                  boxShadow: '0 8px 16px rgba(0, 180, 216, 0.2)'
                }}
              >
                <PlusCircle size={18} />
                REGISTER NEW NODE
              </button>
            </div>
          </>
        )}
      </aside>

      {/* Modal for Adding Node */}
      {isAdding && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--text-primary)', margin: 0 }}>NODE REGISTRATION</h3>
                <p style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: 800, margin: '2px 0 0 0' }}>POINT ON MAP TO ASSIGN GEOSPATIAL COORDINATES</p>
              </div>
              <button onClick={() => setIsAdding(false)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', padding: '8px', borderRadius: '50%', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={18} />
              </button>
            </div>
            
            <div style={styles.modalBody}>
              <div style={styles.modalMap}>
                <MapContainer 
                  center={[20.0, 78.0]} 
                  zoom={5} 
                  style={{ height: '100%', width: '100%', filter: 'grayscale(0.8) invert(1) contrast(0.9)' }}
                  zoomControl={!isMobile}
                >
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <LocationSelector onLocationSelect={(loc) => { setSelectedLocation(loc); if(isMobile) setMapMaximized(false); }} selectedLoc={selectedLocation} />
                </MapContainer>
              </div>

              <div style={styles.modalForm}>
                <div>
                  <label style={styles.label}>Station Name</label>
                  <input 
                    style={styles.input} 
                    placeholder="e.g. ALPHA_TERMINAL_01" 
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

                <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '9px', fontWeight: 800, background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '8px' }}>
                      <AlertCircle size={14} color="var(--accent-primary)" />
                      <span>ID GENERATED UPON COMMIT</span>
                   </div>
                   <button 
                    onClick={handleCreate}
                    style={{ width: '100%', padding: '14px', background: 'var(--accent-primary)', color: '#000', border: 'none', borderRadius: '12px', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                   >
                     <Save size={16} />
                     COMMIT NODE
                   </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); borderRadius: 10px; }
      `}</style>
    </div>
  );
}
