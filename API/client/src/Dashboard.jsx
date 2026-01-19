import { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from './api';

const TF_ORDER = ['15m', '30m', '60m', '240m', '1d'];

// --- Helper Components & Utils ---

const getSignalBadge = (val) => {
    const baseStyle = {
        padding: '4px 8px',
        borderRadius: '4px',
        fontSize: '11px',
        fontWeight: '700',
        display: 'inline-block',
        minWidth: '54px',
        textAlign: 'center'
    };
    if (val === 1) return <span style={{ ...baseStyle, background: '#dcfce7', color: '#166534' }}>BUY</span>;
    if (val === -1) return <span style={{ ...baseStyle, background: '#fee2e2', color: '#991b1b' }}>SELL</span>;
    return <span style={{ ...baseStyle, background: '#f3f4f6', color: '#374151' }}>WAIT</span>;
};

const formatDateTime = (dateInput) => {
    if (!dateInput) return '-';
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleString('sv-SE', { 
        year: 'numeric', month: '2-digit', day: '2-digit', 
        hour: '2-digit', minute: '2-digit' 
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
    const [apiKey, setApiKey] = useState(null);
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    // --- Effects: Auth & Subscription ---
    useEffect(() => {
        const sessionId = searchParams.get('session_id');
        if (sessionId) {
            const refreshProfile = async () => {
                const toastId = toast.loading("Verifying subscription...");
                try {
                    const res = await api.get('/auth/me');
                    localStorage.setItem('user', JSON.stringify(res.data));
                    toast.success("Subscription Active!", { id: toastId });
                    window.location.href = '/'; 
                } catch (err) {
                    toast.error("Activation pending.");
                    navigate('/', { replace: true });
                }
            };
            refreshProfile();
        }
    }, [searchParams, navigate]);

    // --- Effects: Data Fetching ---
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [mRes, hRes] = await Promise.all([
                    api.get('/live_matrix'),
                    api.get('/signal_history')
                ]);
                setMatrixData(mRes.data.results || []);
                setHistoryData(hRes.data.results || []);
                setMatrixStatus('active');
            } catch (err) {
                if (err.response?.status === 403 || err.response?.status === 401) {
                    setMatrixStatus('unpaid');
                }
            }
            const userStr = localStorage.getItem('user');
            if (userStr) setApiKey(JSON.parse(userStr).api_key);
        };
        fetchData();
    }, []);

    // --- Memoized Data: Matrix Grid ---
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

    // --- Memoized Data: Active Signals List (Aggregated) ---
    const activeSignals = useMemo(() => {
        const groups = {};
        matrixData.forEach(d => {
            if (!groups[d.asset]) groups[d.asset] = { score: 0, lastUpdate: d.updated_at, tf: d.tf };
            groups[d.asset].score += d.signal_val;
        });

        return Object.entries(groups)
            .map(([asset, data]) => {
                const { start, end } = getCandleTimes(data.lastUpdate, data.tf);
                return {
                    asset,
                    direction: data.score > 0 ? 'Long' : (data.score < 0 ? 'Short' : null),
                    start: formatDateTime(start),
                    end: formatDateTime(end),
                    score: data.score
                };
            })
            .filter(s => s.direction !== null);
    }, [matrixData]);

    // --- Memoized Data: Performance & History ---
    const { accuracy, totalPnL, enrichedHistory } = useMemo(() => {
        let wins = 0, totalTracked = 0, cumulativePnL = 0;
        const processed = historyData.map(row => {
            const entry = parseFloat(row.price_at_signal);
            const close = parseFloat(row.close_price);
            let pnl = 0;
            if (entry && close) {
                pnl = (row.signal === 'BUY' || row.signal === 1) 
                    ? ((close - entry) / entry) * 100 
                    : ((entry - close) / entry) * 100;
            }
            if (row.outcome === 'WIN') wins++;
            if (row.outcome) totalTracked++;
            cumulativePnL += pnl;

            const { start, end } = getCandleTimes(row.time_str, row.tf || '15m');
            return { ...row, pnlVal: pnl, fmtStart: formatDateTime(start), fmtEnd: formatDateTime(end) };
        });

        return { 
            accuracy: totalTracked > 0 ? ((wins / totalTracked) * 100).toFixed(1) : 0,
            totalPnL: cumulativePnL.toFixed(2),
            enrichedHistory: processed
        };
    }, [historyData]);

    const handleSubscribe = async () => {
        try {
            const res = await api.post('/create-checkout-session');
            window.location.href = res.data.url;
        } catch (err) { 
            navigate('/login');
        }
    };

    const isLocked = matrixStatus === 'unpaid';

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px', fontFamily: 'sans-serif', animation: 'fadeIn 0.5s ease-in' }}>
            
            {/* Header Section */}
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem' }}>
                <div>
                    <h2 style={{ margin: 0 }}>Trading Intelligence</h2>
                    <p style={{ margin: '5px 0 0', color: '#666', fontSize: '0.9rem' }}>Probabilistic market signals for education.</p>
                </div>
                <div style={{ textAlign: 'right', fontSize: '0.8rem', color: '#888' }}>
                    Last Update: {matrixData.length > 0 ? formatDateTime(matrixData[0].updated_at) : 'Connecting...'}
                </div>
            </header>

            {/* Live Signal Matrix Grid */}
            <section style={{ marginBottom: '3rem' }}>
                <h3 style={{ borderBottom: '1px solid #eee', paddingBottom: '10px' }}>Live Signal Matrix</h3>
                {!isLocked ? (
                    <div style={{ overflowX: 'auto' }}>
                        <table>
                            <thead>
                                <tr>
                                    <th style={{ textAlign: 'left' }}>Asset</th>
                                    {TF_ORDER.map(tf => <th key={tf}>{tf}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {assets.map(asset => (
                                    <tr key={asset}>
                                        <td style={{ fontWeight: '600', padding: '12px 8px' }}>{asset}</td>
                                        {TF_ORDER.map(tf => (
                                            <td key={tf} style={{ padding: '8px' }}>{getSignalBadge(grid[asset]?.[tf])}</td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div style={{ background: '#f9fafb', borderRadius: '12px', padding: '3rem', textAlign: 'center', border: '1px dashed #ccc' }}>
                        <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🔒</div>
                        <h4>Premium Access Required</h4>
                        <p style={{ color: '#666' }}>Unlock the full timeframe matrix and real-time signals.</p>
                        <button onClick={handleSubscribe} style={{ padding: '10px 24px', cursor: 'pointer', background: '#000', color: '#fff', border: 'none', borderRadius: '6px' }}>
                            Start Free Trial — 49.90€/mo
                        </button>
                    </div>
                )}
            </section>

            {/* Aggregated Active Signals List */}
            {!isLocked && activeSignals.length > 0 && (
                <section style={{ marginBottom: '3rem' }}>
                    <h3 style={{ borderBottom: '1px solid #eee', paddingBottom: '10px' }}>Current Active Signals</h3>
                    <table>
                        <thead>
                            <tr>
                                <th style={{ textAlign: 'left' }}>Direction</th>
                                <th style={{ textAlign: 'left' }}>Asset</th>
                                <th style={{ textAlign: 'left' }}>Validity Start (UTC)</th>
                                <th style={{ textAlign: 'left' }}>Validity End (UTC)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {activeSignals.map((row, i) => (
                                <tr key={i}>
                                    <td style={{ padding: '10px 8px' }}>
                                        <b style={{ color: row.direction === 'Long' ? '#10b981' : '#ef4444' }}>{row.direction}</b>
                                    </td>
                                    <td>{row.asset}</td>
                                    <td>{row.start}</td>
                                    <td>{row.end}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </section>
            )}

            {/* Performance Stats Cards */}
            <section style={{ marginBottom: '3rem' }}>
                <h3 style={{ borderBottom: '1px solid #eee', paddingBottom: '10px' }}>7D Performance History</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', margin: '1.5rem 0' }}>
                    <div style={{ background: '#fff', padding: '1.25rem', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                        <div style={{ fontSize: '0.7rem', color: '#888', fontWeight: 'bold', marginBottom: '5px' }}>WIN RATE</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: '800' }}>{accuracy}%</div>
                    </div>
                    <div style={{ background: '#fff', padding: '1.25rem', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                        <div style={{ fontSize: '0.7rem', color: '#888', fontWeight: 'bold', marginBottom: '5px' }}>TOTAL ACCUMULATED PNL</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: '800', color: totalPnL >= 0 ? '#10b981' : '#ef4444' }}>
                            {totalPnL > 0 ? '+' : ''}{totalPnL}%
                        </div>
                    </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table className="history-table">
                        <thead>
                            <tr>
                                <th style={{ textAlign: 'left' }}>Asset</th>
                                <th style={{ textAlign: 'left' }}>Signal Time</th>
                                <th style={{ textAlign: 'left' }}>Expiration</th>
                                <th style={{ textAlign: 'left' }}>PnL %</th>
                                <th style={{ textAlign: 'left' }}>Outcome</th>
                            </tr>
                        </thead>
                        <tbody>
                            {enrichedHistory.map((row, i) => (
                                <tr key={i}>
                                    <td style={{ fontWeight: '500', padding: '10px 8px' }}>{row.asset} <span style={{ fontSize: '10px', color: '#999' }}>({row.tf})</span></td>
                                    <td style={{ fontSize: '0.85rem' }}>{row.fmtStart}</td>
                                    <td style={{ fontSize: '0.85rem' }}>{row.fmtEnd}</td>
                                    <td style={{ fontWeight: '700', color: row.pnlVal >= 0 ? '#10b981' : '#ef4444' }}>
                                        {row.pnlVal > 0 ? '+' : ''}{row.pnlVal.toFixed(2)}%
                                    </td>
                                    <td>
                                        <span style={{ color: row.outcome === 'WIN' ? '#10b981' : '#ef4444', fontWeight: 'bold', fontSize: '0.8rem' }}>
                                            {row.outcome}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* Footer / Developer Section */}
            <footer style={{ marginTop: '4rem', borderTop: '1px solid #eee', paddingTop: '2rem' }}>
                {!isLocked && apiKey && (
                    <div style={{ padding: '1.5rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '2rem' }}>
                        <h4 style={{ margin: '0 0 0.5rem 0' }}>Developer API Access</h4>
                        <code style={{ wordBreak: 'break-all', display: 'block', padding: '10px', background: '#fff', border: '1px solid #ddd' }}>{apiKey}</code>
                    </div>
                )}
                
                <div style={{ display: 'flex', gap: '20px', fontSize: '0.9rem' }}>
                    <Link to="/impressum" style={{ color: '#666' }}>Impressum</Link>
                    <Link to="/privacy" style={{ color: '#666' }}>Privacy Policy</Link>
                    <Link to="/terms" style={{ color: '#666' }}>Terms of Service</Link>
                </div>
                <p style={{ fontSize: '11px', color: '#999', marginTop: '20px', lineHeight: '1.6' }}>
                    Disclaimer: All signals are theoretical outcomes of probabilistic modeling. Past performance is not indicative of future results.
                </p>
            </footer>
        </div>
    );
}
