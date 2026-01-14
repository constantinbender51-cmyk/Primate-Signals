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
    
    // Status now only controls the MATRIX lock state
    const [matrixStatus, setMatrixStatus] = useState('loading'); // loading | active | unpaid
    const [apiKey, setApiKey] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchData = async () => {
            // 1. Fetch History (Public - Always runs)
            try {
                const historyRes = await api.get('/signal_history');
                setHistoryData(historyRes.data.results);
            } catch (err) {
                console.error("History fetch failed", err);
                toast.error("Could not load history");
            }

            // 2. Fetch Matrix (Private - Might fail if unpaid)
            try {
                const matrixRes = await api.get('/live_matrix');
                setMatrixData(matrixRes.data.results);
                setMatrixStatus('active');
            } catch (err) {
                if (err.response?.status === 403 || err.response?.status === 401) {
                    setMatrixStatus('unpaid');
                    setMatrixData([]); 
                } else {
                    // Only show error if it's NOT an auth issue (e.g. server down)
                    console.error(err);
                    setMatrixStatus('loading'); // Keep loading or show error state
                }
            }
            
            // 3. Get User Info (if logged in)
            const userStr = localStorage.getItem('user');
            if (userStr) {
                const user = JSON.parse(userStr);
                setApiKey(user.api_key);
            }
        };

        fetchData();
    }, [navigate]);

    // --- Matrix Pivot Logic ---
    const { assets, timeframes, grid } = useMemo(() => {
        if (!matrixData.length) {
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

    // --- History Metrics Logic ---
    const { totalWins, totalLosses, accuracy } = useMemo(() => {
        let wins = 0;
        let losses = 0;
        historyData.forEach(row => {
            if (row.outcome === 'WIN') {
                wins++;
            } else if (row.outcome === 'LOSS') {
                losses++;
            }
        });
        const totalSignals = wins + losses;
        const calculatedAccuracy = totalSignals > 0 ? ((wins / totalSignals) * 100).toFixed(2) : 0;
        return { totalWins: wins, totalLosses: losses, accuracy: calculatedAccuracy };
    }, [historyData]); // Recalculate when historyData changes

    const handleSubscribe = async () => { 
        try {
            const res = await api.post('/create-checkout-session');
            window.location.href = res.data.url;
        } catch (err) { 
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

    const isMatrixLocked = matrixStatus === 'unpaid';

    return (
        <div>
            {/* --- WELCOME HEADER --- */}
            <div style={{ textAlign: 'center', marginBottom: '3rem', marginTop: '2rem' }}>
                <h1 style={{ fontSize: '3rem', marginBottom: '0.5rem', color: 'var(--primary)' }}>Trading signals</h1>
            </div>

            <div style={{ fontSize: '1rem', color: '#64748b', marginBottom: '1rem', textAlign: 'left', border: '1px solid #94a3b8', padding: '0.5rem', borderRadius: '4px' }}>
                ⚠️ Educational Use Only: These signals are strictly for informational purposes. They are not instructions to trade. Always verify market conditions before executing any transaction.
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3>Live Matrix updated: {matrixData.length > 0 ? new Date(matrixData[0].updated_at).toLocaleString() : '-'}</h3>
                {!isMatrixLocked && <button className="secondary" onClick={handleManage}>Manage Subscription</button>}
            </div>

            {/* --- 1. LIVE MATRIX (Paywalled) --- */}
            <div className="table-container" style={{ marginBottom: '1rem', minHeight: '250px' }}>
                {isMatrixLocked && (
                    <div className="paywall-overlay">
                        <p style={{marginBottom: '1rem', fontSize: '1.1rem', fontWeight: 'bold'}}>Subscription required</p>
                        <button onClick={handleSubscribe}>Try for free</button>
                    </div>
                )}
                {/* Add blurry class if locked */}
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
                            // Only show "No signals" if NOT locked (otherwise the overlay covers it)
                            !isMatrixLocked && <tr><td colSpan={timeframes.length + 2} style={{textAlign:'center'}}>No live signals available</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* --- DISCLAIMER --- */}
            <div style={{ marginBottom: '1rem', fontSize: '0.75rem', color: '#64748b', textAlign: 'left' }}>
                <p>Disclaimer: These results are based on simulated performance (backtests) and do not represent actual trading. Past performance is not indicative of future results. Market conditions can change, and the algorithm may not perform as it did in the past.</p>
            </div>

            {/* --- EXPLANATION --- */}
            <div style={{ marginBottom: '3rem', padding: '1rem', background: '#f8fafc', borderRadius: '8px', fontSize: '1.4rem', color: '#64748b' }}>
                <p><strong>Pricing:</strong> 49.90€/month</p>
                <p><strong>How the Algorithm Works (Methodology)</strong></p>
                <p>Our signals are generated by a proprietary quantitative model that analyzes Price Action and Volume across 4-hour charts.</p>
                <p>The model identifies potential Trend Reversal opportunities based on statistical probability. It looks for specific conditions in Momentum Oscillators and Volatility to generate a "Buy," "Sell," or "Wait" signal.</p>
                <p>Note: This process is fully automated and does not involve human intervention or subjective opinion.</p>
            </div>

            {/* --- NEW: Accuracy Metrics Display --- */}
            <p style={{marginBottom: '3rem', textAlign: 'left'}}>
                Accuracy: <span style={{fontWeight: 'bold', color: accuracy >= 50 ? 'var(--success)' : 'var(--danger)'}}>{accuracy}%</span>
            </p>

            {/* --- 2. SIGNAL HISTORY (Public / Always Visible) --- */}
            <h3>7 day signal history</h3>
            <div className="table-container" style={{ minHeight: '250px' }}>
                {/* REMOVED PAYWALL OVERLAY FROM HERE */}
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
                            <tr><td colSpan="6" style={{textAlign:'center', padding:'2rem'}}>No history found</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* --- 3. API KEY DISPLAY (Only if Active & Key Exists) --- */}
            {!isMatrixLocked && apiKey && (
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
