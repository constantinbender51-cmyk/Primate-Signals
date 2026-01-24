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
    currentDay.setHours(0, 0, 0, 0); // Start at midnight local time
    if (currentDay.getTime() < minTime) {
        currentDay.setDate(currentDay.getDate() + 1); // Move to next midnight if start is mid-day
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
            
            {/* PnL Under Chart */}
            <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '18px', fontWeight: 'bold', color: isPositive ? '#10b981' : '#ef4444' }}>
                Total PnL: {isPositive ? '+' : ''}{totalPnL.toFixed(2)}%
            </div>
        </div>
    );
};

// --- Sub-Component: Asset Card ---
const AssetCard = ({ symbol }) => {
    return (
        <Link 
            to={`/asset/${symbol}`} 
            style={{
                textDecoration: 'none',
                color: 'inherit',
                background: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px', // Slightly smaller radius
                padding: '10px 16px', // Much tighter padding
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                // Removed minHeight to fix "80% space" issue
                cursor: 'pointer',
                transition: 'border-color 0.2s, box-shadow 0.2s'
            }}
            onMouseOver={(e) => {
                e.currentTarget.style.borderColor = '#2563eb';
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
            }}
            onMouseOut={(e) => {
                e.currentTarget.style.borderColor = '#e5e7eb';
                e.currentTarget.style.boxShadow = 'none';
            }}
        >
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600' }}>{symbol}</h3> 
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

    // Fetch and aggregate data for the combined plot
    useEffect(() => {
        if (!token) return;

        const fetchAllLive = async () => {
            try {
                // Fetch live data for all assets in parallel
                const promises = ASSETS.map(symbol => 
                    api.get(`/api/signals/${symbol}/live`).catch(err => ({ data: [] }))
                );
                
                const results = await Promise.all(promises);
                
                let allTrades = [];
                results.forEach(res => {
                    // Handle potential different response structures (array vs object with results)
                    const trades = Array.isArray(res.data) ? res.data : (res.data?.results || []);
                    allTrades = [...allTrades, ...trades];
                });

                // Sort all trades chronologically
                allTrades.sort((a, b) => new Date(a.time) - new Date(b.time));

                // Calculate cumulative PnL
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

    // 1. If not logged in, show Landing Page
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

            {/* Asset Cards - Now Compact & Above Chart */}
            <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', // Reduced min width for compact look
                gap: '16px',
            }}>
                {ASSETS.map(symbol => (
                    <AssetCard 
                        key={symbol} 
                        symbol={symbol} 
                    />
                ))}
            </div>

            {/* Combined Performance Chart - Moved Below */}
            <EquityChart data={combinedData} />
        </div>
    );
}
