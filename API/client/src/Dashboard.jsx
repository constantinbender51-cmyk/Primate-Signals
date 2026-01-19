import { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from './api';

// --- Utilities ---

const formatDateTime = (dateInput) => {
    if (!dateInput) return '-';
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleString('sv-SE', { 
        year: 'numeric', month: '2-digit', day: '2-digit', 
        hour: '2-digit', minute: '2-digit', second: '2-digit' 
    });
};

const getCandleTimes = (dateInput, tf) => {
    const start = new Date(dateInput);
    let duration = 0;
    const timeframe = String(tf).toLowerCase();

    switch (timeframe) {
        case '15m': start.setMinutes(Math.floor(start.getMinutes() / 15) * 15, 0, 0); duration = 15 * 60 * 1000; break;
        case '30m': start.setMinutes(Math.floor(start.getMinutes() / 30) * 30, 0, 0); duration = 30 * 60 * 1000; break;
        case '1h': case '60m': start.setMinutes(0, 0, 0); duration = 60 * 60 * 1000; break;
        case '4h': case '240m': start.setHours(Math.floor(start.getHours() / 4) * 4, 0, 0, 0); duration = 4 * 60 * 60 * 1000; break;
        case '1d': start.setHours(0, 0, 0, 0); duration = 24 * 60 * 60 * 1000; break;
        default: start.setMinutes(Math.floor(start.getMinutes() / 15) * 15, 0, 0); duration = 15 * 60 * 1000; break;
    }
    return { start, end: new Date(start.getTime() + duration) };
};

export default function Dashboard() {
    const [matrixData, setMatrixData] = useState([]);
    const [historyData, setHistoryData] = useState([]);
    const [matrixStatus, setMatrixStatus] = useState('loading');
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const cellStyle = { padding: '12px 10px', textAlign: 'left', borderBottom: '1px solid #eee' };

    useEffect(() => {
        const sessionId = searchParams.get('session_id');
        if (sessionId) {
            const verify = async () => {
                try {
                    const res = await api.get('/auth/me');
                    localStorage.setItem('user', JSON.stringify(res.data));
                    toast.success("Subscription Active!");
                    window.location.href = '/'; 
                } catch (e) { navigate('/', { replace: true }); }
            };
            verify();
        }
    }, [searchParams, navigate]);

    useEffect(() => {
        const fetchData = async () => {
            api.get('/signal_history').then(res => setHistoryData(res.data.results || [])).catch(() => {});
            try {
                const res = await api.get('/live_matrix');
                setMatrixData(res.data.results || []);
                setMatrixStatus('active');
            } catch (err) {
                if (err.response?.status === 403 || err.response?.status === 401) {
                    setMatrixStatus('unpaid');
                }
            }
        };
        fetchData();
    }, []);

    const signals = useMemo(() => {
        const assets = {};
        matrixData.forEach(d => {
            if (!assets[d.asset]) {
                assets[d.asset] = { score: 0, start: d.updated_at, tf: d.tf || '15m' };
            }
            assets[d.asset].score += d.signal_val;
        });

        return Object.entries(assets)
            .map(([asset, data]) => {
                const { start, end } = getCandleTimes(data.start, data.tf);
                return {
                    direction: data.score > 0 ? 'Long' : (data.score < 0 ? 'Short' : null),
                    asset,
                    start: formatDateTime(start),
                    end: formatDateTime(end)
                };
            })
            .filter(item => item.direction !== null);
    }, [matrixData]);

    const history = useMemo(() => {
        return historyData.map(row => {
            const entry = parseFloat(row.price_at_signal);
            const close = parseFloat(row.close_price);
            let pctChange = 0;
            let pnl = 0;
            
            if (entry && close) {
                // Raw market movement
                pctChange = ((close - entry) / entry) * 100;
                
                // PnL based on signal direction
                const isBuy = (row.signal === 'BUY' || row.signal === 1);
                pnl = isBuy ? pctChange : -pctChange;
            }

            const { start, end } = getCandleTimes(row.time_str, row.tf || '15m');

            return {
                direction: (row.signal === 'BUY' || row.signal === 1) ? 'Long' : 'Short',
                asset: row.asset,
                start: formatDateTime(start),
                end: formatDateTime(end),
                change: pctChange.toFixed(2) + '%',
                pnlValue: pnl // Used for color logic
            };
        });
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

    return (
        <div style={{ fontFamily: 'sans-serif', maxWidth: '1000px', margin: '0 auto', padding: '40px 20px' }}>
            <header style={{ marginBottom: '40px' }}>
                <h1 style={{ margin: '0 0 10px 0' }}>Trading Signals</h1>
                <p style={{ color: '#666', margin: 0 }}>For educational purposes only.</p>
            </header>

            <section style={{ marginBottom: '60px' }}>
                <h3 style={{ borderBottom: '2px solid #f0f0f0', paddingBottom: '10px' }}>Signals</h3>
                
                {matrixStatus === 'unpaid' ? (
                    <div style={{ 
                        background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '3rem 2rem', 
                        textAlign: 'center', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', margin: '20px 0' 
                    }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🔒</div>
                        <h3 style={{ margin: '0 0 0.5rem 0' }}>Premium Access Required</h3>
                        <p style={{ color: '#6b7280', marginBottom: '2rem' }}>
                            Unlock real-time probability-based signals and active trade setups.
                        </p>
                        <button onClick={handleSubscribe} style={{ 
                            padding: '12px 32px', fontSize: '15px', background: '#000', color: '#fff', 
                            border: 'none', borderRadius: '6px', cursor: 'pointer' 
                        }}>
                            Get Access — 49.90€/mo
                        </button>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                            <thead>
                                <tr>
                                    <th style={cellStyle}>Direction</th>
                                    <th style={cellStyle}>Asset</th>
                                    <th style={cellStyle}>Start</th>
                                    <th style={cellStyle}>End</th>
                                </tr>
                            </thead>
                            <tbody>
                                {signals.length > 0 ? signals.map((row, i) => (
                                    <tr key={i}>
                                        <td style={{ ...cellStyle, color: row.direction === 'Long' ? '#10b981' : '#ef4444', fontWeight: 'bold' }}>{row.direction}</td>
                                        <td style={cellStyle}>{row.asset}</td>
                                        <td style={cellStyle}>{row.start}</td>
                                        <td style={cellStyle}>{row.end}</td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan="4" style={{ ...cellStyle, textAlign: 'center', color: '#999' }}>No active signals</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            <section>
                <h3 style={{ borderBottom: '2px solid #f0f0f0', paddingBottom: '10px' }}>Signal History</h3>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                        <thead>
                            <tr>
                                <th style={cellStyle}>Direction</th>
                                <th style={cellStyle}>Asset</th>
                                <th style={cellStyle}>Start</th>
                                <th style={cellStyle}>End</th>
                                <th style={cellStyle}>%Change</th>
                            </tr>
                        </thead>
                        <tbody>
                            {history.length > 0 ? history.map((row, i) => (
                                <tr key={i}>
                                    <td style={{ ...cellStyle, color: row.direction === 'Long' ? '#10b981' : '#ef4444', fontWeight: 'bold' }}>{row.direction}</td>
                                    <td style={cellStyle}>{row.asset}</td>
                                    <td style={cellStyle}>{row.start}</td>
                                    <td style={cellStyle}>{row.end}</td>
                                    <td style={{ 
                                        ...cellStyle, 
                                        fontWeight: 'bold', 
                                        color: row.pnlValue >= 0 ? '#10b981' : '#ef4444' 
                                    }}>
                                        {parseFloat(row.change) > 0 ? '+' : ''}{row.change}
                                    </td>
                                </tr>
                            )) : (
                                <tr><td colSpan="5" style={{ ...cellStyle, textAlign: 'center', color: '#999' }}>No history records found</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            <footer style={{ marginTop: '60px', display: 'flex', gap: '20px', fontSize: '0.85rem' }}>
                <Link to="/impressum" style={{ color: '#888', textDecoration: 'none' }}>Impressum</Link>
                <Link to="/privacy" style={{ color: '#888', textDecoration: 'none' }}>Privacy</Link>
                <Link to="/terms" style={{ color: '#888', textDecoration: 'none' }}>Terms</Link>
            </footer>
        </div>
    );
}
