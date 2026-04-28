import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, CircleMarker, Tooltip, useMap } from 'react-leaflet';
import { Search, Wind, CloudRain, Thermometer, Cloud, Zap, Play, CheckCircle, XCircle, ChevronRight, RotateCcw, GitBranch, ArrowRight, AlertTriangle, Info, Clock, Bot } from 'lucide-react';
import { useNetwork } from '../context/NetworkContext';
import { useAuth } from '../context/AuthContext';
import { fetchSimulationParameters, triggerSimulation, clearNodeSimulation } from '../services/api';

const MapFlyTo = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, 6, { duration: 1.5 });
    }
  }, [center, map]);
  return null;
};

const SeverityBadge = ({ severity }) => {
  const colors = {
    CRITICAL: 'var(--danger)',
    HIGH: 'var(--warning)',
    MEDIUM: 'var(--info)',
    LOW: 'var(--brand)',
    NONE: 'var(--text-muted)'
  };
  const bgs = {
    CRITICAL: 'var(--danger-dim)',
    HIGH: 'var(--warning-dim)',
    MEDIUM: 'var(--info-dim)',
    LOW: 'var(--brand-dim)',
    NONE: 'rgba(255,255,255,0.05)'
  };

  return (
    <span style={{
      padding: '2px 8px',
      borderRadius: '4px',
      fontSize: '10px',
      fontWeight: '800',
      color: colors[severity] || colors.NONE,
      backgroundColor: bgs[severity] || bgs.NONE,
      textTransform: 'uppercase',
      letterSpacing: '0.05em'
    }}>
      {severity}
    </span>
  );
};

