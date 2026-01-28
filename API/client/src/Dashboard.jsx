import React, { useEffect, useState } from 'react';
import LandingPage from './LandingPage';
import api from './api';
import toast from 'react-hot-toast';

export default function Dashboard() {
    const token = localStorage.getItem('token');
    // State
    const [octopusData, setOctopusData] = useState(null);
    const [currentPrice, setCurrentPrice] = useState(null);
    const [locked, setLocked] = useState(false);
    const [loading, setLoading] = useState(false);

    // If not logged in, show Landing Page immediately
    if (!token) return <LandingPage />;

    // Fetch Strategy Data
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // Fetch from new Octopus endpoint
                const res = await api.get('/api/octopus/latest');
           
                setOctopusData(res.data);
                setLocked(false);
            } catch (err) {
                // Handle Paywall/Auth errors
                if (err.response && (err.response.status === 403 || err.response.status === 401)) {
                   
                    setLocked(true);
                } else {
                    console.error("Fetch error:", err);
                    toast.error("Failed to load strategy data.");
                }
            } finally {
     
                setLoading(false);
            }
        };

        fetchData();
        // Auto-refresh every 60 seconds (aligned with bot cycle)
        const interval = setInterval(fetchData, 60000);
        return () => clearInterval(interval);
    }, []);

    // Fetch Live Price (Binance) for Visualization
    useEffect(() => {
        const fetchPrice = async () => {
            try {
                const res = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT');
                const data = await res.json();
                setCurrentPrice(parseFloat(data.price));
     
            } catch (err) {
                console.error("Price fetch error:", err);
            }
        };

        fetchPrice();
        const interval = setInterval(fetchPrice, 5000); // Update every 5s
        return () => clearInterval(interval);
    }, []);

    const handleSubscribe = async () => {
        try {
            const res = await api.post('/create-checkout-session');
            window.location.href = res.data.url;
        } catch (err) {
            toast.error("Checkout unavailable");
        }
    };

    // --- RENDER HELPERS ---

    const renderLockedState = () => (
        <div style={{ 
            background: '#f8fafc', 
            border: '1px dashed #cbd5e1', 
            borderRadius: '12px', 
            padding: '60px 20px', 
            textAlign: 'center',
            marginTop: '20px'
        }}>
            <div style={{ fontSize: '2rem', marginBottom: '16px' }}>🔒</div>
            <h3 style={{ margin: '0 0 10px 0', color: '#334155' }}>Strategy Data Locked</h3>
            <p style={{ color: '#64748b', maxWidth: '400px', margin: '0 auto 24px auto' }}>
               
                The Octopus Grid runs on a 1-minute cycle. Subscribe to view the live grid lines, 
                dynamic stop-loss, and take-profit parameters in real-time.
            </p>
            <button 
                onClick={handleSubscribe} 
                style={{ 
                     padding: '12px 32px', 
                    fontSize: '16px', 
                    background: '#2563eb', 
                    color: '#fff', 
              
                    border: 'none', 
                    borderRadius: '6px',
                    cursor: 'pointer'
                }}
            >
                Start Free Trial
    
            </button>
        </div>
    );

    const renderStrategyData = () => {
        if (!octopusData) return <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Waiting for next cycle update...</div>;
        const lines = [...(octopusData.line_prices || [])].sort((a, b) => a - b);
        // Sort Low to High
        const stopPct = (octopusData.stop_percent * 100).toFixed(2);
        const profitPct = (octopusData.profit_percent * 100).toFixed(2);

        // Find closest indices for coloring
        let lowerIndex = -1;
        let upperIndex = -1;
        
        if (currentPrice && lines.length > 0) {
            for (let i = 0; i < lines.length; i++) {
                if (lines[i] < currentPrice) {
                    lowerIndex = i;
                    // Continually update to find the highest value less than price
                } else if (lines[i] > currentPrice) {
                    upperIndex = i;
                    break; // Found the first value higher than price
                }
            }
        }

        return (
            <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
                
                {/* HEADLINE METRICS */}
                <div style={{ 
                    position: 'relative',
                    background: '#fff', 
                    padding: '24px', 
           
                    borderRadius: '12px', 
                    border: '1px solid #e5e7eb', 
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                    marginBottom: '30px',
                    
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start'
                }}>
                    {/* Left: Active Grid Count */}
                
                    <div>
                        <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', marginBottom: '8px' }}>Active Grid Lines</div>
                        <div style={{ fontSize: '32px', fontWeight: '800', color: '#2563eb' }}>{lines.length}</div>
                        <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>Key Levels Generated</div>
                    </div>

                    {/* Right: Stop & Profit (Top Right Position) */}
                    <div style={{ display: 'flex', gap: '32px', textAlign: 'right' }}>
                
                        <div>
                            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px' }}>Dyn.
                            Stop Loss</div>
                            <div style={{ fontSize: '20px', fontWeight: '800', color: '#dc2626' }}>{stopPct}%</div>
                        </div>
                        <div>
               
                            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px' }}>Dyn.
                            Take Profit</div>
                            <div style={{ fontSize: '20px', fontWeight: '800', color: '#10b981' }}>{profitPct}%</div>
                        </div>
                    </div>
                </div>

   
                 {/* VISUALIZATION */}
                <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#1e293b' }}>Grid Architecture</h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                             {currentPrice && (
                               
                                <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>
                                    Mark: <span style={{ color: '#1e293b', fontWeight: '700' }}>${currentPrice.toLocaleString()}</span>
                                </span>
                
                             )}
                            <span style={{ fontSize: '12px', background: '#dbeafe', color: '#1e40af', padding: '4px 10px', borderRadius: '12px', fontWeight: '600' }}>LIVE</span>
                        </div>
                    
                    </div>

                    <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '20px' }}>
                        Real-time visualization of the grid ladder relative to market price.
                    </p>

                    <div style={{ 
                        display: 'flex', 
                        flexDirection: 'column-reverse', // Visual stack (High price at top, Low at bottom visually, or list standard?) 
            
                        // Prompt said "List low to high".
                        // Standard list implies Top=Low. 
                        // But grids are usually vertical. Let's stick to standard flex column for a list.
                        flexDirection: 'column', 
                        gap: '6px', 
                        maxHeight: '500px', 
                        overflowY: 'auto',
                     
                        padding: '15px',
                        background: '#f8fafc',
                        borderRadius: '8px',
                        border: '1px solid #f1f5f9'
                   
                     }}>
                        {lines.map((price, idx) => {
                            // Filter: Only show the next levels (immediate context above/below)
                            if (currentPrice && idx !== lowerIndex && idx !== upperIndex) return null;

                            // Determine Color
                            let bg = '#ffffff';
           
                            let border = '#e2e8f0';
                            let text = '#334155';
                            
                     
                            if (idx === lowerIndex) {
                                bg = '#dcfce7'; // Green Light
                                border = '#86efac';
                  
                                text = '#166534';
                            } else if (idx === upperIndex) {
                                bg = '#fee2e2'; // Red Light
             
                                border = '#fca5a5';
                                text = '#991b1b';
                            }

                            // Check if we should insert the Current Price marker before this item
                            // Note: Since we map Low -> High, if currentPrice < price, we insert BEFORE this item (if it's the first upper)
        
                            const showMarker = currentPrice && idx === upperIndex;
                            return (
                                <React.Fragment key={idx}>
                                    {/* Insert Current Price Marker if we reached the gap */}
                    
                                    {showMarker && (
                                        <div style={{
                                         
                                            padding: '8px',
                                            textAlign: 'center',
                                            background: '#1e293b',
      
                                            color: '#fff',
                                            borderRadius: '6px',
                
                                            fontWeight: '700',
                                            fontSize: '14px',
                          
                                            margin: '4px 0',
                                            border: '1px solid #0f172a'
                                 
                                        }}>
                                            MARK PRICE: ${currentPrice.toLocaleString()}
                                        </div>
       
                                    )}

                                    <div style={{
                                  
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        padding: '12px 16px',
          
                                        background: bg,
                                        border: `1px solid ${border}`,
                          
                                        borderRadius: '6px',
                                        fontSize: '14px',
                                        fontWeight: '600',
   
                                        color: text,
                                        fontFamily: 'monospace'
                     
                                    }}>
                                        <span>Level {idx + 1}</span>
                                        <span>${price.toLocaleString()}</span>
  
                                    </div>

                                    {/* Edge Case: Price is higher than ALL lines */}
                     
                                    {currentPrice && idx === lines.length - 1 && currentPrice > price && (
                                        <div style={{
                                
                                            padding: '8px',
                                            textAlign: 'center',
                                          
                                            background: '#1e293b',
                                            color: '#fff',
                                            borderRadius: '6px',
       
                                            fontWeight: '700',
                                            fontSize: '14px',
                 
                                            margin: '4px 0',
                                            border: '1px solid #0f172a'
                        
                                        }}>
                                            MARK PRICE: ${currentPrice.toLocaleString()}
                                      
                                        </div>
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '80px' }}>
            <div style={{ marginBottom: '40px', borderBottom: '1px solid #e5e7eb', paddingBottom: '20px' }}>
                <h1 style={{ margin: '0 0 8px 0', fontSize: '1.8rem' }}>Octopus Grid Strategy</h1>
                <p style={{ margin: 0, color: '#6b7280' }}>Real-time execution parameters and grid density.</p>
     
            </div>

            {loading && !octopusData && !locked ? (
                <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>Loading Grid Data...</div>
            ) : locked ? (
                renderLockedState()
            ) : (
   
                renderStrategyData()
            )}
        </div>
    );
}
