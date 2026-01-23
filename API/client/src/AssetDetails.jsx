import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from './api';
import toast from 'react-hot-toast';

// --- Helper Components ---
const StatBox = ({ label, value, color }) => (
    <div style={{ background: '#f9fafb', padding: '16px', borderRadius: '8px', border: '1px solid #eee' }}>
        <div style={{ fontSize: '12px', color: '#6b7280', textTransform: 'uppercase', marginBottom: '4px' }}>{label}</div>
        <div style={{ fontSize: '20px', fontWeight: 'bold', color: color || '#111827' }}>{value}</div>
    </div>
);

const SignalBadge = ({ dir }) => {
    if (dir === 1) return <span style={{ background: '#ecfdf5', color: '#059669', padding: '6px 12px', borderRadius: '20px', fontWeight: '700' }}>LONG (BUY)</span>;
    if (dir === -1) return <span style={{ background: '#fef2f2', color: '#dc2626', padding: '6px 12px', borderRadius: '20px', fontWeight: '700' }}>SHORT (SELL)</span>;
    return <span style={{ background: '#f3f4f6', color: '#4b5563', padding: '6px 12px', borderRadius: '20px', fontWeight: '700' }}>FLAT (WAIT)</span>;
};

const EquityChart = ({ data }) => {
    if (!data || data.length === 0) return <div style={{ height: '250px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#aaa' }}>No Chart Data</div>;

    const height = 250;
    const width = 800;
    const padding = 30;

    const points = data.map(d => ({
        time: new Date(d.timestamp + (d.timestamp.endsWith('Z') ? '' : 'Z')), 
        val: d.cum_pnl
    })).sort((a,b) => a.time - b.time);

    const minVal = Math.min(0, ...points.map(p => p.val));
    const maxVal = Math.max(0, ...points.map(p => p.val));
    const rangeY = maxVal - minVal || 1;
    const minTime = points[0].time.getTime();
    const maxTime = points[points.length - 1].time.getTime();
    const rangeX = maxTime - minTime || 1;

    const getX = t => padding + ((t.getTime() - minTime) / rangeX) * (width - padding * 2);
    const getY = v => (height - padding) - ((v - minVal) / rangeY) * (height - padding * 2);
    const zeroY = getY(0);

    const pathD = points.map((p, i) => `${i===0?'M':'L'} ${getX(p.time)} ${getY(p.val)}`).join(' ');

    return (
        <div style={{ border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px', background: '#fff', marginBottom: '30px' }}>
            <h4 style={{ margin: '0 0 15px 0', color: '#374151' }}>Backtest Equity Curve</h4>
            <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
                <line x1={padding} y1={zeroY} x2={width-padding} y2={zeroY} stroke="#9ca3af" strokeWidth="1" strokeDasharray="4" opacity="0.5" />
                <path d={pathD} fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        </div>
    );
};

export default function AssetDetails() {
    const { symbol } = useParams();
    const navigate = useNavigate();
    
    const [currentSignal, setCurrentSignal] = useState(null);
    const [liveHistory, setLiveHistory] = useState([]);
    const [backtest, setBacktest] = useState(null);
    const [recent, setRecent] = useState(null);
    
    const [page, setPage] = useState(1);
    const ITEMS_PER_PAGE = 10;
    
    const [loading, setLoading] = useState(true);
    const [locked, setLocked] = useState(false);

    useEffect(() => {
        const fetchAll = async () => {
            setLoading(true);
            try {
                // Fetch Public Data (Guests allowed)
                const [btRes, recRes, liveRes] = await Promise.all([
                    api.get(`/api/signals/${symbol}/backtest`),
                    api.get(`/api/signals/${symbol}/recent`),
                    api.get(`/api/signals/${symbol}/live`)
                ]);
                
                setBacktest(btRes.data);
                setRecent(recRes.data);
                
                const history = liveRes.data.results || liveRes.data;
                if(Array.isArray(history)) {
                    setLiveHistory(history.sort((a,b) => new Date(b.time) - new Date(a.time)));
                }

                // Try Fetch Current Signal (Private)
                try {
                    const curRes = await api.get(`/api/signals/${symbol}/current`);
                    setCurrentSignal(curRes.data);
                    setLocked(false);
                } catch (err) {
                    if (err.response?.status === 403 || err.response?.status === 401) {
                        setLocked(true);
                    }
                }

            } catch (err) {
                console.error(err);
                toast.error("Failed to load data");
            } finally {
                setLoading(false);
            }
        };

        if (symbol) fetchAll();
    }, [symbol]);

    const handleSubscribe = async () => {
        try {
            const res = await api.post('/create-checkout-session');
            window.location.href = res.data.url;
        } catch (err) { toast.error("Checkout unavailable"); }
    };

    if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>;

    const totalPages = Math.ceil(liveHistory.length / ITEMS_PER_PAGE);
    const paginatedHistory = liveHistory.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '60px' }}>
            <div style={{ marginBottom: '30px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                <button onClick={() => navigate('/dashboard')} style={{ background: 'none', border: '1px solid #ddd', color: '#666' }}>&larr; Back</button>
                <h1 style={{ margin: 0 }}>{symbol === 'ALL' ? 'Portfolio Overview' : `${symbol} Analysis`}</h1>
            </div>

            {/* Current Signal Section */}
            <section style={{ marginBottom: '40px' }}>
                <h3 style={{ borderBottom: '1px solid #eee', paddingBottom: '10px' }}>Current Status</h3>
                
                {locked ? (
                    <div style={{ background: '#f3f4f6', border: '1px dashed #9ca3af', borderRadius: '12px', padding: '40px', textAlign: 'center' }}>
                        <div style={{ filter: 'blur(4px)', opacity: 0.5 }}><h2>PREMIUM DATA LOCKED</h2></div>
                        <button onClick={handleSubscribe} style={{ marginTop: '-20px', position: 'relative', zIndex: 10 }}>Unlock Now</button>
                    </div>
                ) : (
                    <div style={{ 
                        background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '24px',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px'
                    }}>
                        <div>
                            <div style={{ fontSize: '12px', color: '#6b7280' }}>LAST UPDATE</div>
                            <div style={{ fontSize: '16px', fontWeight: '500' }}>{currentSignal?.time}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '12px', color: '#6b7280' }}>PRICE / STATUS</div>
                            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
                                {isNaN(currentSignal?.entry_price) ? currentSignal?.entry_price : `$${currentSignal?.entry_price}`}
                            </div>
                        </div>
                        <div>
                            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom:'5px' }}>SENTIMENT</div>
                            <SignalBadge dir={currentSignal?.pred_dir} />
                        </div>
                        <div style={{ flexBasis: '100%', borderTop: '1px solid #f3f4f6', paddingTop: '15px', color: '#4b5563' }}>
                            <strong>Note:</strong> {currentSignal?.note || 'No specific notes.'}
                        </div>
                    </div>
                )}
            </section>

            {/* Stats & Chart */}
            <section style={{ marginBottom: '40px' }}>
                <h3 style={{ borderBottom: '1px solid #eee', paddingBottom: '10px' }}>Performance</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                    <StatBox label="Total Trades" value={backtest?.total_trades} />
                    <StatBox label="Accuracy" value={`${backtest?.accuracy_percent}%`} color="#2563eb" />
                    <StatBox label="Cumulative PnL" value={backtest?.cumulative_pnl?.toFixed(4)} color={backtest?.cumulative_pnl >= 0 ? '#10b981' : '#ef4444'} />
                    <StatBox label="Winning Trades" value={backtest?.correct_trades || '-'} color="#10b981" />
                </div>
                {backtest?.equity_curve && <EquityChart data={backtest.equity_curve} />}
            </section>

            {/* History Table */}
            <section>
                <h3 style={{ borderBottom: '1px solid #eee', paddingBottom: '10px' }}>Global History</h3>
                <div style={{ overflowX: 'auto', background: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                        <thead style={{ background: '#f9fafb', color: '#6b7280', textTransform: 'uppercase', fontSize: '12px' }}>
                            <tr>
                                <th style={{ padding: '12px', textAlign: 'left' }}>Time</th>
                                <th style={{ padding: '12px', textAlign: 'left' }}>Dir</th>
                                <th style={{ padding: '12px', textAlign: 'left' }}>Entry</th>
                                <th style={{ padding: '12px', textAlign: 'left' }}>Exit</th>
                                <th style={{ padding: '12px', textAlign: 'left' }}>PnL</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedHistory.map((row, i) => (
                                <tr key={i} style={{ borderTop: '1px solid #f3f4f6' }}>
                                    <td style={{ padding: '12px', whiteSpace: 'nowrap' }}>{row.time}</td>
                                    <td style={{ padding: '12px' }}>
                                        {row.pred_dir === 1 ? <span style={{color: '#10b981'}}>LONG</span> : 
                                         row.pred_dir === -1 ? <span style={{color: '#ef4444'}}>SHORT</span> : 'FLAT'}
                                    </td>
                                    <td style={{ padding: '12px' }}>{row.entry_price}</td>
                                    <td style={{ padding: '12px' }}>{row.exit_price || '-'}</td>
                                    <td style={{ padding: '12px', fontWeight: 'bold', color: row.pnl > 0 ? '#10b981' : '#ef4444' }}>
                                        {row.pnl ? row.pnl.toFixed(5) : '0.00'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ background: '#fff', border: '1px solid #ddd', color: '#333' }}>Previous</button>
                    <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ background: '#fff', border: '1px solid #ddd', color: '#333' }}>Next</button>
                </div>
            </section>
        </div>
    );
}
