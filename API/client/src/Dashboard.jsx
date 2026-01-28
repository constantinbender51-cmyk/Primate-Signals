import React, { useEffect, useState } from 'react';
import LandingPage from './LandingPage';
import api from './api';
import toast from 'react-hot-toast';

export default function Dashboard() {
    const token = localStorage.getItem('token');
    
    // Data State
    const [historyData, setHistoryData] = useState(null);
    const [signalData, setSignalData] = useState(null);
    const [paramsData, setParamsData] = useState(null);
    
    // UI State
    const [loading, setLoading] = useState(true);
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [expandedRow, setExpandedRow] = useState(null);

    // If not logged in, show Landing Page immediately
    if (!token) return <LandingPage />;

    // 1. Fetch Public History (Base Data)
    const fetchHistory = async () => {
        try {
            const res = await api.get('/api/spearhead/history');
            setHistoryData(res.data);
        } catch (err) {
            console.error("History fetch error:", err);
            toast.error("Failed to load historical data.");
        }
    };

    // 2. Fetch Protected Signals (Live Data)
    const fetchSignals = async () => {
        try {
            const res = await api.get('/api/spearhead/signals');
            setSignalData(res.data);
            setIsSubscribed(true); // If this succeeds, user is subscribed
        } catch (err) {
            if (err.response && err.response.status === 403) {
                setIsSubscribed(false);
                setSignalData(null);
            }
        }
    };

    // 3. Fetch Grid Parameters (For detail view)
    const fetchParams = async () => {
        try {
            const res = await api.get('/api/spearhead/parameters');
            setParamsData(res.data);
        } catch (err) {
            // Ignore auth errors here, handled by signal fetch
        }
    };

    useEffect(() => {
        const init = async () => {
            setLoading(true);
            await fetchHistory();
            await fetchSignals();
            if (token) await fetchParams();
            setLoading(false);
        };

        init();
        
        // Polling: History rarely changes, Signals change often
        const signalInterval = setInterval(fetchSignals, 5000); 
        const historyInterval = setInterval(fetchHistory, 60000);
        
        return () => {
            clearInterval(signalInterval);
            clearInterval(historyInterval);
        };
    }, [token]);

    const handleSubscribe = async () => {
        try {
            const res = await api.post('/create-checkout-session');
            window.location.href = res.data.url;
        } catch (err) {
            toast.error("Checkout unavailable");
        }
    };

    const toggleRow = (symbol) => {
        if (!isSubscribed) return;
        setExpandedRow(expandedRow === symbol ? null : symbol);
    };

    // --- RENDERERS ---

    const renderGridVisual = (symbol) => {
        if (!paramsData || !paramsData[symbol] || !signalData || !signalData[symbol]) return null;
        
        const params = paramsData[symbol];
        const signal = signalData[symbol];
        const lines = params.line_prices || [];
        const currentPrice = signal.current_price;

        // Contextual Slice of Grid
        const relevantLines = lines.filter(l => Math.abs(l - currentPrice) / currentPrice < 0.05); // +/- 5%

        return (
            <div style={{ padding: '20px', background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
                <h4 style={{ fontSize: '14px', textTransform: 'uppercase', color: '#64748b', marginBottom: '15px' }}>
                    Live Neural Grid ({symbol})
                </h4>
                <div style={{ display: 'flex', gap: '20px', fontSize: '13px' }}>
                    <div style={{ flex: 1 }}>
                        <div style={{ marginBottom: '8px' }}><strong>Strategy Config:</strong></div>
                        <div>Dyn Stop Loss: <span style={{ color: '#ef4444' }}>{(params.stop_percent * 100).toFixed(2)}%</span></div>
                        <div>Dyn Take Profit: <span style={{ color: '#10b981' }}>{(params.profit_percent * 100).toFixed(2)}%</span></div>
                    </div>
                    <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '150px', overflowY: 'auto' }}>
                        {relevantLines.map((price, i) => (
                            <div key={i} style={{ 
                                display: 'flex', justifyContent: 'space-between', 
                                padding: '4px 8px', borderRadius: '4px',
                                background: Math.abs(price - currentPrice) < (currentPrice * 0.001) ? '#dbeafe' : '#fff',
                                border: '1px solid #e2e8f0'
                            }}>
                                <span>Level {i}</span>
                                <span style={{ fontFamily: 'monospace' }}>${price.toFixed(4)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    };

    const renderTable = () => {
        if (!historyData) return <div style={{ textAlign: 'center', padding: '40px' }}>Loading Spearhead Engine...</div>;

        const symbols = Object.keys(historyData).sort();

        return (
            <div style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }}>
                            <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', color: '#64748b' }}>ASSET</th>
                            <th style={{ padding: '16px', textAlign: 'right', fontSize: '12px', color: '#64748b' }}>TOTAL TRADES</th>
                            <th style={{ padding: '16px', textAlign: 'right', fontSize: '12px', color: '#64748b' }}>NET PNL (HIST)</th>
                            <th style={{ padding: '16px', textAlign: 'center', fontSize: '12px', color: '#64748b' }}>LIVE SIGNAL</th>
                            <th style={{ padding: '16px', textAlign: 'right', fontSize: '12px', color: '#64748b' }}>LIVE EQUITY</th>
                            <th style={{ padding: '16px', width: '40px' }}></th>
                        </tr>
                    </thead>
                    <tbody>
                        {symbols.map(sym => {
                            const hist = historyData[sym];
                            const sig = signalData ? signalData[sym] : null;
                            const isLocked = !isSubscribed || !sig;

                            // Historical Color
                            const histColor = hist.net_pnl_pct >= 0 ? '#10b981' : '#ef4444';

                            // Live Signal Badge
                            let signalBadge = <span style={{ fontSize: '12px', color: '#94a3b8' }}>Waiting...</span>;
                            if (isLocked) {
                                signalBadge = <span style={{ fontSize: '12px', color: '#64748b', background: '#e2e8f0', padding: '4px 8px', borderRadius: '12px' }}>🔒 Locked</span>;
                            } else if (sig) {
                                const bg = sig.position_int === 1 ? '#dcfce7' : (sig.position_int === -1 ? '#fee2e2' : '#f1f5f9');
                                const col = sig.position_int === 1 ? '#166534' : (sig.position_int === -1 ? '#991b1b' : '#64748b');
                                signalBadge = (
                                    <span style={{ fontSize: '11px', fontWeight: '700', background: bg, color: col, padding: '4px 10px', borderRadius: '12px', display: 'inline-block', minWidth: '60px' }}>
                                        {sig.position}
                                    </span>
                                );
                            }

                            // Live PnL
                            let livePnL = <span style={{ color: '#cbd5e1' }}>---</span>;
                            if (!isLocked && sig) {
                                const val = sig.unrealized_pnl_pct * 100;
                                livePnL = (
                                    <span style={{ color: val >= 0 ? '#10b981' : '#ef4444', fontWeight: '600' }}>
                                        {val > 0 ? '+' : ''}{val.toFixed(2)}%
                                    </span>
                                );
                            }

                            return (
                                <React.Fragment key={sym}>
                                    <tr 
                                        onClick={() => toggleRow(sym)}
                                        style={{ 
                                            borderBottom: '1px solid #f1f5f9', 
                                            cursor: isSubscribed ? 'pointer' : 'default',
                                            transition: 'background 0.2s'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = '#fff'}
                                    >
                                        <td style={{ padding: '16px', fontWeight: '700', color: '#1e293b' }}>{sym}</td>
                                        <td style={{ padding: '16px', textAlign: 'right', fontFamily: 'monospace' }}>{hist.total_trades}</td>
                                        <td style={{ padding: '16px', textAlign: 'right', fontWeight: '600', color: histColor }}>
                                            {(hist.net_pnl_pct * 100).toFixed(2)}%
                                        </td>
                                        <td style={{ padding: '16px', textAlign: 'center' }}>{signalBadge}</td>
                                        <td style={{ padding: '16px', textAlign: 'right' }}>{livePnL}</td>
                                        <td style={{ padding: '16px', textAlign: 'center', color: '#94a3b8' }}>
                                            {isSubscribed && (expandedRow === sym ? '▲' : '▼')}
                                        </td>
                                    </tr>
                                    {expandedRow === sym && (
                                        <tr>
                                            <td colspan="6" style={{ padding: 0 }}>
                                                {renderGridVisual(sym)}
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '80px' }}>
            <div style={{ marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                    <h1 style={{ margin: '0 0 8px 0', fontSize: '1.8rem', color: '#0f172a' }}>Spearhead Control Center</h1>
                    <p style={{ margin: 0, color: '#64748b' }}>Multi-Asset Binomial Grid Execution.</p>
                </div>
                {!isSubscribed && (
                    <button 
                        onClick={handleSubscribe}
                        style={{ background: '#2563eb', padding: '10px 20px', boxShadow: '0 4px 6px -2px rgba(37, 99, 235, 0.3)' }}
                    >
                        Unlock Live Signals
                    </button>
                )}
            </div>

            {!isSubscribed && !loading && (
                <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', padding: '12px 20px', borderRadius: '8px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '20px' }}>🔒</span>
                    <div style={{ fontSize: '14px', color: '#9a3412' }}>
                        <strong>View Only Mode:</strong> You are viewing public historical data. Subscribe to see live positions and entry targets.
                    </div>
                </div>
            )}

            {renderTable()}
        </div>
    );
}