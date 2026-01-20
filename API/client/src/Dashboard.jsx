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

// --- Custom Chart Component (No ext. libs) ---
const PnLChart = ({ data }) => {
    if (!data || data.length < 2) return <div style={{height:'200px', display:'flex', alignItems:'center', justifyContent:'center', color:'#ccc'}}>Not enough data</div>;

    const height = 200;
    const width = 800;
    const padding = 20;

    // 1. Process Data: Filter last 7 days (1w)
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    // Sort by date ascending
    const sorted = [...data]
        .filter(d => new Date(d.time) >= oneWeekAgo)
        .sort((a, b) => new Date(a.time) - new Date(b.time));

    // Calculate Cumulative PnL
    let runningTotal = 0;
    const points = sorted.map(d => {
        runningTotal += parseFloat(d.pnl);
        return { time: new Date(d.time), val: runningTotal };
    });

    if (points.length === 0) return <div style={{height:'200px', display:'flex', alignItems:'center', justifyContent:'center', color:'#ccc'}}>No data for this week</div>;

    // 2. Scales
    const minVal = Math.min(0, ...points.map(p => p.val)); // Ensure 0 is in view
    const maxVal = Math.max(0, ...points.map(p => p.val));
    const rangeY = maxVal - minVal || 1;
    
    const minTime = points[0].time.getTime();
    const maxTime = points[points.length - 1].time.getTime();
    const rangeX = maxTime - minTime || 1;

    // 3. Map to SVG coords
    const getX = (t) => padding + ((t.getTime() - minTime) / rangeX) * (width - (padding * 2));
    const getY = (v) => (height - padding) - ((v - minVal) / rangeY) * (height - (padding * 2));

    const pathD = points.map((p, i) => 
        `${i === 0 ? 'M' : 'L'} ${getX(p.time)} ${getY(p.val)}`
    ).join(' ');

    const zeroY = getY(0);

    return (
        <div style={{ position: 'relative', width: '100%', border: '1px solid #000', borderRadius: '4px', padding: '10px' }}>
            <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
                {/* Zero Line */}
                <line x1={padding} y1={zeroY} x2={width - padding} y2={zeroY} stroke="#e5e7eb" strokeWidth="1" strokeDasharray="4" />
                
                {/* Chart Line */}
                <path d={pathD} fill="none" stroke="#2563eb" strokeWidth="2" />
            </svg>
            <div style={{ textAlign: 'center', marginTop: '5px', fontSize: '12px', fontWeight: 'bold', color: '#000' }}>1w</div>
        </div>
    );
};


export default function Dashboard() {
    const [matrixData, setMatrixData] = useState([]);
    const [historyData, setHistoryData] = useState([]);
    const [matrixStatus, setMatrixStatus] = useState('loading');
    const [searchParams] = useSearchParams();
    const [historyExpanded, setHistoryExpanded] = useState(false); // State for toggle
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

    // Process history for table
    const history = useMemo(() => {
        return historyData.map(row => {
            const entry = parseFloat(row.entry_price || row.price_at_signal || 0);
            const close = parseFloat(row.exit_price || row.close_price || 0);
            let pctChange = 0;
            let pnl = 0;
            
            if (entry && close) {
                pctChange = ((close - entry) / entry) * 100;
                const isBuy = (row.signal === 'BUY' || row.signal === 1 || row.action === 'BUY');
                pnl = isBuy ? pctChange : -pctChange;
            }

            // Fallback for timeframe/dates if missing in DB row
            const { start, end } = getCandleTimes(row.created_at || row.time_str, row.tf || '15m');

            return {
                direction: (row.signal === 'BUY' || row.signal === 1 || row.action === 'BUY') ? 'Long' : 'Short',
                asset: row.asset || row.symbol,
                start: formatDateTime(start),
                end: formatDateTime(end),
                change: pctChange.toFixed(2) + '%',
                pnlValue: pnl,
                time: row.created_at || row.time_str
            };
        });
    }, [historyData]);

    const displayedHistory = historyExpanded ? history : history.slice(0, 10);

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
            {/* Header Removed as requested */}

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
                    <>
                        <div style={{ overflowX: 'auto', marginBottom: '40px' }}>
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

                        {/* Chart Section */}
                        <div style={{ marginBottom: '40px' }}>
                            <PnLChart data={history.map(h => ({ time: h.time, pnl: h.pnlValue }))} />
                        </div>
                    </>
                )}
            </section>

            <section>
                <h3 style={{ borderBottom: '2px solid #f0f0f0', paddingBottom: '10px' }}>Signal History</h3>
                
                {/* Expand Toggle */}
                <div style={{ marginBottom: '10px' }}>
                    <button 
                        onClick={() => setHistoryExpanded(!historyExpanded)}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: '#000',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            padding: 0,
                            fontWeight: 'bold',
                            fontSize: '16px'
                        }}
                    >
                        {/* Pointed down bigger than sign on the left */}
                        <span style={{ 
                            display: 'inline-block', 
                            transform: historyExpanded ? 'rotate(-90deg)' : 'rotate(90deg)', 
                            marginRight: '8px',
                            fontSize: '1.2em',
                            transition: 'transform 0.2s'
                        }}>
                            &gt;
                        </span>
                        {historyExpanded ? 'Collapse' : 'Expand History'}
                    </button>
                </div>

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
                            {displayedHistory.length > 0 ? displayedHistory.map((row, i) => (
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
