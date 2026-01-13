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

// Helper to map numeric signals to UI
const getSignalUI = (val) => {
    if (val === 1) return { text: 'BUY', className: 'badge badge-buy' };
    if (val === -1) return { text: 'SELL', className: 'badge badge-sell' };
    return { text: '-', className: '' }; // 0 or unknown
};

// Custom sort order for timeframes
const TF_ORDER = ['15m', '30m', '60m', '240m', '1d'];

export default function Dashboard() {
    const [matrixData, setMatrixData] = useState([]);
    const [historyData, setHistoryData] = useState([]);
    const [status, setStatus] = useState('loading'); // loading | active | unpaid
    const navigate = useNavigate();

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch both Live Matrix and History
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

    // --- Transform Flat Data into Matrix Grid ---
    const { assets, timeframes, grid } = useMemo(() => {
        if (!matrixData.length) return { assets: [], timeframes: [], grid: {} };

        // 1. Get unique assets (Columns)
        const uniqueAssets = [...new Set(matrixData.map(d => d.asset))].sort();

        // 2. Get unique timeframes (Rows) and sort them by custom logic
        const rawTfs = [...new Set(matrixData.map(d => d.tf))];
        const sortedTfs = rawTfs.sort((a, b) => {
            return TF_ORDER.indexOf(a) - TF_ORDER.indexOf(b);
        });

        // 3. Build Lookup Table: grid[timeframe][asset] = signal_val
        const lookup = {};
        sortedTfs.forEach(tf => {
            lookup[tf] = {};
            uniqueAssets.forEach(asset => {
                // Find the data point for this specific Cell
                const point = matrixData.find(d => d.asset === asset && d.tf === tf);
                lookup[tf][asset] = point ? point.signal_val : 0;
            });
        });

        return { assets: uniqueAssets, timeframes: sortedTfs, grid: lookup };
    }, [matrixData]);

    const handleSubscribe = async () => { /* ... existing stripe logic ... */ };
    const handleManage = async () => { /* ... existing portal logic ... */ };

    if (status === 'loading') return <div style={{ textAlign: 'center', marginTop: '50px' }}>Loading Data...</div>;

    const isLocked = status === 'unpaid';

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h1>Live Matrix</h1>
                {!isLocked && <button className="secondary" onClick={handleManage}>Manage Subscription</button>}
            </div>

            {/* --- 1. LIVE MATRIX VIEW --- */}
            <div className="table-container" style={{ marginBottom: '3rem' }}>
                {isLocked && (
                    <div className="paywall-overlay">
                        <h2>Subscription Required</h2>
                        <p style={{ marginBottom: '20px', color: '#64748b' }}>Unlock real-time signals</p>
                        <button onClick={handleSubscribe}>Unlock Now</button>
                    </div>
                )}

                <table className={isLocked ? 'blurred-content' : ''}>
                    <thead>
                        <tr>
                            <th>Timeframe</th>
                            {/* Render Assets as Column Headers */}
                            {assets.map(asset => (
                                <th key={asset} style={{ textAlign: 'center' }}>{asset}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {/* Render Timeframes as Rows */}
                        {timeframes.map(tf => (
                            <tr key={tf}>
                                <td style={{ fontWeight: 'bold', color: '#64748b' }}>{tf}</td>
                                {assets.map(asset => {
                                    const val = grid[tf][asset];
                                    const ui = getSignalUI(val);
                                    return (
                                        <td key={`${tf}-${asset}`} style={{ textAlign: 'center' }}>
                                            <span className={ui.className} style={{ minWidth: '40px', display: 'inline-block' }}>
                                                {ui.text}
                                            </span>
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* --- 2. SIGNAL HISTORY VIEW --- */}
            <h2>Signal History</h2>
            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Time</th>
                            <th>Symbol</th>
                            <th>Action</th>
                            <th>Entry</th>
                            <th>Exit</th>
                            <th>P/L</th>
                        </tr>
                    </thead>
                    <tbody>
                        {historyData.length > 0 ? historyData.map((row, i) => (
                            <tr key={i}>
                                <td>{new Date(row.created_at || Date.now()).toLocaleTimeString()}</td>
                                <td><b>{row.symbol}</b></td>
                                <td>
                                    <span className={`badge ${row.action === 'BUY' ? 'badge-buy' : 'badge-sell'}`}>
                                        {row.action}
                                    </span>
                                </td>
                                <td>{row.entry_price}</td>
                                <td>{row.exit_price || '-'}</td>
                                <td style={{ color: row.profit_loss > 0 ? 'green' : 'red' }}>
                                    {row.profit_loss ? `${row.profit_loss}%` : '-'}
                                </td>
                            </tr>
                        )) : (
                            <tr><td colSpan="6" style={{textAlign:'center', padding:'2rem'}}>No history found</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
