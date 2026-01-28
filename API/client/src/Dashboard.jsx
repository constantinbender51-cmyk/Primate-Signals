import React, { useEffect, useState } from 'react';
import LandingPage from './LandingPage';
import api from './api';
import toast from 'react-hot-toast';

// Simple SVG Chart Component to avoid external deps
const SimpleEquityChart = ({ data, color }) => {
    if (!data || data.length < 2) return null;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const width = 100; // viewBox units
    const height = 50; 
    
    const points = data.map((val, i) => {
        const x = (i / (data.length - 1)) * width;
        const y = height - ((val - min) / range) * height;
        return `${x},${y}`;
    }).join(' ');

    return (
        <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: '100%', overflow: 'visible' }}>
            <polyline fill="none" stroke={color} strokeWidth="1.5" points={points} vectorEffect="non-scaling-stroke" />
        </svg>
    );
};

export default function Dashboard() {
    const token = localStorage.getItem('token');
    
    const [assets, setAssets] = useState([]);
    const [selectedAsset, setSelectedAsset] = useState('BTC');
    const [strategyData, setStrategyData] = useState(null);
    const [currentPrice, setCurrentPrice] = useState(null);
    const [locked, setLocked] = useState(false);
    const [loading, setLoading] = useState(false);

    if (!token) return <LandingPage />;

    // 1. Fetch Asset List
    useEffect(() => {
        api.get('/api/octopus/assets')
           .then(res => setAssets(res.data))
           .catch(err => console.error("Asset fetch failed", err));
    }, []);

    // 2. Fetch Strategy Data for Selected Asset
    useEffect(() => {
        if (!selectedAsset) return;

        const fetchData = async () => {
            setLoading(true);
            try {
                const res = await api.get(`/api/octopus/status/${selectedAsset}`);
                setStrategyData(res.data);
                setLocked(false);
            } catch (err) {
                if (err.response && (err.response.status === 403 || err.response.status === 401)) {
                    setLocked(true);
                } else {
                    console.error(err);
                    toast.error("Asset initializing or unavailable.");
                }
            } finally {
                setLoading(false);
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 60000); // 1 min refresh
        return () => clearInterval(interval);
    }, [selectedAsset]);

    // 3. Fetch Live Price for Visuals
    useEffect(() => {
        const assetObj = assets.find(a => a.symbol === selectedAsset);
        const pair = assetObj ? assetObj.pair : `${selectedAsset}USDT`;
        
        const fetchPrice = async () => {
            try {
                const res = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${pair}`);
                const data = await res.json();
                setCurrentPrice(parseFloat(data.price));
            } catch (err) { }
        };
        fetchPrice();
        const interval = setInterval(fetchPrice, 5000);
        return () => clearInterval(interval);
    }, [selectedAsset, assets]);

    const handleSubscribe = async () => {
        try {
            const res = await api.post('/create-checkout-session');
            window.location.href = res.data.url;
        } catch (err) { toast.error("Checkout error"); }
    };

    // --- RENDERERS ---

    const renderLocked = () => (
        <div style={{ background: '#f8fafc', border: '2px dashed #cbd5e1', borderRadius: '12px', padding: '4rem', textAlign: 'center' }}>
            <h2 style={{ color: '#334155' }}>🔒 Premium Strategy Data</h2>
            <p style={{ color: '#64748b' }}>Subscribe to view real-time grid levels, trades, and logs for {selectedAsset}.</p>
            <button onClick={handleSubscribe} style={{ marginTop: '1rem', padding: '10px 20px', fontSize: '1rem' }}>Start Free Trial</button>
        </div>
    );

    const renderContent = () => {
        if (!strategyData || strategyData.status === 'Initializing') {
            return <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>🤖 Algorithm is evolving strategy for {selectedAsset}... Please wait.</div>;
        }

        const { params, live_logs, live_trades, equity_curve } = strategyData;
        const lines = params.lines.sort((a,b) => a-b);

        return (
            <div style={{ display: 'grid', gap: '20px' }}>
                {/* METRICS ROW */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
                    <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                        <div className="tiny">DYNAMIC STOP LOSS</div>
                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ef4444' }}>{(params.stop_pct * 100).toFixed(3)}%</div>
                    </div>
                    <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                        <div className="tiny">DYNAMIC TAKE PROFIT</div>
                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>{(params.profit_pct * 100).toFixed(3)}%</div>
                    </div>
                    <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                        <div className="tiny">ACTIVE GRID LINES</div>
                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#3b82f6' }}>{lines.length}</div>
                    </div>
                </div>

                {/* EQUITY CHART */}
                <div style={{ background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', height: '200px' }}>
                    <div style={{ marginBottom: '10px', fontWeight: '600', color: '#334155' }}>Live Equity Curve (Backtest + Forward Test)</div>
                    <div style={{ height: '140px' }}>
                        <SimpleEquityChart data={equity_curve} color="#2563eb" />
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    {/* LIVE LOGS */}
                    <div style={{ background: '#1e293b', padding: '20px', borderRadius: '12px', color: '#f1f5f9', height: '400px', overflowY: 'auto', fontFamily: 'monospace', fontSize: '12px' }}>
                        <h4 style={{ color: '#94a3b8', margin: '0 0 10px 0' }}>SYSTEM LOGS</h4>
                        {live_logs.length === 0 ? "Waiting for next minute trigger..." : live_logs.map((log, i) => (
                            <div key={i} style={{ marginBottom: '8px', borderBottom: '1px solid #334155', paddingBottom: '4px' }}>
                                <span style={{ color: '#64748b' }}>[{log.timestamp.split(' ')[1]}]</span>{' '}
                                <span style={{ color: '#38bdf8' }}>{log.price.toFixed(2)}</span>{' '}
                                <span style={{ color: log.position === 'LONG' ? '#4ade80' : (log.position === 'SHORT' ? '#f87171' : '#94a3b8') }}>
                                    {log.position}
                                </span>
                                {log.active_sl > 0 && <span style={{ marginLeft: '8px', color: '#ef4444' }}>SL: {log.active_sl.toFixed(2)}</span>}
                            </div>
                        ))}
                    </div>

                    {/* LIVE TRADES */}
                    <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', height: '400px', overflowY: 'auto' }}>
                        <h4 style={{ color: '#334155', margin: '0 0 10px 0' }}>RECENT TRADES</h4>
                        <table style={{ width: '100%', fontSize: '13px' }}>
                            <thead>
                                <tr style={{ color: '#64748b' }}><th style={{textAlign:'left'}}>Type</th><th>Price</th><th>PnL</th></tr>
                            </thead>
                            <tbody>
                                {live_trades.length === 0 ? <tr><td colSpan="3">No live trades yet.</td></tr> : live_trades.map((t, i) => (
                                    <tr key={i}>
                                        <td style={{ color: t.type === 'Exit' ? '#f59e0b' : '#3b82f6', fontWeight: 'bold' }}>{t.type} {t.reason ? `(${t.reason})` : ''}</td>
                                        <td>{t.price.toFixed(2)}</td>
                                        <td style={{ color: t.pnl > 0 ? '#10b981' : (t.pnl < 0 ? '#ef4444' : '#64748b') }}>
                                            {t.pnl !== 0 ? (t.pnl * 100).toFixed(2) + '%' : '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div style={{ paddingBottom: '100px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <h1 style={{ margin: 0 }}>Octopus Strategy</h1>
                <select 
                    value={selectedAsset} 
                    onChange={(e) => { setSelectedAsset(e.target.value); setStrategyData(null); }}
                    style={{ width: '150px', fontSize: '16px', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                >
                    {assets.map(a => <option key={a.symbol} value={a.symbol}>{a.symbol}</option>)}
                </select>
            </div>
            
            {locked ? renderLocked() : renderContent()}
        </div>
    );
}
