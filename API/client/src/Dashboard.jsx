import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from './api';

// Fake data for paywall blur
const TEASER_MATRIX = [
    { asset: 'BTCUSDT', tf: '15m', signal_val: 1 },
    { asset: 'ETHUSDT', tf: '15m', signal_val: -1 },
    { asset: 'SOLUSDT', tf: '1d', signal_val: 1 },
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
    const [status, setStatus] = useState('loading');
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
            } catch (err) {
                if (err.response?.status === 403) {
                    setStatus('unpaid');
                    setMatrixData(TEASER_MATRIX);
                } else {
                    toast.error("Please log in to continue");
                    navigate('/login');
                }
            }
        };
        fetchData();
    }, [navigate]);

    // --- Matrix Pivot Logic ---
    const { assets, timeframes, grid } = useMemo(() => {
        if (!matrixData.length) return { assets: [], timeframes: [], grid: {} };
        const uniqueAssets = [...new Set(matrixData.map(d => d.asset))].sort();
        const rawTfs = [...new Set(matrixData.map(d => d.tf))];
        const sortedTfs = rawTfs.sort((a, b) => TF_ORDER.indexOf(a) - TF_ORDER.indexOf(b));

        const lookup = {};
        sortedTfs.forEach(tf => {
            lookup[tf] = {};
            uniqueAssets.forEach(asset => {
                const point = matrixData.find(d => d.asset === asset && d.tf === tf);
                lookup[tf][asset] = point ? point.signal_val : 0;
            });
        });

        return { assets: uniqueAssets, timeframes: sortedTfs, grid: lookup };
    }, [matrixData]);

    const handleSubscribe = async () => { 
        try {
            const res = await api.post('/create-checkout-session');
            window.location.href = res.data.url;
        } catch (err) { toast.error("Payment Error"); }
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h1>Live Matrix</h1>
                {!isLocked && <button className="secondary" onClick={handleManage}>Manage Subscription</button>}
            </div>

            {/* --- 1. LIVE MATRIX --- */}
            <div className="table-container" style={{ marginBottom: '3rem' }}>
                {isLocked && (
                    <div className="paywall-overlay">
                        <h2>Subscription Required</h2>
                        <button onClick={handleSubscribe}>Unlock Now</button>
                    </div>
                )}
                <table className={isLocked ? 'blurred-content' : ''}>
                    <thead>
                        <tr>
                            <th>Timeframe</th>
                            {assets.map(asset => <th key={asset} style={{textAlign:'center'}}>{asset}</th>)}
                        </tr>
                    </thead>
                    <tbody>
                        {timeframes.map(tf => (
                            <tr key={tf}>
                                <td style={{ fontWeight: 'bold', color: '#64748b' }}>{tf}</td>
                                {assets.map(asset => {
                                    const val = grid[tf][asset];
                                    const ui = getSignalUI(val);
                                    return (
                                        <td key={`${tf}-${asset}`} style={{ textAlign: 'center' }}>
                                            <span className={ui.className}>{ui.text}</span>
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* --- 2. SIGNAL HISTORY --- */}
            <h2>Signal History</h2>
            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Time</th>
                            <th>Symbol</th>
                            <th>TF</th>
                            <th>Action</th>
                            <th>Entry</th>
                            <th>Exit</th>
                            <th>Result</th>
                        </tr>
                    </thead>
                    <tbody>
                        {historyData.length > 0 ? historyData.map((row, i) => (
                            <tr key={i}>
                                {/* row[1] is the time string "2026-01-13 12:00" based on your sample */}
                                <td>{row.time ? row.time : new Date().toLocaleTimeString()}</td>
                                <td><b>{row.symbol}</b></td>
                                <td>{row.tf}</td>
                                <td>
                                    <span className={`badge ${row.action === 'BUY' ? 'badge-buy' : 'badge-sell'}`}>
                                        {row.action}
                                    </span>
                                </td>
                                <td>{row.entry}</td>
                                <td>{row.exit}</td>
                                <td>
                                    <span style={{ 
                                        fontWeight: 'bold', 
                                        color: row.result === 'WIN' ? 'var(--success)' : 
                                               row.result === 'LOSS' ? 'var(--danger)' : '#64748b' 
                                    }}>
                                        {row.result}
                                    </span>
                                </td>
                            </tr>
                        )) : (
                            <tr><td colSpan="7" style={{textAlign:'center', padding:'2rem'}}>No history found</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
