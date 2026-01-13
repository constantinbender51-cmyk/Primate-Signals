import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast'; // Replace alerts
import api from './api';

// Fake data to show behind the paywall blur
const TEASER_DATA = [
    { symbol: 'BTC/USD', timeframe: '15m', signal_type: 'BUY', price: 42000.50, created_at: new Date() },
    { symbol: 'ETH/USD', timeframe: '1h', signal_type: 'SELL', price: 2800.20, created_at: new Date() },
    { symbol: 'SOL/USD', timeframe: '4h', signal_type: 'BUY', price: 98.45, created_at: new Date() },
    { symbol: 'EUR/USD', timeframe: '15m', signal_type: 'SELL', price: 1.0850, created_at: new Date() },
    { symbol: 'AAPL', timeframe: '1d', signal_type: 'BUY', price: 185.10, created_at: new Date() },
];

export default function Dashboard() {
    const [data, setData] = useState([]);
    const [status, setStatus] = useState('loading'); // loading | active | unpaid
    const navigate = useNavigate();

    useEffect(() => {
        api.get('/live_matrix')
            .then(res => {
                setData(res.data.results);
                setStatus('active');
            })
            .catch(err => {
                if (err.response?.status === 403) {
                    setStatus('unpaid'); 
                    setData(TEASER_DATA); // Show fake data for the blur effect
                } else {
                    toast.error("Please log in to continue");
                    navigate('/login');
                }
            });
    }, [navigate]);

    const handleSubscribe = async () => {
        const loadingToast = toast.loading("Preparing checkout...");
        try {
            const res = await api.post('/create-checkout-session');
            window.location.href = res.data.url; 
        } catch (err) {
            toast.dismiss(loadingToast);
            toast.error("Error starting payment");
        }
    };

    const handleManage = async () => {
        try {
            const res = await api.post('/create-portal-session');
            window.location.href = res.data.url; 
        } catch (err) {
            toast.error("Error opening portal");
        }
    };

    if (status === 'loading') return <div style={{textAlign: 'center', marginTop: '50px'}}>Loading live signals...</div>;

    const isLocked = status === 'unpaid';

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h1>Live Matrix Data</h1>
                {!isLocked && <button className="secondary" onClick={handleManage}>Manage Subscription</button>}
            </div>

            <div className="table-container">
                {/* The "Teaser" Overlay */}
                {isLocked && (
                    <div className="paywall-overlay">
                        <h2>Subscription Required</h2>
                        <p style={{marginBottom: '20px', color: '#64748b'}}>Unlock real-time buy/sell signals for $10/mo</p>
                        <button onClick={handleSubscribe} style={{ fontSize: '1.1rem', padding: '12px 24px' }}>
                            Unlock Now
                        </button>
                    </div>
                )}

                {/* The Table (Blurred if locked) */}
                <table className={isLocked ? 'blurred-content' : ''}>
                    <thead>
                        <tr>
                            <th>Symbol</th>
                            <th>Timeframe</th>
                            <th>Signal</th>
                            <th>Price</th>
                            <th>Time</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((row, i) => (
                            <tr key={i}>
                                <td><b>{row.symbol}</b></td>
                                <td>{row.timeframe}</td>
                                <td>
                                    <span className={`badge ${row.signal_type === 'BUY' ? 'badge-buy' : 'badge-sell'}`}>
                                        {row.signal_type}
                                    </span>
                                </td>
                                <td>${Number(row.price).toFixed(4)}</td>
                                <td>{new Date(row.created_at).toLocaleTimeString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
