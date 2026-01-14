import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from './api';

const TF_ORDER = ['15m', '30m', '60m', '240m', '1d'];

// Helper to calculate candle progress (0-100%)
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
    // Find start of current candle block (aligned to Unix epoch)
    const startTimestamp = Math.floor(nowMs / durationMs) * durationMs;
    const elapsed = nowMs - startTimestamp;
    
    return Math.min(100, Math.max(0, (elapsed / durationMs) * 100));
};

export default function Dashboard() {
    const [matrixData, setMatrixData] = useState([]);
    const [historyData, setHistoryData] = useState([]);
    const [matrixStatus, setMatrixStatus] = useState('loading'); 
    const [apiKey, setApiKey] = useState(null);
    // Force re-render every minute to update progress bars
    const [tick, setTick] = useState(0); 
    const navigate = useNavigate();

    useEffect(() => {
        // Update progress bars every minute
        const timer = setInterval(() => setTick(t => t + 1), 60000);
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
                        Live Updates
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
                
                <table className={isMatrixLocked ? 'blurred-content' : ''} style={{ tableLayout: 'fixed' }}>
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
                                        <td key={`${asset}-${tf}`} style={{ padding: 0, height: '50px', border: '1px solid #f0f0f0' }}>
                                            {/* Only render visual bar if there is an active signal */}
                                            {val !== 0 ? (
                                                <div className={cellClass}>
                                                    <div 
                                                        className="progress-fill" 
                                                        style={{ width: `${progress}%` }} 
                                                    />
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

            {/* Methodology & Disclaimer */}
            <div className="disclaimer-box">
                <p><strong>CANDLE PROGRESS:</strong> Colored bars indicate the elapsed time of the current candle signal.</p>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-subtle)' }}>
                    Example: A 30m BUY signal half-filled means 15 minutes have passed in the current 30-minute interval.
                </p>
            </div>

            {/* History Table (Kept Minimalist Black/White per previous request, or can add color if desired. Keeping BW for contrast) */}
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
                                    {/* Simple text for history to distinguish from live "active" bars */}
                                    <span style={{ fontWeight: 'bold' }}>{row.signal}</span>
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
            
            {/* Developer Key */}
            {!isMatrixLocked && apiKey && (
                <div style={{ marginTop: '4rem', paddingTop: '2rem', borderTop: '1px solid var(--border-light)' }}>
                    <h4>Developer Access</h4>
                    <code>{apiKey}</code>
                </div>
            )}
        </div>
    );
}
