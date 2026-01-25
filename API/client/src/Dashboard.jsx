import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from './api';
import LandingPage from './LandingPage';

// UPDATED: Full Asset List
const ASSETS = [
    'BTC', 'ETH', 'XRP', 'SOL', 'DOGE', 
    'ADA', 'BCH', 'LINK', 'XLM', 'SUI', 
    'AVAX', 'LTC', 'HBAR', 'SHIB', 'TON'
];

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

    const totalPnL = points[points.length - 1].val;
    const isPositive = totalPnL >= 0;

    return (
        <div style={{ border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px', background: '#fff', marginTop: '40px', overflow: 'hidden' }}>
            <h4 style={{ margin: '0 0 15px 0', color: '#374151', fontSize: '14px', textTransform: 'uppercase' }}>Combined Portfolio Performance (Live)</h4>
            
            <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
                <line x1={padding} y1={zeroY} x2={width-padding} y2={zeroY} stroke="#9ca3af" strokeWidth="1" strokeDasharray="4" opacity="0.5" />
                {dayLines.map((x, i) => (
                   <line key={i} x1={x} y1={padding} x2={x} y2={height - padding} stroke="#e5e7eb" strokeWidth="1" />
                ))}
                <path d={pathD} fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            
            <div style={{ textAlign: 'left', marginTop: '12px', fontSize: '14px', fontWeight: 'bold', color: isPositive ? '#10b981' : '#ef4444' }}>
                Total PnL: {isPositive ? '+' : ''}{totalPnL.toFixed(2)}%
            </div>
        </div>
    );
};

const AssetCard = ({ symbol, metrics, isActive }) => {
    const pnl = metrics?.pnl || 0;
    const isPos = pnl >= 0;
    const acc = metrics?.accuracy || 0;
    const trades = metrics?.trades || 0;
    const expRet = metrics?.exp_return || 0;
    const signal = metrics?.signal || 0; 

    return (
        <Link 
            to={`/asset/${symbol}`}
            style={{
                textDecoration: 'none',
                color: 'inherit',
                background: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '16px 20px', 
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between', 
                cursor: 'pointer',
                transition: 'border-color 0.2s, background-color 0.2s'
            }}
            onMouseOver={(e) => {
                e.currentTarget.style.borderColor = '#2563eb';
                e.currentTarget.style.backgroundColor = '#f9fafb';
            }}
            onMouseOut={(e) => {
                e.currentTarget.style.borderColor = '#e5e7eb';
                e.currentTarget.style.backgroundColor = '#fff';
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flex: 1 }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600', width: '60px' }}>{symbol}</h3>
                
                {metrics ? (
                    <div style={{ display: 'flex', gap: '20px', alignItems: 'center', fontSize: '13px' }}>
                        <div style={{ color: '#4b5563' }}>
                            <span style={{ color: '#9ca3af', marginRight: '4px' }}>Acc:</span>
                            <span style={{ fontWeight: '600' }}>{acc}%</span>
                        </div>
                        <div style={{ color: isPos ? '#10b981' : '#ef4444', fontWeight: '700' }}>
                            {isPos ? '+' : ''}{pnl.toFixed(2)}%
                        </div>
                        <div style={{ color: '#4b5563' }}>
                            <span style={{ color: '#9ca3af', marginRight: '4px' }}>Exp. Ret:</span>
                            {expRet > 0 ? '+' : ''}{expRet.toFixed(2)}%
                        </div>
                        <div style={{ color: '#4b5563' }}>
                            <span style={{ color: '#9ca3af', marginRight: '4px' }}>Trades:</span>
                            {trades}
                        </div>
                        <div style={{ color: '#4b5563' }}>
                            <span style={{ color: '#9ca3af', marginRight: '4px' }}>Signal:</span>
                            {isActive ? (
                                <span>{signal === 1 ? 'LONG' : signal === -1 ? 'SHORT' : 'FLAT'}</span>
                            ) : (
                                <span style={{ color: '#dc2626', fontWeight: '600', fontSize: '12px' }}>RESTRICTED</span>
                            )}
                        </div>
                    </div>
                ) : (
                    <span style={{ fontSize: '12px', color: '#9ca3af' }}>Loading stats...</span>
                )}
            </div>
        </Link>
    );
};

export default function Dashboard() {
    const navigate = useNavigate();
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;
    const [combinedData, setCombinedData] = useState([]);
    const [assetStats, setAssetStats] = useState({});

    const isActive = user && (user.subscription_status === 'active' || user.subscription_status === 'trialing');

    useEffect(() => {
        if (!token) return;

        const fetchAllLive = async () => {
            try {
                // Fetch stats for all assets in parallel
                const promises = ASSETS.map(symbol => 
                    api.get(`/api/signals/${symbol}/live`).catch(err => ({ data: { results: [] } }))
                );
                
                const results = await Promise.all(promises);
                
                let allTrades = [];
                const newStats = {};
           
                results.forEach((res, index) => {
                    const trades = res.data?.results || [];
                    const symbol = ASSETS[index];

                    if (trades.length > 0) {
                        const sorted = [...trades].sort((a, b) => new Date(a.time) - new Date(b.time));
                        
                        const validTrades = sorted.filter(t => t.pred_dir !== 0);
                        const wins = validTrades.filter(t => (parseFloat(t.pnl) || 0) > 0).length;
                        const validCount = validTrades.length;
                        
                        const totalPnl = sorted.reduce((acc, t) => acc + (parseFloat(t.pnl) || 0), 0);
                        const avgReturn = validCount > 0 ? (totalPnl / validCount) : 0;
                        const lastTrade = sorted[sorted.length - 1];

                        newStats[symbol] = {
                            pnl: totalPnl,
                            trades: validCount,
                            accuracy: validCount > 0 ? ((wins / validCount) * 100).toFixed(1) : 0,
                            exp_return: avgReturn,
                            signal: lastTrade?.pred_dir || 0
                        };
                    } else {
                        newStats[symbol] = { pnl: 0, trades: 0, accuracy: 0, exp_return: 0, signal: 0 };
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

    if (!token) return <LandingPage />;

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '80px', animation: 'fadeIn 0.5s ease-out' }}>
            <header style={{ marginBottom: '30px' }}>
                <h2 style={{ fontSize: '1.8rem', fontWeight: '800', margin: '0 0 8px 0', color: '#111827' }}>Market Overview</h2>
                <p style={{ margin: 0, color: '#6b7280' }}>
                     Real-time AI signals for major assets. {isActive ? "Active Plan" : "Free Account"}
                </p>
            </header>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {ASSETS.map(symbol => (
                    <AssetCard 
                        key={symbol} 
                        symbol={symbol} 
                        metrics={assetStats[symbol]}
                        isActive={isActive}
                    />
                ))}
            </div>

            <EquityChart data={combinedData} />
        </div>
    );
}