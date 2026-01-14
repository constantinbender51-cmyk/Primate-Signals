import { useEffect, useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from './api';

const TF_ORDER = ['15m', '30m', '1h', '4h', '1d'];

export default function Dashboard() {
    const [matrixData, setMatrixData] = useState([]);
    const [historyData, setHistoryData] = useState([]);
    const [matrixStatus, setMatrixStatus] = useState('loading'); 
    const navigate = useNavigate();

    useEffect(() => {
        // 1. Fetch History
        api.get('/signal_history')
           .then(res => setHistoryData(res.data.results))
           .catch(() => {});

        // 2. Fetch Matrix
        api.get('/live_matrix')
           .then(res => {
               setMatrixData(res.data.results);
               setMatrixStatus('active');
           })
           .catch(err => {
               if (err.response?.status === 403 || err.response?.status === 401) {
                   setMatrixStatus('unpaid');
               }
           });
    }, []);

    // Matrix Processing
    const { assets, grid } = useMemo(() => {
        if (!matrixData.length) return { assets: [], grid: {} };
        const uniqueAssets = [...new Set(matrixData.map(d => d.asset))].sort();
        const lookup = {};
        uniqueAssets.forEach(asset => {
            lookup[asset] = {};
            TF_ORDER.forEach(tf => {
                const point = matrixData.find(d => d.asset === asset && d.tf === tf);
                lookup[asset][tf] = point ? (point.signal_val === 1 ? 'BUY' : point.signal_val === -1 ? 'SELL' : '-') : '-';
            });
        });
        return { assets: uniqueAssets, grid: lookup };
    }, [matrixData]);

    const handleSubscribe = async () => { 
        try {
            const res = await api.post('/create-checkout-session');
            window.location.href = res.data.url;
        } catch (err) { navigate('/login'); }
    };

    const isLocked = matrixStatus === 'unpaid';
    const lastUpdate = matrixData.length > 0 ? new Date(matrixData[0].updated_at).toLocaleTimeString() : '...';

    return (
        <div>
            {/* SUBTITLE */}
            <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>Trading Signals</div>

            {/* UPDATED */}
            <div style={{ marginBottom: '10px' }}>Updated: {lastUpdate}</div>

            {/* MATRIX (Or Try for free) */}
            {isLocked ? (
                <div style={{ border: '1px solid #000', padding: '10px', textAlign: 'center', marginBottom: '10px' }}>
                    <strong><a href="#" onClick={handleSubscribe}>Try for free</a></strong>
                </div>
            ) : (
                <table>
                    <thead>
                        <tr>
                            <th>Asset</th>
                            {TF_ORDER.map(tf => <th key={tf}>{tf}</th>)}
                        </tr>
                    </thead>
                    <tbody>
                        {assets.map(asset => (
                            <tr key={asset}>
                                <td>{asset}</td>
                                {TF_ORDER.map(tf => <td key={tf}>{grid[asset][tf]}</td>)}
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}

            {/* TINY DISCLAIMER */}
            <div className="tiny" style={{ marginBottom: '15px' }}>
                Edu only. Not fin advice.
            </div>

            {/* DOCUMENTATION */}
            <div style={{ marginBottom: '5px' }}>
                <Link to="/api-docs">Documentation</Link>
            </div>

            {/* PRICING */}
            <div style={{ marginBottom: '15px' }}>
                Pricing: 49.90€
            </div>

            {/* HISTORY */}
            <div style={{ marginBottom: '5px' }}>7 day signal history:</div>
            <ul style={{ fontSize: '14px' }}>
                {historyData.slice(0, 20).map((row, i) => (
                    <li key={i}>
                        {row.time_str.split('T')[0]} - {row.asset} {row.tf}: <strong>{row.signal}</strong> ({row.outcome})
                    </li>
                ))}
            </ul>
        </div>
    );
}
