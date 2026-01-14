import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from './api';

const getSignalUI = (val) => {
    if (val === 1) return { text: 'BUY', className: 'badge badge-buy' };
    if (val === -1) return { text: 'SELL', className: 'badge badge-sell' };
    return { text: '-', className: '' };
};

const TF_ORDER = ['15m', '30m', '60m', '240m', '1d'];

export default function Dashboard() {
    const [matrixData, setMatrixData] = useState([]);
    const [historyData, setHistoryData] = useState([]);
    const [status, setStatus] = useState('loading'); // loading | active | unpaid | error
    const [apiKey, setApiKey] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch both endpoints
                const [matrixRes, historyRes] = await Promise.all([
                    api.get('/live_matrix'),
                    api.get('/signal_history')
                ]);

                setMatrixData(matrixRes.data.results);
                setHistoryData(historyRes.data.results);
                setStatus('active');
                
                // Get User Info for API Key display
                const userStr = localStorage.getItem('user');
                if (userStr) {
                    const user = JSON.parse(userStr);
                    setApiKey(user.api_key);
                }

            } catch (err) {
                console.error(err);
                // Handle Access Denied (Unpaid or Not Logged In)
                if (err.response?.status === 403 || err.response?.status === 401) {
                    setStatus('unpaid');
                    setMatrixData([]); // Ensure data is empty
                    setHistoryData([]); // Ensure data is empty
                } 
                // Handle Actual Errors (Server down, Network issues)
                else {
                    setStatus('error');
                    toast.error("Failed to retrieve data");
                }
            }
        };
        fetchData();
    }, [navigate]);

    // --- Matrix Pivot Logic (Rows = Assets, Cols = TFs) ---
    const { assets, timeframes, grid } = useMemo(() => {
        if (!matrixData.length) {
             // Return structure for headers, but empty rows
             return { assets: [], timeframes: TF_ORDER, grid: {} };
        }

        const uniqueAssets = [...new Set(matrixData.map(d => d.asset))].sort();
        const usedTfs = [...new Set(matrixData.map(d => d.tf))];
        const sortedTfs = TF_ORDER.filter(tf => usedTfs.includes(tf) || true); 

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
            // If strictly unpaid/unauth, redirect to login might be safer if no user token exists
            if (!localStorage.getItem('token')) {
                navigate('/login');
            } else {
                toast.error("Payment Service Unavailable"); 
            }
        }
    };
    
    const handleManage = async () => { 
        try {
            const res = await api.post('/create-portal-session');
            window.location.href = res.data.url;
        } catch (err) { toast.error("Portal Error"); }
    };

    // --- RENDER STATES ---

    if (status === 'loading') {
        return <div style={{ textAlign: 'center', marginTop: '50px' }}>Loading Data...</div>;
    }

    if (status === 'error') {
        return (
            <div style={{ textAlign: 'center', marginTop: '50px', color: 'var(--danger)' }}>
                <h2>Error Loading Data</h2>
                <p>Unable to retrieve signals. Please check your connection or try again later.</p>
                <button className="secondary" onClick={() => window.location.reload()}>Retry</button>
            </div>
        );
    }

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

            {/* --- 1. LIVE MATRIX --- */}
            <div className="table-container" style={{ marginBottom: '1rem', minHeight: '250px' }}>
                {isLocked && (
                    <div className="paywall-overlay">
                        <h2>Subscription Required</h2>
                        {/* UPDATE 1: Button text change */}
                        <button onClick={handleSubscribe}>Try for free</button>
                    </div>
                )}
                <table>
                    <thead>
                        <tr>
                            <th>Asset</th>
                            {timeframes.map(tf => <th key={tf} style={{textAlign:'center'}}>{tf}</th>)}
                        </tr>
                    </thead>
                    <tbody>
                        {assets.length > 0 ? assets.map(asset => (
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
                        )) : (
                            !isLocked && <tr><td colSpan={timeframes.length + 1} style={{textAlign:'center'}}>No live signals available</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* --- EXPLANATION --- */}
            <div style={{ marginBottom: '3rem', padding: '1rem', background: '#f8fafc', borderRadius: '8px', fontSize: '0.9rem', color: '#64748b' }}>
                <p><strong>How to read:</strong> The matrix above shows real-time trend signals across multiple timeframes. Green (BUY) indicates a bullish trend, while Red (SELL) indicates bearish momentum. Use confluence across timeframes for higher probability entries.</p>
            </div>

            {/* --- 2. SIGNAL HISTORY --- */}
            <h3>Signal History</h3>
            <div className="table-container" style={{ minHeight: '250px' }}>
                 {isLocked && (
                    <div className="paywall-overlay">
                        <h2>Subscription Required</h2>
                        {/* UPDATE 2: Button text change */}
                        <button onClick={handleSubscribe}>Try for free</button>
                    </div>
                )}
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
                            !isLocked && <tr><td colSpan="6" style={{textAlign:'center', padding:'2rem'}}>No history found</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* --- 3. API KEY DISPLAY (Only if Active & Key Exists) --- */}
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
