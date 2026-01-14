import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from './api';

// --- 1. MOCK DATA (TEASERS) ---
const TEASER_MATRIX = [
    { asset: 'BTCUSDT', tf: '15m', signal_val: 1 },
    { asset: 'ETHUSDT', tf: '15m', signal_val: -1 },
    { asset: 'SOLUSDT', tf: '1d', signal_val: 1 },
    { asset: 'DOGEUSDT', tf: '60m', signal_val: -1 },
];

const TEASER_HISTORY = [
    { id: 7593, time_str: '2026-01-14 15:00', asset: 'DOGEUSDT', tf: '60m', signal: 'SELL', price_at_signal: 0.14838, outcome: 'NOISE', close_price: 0.14899 },
    { id: 7594, time_str: '2026-01-14 14:00', asset: 'XRPUSDT', tf: '60m', signal: 'BUY', price_at_signal: 2.116, outcome: 'WIN', close_price: 2.1598 },
    { id: 7595, time_str: '2026-01-14 12:00', asset: 'BNBUSDT', tf: '240m', signal: 'BUY', price_at_signal: 928.79, outcome: 'WIN', close_price: 942.03 },
    { id: 7596, time_str: '2026-01-14 11:00', asset: 'SOLUSDT', tf: '30m', signal: 'BUY', price_at_signal: 144.74, outcome: 'NOISE', close_price: 144.08 },
];

const getSignalUI = (val) => {
    if (val === 1) return { text: 'BUY', className: 'badge badge-buy' };
    if (val === -1) return { text: 'SELL', className: 'badge badge-sell' };
    return { text: '-', className: '' };
};

const TF_ORDER = ['15m', '30m', '60m', '240m', '1d'];

