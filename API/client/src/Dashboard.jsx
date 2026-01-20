import { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from './api';

// --- Utilities ---

const formatDateTime = (dateInput) => {
    if (!dateInput) return '-';
    // Handle specific "YYYY-MM-DD HH:mm" strings if necessary, but Date() usually handles ISO-like strings
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return dateInput; // Fallback to raw string if parsing fails
    return date.toLocaleString('sv-SE', { 
        year: 'numeric', month: '2-digit', day: '2-digit', 
        hour: '2-digit', minute: '2-digit'
    });
};

const getCandleTimes = (dateInput, tf) => {
    const start = new Date(dateInput);
    if (isNaN(start.getTime())) {
        // Fallback if dateInput is invalid
        return { start: new Date(), end: new Date() };
    }
    
    let duration = 0;
    const timeframe = String(tf || '15m').toLowerCase();

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

// --- Custom Chart Component ---
const PnLChart = ({ data }) => {
    // Basic validation
    if (!data || data.length < 2) return <div style={{height:'200px', display:'flex', alignItems:'center', justifyContent:'center', color:'#ccc'}}>Not enough data</div>;

    const height = 200;
    const width = 800;
    const padding = 20;

    // 1. Process Data
    const now = new Date();
    // Use last 14 days to be safe with sparse data
    const filterDate = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000); 
    
    const sorted = [...data]
        .filter(d => new Date(d.time) >= filterDate)
        .sort((a, b) => new Date(a.time) - new Date(b.time));

    if (sorted.length < 2) return <div style={{height:'200px', display:'flex', alignItems:'center', justifyContent:'center', color:'#ccc'}}>No data for chart</div>;

    // Calculate Cumulative
    let runningTotal = 0;
    const points = sorted.map(d => {
        runningTotal += parseFloat(d.pnl || 0);
        return { time: new Date(d.time), val: runningTotal };
    });

    const minVal = Math.min(0, ...points.map(p => p.val)); 
    const maxVal = Math.max(0, ...points.map(p => p.val));
    const rangeY = maxVal - minVal || 1;
    
    const minTime = points[0].time.getTime();
    const maxTime = points[points.length - 1].time.getTime();
    const rangeX = maxTime - minTime || 1;

    const getX = (t) => padding + ((t.getTime() - minTime) / rangeX) * (width - (padding * 2));
    const getY = (v) => (height - padding) - ((v - minVal) / rangeY) * (height - (padding * 2));

    const pathD = points.map((p, i) => 
        `${i === 0 ? 'M' : 'L'} ${getX(p.time)} ${getY(p.val)}`
    ).join(' ');

    const zeroY = getY(0);

    return (
        <div style={{ position: 'relative', width: '100%', border: '1px solid #000', borderRadius: '4px', padding: '10px' }}>
            <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
                <line x1={padding} y1={zeroY} x2={width - padding} y2={zeroY} stroke="#e5e7eb" strokeWidth="1" strokeDasharray="4" />
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
    
    // Pagination
    const [historyExpanded, setHistoryExpanded] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;
    
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
            // Signal History Fetch
            api.get('/signal_history')
                .then(res => {
                    if (res.data.results) {
                        setHistoryData(res.data.results);
                    }
                })
                .catch(err => console.error("History fetch error:", err));
            
            // Matrix Fetch
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

    // Matrix Logic
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

    // History Logic (UPDATED MAPPING)
    const history = useMemo(() => {
        return historyData.map(row => {
            // 1. Determine Time
            // User data has 'time_str' or 'created_at'.
            const timeRaw = row.time_str || row.created_at;
            const { start, end } = getCandleTimes(timeRaw, row.tf || row.timeframe || '15m');
            
            // 2. Determine PnL
            // Use the explicit 'pnl' column if it exists, otherwise 0
            const pnlValue = parseFloat(row.pnl || row.profit_loss || 0);
            
            // 3. Determine Change % string
            // If pnl is like -0.107, we can just show that, or multiply by 100 if it's raw decimal.
            // Assuming your data '-0.1079' is percentage (e.g. -0.1%), or raw?
            // Usually pnl is raw percent. Let's assume it is ready for display.
            const changeStr = pnlValue.toFixed(2) + '%';

            return {
                direction: (row.signal === 'BUY' || row.action === 'BUY') ? 'Long' : 'Short',
                asset: row.asset || row.symbol,
                start: formatDateTime(start),
                end: formatDateTime(end),
                change: changeStr,
                pnlValue: pnlValue,
                time: timeRaw
            };
        }).reverse();
    }, [historyData]);

    const totalPages = Math.ceil(history.length / ITEMS_PER_PAGE);
    
    const displayedHistory = useMemo(() => {
        if (!historyExpanded) {
            return history.slice(0, 10);
        } else {
            const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
            return history.slice(startIdx, startIdx + ITEMS_PER_PAGE);
        }
    }, [history, historyExpanded, currentPage]);

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

                        {/* Chart */}
                        <div style={{ marginBottom: '40px' }}>
                            <PnLChart data={history.map(h => ({ time: h.time, pnl: h.pnlValue }))} />
                        </div>
                    </>
                )}
            </section>

            <section>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid #f0f0f0', paddingBottom: '10px', marginBottom: '20px' }}>
                    <h3 style={{ margin: 0, border: 'none', padding: 0 }}>Signal History</h3>
                </div>
                
                <div style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <button 
                        onClick={() => setHistoryExpanded(!historyExpanded)}
                        style={{
                            background: 'none', border: 'none', color: '#000', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', padding: 0, fontWeight: 'bold', fontSize: '16px'
                        }}
                    >
                        <span style={{ 
                            display: 'inline-block', transform: historyExpanded ? 'rotate(-90deg)' : 'rotate(90deg)', 
                            marginRight: '8px', fontSize: '1.2em', transition: 'transform 0.2s'
                        }}>&gt;</span>
                        {historyExpanded ? 'Collapse' : 'Expand History'}
                    </button>

                    {historyExpanded && history.length > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <button 
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                                style={{ background: '#f3f4f6', color: '#374151', padding: '4px 8px', fontSize: '12px' }}
                            >Prev</button>
                            <span style={{ fontSize: '12px', color: '#6b7280' }}>Page {currentPage} of {totalPages}</span>
                            <button 
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                                style={{ background: '#f3f4f6', color: '#374151', padding: '4px 8px', fontSize: '12px' }}
                            >Next</button>
                        </div>
                    )}
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
                                    <td style={{ ...cellStyle, fontWeight: 'bold', color: row.pnlValue >= 0 ? '#10b981' : '#ef4444' }}>
                                        {row.pnlValue > 0 ? '+' : ''}{row.change}
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
