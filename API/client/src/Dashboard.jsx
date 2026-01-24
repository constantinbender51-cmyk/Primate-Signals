import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from './api';
import LandingPage from './LandingPage';

const ASSETS = ['BTC', 'XRP', 'SOL'];
// --- Reusable Component: Equity Chart (Adapted for Dashboard) ---
const EquityChart = ({ data }) => {
    if (!data || data.length === 0) return <div style={{ height: '200px', background: '#f9fafb', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', marginTop: '24px' }}>Loading Performance...</div>;
const height = 250;
    const width = 800;
    const padding = 20;
const points = data.map(d => ({
        time: new Date(d.time), 
        val: d.val 
    })).sort((a,b) => a.time - b.time);
if (points.length < 2) return null;

    const minVal = Math.min(0, ...points.map(p => p.val));
    const maxVal = Math.max(0, ...points.map(p => p.val));
const rangeY = maxVal - minVal || 1;
    const minTime = points[0].time.getTime();
    const maxTime = points[points.length - 1].time.getTime();
const rangeX = maxTime - minTime || 1;

    const getX = t => padding + ((t.getTime() - minTime) / rangeX) * (width - padding * 2);
const getY = v => (height - padding) - ((v - minVal) / rangeY) * (height - padding * 2);
const zeroY = getY(0);

    const pathD = points.map((p, i) => `${i===0?'M':'L'} ${getX(p.time)} ${getY(p.val)}`).join(' ');
// Calculate Grid Lines (Midnight of each day)
    const dayLines = [];
    let currentDay = new Date(minTime);
currentDay.setHours(0, 0, 0, 0); 
    if (currentDay.getTime() < minTime) {
        currentDay.setDate(currentDay.getDate() + 1);
}
    
    while (currentDay.getTime() <= maxTime) {
        dayLines.push(getX(currentDay));
currentDay.setDate(currentDay.getDate() + 1);
    }

    // Final PnL
    const totalPnL = points[points.length - 1].val;
const isPositive = totalPnL >= 0;

    return (
        <div style={{ border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px', background: '#fff', marginTop: '40px', overflow: 'hidden' }}>
            <h4 style={{ margin: '0 0 15px 0', color: '#374151', fontSize: '14px', textTransform: 'uppercase' }}>Combined Portfolio Performance (Live)</h4>
            
            <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
     
           {/* Zero Line */}
                <line x1={padding} y1={zeroY} x2={width-padding} y2={zeroY} stroke="#9ca3af" strokeWidth="1" strokeDasharray="4" opacity="0.5" />
                
                {/* Day Grid Lines */}
                {dayLines.map((x, i) => (
      
              <line key={i} x1={x} y1={padding} x2={x} y2={height - padding} stroke="#e5e7eb" strokeWidth="1" />
                ))}

                {/* Main Curve */}
                <path d={pathD} fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
      
      
            {/* PnL Under Chart: Left Aligned & Smaller */}
            <div style={{ textAlign: 'left', marginTop: '12px', fontSize: '14px', fontWeight: 'bold', color: isPositive ?
'#10b981' : '#ef4444' }}>
                Total PnL: {isPositive ?
'+' : ''}{totalPnL.toFixed(2)}%
            </div>
        </div>
    );
};

// --- Sub-Component: Asset Card (Row Style) ---
const AssetCard = ({ symbol, metrics }) => {
    // Default values if metrics are loading or unavailable
    const pnl = metrics?.pnl || 0;
    const isPos = pnl >= 0;
    const acc = metrics?.accuracy || 0;
    const trades = metrics?.trades || 0;
    const signal = metrics?.signal || 0; // 1 = Long, -1 = Short

    return (
        <Link 
            to={`/asset/${symbol}`} 
            style={{
                textDecoration: 'none',
                color: 'inherit',
            
    background: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '16px 20px', // Standard list padding
                display: 'flex',
                alignItems: 'center',
   
             justifyContent: 'space-between', // Align content across the row
                cursor: 'pointer',
                transition: 'border-color 0.2s, background-color 0.2s'
            }}
            onMouseOver={(e) => {
                e.currentTarget.style.borderColor 
= '#2563eb';
                e.currentTarget.style.backgroundColor = '#f9fafb';
            }}
            onMouseOut={(e) => {
                e.currentTarget.style.borderColor = '#e5e7eb';
                e.currentTarget.style.backgroundColor = '#fff';
}}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flex: 1 }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600', width: '60px' }}>{symbol}</h3>
                
                {/* Metrics Row */}
                {metrics ? (
                    <div style={{ display: 'flex', gap: '20px', alignItems: 'center', fontSize: '13px' }}>
                        {/* Signal Badge */}
                        <span style={{ 
                            padding: '2px 8px', borderRadius: '4px', fontWeight: '700', fontSize: '11px',
                            background: signal === 1 ? '#d1fae5' : signal === -1 ? '#fee2e2' : '#f3f4f6',
                            color: signal === 1 ? '#047857' : signal === -1 ? '#b91c1c' : '#6b7280'
                        }}>
                            {signal === 1 ? 'LONG' : signal === -1 ? 'SHORT' : 'FLAT'}
                        </span>

                        <div style={{ color: '#4b5563' }}>
                            <span style={{ color: '#9ca3af', marginRight: '4px' }}>Acc:</span>
                            {acc}%
                        </div>

                        <div style={{ color: '#4b5563' }}>
                            <span style={{ color: '#9ca3af', marginRight: '4px' }}>Trades:</span>
                            {trades}
                        </div>
                    </div>
                ) : (
                    <span style={{ fontSize: '12px', color: '#9ca3af' }}>Loading stats...</span>
                )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                 {/* PnL Display */}
                 {metrics && (
                    <div style={{ fontWeight: '700', color: isPos ? '#10b981' : '#ef4444' }}>
                        {isPos ? '+' : ''}{pnl.toFixed(2)}%
                    </div>
                 )}
                <span style={{ color: '#9ca3af', fontSize: '1.2rem' }}>&rsaquo;</span>
            </div>
        </Link>
    );
};

// --- Main Dashboard Component ---
export default function Dashboard() {
    const navigate = useNavigate();
const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;
const [combinedData, setCombinedData] = useState([]);
    const [assetStats, setAssetStats] = useState({});

    // Fetch and aggregate data for the combined plot
    useEffect(() => {
        if (!token) return;

        const fetchAllLive = async () => {
            try {
                const promises = ASSETS.map(symbol => 
                    api.get(`/api/signals/${symbol}/live`).catch(err => ({ 
data: [] }))
                );
                
                const results = await Promise.all(promises);
                
                let allTrades = [];
                const newStats = {};
           
     results.forEach((res, index) => {
                    const trades = Array.isArray(res.data) ? res.data : (res.data?.results || []);
                    const symbol = ASSETS[index];

                    // Calculate Per-Asset Stats
                    if (trades.length > 0) {
                        // Sort by time for signal detection
                        const sorted = [...trades].sort((a, b) => new Date(a.time) - new Date(b.time));
                        
                        const wins = sorted.filter(t => (parseFloat(t.pnl) || 0) > 0).length;
                        const total = sorted.length;
                        const cumPnl = sorted.reduce((acc, t) => acc + (parseFloat(t.pnl) || 0), 0);
                        const lastTrade = sorted[sorted.length - 1];

                        newStats[symbol] = {
                            pnl: cumPnl,
                            trades: total,
                            accuracy: total > 0 ? ((wins / total) * 100).toFixed(1) : 0,
                            signal: lastTrade?.pred_dir || 0
                        };
                    } else {
                        newStats[symbol] = { pnl: 0, trades: 0, accuracy: 0, signal: 0 };
                    }

                    allTrades = [...allTrades, ...trades];
                });

                setAssetStats(newStats);

                allTrades.sort((a, b) => new Date(a.time) - new Date(b.time));

  
              let runningPnL = 0;
                const curve = allTrades.map(t => {
                    runningPnL += (parseFloat(t.pnl) || 0);
                    return {
                 
       time: t.time,
                        val: runningPnL
                    };
});

                setCombinedData(curve);

            } catch (err) {
                console.error("Error fetching combined stats:", err);
}
        };

        fetchAllLive();
    }, [token]);
if (!token) {
        return <LandingPage />;
}

    const isActive = user && (user.subscription_status === 'active' || user.subscription_status === 'trialing');
return (
        <div style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '80px', animation: 'fadeIn 0.5s ease-out' }}>
            <header style={{ marginBottom: '30px' }}>
                <h2 style={{ fontSize: '1.8rem', fontWeight: '800', margin: '0 0 8px 0', color: '#111827' }}>Market Overview</h2>
                <p style={{ margin: 0, color: '#6b7280' }}>
          
          Real-time AI signals for major assets. {isActive ? "Active Plan" : "Free Account"}
                </p>
            </header>

            {/* Asset List - Stacked Vertically */}
            <div style={{ 
                display: 'flex',
 
               flexDirection: 'column',
                gap: '12px',
            }}>
                {ASSETS.map(symbol => (
                    <AssetCard 
                
        key={symbol} 
                        symbol={symbol} 
                        metrics={assetStats[symbol]}
                    />
                ))}
            </div>

            {/* Combined Performance Chart - Below 
List */}
            <EquityChart data={combinedData} />
        </div>
    );
}
