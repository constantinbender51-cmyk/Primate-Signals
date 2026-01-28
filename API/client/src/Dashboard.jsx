import React, { useEffect, useState } from 'react';
import LandingPage from './LandingPage';
import api from './api';
import toast from 'react-hot-toast';

export default function Dashboard() {
    const token = localStorage.getItem('token');
    
    // State
    const [octopusData, setOctopusData] = useState(null);
    const [locked, setLocked] = useState(false);
    const [loading, setLoading] = useState(false);

    // If not logged in, show Landing Page immediately
    if (!token) return <LandingPage />;

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

        const lines = octopusData.line_prices || [];
        const stopPct = (octopusData.stop_percent * 100).toFixed(2);
        const profitPct = (octopusData.profit_percent * 100).toFixed(2);

        return (
            <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
                {/* HEADLINE METRICS */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                    <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                        <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', marginBottom: '8px' }}>Dynamic Stop Loss</div>
                        <div style={{ fontSize: '28px', fontWeight: '800', color: '#dc2626' }}>{stopPct}%</div>
                        <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>Trailing Risk</div>
                    </div>
                    <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                        <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', marginBottom: '8px' }}>Dynamic Take Profit</div>
                        <div style={{ fontSize: '28px', fontWeight: '800', color: '#10b981' }}>{profitPct}%</div>
                        <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>Target Capture</div>
                    </div>
                    <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                        <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', marginBottom: '8px' }}>Active Grid Lines</div>
                        <div style={{ fontSize: '28px', fontWeight: '800', color: '#2563eb' }}>{lines.length}</div>
                        <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>Key Levels Generated</div>
                    </div>
                </div>

                {/* VISUALIZATION */}
                <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#1e293b' }}>Grid Architecture</h3>
                        <span style={{ fontSize: '12px', background: '#dbeafe', color: '#1e40af', padding: '4px 10px', borderRadius: '12px', fontWeight: '600' }}>LIVE</span>
                    </div>

                    <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '20px' }}>
                        These price levels (USDT) are currently being monitored by the execution engine. 
                        Limit orders are placed dynamically around the current market price based on these anchors.
                    </p>

                    <div style={{ 
                        display: 'flex', 
                        flexWrap: 'wrap', 
                        gap: '10px', 
                        maxHeight: '300px', 
                        overflowY: 'auto',
                        padding: '10px',
                        background: '#f8fafc',
                        borderRadius: '8px',
                        border: '1px solid #f1f5f9'
                    }}>
                        {lines.map((price, idx) => (
                            <div key={idx} style={{
                                flex: '1 0 120px',
                                textAlign: 'center',
                                padding: '10px',
                                background: '#ffffff',
                                border: '1px solid #e2e8f0',
                                borderRadius: '6px',
                                fontSize: '14px',
                                fontWeight: '600',
                                color: '#334155',
                                fontFamily: 'monospace'
                            }}>
                                {price.toLocaleString()}
                            </div>
                        ))}
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