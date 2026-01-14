import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from './api';

// Simplified UI logic - just text
const getSignalText = (val) => {
    if (val === 1) return 'BUY';
    if (val === -1) return 'SELL';
    return '-';
};

const TF_ORDER = ['15m', '30m', '60m', '240m', '1d'];

export default function Dashboard() {
    const [matrixData, setMatrixData] = useState([]);
    const [historyData, setHistoryData] = useState([]);
    const [matrixStatus, setMatrixStatus] = useState('loading'); 
    const [apiKey, setApiKey] = useState(null);
    const navigate = useNavigate();

    // ... (Keep existing useEffect/fetch logic exactly the same) ...
    // Copy-paste the useEffect from your original file here
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

    // ... (Keep existing useMemo logic exactly the same) ...
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

    // ... (Keep existing accuracy logic) ...
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
            <h2>Market Signals</h2>
            <p>
                <strong>Status:</strong> Automated Quantitative Analysis.<br/>
                <strong>Note:</strong> Educational Use Only. Verify all market conditions.
            </p>

            <div style={{ margin: '2rem 0' }}>
                <h3>Live Matrix</h3>
                <p>Last Update: {matrixData.length > 0 ? new Date(matrixData[0].updated_at).toLocaleTimeString() : 'Waiting for data...'}</p>
                
                {!isMatrixLocked ? (
                    <>
                        <button onClick={handleManage}>Manage Subscription</button>
                        <table>
                            <thead>
                                <tr>
                                    <th>Asset</th>
                                    {timeframes.map(tf => <th key={tf}>{tf}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {assets.map(asset => (
                                    <tr key={asset}>
                                        <td><strong>{asset}</strong></td>
                                        {timeframes.map(tf => {
                                            const val = grid[asset]?.[tf];
                                            const text = getSignalText(val);
                                            return <td key={`${asset}-${tf}`}>{text}</td>;
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </>
                ) : (
                    <div style={{ background: '#f4f4f4', padding: '1rem', border: '1px solid #000' }}>
                        <p><strong>ACCESS RESTRICTED.</strong></p> 
                        <p>To view real-time signals, you must start a subscription.</p>
                        <button onClick={handleSubscribe}>Start Free Trial</button>
                    </div>
                )}
            </div>

            <hr />

            <div>
                <h3>Methodology</h3>
                <ul>
                    <li><strong>Pricing:</strong> 49.90€ / Month (Includes Free Trial)</li>
                    <li><strong>Model:</strong> Markov chain trained on historical data.</li>
                    <li><strong>Strategy:</strong> Signal active for one candle duration (e.g., 15m).</li>
                </ul>
            </div>

            <hr />

            <h3>Signal History</h3>
            <p>Historical Accuracy: <strong>{accuracy}%</strong></p>
            
            <table>
                <thead>
                    <tr>
                        <th>Time (UTC)</th>
                        <th>Asset</th>
                        <th>TF</th>
                        <th>Signal</th>
                        <th>Entry Price</th>
                        <th>Result</th>
                    </tr>
                </thead>
                <tbody>
                    {historyData.map((row, i) => (
                        <tr key={i}>
                            <td>{row.time_str}</td>
                            <td>{row.asset}</td>
                            <td>{row.tf}</td>
                            <td>{row.signal}</td>
                            <td>{row.price_at_signal}</td>
                            <td>{row.outcome}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {apiKey && (
                <div style={{marginTop: '2rem'}}>
                    <h3>API Access</h3>
                    <p>Your API Key: <code>{apiKey}</code></p>
                </div>
            )}
        </div>
    );
}