export default function DisruptionSimulator() {
  const navigate = useNavigate();
  const { nodes, loading: networkLoading } = useNetwork();
  const { getAuthHeaders } = useAuth();

  const [step, setStep] = useState(1);
  const [selectedNode, setSelectedNode] = useState(null);
  const [activeTab, setActiveTab] = useState('presets');
  const [selectedPreset, setSelectedPreset] = useState(null);
  const [enabledParams, setEnabledParams] = useState({});
  const [paramValues, setParamValues] = useState({});
  const [scenarioName, setScenarioName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [simulationResult, setSimulationResult] = useState(null);
  const [parametersConfig, setParametersConfig] = useState(null);
  const [loadingParams, setLoadingParams] = useState(true);
  const [nodeSearch, setNodeSearch] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadParams() {
      try {
        const config = await fetchSimulationParameters(getAuthHeaders());
        setParametersConfig(config);
        
        // Initialize param values with defaults
        const defaults = {};
        config.parameters.forEach(p => {
          defaults[p.id] = p.default_simulate_value;
        });
        setParamValues(defaults);
      } catch (err) {
        setError('Failed to load simulation parameters');
      } finally {
        setLoadingParams(false);
      }
    }
    loadParams();
  }, [getAuthHeaders]);

  const filteredNodes = useMemo(() => {
    return nodes.filter(n => 
      n.name.toLowerCase().includes(nodeSearch.toLowerCase()) || 
      n.id.toLowerCase().includes(nodeSearch.toLowerCase())
    );
  }, [nodes, nodeSearch]);

  const handleNodeSelect = (node) => {
    setSelectedNode(node);
  };

  const toggleParam = (paramId) => {
    setEnabledParams(prev => {
      const newState = { ...prev, [paramId]: !prev[paramId] };
      // Handle temperature mutual exclusivity
      if (paramId === 'temperature_heat_c' && newState[paramId]) {
        newState['temperature_cold_c'] = false;
      } else if (paramId === 'temperature_cold_c' && newState[paramId]) {
        newState['temperature_heat_c'] = false;
      }
      return newState;
    });
  };

  const handleParamValueChange = (paramId, value) => {
    setParamValues(prev => ({ ...prev, [paramId]: parseFloat(value) }));
    setSelectedPreset(null);
  };

  const applyPreset = (preset) => {
    setSelectedPreset(preset);
    setScenarioName(preset.label);
    
    // Create new enabled and values based on preset
    const newEnabled = {};
    const newValues = { ...paramValues };
    
    preset.parameters.forEach(p => {
      // Backend uses 'temperature_c', frontend splits it. 
      // Map back for display if needed, but here we just match preset IDs
      let targetId = p.parameter;
      if (targetId === 'temperature_c') {
        targetId = p.value > 0 ? 'temperature_heat_c' : 'temperature_cold_c';
      }
      newEnabled[targetId] = true;
      newValues[targetId] = p.value;
    });
    
    setEnabledParams(newEnabled);
    setParamValues(newValues);
  };

  const getParamSeverity = (paramId, value) => {
    if (!parametersConfig) return 'NONE';
    const param = parametersConfig.parameters.find(p => p.id === paramId);
    if (!param) return 'NONE';
    
    const range = param.disruption_ranges.find(r => value >= r.min && value <= r.max);
    return range ? range.severity : 'NONE';
  };

  const overallSeverity = useMemo(() => {
    const activeSeverities = Object.entries(enabledParams)
      .filter(([_, enabled]) => enabled)
      .map(([id, _]) => getParamSeverity(id, paramValues[id]));
    
    const order = { 'CRITICAL': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1, 'NONE': 0 };
    let max = 'NONE';
    activeSeverities.forEach(s => {
      if (order[s] > order[max]) max = s;
    });
    return max;
  }, [enabledParams, paramValues, parametersConfig]);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const parameters = Object.entries(enabledParams)
        .filter(([_, enabled]) => enabled)
        .map(([id, _]) => ({
          parameter: id,
          value: paramValues[id]
        }));
      
      if (parameters.length === 0) {
        throw new Error('Please enable at least one disruption parameter');
      }

      const result = await triggerSimulation({
        node_id: selectedNode.id,
        parameters,
        scenario_name: scenarioName || 'Custom Simulation'
      }, getAuthHeaders());
      
      setSimulationResult(result);
      setStep(3);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClear = async () => {
    if (!selectedNode) return;
    try {
      await clearNodeSimulation(selectedNode.id, getAuthHeaders());
      navigate('/');
    } catch (err) {
      setError('Failed to clear simulation');
    }
  };

  // --- RENDERING HELPERS ---

  const renderStepIndicator = () => (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      gap: '3rem',
      marginBottom: '32px',
      padding: '20px',
      background: 'rgba(255, 255, 255, 0.02)',
      borderRadius: '20px',
      border: '1px solid var(--border)',
      backdropFilter: 'blur(10px)'
    }}>
      {[1, 2, 3].map(s => (
        <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '15px',
            fontWeight: '900',
            background: step === s ? 'var(--brand)' : (step > s ? 'var(--brand-dim)' : 'rgba(255,255,255,0.05)'),
            color: step === s ? '#000' : (step > s ? 'var(--brand)' : 'var(--text-muted)'),
            border: step === s ? 'none' : `1px solid ${step > s ? 'var(--brand)' : 'var(--border)'}`,
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            transform: step === s ? 'scale(1.1)' : 'scale(1)',
            boxShadow: step === s ? '0 0 15px var(--brand-dim)' : 'none'
          }}>
            {step > s ? <CheckCircle size={18} /> : s}
          </div>
          <span style={{ 
            fontSize: '11px', 
            fontWeight: 800, 
            textTransform: 'uppercase', 
            letterSpacing: '0.1em',
            color: step === s ? 'var(--text-main)' : 'var(--text-muted)'
          }}>
            {s === 1 ? 'Target' : s === 2 ? 'Configure' : 'Response'}
          </span>
          {s < 3 && <div style={{ width: '60px', height: '2px', background: step > s ? 'var(--brand-dim)' : 'var(--border)', borderRadius: '1px' }} />}
        </div>
      ))}
    </div>
  );

  const renderStep1 = () => (
    <div style={{ 
      display: 'flex', 
      gap: '24px', 
      height: '650px', // Fixed height for the interactive area in step 1
      minHeight: '500px'
    }}>
      {/* Map Side */}
      <div style={{ 
        flex: '1.8', 
        borderRadius: '16px', 
        overflow: 'hidden', 
        border: '1px solid var(--border)', 
        position: 'relative',
        boxShadow: 'var(--shadow-lg)'
      }}>
        <MapContainer 
          center={[20, 0]} 
          zoom={2} 
          style={{ height: '100%', width: '100%', background: 'var(--bg-canvas)' }}
          zoomControl={false}
        >
          <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
          {nodes.map(node => (
            <CircleMarker
              key={node.id}
              center={[node.location.lat, node.location.lng]}
              radius={selectedNode?.id === node.id ? 10 : 6}
              pathOptions={{
                fillColor: node.type === 'factory' ? '#00E5A0' : node.type === 'port' ? '#3B9EFF' : node.type === 'warehouse' ? '#A855F7' : node.type === 'retail' ? '#FFB020' : '#3B9EFF',
                fillOpacity: 0.8,
                color: selectedNode?.id === node.id ? '#fff' : 'transparent',
                weight: 2
              }}
              eventHandlers={{
                click: () => handleNodeSelect(node)
              }}
            >
              <Tooltip direction="top" offset={[0, -5]} opacity={1}>
                <div style={{ fontWeight: 700 }}>{node.name}</div>
                <div style={{ fontSize: '10px', textTransform: 'capitalize' }}>{node.type}</div>
              </Tooltip>
            </CircleMarker>
          ))}
          {selectedNode && <MapFlyTo center={[selectedNode.location.lat, selectedNode.location.lng]} />}
        </MapContainer>
        <div style={{ 
          position: 'absolute', 
          bottom: '20px', 
          left: '20px', 
          background: 'rgba(10, 15, 25, 0.85)', 
          padding: '12px 20px', 
          borderRadius: '12px', 
          backdropFilter: 'blur(12px)',
          border: '1px solid var(--glass-border)',
          zIndex: 1000,
          fontSize: '12px',
          color: 'var(--text-secondary)',
          boxShadow: 'var(--shadow-md)'
        }}>
          Click a node on the map to begin simulation
        </div>
      </div>

      {/* List Side */}
      <div style={{ flex: '1', display: 'flex', flexDirection: 'column', gap: '16px', height: '100%' }}>
        <div className="card" style={{ 
          padding: '24px', 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column', 
          overflow: 'hidden',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border)'
        }}>
          <h3 style={{ marginBottom: '20px', fontSize: '16px', fontWeight: 900, color: 'var(--text-main)', letterSpacing: '0.02em' }}>AVAILABLE NODES</h3>
          <div style={{ position: 'relative', marginBottom: '20px' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              placeholder="Search by name or ID..." 
              value={nodeSearch}
              onChange={(e) => setNodeSearch(e.target.value)}
              className="input-control"
              style={{ width: '100%', paddingLeft: '40px', background: 'var(--bg-canvas)', height: '44px' }}
            />
          </div>
          
          <div style={{ 
            flex: 1, 
            overflowY: 'auto', 
            padding: '4px 12px 60px 4px', // Added significant bottom padding
            marginRight: '-4px'
          }}>
            {filteredNodes.map(node => (
              <div 
                key={node.id}
                onClick={() => handleNodeSelect(node)}
                className="hover-bg-glow"
                style={{
                  padding: '16px',
                  borderRadius: '16px',
                  background: selectedNode?.id === node.id ? 'var(--brand-dim)' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${selectedNode?.id === node.id ? 'var(--brand)' : 'var(--border)'}`,
                  cursor: 'pointer',
                  marginBottom: '12px',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px'
                }}
              >
                <div style={{ 
                  width: '12px', 
                  height: '12px', 
                  borderRadius: '50%', 
                  background: node.status === 'operational' ? 'var(--brand)' : (node.status === 'congested' ? 'var(--warning)' : 'var(--danger)'),
                  boxShadow: node.status === 'operational' ? '0 0 12px var(--brand-dim)' : 'none'
                }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 900, fontSize: '15px', color: selectedNode?.id === node.id ? 'var(--brand)' : 'var(--text-main)', letterSpacing: '-0.2px' }}>{node.name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>{node.id}</div>
                </div>
                <span style={{
                  fontSize: '10px',
                  fontWeight: 950,
                  textTransform: 'uppercase',
                  padding: '4px 10px',
                  borderRadius: '8px',
                  background: 'rgba(255,255,255,0.05)',
                  color: node.type === 'factory' ? 'var(--brand)' : node.type === 'port' ? 'var(--info)' : node.type === 'warehouse' ? 'var(--purple)' : 'var(--warning)',
                  border: '1px solid var(--border)'
                }}>
                  {node.type}
                </span>
              </div>
            ))}
          </div>

          <button 
            disabled={!selectedNode}
            onClick={() => setStep(2)}
            style={{
              width: '100%',
              padding: '16px',
              borderRadius: '12px',
              background: 'var(--brand)',
              color: '#000',
              fontWeight: 900,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              marginTop: '20px',
              opacity: selectedNode ? 1 : 0.5,
              cursor: selectedNode ? 'pointer' : 'default',
              boxShadow: selectedNode ? '0 8px 24px rgba(0, 180, 216, 0.25)' : 'none',
              transition: 'all 0.3s ease'
            }}
          >
            CONTINUE TO CONFIGURATION <ArrowRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => {
    if (!parametersConfig) return <div style={{ textAlign: 'center', padding: '100px' }}>Loading configuration...</div>;

    return (
      <div style={{ 
        display: 'flex', 
        gap: '20px', 
        minHeight: '600px'
      }}>
        {/* Config Panel */}
        <div className="card" style={{ 
          flex: '1.6', 
          display: 'flex', 
          flexDirection: 'column', 
          overflow: 'hidden',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border)'
        }}>
          <div style={{ 
            padding: '16px 24px', 
            borderBottom: '1px solid var(--border)', 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            background: 'var(--bg-surface)'
          }}>
            <div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Configuring Disruption for</div>
              <h2 style={{ fontSize: '18px', fontWeight: 900, color: 'var(--text-main)' }}>{selectedNode.name}</h2>
            </div>
            <button 
              onClick={() => setStep(1)} 
              style={{ 
                color: 'var(--brand)', 
                fontSize: '11px', 
                fontWeight: 800, 
                padding: '6px 12px',
                borderRadius: '6px',
                background: 'rgba(0, 180, 216, 0.08)',
                border: '1px solid rgba(0, 180, 216, 0.2)'
              }}
            >
              CHANGE NODE
            </button>
          </div>

          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'rgba(0,0,0,0.1)' }}>
            <button 
              onClick={() => setActiveTab('presets')}
              style={{ 
                flex: 1, padding: '12px', fontSize: '12px', fontWeight: 800, 
                color: activeTab === 'presets' ? 'var(--brand)' : 'var(--text-muted)',
                borderBottom: activeTab === 'presets' ? '2px solid var(--brand)' : '2px solid transparent',
                background: activeTab === 'presets' ? 'rgba(0, 180, 216, 0.03)' : 'transparent'
              }}
            >
              PRESET SCENARIOS
            </button>
            <button 
              onClick={() => setActiveTab('custom')}
              style={{ 
                flex: 1, padding: '12px', fontSize: '12px', fontWeight: 800, 
                color: activeTab === 'custom' ? 'var(--brand)' : 'var(--text-muted)',
                borderBottom: activeTab === 'custom' ? '2px solid var(--brand)' : '2px solid transparent',
                background: activeTab === 'custom' ? 'rgba(0, 180, 216, 0.03)' : 'transparent'
              }}
            >
              CUSTOM PARAMETERS
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
            {activeTab === 'presets' ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                {parametersConfig.preset_scenarios.map(p => (
                  <div 
                    key={p.id}
                    onClick={() => applyPreset(p)}
                    style={{
                      padding: '14px',
                      borderRadius: '12px',
                      background: selectedPreset?.id === p.id ? 'rgba(0, 180, 216, 0.1)' : 'var(--bg-elevated)',
                      border: `1px solid ${selectedPreset?.id === p.id ? 'var(--brand)' : 'var(--border)'}`,
                      cursor: 'pointer',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      position: 'relative'
                    }}
                  >
                    <div style={{ fontSize: '20px', marginBottom: '8px' }}>{p.icon}</div>
                    <div style={{ fontWeight: 900, fontSize: '13px', marginBottom: '4px', color: 'var(--text-main)' }}>{p.label}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.4, marginBottom: '10px', height: '32px', overflow: 'hidden' }}>{p.description}</div>
                    <SeverityBadge severity={p.expected_severity} />
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {parametersConfig.parameters.map(p => {
                  const isEnabled = !!enabledParams[p.id];
                  const value = paramValues[p.id];
                  const severity = getParamSeverity(p.id, value);
                  
                  return (
                    <div key={p.id} style={{ 
                      padding: '12px', 
                      borderRadius: '12px', 
                      background: isEnabled ? 'rgba(255,255,255,0.02)' : 'var(--bg-elevated)', 
                      border: `1px solid ${isEnabled ? 'rgba(255,255,255,0.1)' : 'var(--border)'}`
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ color: isEnabled ? 'var(--brand)' : 'var(--text-muted)' }}>
                            {p.icon === 'wind' ? <Wind size={16} /> : p.icon === 'rain' ? <CloudRain size={16} /> : p.icon === 'thermometer' ? <Thermometer size={16} /> : <Cloud size={16} />}
                          </div>
                          <span style={{ fontWeight: 800, fontSize: '12px', color: isEnabled ? 'var(--text-main)' : 'var(--text-muted)' }}>{p.label}</span>
                        </div>
                        <button 
                          onClick={() => toggleParam(p.id)}
                          style={{
                            width: '32px', height: '18px', borderRadius: '9px', background: isEnabled ? 'var(--brand)' : 'var(--text-muted)',
                            position: 'relative', cursor: 'pointer'
                          }}
                        >
                          <div style={{
                            width: '12px', height: '12px', borderRadius: '50%', background: isEnabled ? '#000' : '#fff',
                            position: 'absolute', top: '3px', left: isEnabled ? '17px' : '3px', transition: 'left 0.2s'
                          }} />
                        </button>
                      </div>

                      {isEnabled && (
                        <div style={{ padding: '0 4px' }}>
                          {p.id === 'weather_code' ? (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                              {p.presets.map(wp => (
                                <button
                                  key={wp.value}
                                  onClick={() => handleParamValueChange(p.id, wp.value)}
                                  style={{
                                    padding: '6px 2px', borderRadius: '6px', fontSize: '9px', fontWeight: 800,
                                    background: value === wp.value ? 'var(--brand)' : 'var(--bg-surface)',
                                    color: value === wp.value ? '#000' : 'var(--text-secondary)',
                                    border: `1px solid ${value === wp.value ? 'var(--brand)' : 'var(--border)'}`
                                  }}
                                >
                                  {wp.label}
                                </button>
                              ))}
                            </div>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <input 
                                type="range" min={p.min} max={p.max} value={value} 
                                onChange={(e) => handleParamValueChange(p.id, e.target.value)}
                                style={{ flex: 1, accentColor: 'var(--brand)', height: '4px' }}
                              />
                              <div style={{ minWidth: '40px', textAlign: 'right', fontWeight: 900, fontSize: '12px', color: 'var(--brand)' }}>
                                {value}{p.unit}
                              </div>
                            </div>
                          )}
                          <div style={{ marginTop: '8px', textAlign: 'right' }}>
                            <SeverityBadge severity={severity} />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          
          <div style={{ padding: '16px 24px', background: 'var(--bg-surface)', borderTop: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Network Severity</span>
              <SeverityBadge severity={overallSeverity} />
            </div>
          </div>
        </div>

        {/* Preview & Action Panel */}
        <div style={{ flex: '0.8', display: 'flex', flexDirection: 'column', gap: '24px', height: '100%', overflow: 'hidden' }}>
          <div className="card" style={{ 
            padding: '24px', 
            flex: 1, 
            display: 'flex', 
            flexDirection: 'column',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            overflow: 'hidden'
          }}>
            <h3 style={{ marginBottom: '16px', fontSize: '14px', fontWeight: 900, color: 'var(--text-main)' }}>SCENARIO SUMMARY</h3>
            
            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ padding: '12px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: 800, marginBottom: '4px', textTransform: 'uppercase' }}>TARGET NODE</div>
                  <div style={{ fontWeight: 900, fontSize: '14px', color: 'var(--text-main)' }}>{selectedNode.name}</div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase' }}>ACTIVE PARAMETERS</div>
                  {Object.entries(enabledParams).filter(([_, enabled]) => enabled).map(([id, _]) => {
                    const p = parametersConfig.parameters.find(x => x.id === id);
                    return (
                      <div key={id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>{p.label}</span>
                        <span style={{ fontWeight: 800, color: 'var(--brand)' }}>{paramValues[id]}{p.unit}</span>
                      </div>
                    );
                  })}
                </div>

                <div style={{ marginTop: '4px' }}>
                  <div style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: 800, marginBottom: '8px', textTransform: 'uppercase' }}>SCENARIO NAME</div>
                  <input 
                    type="text" placeholder="e.g. Hurricane Alpha..." value={scenarioName}
                    onChange={(e) => setScenarioName(e.target.value)}
                    className="input-control"
                    style={{ width: '100%', background: 'var(--bg-canvas)', height: '40px', fontSize: '13px', fontWeight: 700 }}
                  />
                </div>

                <div style={{ marginTop: '8px' }}>
                  <div style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: 800, marginBottom: '12px', textTransform: 'uppercase' }}>PIPELINE WORKFLOW</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {[
                      { agent: 'Scout', task: 'Risk verification' },
                      { agent: 'Mapper', task: 'Impact cross-ref' },
                      { agent: 'Optimizer', task: 'Pathfinding' }
                    ].map((a, i) => (
                      <div key={a.agent} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ 
                          width: '24px', height: '24px', borderRadius: '6px', background: 'var(--bg-elevated)', 
                          border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                          fontSize: '10px', fontWeight: 900, color: 'var(--brand)' 
                        }}>{i + 1}</div>
                        <div>
                          <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-main)' }}>{a.agent}</div>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{a.task}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {error && (
              <div style={{ padding: '10px', borderRadius: '8px', background: 'var(--danger-dim)', color: 'var(--danger)', fontSize: '11px', fontWeight: 700, marginBottom: '16px', border: '1px solid rgba(255, 77, 77, 0.2)' }}>
                <AlertTriangle size={14} style={{ marginRight: '6px' }} /> {error}
              </div>
            )}

            {/* ACTION BUTTON - MOVED TO THE BOTTOM AND ALWAYS VISIBLE */}
            <button 
              onClick={handleSubmit}
              disabled={isSubmitting || Object.values(enabledParams).filter(v => v).length === 0}
              style={{
                width: '100%',
                padding: '16px',
                borderRadius: '10px',
                background: isSubmitting ? 'var(--bg-elevated)' : 'var(--danger)',
                color: isSubmitting ? 'var(--text-muted)' : '#fff',
                fontWeight: 900,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                cursor: isSubmitting ? 'default' : 'pointer',
                boxShadow: isSubmitting ? 'none' : '0 8px 16px rgba(255, 77, 77, 0.2)',
                flexShrink: 0 // Prevent button from being squashed
              }}
            >
              {isSubmitting ? (
                <>
                  <div style={{ width: '16px', height: '16px', border: '2px solid var(--text-muted)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                  AGENTS RUNNING...
                </>
              ) : (
                <>
                  <Zap size={18} fill="currentColor" /> TRIGGER SIMULATION
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderStep3 = () => (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      gap: '24px', 
      animation: 'fadeIn 0.5s ease-out'
    }}>
      {/* Result Banner */}
      <div style={{ 
        padding: '24px 32px', 
        borderRadius: '16px', 
        background: simulationResult.severity === 'CRITICAL' ? 'var(--danger-dim)' : (simulationResult.severity === 'HIGH' ? 'var(--warning-dim)' : 'var(--info-dim)'),
        border: `1px solid ${simulationResult.severity === 'CRITICAL' ? 'var(--danger)' : (simulationResult.severity === 'HIGH' ? 'var(--warning)' : 'var(--info)')}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: 'var(--shadow-md)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <div style={{ 
            width: '56px', height: '56px', borderRadius: '50%', 
            background: simulationResult.severity === 'CRITICAL' ? 'var(--danger)' : (simulationResult.severity === 'HIGH' ? 'var(--warning)' : 'var(--info)'),
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000',
            boxShadow: '0 0 15px rgba(255,255,255,0.1)'
          }}>
            <AlertTriangle size={28} />
          </div>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 900, marginBottom: '4px', letterSpacing: '-0.02em' }}>SIMULATION ANALYSED</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <SeverityBadge severity={simulationResult.severity} />
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Detected on node: {simulationResult.node_name}</span>
            </div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>MAX ESTIMATED IMPACT</div>
          <div style={{ fontSize: '22px', fontWeight: 950, color: 'var(--brand)', fontFamily: 'var(--font-mono)' }}>+{simulationResult.estimated_total_delay_hrs}h DELAY</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '24px', flex: 1, overflow: 'hidden' }}>
        {/* Agent Logs */}
        <div className="card" style={{ 
          padding: '28px', 
          background: '#05070a', 
          border: '1px solid #1a1e26', 
          display: 'flex', 
          flexDirection: 'column',
          boxShadow: 'inset 0 0 40px rgba(0,0,0,0.5)',
          height: '500px' // Give the log a stable height
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 900, color: '#22D3EE', display: 'flex', alignItems: 'center', gap: '10px', letterSpacing: '0.05em' }}>
              <Bot size={20} /> AGENT PIPELINE ACTIVITY LOG
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22D3EE', boxShadow: '0 0 8px #22D3EE' }} />
              <span style={{ fontSize: '10px', color: '#4b5563', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>LIVE_STREAM</span>
            </div>
          </div>
          <div style={{ 
            flex: 1,
            overflowY: 'auto', 
            fontFamily: 'var(--font-mono)', 
            fontSize: '12px', 
            lineHeight: 1.7,
            padding: '20px 20px 40px 20px', // Added bottom padding
            background: 'rgba(0,0,0,0.4)',
            borderRadius: '8px',
            border: '1px solid #1a1e26',
            wordBreak: 'break-word',
            whiteSpace: 'pre-wrap'
          }}>
            {simulationResult.agent_logs.map((log, i) => {
              const colors = { Scout: '#22D3EE', Mapper: '#A855F7', Optimizer: '#00E5A0', Communicator: '#3B9EFF', Monitor: '#94A3B8' };
              const isReroute = log.action.toLowerCase().includes('reroute') || log.action.toLowerCase().includes('viability');
              return (
                <div key={i} style={{ marginBottom: '6px', borderLeft: isReroute ? `2px solid ${colors.Optimizer}` : 'none', paddingLeft: isReroute ? '10px' : '0' }}>
                  <span style={{ color: '#4b5563', fontSize: '10px' }}>[{new Date(log.timestamp).toLocaleTimeString([], { hour12: false })}]</span>{' '}
                  <span style={{ color: colors[log.agent] || '#fff', fontWeight: 800 }}>&lt;{log.agent.toUpperCase()}&gt;</span>{' '}
                  <span style={{ color: isReroute ? '#fff' : '#94a3b8', fontWeight: isReroute ? 600 : 400 }}>{log.action}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Response Summary */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '100%' }}>
          <div className="card" style={{ padding: '32px', flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 900, marginBottom: '24px', color: 'var(--text-main)', letterSpacing: '0.02em' }}>NETWORK RESPONSE</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '32px' }}>
              {[
                { label: 'Rerouted', value: simulationResult.reroutes_suggested, color: 'var(--brand)', icon: <GitBranch size={16} /> },
                { label: 'Blocked', value: simulationResult.blocked_count || 0, color: 'var(--danger)', icon: <AlertTriangle size={16} /> },
                { label: 'Optimal', value: simulationResult.optimal_count || 0, color: 'var(--success)', icon: <CheckCircle size={16} /> }
              ].map((stat, i) => (
                <div key={i} style={{ 
                  textAlign: 'center', 
                  padding: '24px 12px', 
                  background: 'var(--bg-canvas)', 
                  borderRadius: '16px', 
                  border: '1px solid var(--border)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <div style={{ color: stat.color, marginBottom: '4px' }}>{stat.icon}</div>
                  <div style={{ fontSize: '32px', fontWeight: 950, color: stat.value > 0 ? stat.color : 'var(--text-muted)', lineHeight: 1 }}>
                    {stat.value}
                  </div>
                  <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>

            {simulationResult.reroutes_suggested > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', flex: 1 }}>
                <div style={{ 
                  padding: '20px', 
                  borderRadius: '16px', 
                  background: 'rgba(0, 180, 216, 0.05)', 
                  border: '1px solid rgba(0, 180, 216, 0.2)', 
                  color: 'var(--brand)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '16px' 
                }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--brand)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 15px var(--brand-dim)' }}>
                    <GitBranch size={24} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 900, fontSize: '15px' }}>REROUTES READY</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>AI has proposed new paths for {simulationResult.reroutes_suggested} shipments.</div>
                  </div>
                </div>

                <div style={{ flex: 1 }} />

                <button 
                  onClick={() => navigate('/app/rerouting-center')}
                  style={{
                    width: '100%',
                    padding: '24px',
                    borderRadius: '16px',
                    background: 'var(--brand)',
                    color: '#000',
                    fontWeight: 950,
                    fontSize: '15px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    boxShadow: '0 12px 32px rgba(0, 180, 216, 0.3)',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    cursor: 'pointer',
                    border: 'none'
                  }}
                >
                  GOTO REROUTING CENTER <GitBranch size={22} />
                </button>
              </div>
            ) : simulationResult.blocked_count > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', flex: 1 }}>
                <div style={{ 
                  padding: '20px', 
                  borderRadius: '16px', 
                  background: 'rgba(255, 77, 77, 0.05)', 
                  border: '1px solid rgba(255, 77, 77, 0.2)', 
                  color: 'var(--danger)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '16px' 
                }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--danger)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 15px rgba(255,77,77,0.3)' }}>
                    <AlertTriangle size={24} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 900, fontSize: '15px' }}>ACTION REQUIRED</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{simulationResult.blocked_count} shipment(s) are blocked with no viable routes.</div>
                  </div>
                </div>

                <div style={{ flex: 1 }} />

                <button 
                  onClick={() => navigate('/app/rerouting-center')}
                  style={{
                    width: '100%',
                    padding: '24px',
                    borderRadius: '16px',
                    background: 'var(--danger)',
                    color: '#fff',
                    fontWeight: 950,
                    fontSize: '15px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    boxShadow: '0 12px 32px rgba(255, 77, 77, 0.3)',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    cursor: 'pointer',
                    border: 'none'
                  }}
                >
                  MANAGE DISRUPTIONS <Shield size={22} />
                </button>
              </div>
            ) : (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ padding: '24px', borderRadius: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', color: 'var(--text-secondary)', display: 'flex', gap: '16px' }}>
                  <Info size={28} style={{ color: 'var(--info)', flexShrink: 0 }} />
                  <div style={{ fontSize: '13px', lineHeight: 1.6 }}>
                    <div style={{ fontWeight: 800, color: 'var(--text-main)', marginBottom: '4px' }}>NO ACTION REQUIRED</div>
                    The disruption impact was analyzed, but no active shipments were found on affected paths. The network remains stable.
                  </div>
                </div>
                
                <div style={{ flex: 1 }} />
                
                <button 
                  onClick={() => navigate('/app/rerouting-center')}
                  style={{
                    width: '100%',
                    padding: '20px',
                    borderRadius: '16px',
                    background: 'transparent',
                    border: '1px solid var(--border)',
                    color: 'var(--text-main)',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    transition: 'all 0.2s ease',
                    cursor: 'pointer'
                  }}
                >
                  VIEW LOG HISTORY <RotateCcw size={20} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', padding: '16px 0' }}>
        <button 
          onClick={() => { setStep(1); setSimulationResult(null); }}
          style={{ padding: '14px 28px', borderRadius: '12px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-main)', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '12px', transition: 'all 0.2s ease' }}
          onMouseOver={e => e.currentTarget.style.borderColor = 'var(--text-muted)'}
          onMouseOut={e => e.currentTarget.style.borderColor = 'var(--border)'}
        >
          <RotateCcw size={20} /> SIMULATE ANOTHER
        </button>
        <button 
          onClick={handleClear}
          style={{ padding: '14px 28px', borderRadius: '12px', background: 'rgba(255, 77, 77, 0.08)', border: '1px solid rgba(255, 77, 77, 0.2)', color: 'var(--danger)', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '12px', transition: 'all 0.2s ease' }}
          onMouseOver={e => e.currentTarget.style.background = 'rgba(255, 77, 77, 0.12)'}
          onMouseOut={e => e.currentTarget.style.background = 'rgba(255, 77, 77, 0.08)'}
        >
          <XCircle size={20} /> CLEAR & EXIT
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ 
      maxWidth: '1600px', 
      margin: '0 auto', 
      padding: '2rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '24px'
    }}>
      <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: 950, letterSpacing: '-1.5px', textTransform: 'uppercase', marginBottom: '4px', color: 'var(--text-main)' }}>
            DISRUPTION SIMULATOR
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 500 }}>
            Simulate extreme events and validate Agent Orchestration response logic
          </p>
        </div>
        {step < 3 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 800, background: 'rgba(255,255,255,0.03)', padding: '6px 12px', borderRadius: '20px', border: '1px solid var(--border)' }}>
            <Clock size={14} /> LIVE ENVIRONMENT
          </div>
        )}
      </header>

      {renderStepIndicator()}

      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); borderRadius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
      `}</style>
    </div>
  );
}
