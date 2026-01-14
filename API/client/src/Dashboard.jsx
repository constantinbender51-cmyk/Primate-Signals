import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from './api';

const TF_ORDER = ['15m', '30m', '60m', '240m', '1d'];

// Simple Text Helpers
const getSignalText = (val) => {
    if (val === 1) return 'BUY';
    if (val === -1) return 'SELL';
    return '-';
};

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
            else toast.error("Unavailable");
        }
    };
    
    const handleManage = async () => { 
        try {
            const res = await api.post('/create-portal-session');
            window.location.href = res.data.url;
        } catch (err) { toast.error("Error"); }
    };

    const isMatrixLocked = matrixStatus === 'unpaid';

    return (
        <div>
            {/* Header / Intro */}
            <h3>Market Signals</h3>
            <p>Automated Quantitative Analysis.</p>
            <p className="tiny">
                [NOTE] Educational Use Only. These signals are strictly for informational purposes. Verify all market conditions.
            </p>

            {/* Matrix Section */}
            <div style={{ marginTop: '20px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <strong>Live Matrix</strong>
                    <span className="tiny">
                        Updated: {matrixData.length > 0 ? new Date(matrixData[0].updated_at).toLocaleTimeString() : '-'}
                    </span>
                </div>

                {!isMatrixLocked ? (
                    <>
                        <button onClick={handleManage} style={{ margin: '10px 0' }}>Manage Subscription</button>
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
                        <p className="tiny">DISCLAIMER: Results based on simulated backtests. Past performance does not guarantee future results.</p>
                    </>
                ) : (
                    <div style={{ border: '2px solid #000', padding: '15px', marginTop: '10px' }}>
                        <p><strong>ACCESS RESTRICTED</strong></p>
                        <p>Unlock Real-time Signals. <a onClick={handleSubscribe}>Start Free Trial</a> (then 49.90€/mo).</p>
                    </div>
                )}
            </div>

            <hr />

            {/* Methodology */}
            <div>
                <p><strong>PRICING:</strong> 49.90€ / MO</p>
                <p><strong>METHODOLOGY:</strong> The signals are generated by a markov model trained on historical data. A signal is active for one 15m, 30m, 1h, 4h or 1d candle. Get in when the signal begins, get out when it disappears.</p>
            </div>

            <hr />

            {/* History Section */}
            <h3>Signal History</h3>
            <p>Accuracy: <strong>{accuracy}%</strong></p>
            
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
                            <td>{row.signal}</td>
                            <td>{row.price_at_signal}</td>
                            <td>{row.outcome}</td>
                        </tr>
                    )) : (
                        <tr><td colSpan="6">No history recorded</td></tr>
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
