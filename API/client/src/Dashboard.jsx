import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from './api';
import LandingPage from './LandingPage'; 

const ASSETS = ['BTC', 'XRP', 'SOL'];

// --- Sub-Component: Asset Card ---
const AssetCard = ({ symbol, isActive, onSubscribe }) => {
    const [recentStats, setRecentStats] = useState(null);
    const [currentSignal, setCurrentSignal] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // Always fetch recent stats (Public)
                const recRes = await api.get(`/api/signals/${symbol}/recent`);
                setRecentStats(recRes.data);

                // If active, try fetching current signal
                if (isActive) {
                    try {
                        const curRes = await api.get(`/api/signals/${symbol}/current`);
                        setCurrentSignal(curRes.data);
                    } catch (e) { /* Ignore fetch error for signal */ }
                }
            } catch (err) {
                console.error(`Failed to load ${symbol} data`);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [symbol, isActive]);

    return (
        <div style={{
            background: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: '10px', // Slightly tighter radius
            padding: '16px', // REDUCED from 24px
            display: 'flex',
            flexDirection: 'column',
            gap: '12px', // REDUCED from 16px
            height: '100%',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
        }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Link to={`/asset/${symbol}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                    <h3 style={{ margin: 0, fontSize: '1.25rem', cursor: 'pointer', fontWeight: '700' }}>{symbol} / USD</h3>
                </Link>
                <span style={{ 
                    background: '#eff6ff', color: '#2563eb', 
                    padding: '2px 8px', borderRadius: '12px', 
                    fontSize: '11px', fontWeight: '600' 
                }}>1H</span>
            </div>

            <div style={{ height: '1px', background: '#f3f4f6' }}></div>

            {/* Signal / Call to Action Area */}
            <div style={{ minHeight: '40px', display: 'flex', alignItems: 'center' }}>
                {loading ? (
                    <span style={{ color: '#9ca3af', fontSize: '13px' }}>Loading...</span>
                ) : isActive && currentSignal ? (
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                         {currentSignal.pred_dir === 1 && (
                            <span style={{ background: '#ecfdf5', color: '#059669', padding: '4px 10px', borderRadius: '4px', fontWeight: '700', fontSize:'13px' }}>BUY</span>
                         )}
                         {currentSignal.pred_dir === -1 && (
                            <span style={{ background: '#fef2f2', color: '#dc2626', padding: '4px 10px', borderRadius: '4px', fontWeight: '700', fontSize:'13px' }}>SELL</span>
                         )}
                         {currentSignal.pred_dir === 0 && (
                            <span style={{ background: '#f3f4f6', color: '#4b5563', padding: '4px 10px', borderRadius: '4px', fontWeight: '700', fontSize:'13px' }}>HOLD</span>
                         )}
                         <span style={{ fontSize: '15px', fontWeight: '600', color: '#374151' }}>
                            ${currentSignal.entry_price}
                         </span>
                    </div>
                ) : (
                    <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                         <span style={{ fontSize: '13px', color: '#6b7280', fontStyle: 'italic' }}>Signal Locked</span>
                         <button 
                            onClick={onSubscribe}
                            style={{ 
                                background: '#2563eb', fontSize: '12px', padding: '6px 12px',
                                boxShadow: '0 2px 4px -1px rgba(37, 99, 235, 0.2)' 
                            }}
                        >
                            Try Free
                        </button>
                    </div>
                )}
            </div>

            {/* Recent Stats Grid - Compacted */}
            <div style={{ 
                background: '#f9fafb', 
                borderRadius: '6px', 
                padding: '10px', // REDUCED from 16px
                display: 'grid', 
                gridTemplateColumns: '1fr 1fr 1fr', 
                gap: '8px' // REDUCED from 12px
            }}>
                <div>
                    <div style={{ fontSize: '10px', color: '#6b7280', textTransform: 'uppercase', marginBottom:'2px' }}>Recent PnL</div>
                    <div style={{ 
                        fontSize: '13px', fontWeight: 'bold',
                        color: recentStats?.cumulative_pnl >= 0 ? '#10b981' : '#ef4444'
                    }}>
                         {recentStats ? (recentStats.cumulative_pnl >= 0 ? '+' : '') + parseFloat(recentStats.cumulative_pnl).toFixed(2) + '%' : '-'}
                    </div>
                </div>
                <div>
                    <div style={{ fontSize: '10px', color: '#6b7280', textTransform: 'uppercase', marginBottom:'2px' }}>Accuracy</div>
                    <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#111827' }}>
                        {recentStats ? `${recentStats.accuracy_percent}%` : '-'}
                    </div>
                </div>
                <div>
                    <div style={{ fontSize: '10px', color: '#6b7280', textTransform: 'uppercase', marginBottom:'2px' }}>Trades/14d</div>
                    <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#111827' }}>
                        {recentStats ? recentStats.total_trades : '-'}
                    </div>
                </div>
            </div>
            
            <Link to={`/asset/${symbol}`} style={{ textAlign: 'center', fontSize: '12px', color: '#6b7280', marginTop: '4px', textDecoration: 'none' }}>
                Full Analysis &rarr;
            </Link>
        </div>
    );
};

// --- Main Dashboard Component ---
export default function Dashboard() {
    const navigate = useNavigate();
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;
    
    // 1. If not logged in, show Landing Page
    if (!token) {
        return <LandingPage />;
    }

    const isActive = user && (user.subscription_status === 'active' || user.subscription_status === 'trialing');

    const handleSubscribe = async () => {
        try {
            const res = await api.post('/create-checkout-session');
            window.location.href = res.data.url;
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '80px', animation: 'fadeIn 0.5s ease-out' }}>
            <header style={{ marginBottom: '32px' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: '800', margin: '0 0 6px 0', color: '#111827' }}>Market Overview</h2>
                <p style={{ margin: 0, color: '#6b7280', fontSize: '14px' }}>
                    Real-time AI signals for major assets. {isActive ? "Active Plan" : "Free Account"}
                </p>
            </header>

            {/* Asset Cards */}
            <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', // Reduced minmax slightly
                gap: '16px', // REDUCED from 24px
                marginBottom: '48px'
            }}>
                {ASSETS.map(symbol => (
                    <AssetCard 
                        key={symbol} 
                        symbol={symbol} 
                        isActive={isActive} 
                        onSubscribe={handleSubscribe} 
                    />
                ))}
            </div>
        </div>
    );
}
