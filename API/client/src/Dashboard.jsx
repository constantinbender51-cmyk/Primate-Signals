import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from './api';

const getSignalUI = (val) => {
    // These classes now map to Green (buy) and Red (sell) in your new CSS
    if (val === 1) return { text: 'BUY', className: 'badge badge-buy' };
    if (val === -1) return { text: 'SELL', className: 'badge badge-sell' };
    return { text: '—', className: '' };
};

const TF_ORDER = ['15m', '30m', '60m', '240m', '1d'];

export default function Dashboard() {
    const [matrixData, setMatrixData] = useState([]);
    const [historyData, setHistoryData] = useState([]);
    const [matrixStatus, setMatrixStatus] = useState('loading'); 
    const [apiKey, setApiKey] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const historyRes = await api.get('/signal_history');
                setHistoryData(historyRes.data.results);
            } catch (err) {
                console.error("History fetch failed", err);
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
                    console.error(err);
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
        let wins = 0;
        let losses = 0;
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
            else toast.error("Payment Service Unavailable");
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
            {/* --- HEADER --- */}
            <div style={{ marginBottom: '4rem', marginTop: '2rem' }}>
                <h1 style={{ margin: 0 }}>Market Signals</h1>
                <p style={{ color: 'var(--text-subtle)', marginTop: '0.5rem' }}>Automated Quantitative Analysis</p>
            </div>

            {/* --- EDUCATIONAL BANNER --- */}
            <div style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: '1rem', marginBottom: '3rem', fontSize: '0.85rem', color: 'var(--text-subtle)' }}>
                [NOTE] Educational Use Only. These signals are strictly for informational purposes. Verify all market conditions.
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '20px' }}>
                <div>
                    <h3>Live Matrix</h3>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-subtle)' }}>
                        Last Update: {matrixData.length > 0 ? new Date(matrixData[0].updated_at).toLocaleTimeString() : '-'}
                    </span>
                </div>
                {!isMatrixLocked && <button className="secondary" onClick={handleManage}>Manage Subscription</button>}
            </div>

            {/* --- LIVE MATRIX --- */}
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
                            <th>Asset</th>
                            {timeframes.map(tf => <th key={tf} style={{textAlign:'center'}}>{tf}</th>)}
                        </tr>
                    </thead>
                    <tbody>
                        {assets.length > 0 ? assets.map(asset => (
                            <tr key={asset}>
                                <td style={{ fontWeight: '400' }}>{asset}</td>
                                {timeframes.map(tf => {
                                    const val = grid[asset]?.[tf];
                                    const ui = getSignalUI(val);
                                    return (
                                        <td key={`${asset}-${tf}`} style={{ textAlign: 'center' }}>
                                            <span className={ui.className}>{ui.text}</span>
                                        </td>
                                    );
                                })}
                            </tr>
                        )) : (
                            !isMatrixLocked && <tr><td colSpan={timeframes.length + 2} style={{textAlign:'center', padding: '3rem'}}>Waiting for market data...</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* --- METHODOLOGY --- */}
            <div>
                <p style={{ marginTop: 0 }}><strong>PRICING:</strong> 49.90€ / MO</p>
                <br />
                <p><strong>METHODOLOGY</strong></p>
                <p style={{ color: 'var(--text-subtle)' }}>
                    The signals are generated by a markov model trained on historical data.
                    A signal is active for one 15m, 30m, 1h, 4h or 1d candle. Get in when the signal begins, get out when it disappears.
                </p>
                <br />
                <p style={{fontSize: '0.8rem'}}>
                    DISCLAIMER: Results based on simulated backtests.
                    Past performance does not guarantee future results.
                </p>
            </div>

            {/* --- HISTORY --- */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
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
                                    <span className={row.signal === 'BUY' ? 'badge badge-buy' : 'badge badge-sell'}>
                                        {row.signal}
                                    </span>
                                </td>
                                <td>{row.price_at_signal}</td>
                                <td>
                                    {/* UPDATED: Uses Green/Red colors instead of Strikethrough */}
                                    <span style={{ 
                                        fontWeight: 'bold',
                                        color: row.outcome === 'WIN' ? 'var(--color-green)' : (row.outcome === 'LOSS' ? 'var(--color-red)' : 'inherit')
                                    }}>
                                        {row.outcome}
                                    </span>
                                </td>
                            </tr>
                        )) : (
                            <tr><td colSpan="6" style={{textAlign:'center', padding:'3rem'}}>No history recorded</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* --- API KEY --- */}
            {!isMatrixLocked && apiKey && (
                <div style={{ marginTop: '4rem', paddingTop: '2rem', borderTop: '1px solid var(--border-light)' }}>
                    <h4>Developer Access</h4>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-subtle)', marginBottom: '1rem' }}>Raw JSON Feed Key</p>
                    <code>{apiKey}</code>
                </div>
            )}
        </div>
    );
}
