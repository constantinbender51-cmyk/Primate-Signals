import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom'; // Added useSearchParams
import toast from 'react-hot-toast';
import api from './api';

const TF_ORDER = ['15m', '30m', '60m', '240m', '1d'];

// Simple Text Helpers
const getSignalText = (val) => {
    if (val === 1) return <span style={{ color: 'green' }}>BUY</span>;
    if (val === -1) return <span style={{ color: 'red' }}>SELL</span>;
    return 'WAIT';
};

export default function Dashboard() {
    const [matrixData, setMatrixData] = useState([]);
    const [historyData, setHistoryData] = useState([]);
    const [matrixStatus, setMatrixStatus] = useState('loading'); 
    const [apiKey, setApiKey] = useState(null);
    const [searchParams] = useSearchParams(); // To detect Stripe return
    const navigate = useNavigate();

    // 1. Handle Stripe Return & Profile Refresh
    useEffect(() => {
        const sessionId = searchParams.get('session_id');
        
        if (sessionId) {
            const refreshProfile = async () => {
                const toastId = toast.loading("Verifying subscription...");
                try {
                    // Call the new endpoint to get fresh data from DB
                    const res = await api.get('/auth/me');
                    
                    // Update LocalStorage with fresh user object (now 'active')
                    localStorage.setItem('user', JSON.stringify(res.data));
                    
                    toast.success("Subscription Active!", { id: toastId });
                    
                    // Clear URL and Force Reload to update Layout/Header state
                    window.location.href = '/'; 
                } catch (err) {
                    toast.error("Activation pending. Please wait.", { id: toastId });
                    // Even if it fails (webhook delay), clear the URL so they aren't stuck
                    navigate('/', { replace: true });
                }
            };
            refreshProfile();
        }
    }, [searchParams, navigate]);

    // 2. Existing Data Fetching
    useEffect(() => {
        const fetchData = async () => {
            try {
                const historyRes = await api.get('/signal_history');
                setHistoryData(historyRes.data.results);
            } catch (err) {
                // Silent fail for history
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

    const { assets, grid } = useMemo(() => {
        if (!matrixData.length) return { assets: [], grid: {} };
        const uniqueAssets = [...new Set(matrixData.map(d => d.asset))].sort();
        const lookup = {};
        uniqueAssets.forEach(asset => {
            lookup[asset] = {};
            TF_ORDER.forEach(tf => {
                const point = matrixData.find(d => d.asset === asset && d.tf === tf);
                lookup[asset][tf] = point ? point.signal_val : 0;
            });
        });
        return { assets: uniqueAssets, grid: lookup };
    }, [matrixData]);

    // Calculate Accuracy and PnL
    const { accuracy, totalPnL, enrichedHistory } = useMemo(() => {
        let wins = 0, losses = 0;
        let cumulativePnL = 0;

        const processed = historyData.map(row => {
            const entry = parseFloat(row.price_at_signal);
            const close = parseFloat(row.close_price);
            let pnlPercent = 0;

            const isLong = row.signal === 'BUY' || row.signal === 1;
            const isShort = row.signal === 'SELL' || row.signal === -1;

            if (!isNaN(entry) && !isNaN(close) && entry !== 0) {
                if (isLong) {
                    pnlPercent = ((close - entry) / entry) * 100;
                } else if (isShort) {
                    pnlPercent = ((entry - close) / entry) * 100;
                }
            }

            if (row.outcome === 'WIN') wins++;
            else if (row.outcome === 'LOSS') losses++;
            
            cumulativePnL += pnlPercent;

            return { ...row, pnlVal: pnlPercent };
        });

        const total = wins + losses;
        
        return { 
            accuracy: total > 0 ? ((wins / total) * 100).toFixed(2) : 0,
            totalPnL: cumulativePnL.toFixed(2),
            enrichedHistory: processed
        };
    }, [historyData]);

    const handleSubscribe = async () => { 
        try {
            const res = await api.post('/create-checkout-session');
            window.location.href = res.data.url;
        } catch (err) { 
            if (!localStorage.getItem('token')) navigate('/login');
            else toast.error("Unavailable");
        }
    };

    const isMatrixLocked = matrixStatus === 'unpaid';

    return (
        <div>
            {/* Matrix Section */}
            <div style={{ marginTop: '20px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <strong>Live Matrix</strong>
                    <div>
                        <span className="tiny" style={{ marginRight: '10px' }}>
                            Updated: {matrixData.length > 0 ? new Date(matrixData[0].updated_at).toLocaleTimeString() : '-'}
                        </span>
                    </div>
                </div>

                {!isMatrixLocked ? (
                    <table>
                        <thead>
                            <tr>
                                <th>Asset</th>
                                {TF_ORDER.map(tf => <th key={tf}>{tf}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {assets.length > 0 ? assets.map(asset => (
                                <tr key={asset}>
                                    <td>{asset}</td>
                                    {TF_ORDER.map(tf => (
                                        <td key={tf}>{getSignalText(grid[asset]?.[tf])}</td>
                                    ))}
                                </tr>
                            )) : (
                                <tr><td colSpan="6">Waiting for market data...</td></tr>
                            )}
                        </tbody>
                    </table>
                ) : (
                    <>
                        <p style={{ fontSize: '12px', color: '#666', marginTop: '10px', fontStyle: 'italic' }}>
                            This is for educational purposes only. This is not investment advice. Past performance is not indicative of future results. 
                            The publisher may hold or trade these assets. 
                            Trading carries a high risk of loss.
                            Signals are generated through discrete probabilistic modelling.
                        </p>
                        
                        <div style={{ border: '2px solid #000', padding: '15px', marginTop: '10px' }}>
                            <p><strong>ACCESS RESTRICTED</strong></p>
                            <p>
                                Unlock Real-time Signals.{' '}
                                <button 
                                    onClick={handleSubscribe}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        padding: 0,
                                        color: 'blue',
                                        textDecoration: 'underline',
                                        cursor: 'pointer',
                                        fontSize: 'inherit'
                                    }}
                                >
                                    Try for free 
                                </button>
                                {' '}(Pricing: 49.90€/month).
                            </p>
                        </div>
                    </>
                )}
            </div>

            {/* History Section */}
            <h3>Signal History (7 Days)</h3>
            <div style={{ marginBottom: '15px' }}>
                <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                    <p style={{ margin: '5px 0' }}>Accuracy: <strong>{accuracy}%</strong></p>
                    <p style={{ margin: '5px 0' }}>
                        Total PnL: <strong style={{ color: totalPnL >= 0 ? 'green' : 'red' }}>
                            {totalPnL > 0 ? '+' : ''}{totalPnL}%
                        </strong>
                    </p>
                </div>
                <p style={{ fontSize: '11px', color: '#888', fontStyle: 'italic' }}>
                    This is not actual performance data.
                </p>
            </div>
            
            <table>
                <thead>
                    <tr>
                        <th>Time (UTC)</th>
                        <th>Asset</th>
                        <th>TF</th>
                        <th>Signal</th>
                        <th>Entry</th>
                        <th>Exit</th>
                        <th>PnL %</th>
                        <th>Result</th>
                    </tr>
                </thead>
                <tbody>
                    {enrichedHistory.length > 0 ? enrichedHistory.map((row, i) => (
                        <tr key={i}>
                            <td>{row.time_str}</td>
                            <td>{row.asset}</td>
                            <td>{row.tf}</td>
                            <td>{row.signal}</td>
                            <td>{row.price_at_signal}</td>
                            <td>{row.close_price || '-'}</td>
                            <td style={{ fontWeight: 'bold', color: row.pnlVal >= 0 ? 'green' : 'red' }}>
                                {row.pnlVal ? `${row.pnlVal > 0 ? '+' : ''}${row.pnlVal.toFixed(2)}%` : '-'}
                            </td>
                            <td>
                                {row.outcome === 'WIN' ? <span style={{ color: 'green' }}>WIN</span> : 
                                 row.outcome === 'LOSS' ? <span style={{ color: 'red' }}>LOSS</span> : 
                                 row.outcome}
                            </td>
                        </tr>
                    )) : (
                        <tr><td colSpan="8">No history recorded</td></tr>
                    )}
                </tbody>
            </table>

            {/* API Key */}
            {!isMatrixLocked && apiKey && (
                <div style={{ marginTop: '30px', paddingTop: '10px', borderTop: '1px dashed #000' }}>
                    <h4>Developer Access</h4>
                    <p className="tiny">Raw JSON Feed Key</p>
                    <code>{apiKey}</code>
                </div>
            )}
        </div>
    );
}
