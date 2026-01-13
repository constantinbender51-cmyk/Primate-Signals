import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from './api';

export default function Dashboard() {
    const [data, setData] = useState([]);
    const [status, setStatus] = useState('loading'); // loading | active | unpaid
    const navigate = useNavigate();

    useEffect(() => {
        // Try to fetch the protected data
        api.get('/live_matrix')
            .then(res => {
                setData(res.data.results);
                setStatus('active');
            })
            .catch(err => {
                if (err.response?.status === 403) {
                    setStatus('unpaid'); // User is logged in, but not subscribed
                } else {
                    alert("Please log in");
                    navigate('/login');
                }
            });
    }, [navigate]);

    const handleSubscribe = async () => {
        try {
            const res = await api.post('/create-checkout-session');
            window.location.href = res.data.url; // Redirect to Stripe
        } catch (err) {
            alert("Error starting payment");
        }
    };

    const handleManage = async () => {
        try {
            const res = await api.post('/create-portal-session');
            window.location.href = res.data.url; // Redirect to Portal
        } catch (err) {
            alert("Error opening portal");
        }
    };

    if (status === 'loading') return <div>Loading...</div>;

    if (status === 'unpaid') {
        return (
            <div style={{ textAlign: 'center', marginTop: '50px' }}>
                <h1>Subscription Required</h1>
                <p>You need an active subscription to view the Live Matrix.</p>
                <button onClick={handleSubscribe} style={{ padding: '10px 20px', fontSize: '18px' }}>
                    Subscribe Now ($10/mo)
                </button>
                <br /><br />
                <button onClick={() => { localStorage.clear(); window.location.reload(); }}>Logout</button>
            </div>
        );
    }

    return (
        <div style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <h1>Live Matrix Data</h1>
                <button onClick={handleManage}>Manage Subscription</button>
            </div>
            
            <table border="1" cellPadding="10" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                    <tr>
                        <th>ID</th>
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
                            <td>{row.id}</td>
                            <td>{row.symbol}</td>
                            <td>{row.timeframe}</td>
                            <td>{row.signal_type}</td>
                            <td>{row.price}</td>
                            <td>{new Date(row.created_at).toLocaleString()}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
