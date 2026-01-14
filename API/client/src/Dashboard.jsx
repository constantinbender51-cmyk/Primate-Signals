import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from './api';

const TF_ORDER = ['15m', '30m', '60m', '240m', '1d'];

// Helper: Calculate percentage of candle elapsed (0-100)
const calcProgress = (tf) => {
    const now = new Date();
    const nowMs = now.getTime();
    
    // Convert TF string to minutes
    let minutes = 0;
    if (tf === '15m') minutes = 15;
    else if (tf === '30m') minutes = 30;
    else if (tf === '60m') minutes = 60;
    else if (tf === '240m') minutes = 240;
    else if (tf === '1d') minutes = 1440;
    
    if (minutes === 0) return 0;

    const durationMs = minutes * 60 * 1000;
    // Align to nearest candle block
    const startTimestamp = Math.floor(nowMs / durationMs) * durationMs;
    const elapsed = nowMs - startTimestamp;
    
    return Math.min(100, Math.max(0, (elapsed / durationMs) * 100));
};

export default function Dashboard() {
    const [matrixData, setMatrixData] = useState([]);
    const [historyData, setHistoryData] = useState([]);
    const [matrixStatus, setMatrixStatus] = useState('loading'); 
    const [apiKey, setApiKey] = useState(null);
    // Ticker to update progress bars every minute
    const [tick, setTick] = useState(0); 
    const navigate = useNavigate();

    useEffect(() => {
        const timer = setInterval(() => setTick(t => t + 1), 60000); // Update UI every min
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const historyRes = await api.get('/signal_history');
                setHistoryData(historyRes.data.results);
            } catch (err) {
                console.error(err);
                toast.error("Could not load history");
            }

            try {
                const matrixRes = await api.get('/live_matrix');
                setMatrixData(matrixRes.data.results);
                setMatrixStatus('active');
            } catch (err) {
                if (err.response?.status === 403 || err.response?.status === 401) {
                    setMatrixStatus('unpaid');
                    setMatrixData([]); 
                } else {
                    setMatrixStatus('loading');
                }
            }
            
            const userStr = localStorage.getItem('user');
            if (userStr) {
                const user = JSON.parse(userStr);
                setApiKey(user.api_key);
            }
        };
        fetchData();
    }, [navigate]);

    const { assets, timeframes, grid } = useMemo(() => {
        if (!matrixData.length) return { assets: [], timeframes: TF_ORDER, grid: {} };

        const uniqueAssets = [...new Set(matrixData.map(d => d.asset))].sort();
        const lookup = {};
        uniqueAssets.forEach(asset => {
            lookup[asset] = {};
            TF_ORDER.forEach(tf => {
                const point = matrixData.find(d => d.asset === asset && d.tf === tf);
                lookup[asset][tf] = point ? point.signal_val : 0;
            });
        });
        return { assets: uniqueAssets, timeframes: TF_ORDER, grid: lookup };
    }, [matrixData]);

    const { accuracy } = useMemo(() => {
        let wins = 0, losses = 0;
        historyData.forEach(row => {
            if (row.outcome === 'WIN') wins++;
            else if (row.outcome === 'LOSS') losses++;
        });
        const total = wins + losses;
        return { accuracy: total > 0 ? ((wins / total) * 100).toFixed(2) : 0 };
    }, [historyData]);

    const handleSubscribe = async () => { 
        try {
            const res = await api.post('/create-checkout-session');
            window.location.href = res.data.url;
        } catch (err) { 
            if (!localStorage.getItem('token')) navigate('/login');
            else toast.error("Service Unavailable"); 
        }
    };
    
    const handleManage = async () => { 
        try {
            const res = await api.post('/create-portal-session');
            window.location.href = res.data.url;
        } catch (err) { toast.error("Portal Error"); }
    };

    const isMatrixLocked = matrixStatus === 'unpaid';

    return (
        <div>
            {/* Header */}
            <div style={{ marginBottom: '4rem', marginTop: '2rem' }}>
                <h1 style={{ margin: 0 }}>Market Signals</h1>
                <p style={{ color: 'var(--text-subtle)', marginTop: '0.5rem' }}>Automated Quantitative Analysis</p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '20px' }}>
                <div>
                    <h3>Live Matrix</h3>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-subtle)' }}>
                        Real-time Candle Progress
                    </span>
                </div>
                {!isMatrixLocked && <button className="secondary" onClick={handleManage}>Manage Subscription</button>}
            </div>

            {/* LIVE MATRIX */}
            <div className="table-container" style={{ minHeight: '300px' }}>
                {isMatrixLocked && (
                    <div className="paywall-overlay">
                        <p style={{ marginBottom: '2rem', textTransform: 'uppercase', letterSpacing: '0.2rem' }}>Access Restricted</p>
                        <button onClick={handleSubscribe}>Unlock Matrix</button>
                    </div>
                )}
                
                <table className={isMatrixLocked ? 'blurred-content' : ''}>
                    <thead>
                        <tr>
                            <th style={{ width: '15%' }}>Asset</th>
                            {timeframes.map(tf => <th key={tf} style={{textAlign:'center'}}>{tf}</th>)}
                        </tr>
                    </thead>
                    <tbody>
                        {assets.length > 0 ? assets.map(asset => (
                            <tr key={asset}>
                                <td style={{ fontWeight: '400' }}>{asset}</td>
                                {timeframes.map(tf => {
                                    const val = grid[asset]?.[tf];
                                    const progress = calcProgress(tf);
                                    
                                    let cellClass = 'signal-cell';
                                    let text = '—';
                                    
                                    if (val === 1) {
                                        cellClass += ' is-buy';
                                        text = 'BUY';
                                    } else if (val === -1) {
                                        cellClass += ' is-sell';
                                        text = 'SELL';
                                    }

                                    return (
                                        <td key={`${asset}-${tf}`} style={{ padding: 0, height: '50px', borderBottom: '1px solid var(--border-light)' }}>
                                            {val !== 0 ? (
                                                <div className={cellClass}>
                                                    {/* The Expanding Color Box */}
                                                    <div className="progress-fill" style={{ width: `${progress}%` }} />
                                                    {/* The Text Layer */}
                                                    <span className="signal-text">{text}</span>
                                                </div>
                                            ) : (
                                                <div className="signal-cell">
                                                    <span style={{color: '#ccc'}}>-</span>
                                                </div>
                                            )}
                                        </td>
                                    );
                                })}
                            </tr>
                        )) : (
                            !isMatrixLocked && <tr><td colSpan={timeframes.length + 1} style={{textAlign:'center', padding: '3rem'}}>Waiting for market data...</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Methodology & Legend */}
            <div className="disclaimer-box">
                <p><strong>LEGEND:</strong> Green = Buy, Red = Sell.</p>
                <p style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--text-subtle)' }}>
                    The filled area represents the elapsed time of the current candle (e.g., half-filled box = 50% of the timeframe completed).
                </p>
            </div>

            {/* History Table - Strictly Black & White */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '4rem' }}>
                <h3>Signal History</h3>
                <p>Accuracy: <strong>{accuracy}%</strong></p>
            </div>
            
            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Time (UTC)</th>
                            <th>Asset</th>
                            <th>TF</th>
                            <th>Signal</th>
                            <th>Price</th>
                            <th>Result</th>
                        </tr>
                    </thead>
                    <tbody>
                        {historyData.length > 0 ? historyData.map((row, i) => (
                            <tr key={i}>
                                <td>{row.time_str}</td>
                                <td>{row.asset}</td>
                                <td>{row.tf}</td>
                                <td>
                                    <span style={{ 
                                        fontWeight: 'bold', 
                                        borderBottom: row.signal === 'BUY' ? '1px solid black' : '1px dotted black' // Subtle distinction
                                    }}>
                                        {row.signal}
                                    </span>
                                </td>
                                <td>{row.price_at_signal}</td>
                                <td>{row.outcome}</td>
                            </tr>
                        )) : (
                            <tr><td colSpan="6" style={{textAlign:'center', padding:'3rem'}}>No history recorded</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
            
            {!isMatrixLocked && apiKey && (
                <div style={{ marginTop: '4rem', paddingTop: '2rem', borderTop: '1px solid var(--border-light)' }}>
                    <h4>Developer Access</h4>
                    <code>{apiKey}</code>
                </div>
            )}
        </div>
    );
}