export default function Dashboard() {
    const [matrixData, setMatrixData] = useState([]);
    const [historyData, setHistoryData] = useState([]);
    const [status, setStatus] = useState('loading'); // loading | active | unpaid
    const [apiKey, setApiKey] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [matrixRes, historyRes] = await Promise.all([
                    api.get('/live_matrix'),
                    api.get('/signal_history')
                ]);
                setMatrixData(matrixRes.data.results);
                setHistoryData(historyRes.data.results);
                setStatus('active');
                
                // Get User Info for API Key
                const userStr = localStorage.getItem('user');
                if (userStr) {
                    const user = JSON.parse(userStr);
                    setApiKey(user.api_key);
                }

            } catch (err) {
                // If 403 (Unpaid) or 401 (Not logged in), show TEASER
                if (err.response?.status === 403 || err.response?.status === 401) {
                    setStatus('unpaid');
                    setMatrixData(TEASER_MATRIX);
                    setHistoryData(TEASER_HISTORY); // <--- FIX: Fetch/Set Teaser History
                } else {
                    toast.error("Network Error");
                }
            }
        };
        fetchData();
    }, [navigate]);

    // --- Matrix Pivot Logic (Rows = Assets, Cols = TFs) ---
    const { assets, timeframes, grid } = useMemo(() => {
        // If loading or empty
        if (!matrixData.length) {
             // Fallback to show structure even if empty
             return { assets: ['BTCUSDT', 'ETHUSDT'], timeframes: TF_ORDER, grid: { 'BTCUSDT': {}, 'ETHUSDT': {} } };
        }

        const uniqueAssets = [...new Set(matrixData.map(d => d.asset))].sort();
        // Use predefined TF_ORDER to ensure columns are always in correct logic order
        const usedTfs = [...new Set(matrixData.map(d => d.tf))];
        const sortedTfs = TF_ORDER.filter(tf => usedTfs.includes(tf) || true); // Keep all TFs for structure

        const lookup = {};
        uniqueAssets.forEach(asset => {
            lookup[asset] = {};
            sortedTfs.forEach(tf => {
                const point = matrixData.find(d => d.asset === asset && d.tf === tf);
                lookup[asset][tf] = point ? point.signal_val : 0;
            });
        });

        return { assets: uniqueAssets, timeframes: TF_ORDER, grid: lookup };
    }, [matrixData]);

    const handleSubscribe = async () => { 
        try {
            const res = await api.post('/create-checkout-session');
            window.location.href = res.data.url;
        } catch (err) { 
            // If they aren't logged in, send to login first
            if(status === 'unpaid' && !localStorage.getItem('token')) {
                navigate('/login');
            } else {
                toast.error("Payment Error"); 
            }
        }
    };
    
    const handleManage = async () => { 
        try {
            const res = await api.post('/create-portal-session');
            window.location.href = res.data.url;
        } catch (err) { toast.error("Portal Error"); }
    };

    if (status === 'loading') return <div style={{ textAlign: 'center', marginTop: '50px' }}>Loading Data...</div>;

    const isLocked = status === 'unpaid';

    return (
        <div>
            {/* --- WELCOME HEADER --- */}
            <div style={{ textAlign: 'center', marginBottom: '3rem', marginTop: '2rem' }}>
                <h1 style={{ fontSize: '3rem', marginBottom: '0.5rem', color: 'var(--primary)' }}>Primate</h1>
                <h2 style={{ fontSize: '1.5rem', color: '#64748b', fontWeight: '400', marginTop: 0 }}>Trading signals</h2>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3>Live Matrix</h3>
                {!isLocked && <button className="secondary" onClick={handleManage}>Manage Subscription</button>}
            </div>

            {/* --- 1. LIVE MATRIX (Transposed) --- */}
            <div className="table-container" style={{ marginBottom: '1rem' }}>
                {isLocked && (
                    <div className="paywall-overlay">
                        <h2>Subscription Required</h2>
                        <button onClick={handleSubscribe}>Get Access</button>
                    </div>
                )}
                <table className={isLocked ? 'blurred-content' : ''}>
                    <thead>
                        <tr>
                            <th>Asset</th>
                            {timeframes.map(tf => <th key={tf} style={{textAlign:'center'}}>{tf}</th>)}
                        </tr>
                    </thead>
                    <tbody>
                        {assets.map(asset => (
                            <tr key={asset}>
                                <td style={{ fontWeight: 'bold' }}>{asset}</td>
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
                        ))}
                    </tbody>
                </table>
            </div>

            {/* --- EXPLANATION --- */}
            <div style={{ marginBottom: '3rem', padding: '1rem', background: '#f8fafc', borderRadius: '8px', fontSize: '0.9rem', color: '#64748b' }}>
                <p><strong>How to read:</strong> The matrix above shows real-time trend signals across multiple timeframes. Green (BUY) indicates a bullish trend, while Red (SELL) indicates bearish momentum. Use confluence across timeframes for higher probability entries.</p>
            </div>

            {/* --- 2. SIGNAL HISTORY --- */}
            <h3>Signal History</h3>
            <div className="table-container">
                 {isLocked && (
                    <div className="paywall-overlay">
                        {/* Reuse Paywall or allow partial view? Assuming blocked for consistency */}
                         <h2>Subscription Required</h2>
                        <button onClick={handleSubscribe}>Get Access</button>
                    </div>
                )}
                <table className={isLocked ? 'blurred-content' : ''}>
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
                                <td><b>{row.asset}</b></td>
                                <td>{row.tf}</td>
                                <td>
                                    <span className={`badge ${row.signal === 'BUY' ? 'badge-buy' : 'badge-sell'}`}>
                                        {row.signal}
                                    </span>
                                </td>
                                <td>{row.price_at_signal}</td>
                                <td>
                                    <span style={{ 
                                        fontWeight: 'bold', 
                                        color: row.outcome === 'WIN' ? 'var(--success)' : 
                                               row.outcome === 'LOSS' ? 'var(--danger)' : '#64748b' 
                                    }}>
                                        {row.outcome}
                                    </span>
                                </td>
                            </tr>
                        )) : (
                            <tr><td colSpan="6" style={{textAlign:'center', padding:'2rem'}}>No history found</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* --- 3. API KEY DISPLAY (Only if Active) --- */}
            {!isLocked && apiKey && (
                <div style={{ marginTop: '3rem', padding: '1rem', border: '1px solid var(--border)', borderRadius: '8px' }}>
                    <h3>Your API Key</h3>
                    <p style={{ fontSize: '0.9rem', color: '#64748b' }}>Use this key to access the raw JSON data programmatically.</p>
                    <code style={{ background: '#eee', padding: '0.5rem', borderRadius: '4px', display: 'block', overflowX: 'auto' }}>
                        {apiKey}
                    </code>
                </div>
            )}
        </div>
    );
}
