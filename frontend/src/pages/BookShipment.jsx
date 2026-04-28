import React, { useState } from 'react';
import { useNetwork } from '../context/NetworkContext';
import { bookShipment } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function BookShipment() {
  const [step, setStep] = useState(1);
  const { nodes, setShipments } = useNetwork();
  const { getAuthHeaders } = useAuth();
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
    { id: 'electronics', label: 'Electronics', icon: '💻' },
    { id: 'textiles', label: 'Textiles', icon: '👕' },
    { id: 'medical_supplies', label: 'Medical Supplies', icon: '💊' },
    { id: 'consumer_goods', label: 'Consumer Goods', icon: '🛒' },
    { id: 'machinery', label: 'Machinery', icon: '⚙' },
    { id: 'chemicals', label: 'Chemicals', icon: '🧪' },
    { id: 'food_products', label: 'Food Products', icon: '🍎' },
    { id: 'automotive_parts', label: 'Auto Parts', icon: '🔧' }
  ];

  const handleBook = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await bookShipment(formData, getAuthHeaders());
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
    <div className="animate-slide-up" style={{ padding: '2rem', maxWidth: '900px', margin: '0 auto', background: 'var(--bg-main)', minHeight: '100%' }}>
      <header style={{ marginBottom: '3rem', borderLeft: '4px solid var(--accent-primary)', paddingLeft: '1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--text-main)', margin: 0, letterSpacing: '-0.02em' }}>MISSION BOOKING ENGINE</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.25rem', fontWeight: 600 }}>Provision New Tactical Logistics Vector</p>
      </header>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginBottom: '3rem' }}>
         {[1, 2, 3].map(s => (
           <React.Fragment key={s}>
             <div style={{ 
               width: '36px', height: '36px', borderRadius: '50%', 
               background: step >= s ? 'var(--accent-primary)' : 'rgba(255,255,255,0.05)', 
               color: step >= s ? '#000' : 'var(--text-muted)',
               display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '0.85rem',
               border: `1px solid ${step >= s ? 'var(--accent-primary)' : 'var(--glass-border)'}`,
               boxShadow: step === s ? '0 0 15px var(--accent-primary)44' : 'none',
               transition: 'all 0.3s'
             }}>{s}</div>
             {s < 3 && <div style={{ width: '80px', height: '2px', background: step > s ? 'var(--accent-primary)' : 'var(--glass-border)', transition: 'all 0.3s' }}></div>}
           </React.Fragment>
         ))}
      </div>

      {error && (
        <div style={{ padding: '1rem', background: 'rgba(255,20,50,0.1)', border: '1px solid var(--status-critical)', color: 'var(--status-critical)', borderRadius: '4px', marginBottom: '2rem', fontSize: '0.85rem', fontWeight: 600 }}>
          {error}
        </div>
      )}

      <div className="glass-panel" style={{ padding: '2.5rem' }}>
        {step === 1 && (
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '2rem', textTransform: 'uppercase' }}>I. Vector Assignment</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                  <div>
                     <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '0.75rem', textTransform: 'uppercase' }}>Origin Node</label>
                     <select 
                       className="input-control" 
                       style={{ width: '100%', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', color: 'var(--text-main)', padding: '0.8rem', fontWeight: 600 }}
                       value={formData.origin}
                       onChange={(e) => setFormData({...formData, origin: e.target.value})}
                     >
                       <option value="">Select Origin...</option>
                       {nodes.map(n => <option key={n.id} value={n.id} style={{background: '#111'}}>{n.name} ({n.id})</option>)}
                     </select>
                  </div>
                  <div>
                     <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '0.75rem', textTransform: 'uppercase' }}>Destination Node</label>
                     <select 
                       className="input-control" 
                       style={{ width: '100%', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', color: 'var(--text-main)', padding: '0.8rem', fontWeight: 600 }}
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
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '2rem', textTransform: 'uppercase' }}>II. Payload Intelligence</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2.5rem' }}>
               {cargoTypes.map(c => (
                 <div 
                  key={c.id} 
                  onClick={() => setFormData({...formData, cargo_type: c.id})}
                  style={{ 
                    padding: '1.25rem', borderRadius: '4px', background: formData.cargo_type === c.id ? 'rgba(0, 180, 216, 0.1)' : 'rgba(255,255,255,0.02)', 
                    border: `1px solid ${formData.cargo_type === c.id ? 'var(--accent-primary)' : 'var(--glass-border)'}`,
                    cursor: 'pointer', transition: 'all 0.2s ease', textAlign: 'center'
                  }}
                 >
                    <div style={{ fontSize: '1.75rem', marginBottom: '0.75rem' }}>{c.icon}</div>
                    <div style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', color: formData.cargo_type === c.id ? 'var(--accent-primary)' : 'var(--text-muted)' }}>{c.label}</div>
                 </div>
               ))}
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2.5rem' }}>
               <div>
                  <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '0.75rem', textTransform: 'uppercase' }}>Priority Level</label>
                  <select 
                    className="input-control" 
                    style={{ width: '100%', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', color: 'var(--text-main)', padding: '0.8rem', fontWeight: 600 }}
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
                  <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '0.75rem', textTransform: 'uppercase' }}>Gross Weight (kg)</label>
                  <input 
                    type="number" 
                    className="input-control" 
                    style={{ width: '100%', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', color: 'var(--text-main)', padding: '0.8rem', fontWeight: 600 }}
                    placeholder="5000" 
                    value={formData.weight_kg}
                    onChange={(e) => setFormData({...formData, weight_kg: parseFloat(e.target.value)})}
                  />
               </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
               <button onClick={() => setStep(1)} style={{ flex: 1, padding: '1rem', borderRadius: '4px', border: '1px solid var(--glass-border)', background: 'transparent', color: 'var(--text-muted)', fontWeight: 800, cursor: 'pointer', textTransform: 'uppercase' }}>Back</button>
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
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(0, 229, 160, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--status-live)', margin: '0 auto 1.5rem auto', border: '1px solid var(--status-live)' }}>
               <CheckCircle size={40} />
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-main)', marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>MISSION PROVISIONED</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '3rem', fontWeight: 600, fontSize: '0.9rem' }}>SHIPMENT_ID: <span style={{color: 'var(--accent-primary)', fontFamily: 'var(--font-mono)'}}>{result.shipment?.id}</span> · STATUS: ACTIVE</p>
            
            <div className="glass-panel" style={{ background: 'rgba(0,0,0,0.2)', padding: '2rem', textAlign: 'left', marginBottom: '2.5rem', border: '1px solid var(--glass-border)' }}>
               <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '1.5rem', textTransform: 'uppercase', fontWeight: 900, letterSpacing: '0.1em' }}>Neural Optimized Route Analytics</div>
               <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', fontWeight: 800, fontSize: '1.25rem', marginBottom: '2.5rem', color: 'var(--text-main)' }}>
                  <div style={{display: 'flex', flexDirection: 'column'}}>
                     <span style={{fontSize: '0.6rem', color: 'var(--text-muted)'}}>ORIGIN</span>
                     {result.shipment?.origin}
                  </div>
                  <ChevronRight size={24} style={{ color: 'var(--accent-primary)', marginTop: '1rem' }} />
                  <div style={{display: 'flex', flexDirection: 'column'}}>
                     <span style={{fontSize: '0.6rem', color: 'var(--text-muted)'}}>DESTINATION</span>
                     {result.shipment?.destination}
                  </div>
               </div>
               
               <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem' }}>
                  <div>
                     <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem' }}><Clock size={10} /> TRANSIT</div>
                     <div style={{ fontWeight: 800, color: 'var(--text-main)' }}>{result.route_analytics?.total_transit_hrs.toFixed(0)}H</div>
                  </div>
                  <div>
                     <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem' }}><DollarSign size={10} /> EST. COST</div>
                     <div style={{ fontWeight: 800, color: 'var(--text-main)' }}>${result.route_analytics?.total_cost.toFixed(0)}</div>
                  </div>
                  <div>
                     <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem' }}><MapPin size={10} /> DISTANCE</div>
                     <div style={{ fontWeight: 800, color: 'var(--text-main)' }}>{result.route_analytics?.total_distance_km.toLocaleString()}km</div>
                  </div>
                  <div>
                     <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem' }}><Activity size={10} /> HOPS</div>
                     <div style={{ fontWeight: 800, color: 'var(--text-main)' }}>{result.route_analytics?.hop_count}</div>
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
