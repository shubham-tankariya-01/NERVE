import React, { useState } from 'react';
import { useNetwork } from '../context/NetworkContext';
import { Truck, Package, CheckCircle, ChevronRight, Activity, Zap, MapPin, DollarSign, Clock } from 'lucide-react';
import { bookShipment } from '../services/api';

export default function BookShipment() {
  const [step, setStep] = useState(1);
  const { nodes, setShipments } = useNetwork();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  
  const [formData, setFormData] = useState({
    origin: '',
    destination: '',
    cargo_type: '',
    priority: 'medium',
    weight_kg: 1000
  });

  const cargoTypes = [
    { id: 'elec', label: 'Electronics', icon: '💻' },
    { id: 'text', label: 'Textiles', icon: '👕' },
    { id: 'med', label: 'Medical Supplies', icon: '💊' },
    { id: 'cons', label: 'Consumer Goods', icon: '🛒' },
    { id: 'mach', label: 'Machinery', icon: '⚙' },
    { id: 'chem', label: 'Chemicals', icon: '🧪' },
    { id: 'food', label: 'Food Products', icon: '🍎' },
    { id: 'auto', label: 'Auto Parts', icon: '🔧' }
  ];

  const handleBook = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await bookShipment(formData);
      setResult(res);
      setShipments(prev => [...prev, res.shipment]);
      setStep(3);
    } catch (err) {
      setError(err.message || 'Failed to book shipment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-slide-up" style={{ padding: '2.5rem 3rem', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
      <header style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        background: 'var(--bg-elevated)', 
        padding: '1.25rem 2rem', 
        borderLeft: '4px solid var(--accent-primary)',
        borderRadius: '0 8px 8px 0',
        marginBottom: '2.5rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              MISSION BOOKING ENGINE
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.25rem', fontWeight: 600 }}>Provision New Tactical Logistics Vector</p>
          </div>
        </div>
      </header>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginBottom: '3rem' }}>
         {[1, 2, 3].map(s => (
           <React.Fragment key={s}>
             <div style={{ 
               width: '36px', height: '36px', borderRadius: '50%', 
               background: step >= s ? 'var(--accent-primary)' : 'rgba(255,255,255,0.05)', 
               color: step >= s ? '#000' : 'var(--text-secondary)',
               display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '0.85rem',
               border: `1px solid ${step >= s ? 'var(--accent-primary)' : 'var(--border-color)'}`,
               boxShadow: step === s ? '0 0 15px var(--accent-primary)44' : 'none',
               transition: 'all 0.3s'
             }}>{s}</div>
             {s < 3 && <div style={{ width: '80px', height: '2px', background: step > s ? 'var(--accent-primary)' : 'var(--border-color)', transition: 'all 0.3s' }}></div>}
           </React.Fragment>
         ))}
      </div>

      {error && (
        <div style={{ padding: '1rem', background: 'rgba(255,20,50,0.1)', border: '1px solid var(--status-danger)', color: 'var(--status-danger)', borderRadius: '4px', marginBottom: '2rem', fontSize: '0.85rem', fontWeight: 600 }}>
          {error}
        </div>
      )}

      <div className="glass-panel" style={{ padding: '2.5rem' }}>
        {step === 1 && (
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '2rem', textTransform: 'uppercase' }}>I. Vector Assignment</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                  <div>
                     <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '0.75rem', textTransform: 'uppercase' }}>Origin Node</label>
                     <select 
                       className="input-control" 
                       style={{ width: '100%', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.8rem', fontWeight: 600 }}
                       value={formData.origin}
                       onChange={(e) => setFormData({...formData, origin: e.target.value})}
                     >
                       <option value="">Select Origin...</option>
                       {nodes.map(n => <option key={n.id} value={n.id} style={{background: '#111'}}>{n.name} ({n.id})</option>)}
                     </select>
                  </div>
                  <div>
                     <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '0.75rem', textTransform: 'uppercase' }}>Destination Node</label>
                     <select 
                       className="input-control" 
                       style={{ width: '100%', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.8rem', fontWeight: 600 }}
                       value={formData.destination}
                       onChange={(e) => setFormData({...formData, destination: e.target.value})}
                     >
                       <option value="">Select Destination...</option>
                       {nodes.map(n => <option key={n.id} value={n.id} style={{background: '#111'}}>{n.name} ({n.id})</option>)}
                     </select>
                  </div>
               </div>
               <button 
                onClick={() => setStep(2)}
                disabled={!formData.origin || !formData.destination}
                style={{ background: 'var(--accent-primary)', color: '#000', padding: '1rem', borderRadius: '4px', fontWeight: 900, marginTop: '1rem', opacity: (!formData.origin || !formData.destination) ? 0.3 : 1, cursor: 'pointer', border: 'none', textTransform: 'uppercase', letterSpacing: '0.05em' }}
               >
                 Proceed to Payload Specifications
               </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '2rem', textTransform: 'uppercase' }}>II. Payload Intelligence</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2.5rem' }}>
               {cargoTypes.map(c => (
                 <div 
                  key={c.id} 
                  onClick={() => setFormData({...formData, cargo_type: c.label})}
                  style={{ 
                    padding: '1.25rem', borderRadius: '4px', background: formData.cargo_type === c.label ? 'rgba(0, 180, 216, 0.1)' : 'rgba(255,255,255,0.02)', 
                    border: `1px solid ${formData.cargo_type === c.label ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                    cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s'
                  }}
                 >
                    <div style={{ fontSize: '1.75rem', marginBottom: '0.75rem' }}>{c.icon}</div>
                    <div style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', color: formData.cargo_type === c.label ? 'var(--accent-primary)' : 'var(--text-secondary)' }}>{c.label}</div>
                 </div>
               ))}
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2.5rem' }}>
               <div>
                  <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '0.75rem', textTransform: 'uppercase' }}>Priority Level</label>
                  <select 
                    className="input-control" 
                    style={{ width: '100%', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.8rem', fontWeight: 600 }}
                    value={formData.priority}
                    onChange={(e) => setFormData({...formData, priority: e.target.value})}
                  >
                    <option value="low" style={{background: '#111'}}>LOW - COST OPTIMIZED</option>
                    <option value="medium" style={{background: '#111'}}>MEDIUM - BALANCED</option>
                    <option value="high" style={{background: '#111'}}>HIGH - FAST DELIVERY</option>
                    <option value="critical" style={{background: '#111'}}>CRITICAL - TIME SENSITIVE</option>
                  </select>
               </div>
               <div>
                  <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '0.75rem', textTransform: 'uppercase' }}>Gross Weight (kg)</label>
                  <input 
                    type="number" 
                    className="input-control" 
                    style={{ width: '100%', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.8rem', fontWeight: 600 }}
                    placeholder="5000" 
                    value={formData.weight_kg}
                    onChange={(e) => setFormData({...formData, weight_kg: parseFloat(e.target.value)})}
                  />
               </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
               <button onClick={() => setStep(1)} style={{ flex: 1, padding: '1rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-secondary)', fontWeight: 800, cursor: 'pointer', textTransform: 'uppercase' }}>Back</button>
               <button 
                onClick={handleBook} 
                disabled={loading || !formData.cargo_type}
                style={{ flex: 2, background: 'var(--accent-primary)', color: '#000', padding: '1rem', borderRadius: '4px', fontWeight: 900, cursor: 'pointer', border: 'none', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: (loading || !formData.cargo_type) ? 0.3 : 1 }}
               >
                 {loading ? 'COMPUTING OPTIMAL VECTOR...' : 'Finalize & Book Mission'}
               </button>
            </div>
          </div>
        )}

        {step === 3 && result && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(0, 229, 160, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--status-success)', margin: '0 auto 1.5rem auto', border: '1px solid var(--status-success)' }}>
               <CheckCircle size={40} />
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-primary)', marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>MISSION PROVISIONED</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '3rem', fontWeight: 600, fontSize: '0.9rem' }}>SHIPMENT_ID: <span style={{color: 'var(--accent-primary)', fontFamily: 'var(--font-mono)'}}>{result.shipment?.id}</span> · STATUS: ACTIVE</p>
            
            <div className="glass-panel" style={{ background: 'rgba(0,0,0,0.2)', padding: '2rem', textAlign: 'left', marginBottom: '2.5rem', border: '1px solid var(--border-color)' }}>
               <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', textTransform: 'uppercase', fontWeight: 900, letterSpacing: '0.1em' }}>Neural Optimized Route Analytics</div>
               <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', fontWeight: 800, fontSize: '1.25rem', marginBottom: '2.5rem', color: 'var(--text-primary)' }}>
                  <div style={{display: 'flex', flexDirection: 'column'}}>
                     <span style={{fontSize: '0.6rem', color: 'var(--text-secondary)'}}>ORIGIN</span>
                     {result.shipment?.origin}
                  </div>
                  <ChevronRight size={24} style={{ color: 'var(--accent-primary)', marginTop: '1rem' }} />
                  <div style={{display: 'flex', flexDirection: 'column'}}>
                     <span style={{fontSize: '0.6rem', color: 'var(--text-secondary)'}}>DESTINATION</span>
                     {result.shipment?.destination}
                  </div>
               </div>
               
               <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem' }}>
                  <div>
                     <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem' }}><Clock size={10} /> TRANSIT</div>
                     <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{result.route_analytics?.total_transit_hrs.toFixed(0)}H</div>
                  </div>
                  <div>
                     <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem' }}><DollarSign size={10} /> EST. COST</div>
                     <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>${result.route_analytics?.total_cost.toFixed(0)}</div>
                  </div>
                  <div>
                     <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem' }}><MapPin size={10} /> DISTANCE</div>
                     <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{result.route_analytics?.total_distance_km.toLocaleString()}km</div>
                  </div>
                  <div>
                     <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem' }}><Activity size={10} /> HOPS</div>
                     <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{result.route_analytics?.hop_count}</div>
                  </div>
               </div>
            </div>

            <button onClick={() => setStep(1)} style={{ background: 'var(--accent-primary)', color: '#000', padding: '1rem 2.5rem', borderRadius: '4px', fontWeight: 900, cursor: 'pointer', border: 'none', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Provision Another Mission</button>
          </div>
        )}
      </div>
    </div>
  );
}
