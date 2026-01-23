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
    // 1 = Long, -1 = Short, 0 = Flat
    if (dir === 1) return <span style={{ background: '#ecfdf5', color: '#059669', padding: '6px 12px', borderRadius: '20px', fontWeight: '700' }}>LONG (BUY)</span>;
    if (dir === -1) return <span style={{ background: '#fef2f2', color: '#dc2626', padding: '6px 12px', borderRadius: '20px', fontWeight: '700' }}>SHORT (SELL)</span>;
    return <span style={{ background: '#f3f4f6', color: '#4b5563', padding: '6px 12px', borderRadius: '20px', fontWeight: '700' }}>FLAT (WAIT)</span>;
};

const EquityChart = ({ data }) => {
    if (!data || data.length === 0) return <div style={{ height: '250px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#aaa' }}>No Chart Data</div>;

    const height = 250;
    const width = 800;
    const padding = 30;

    // Parse data: { timestamp: "YYYY-MM-DD HH:mm:ss", cum_pnl: float }
    const points = data.map(d => ({
        time: new Date(d.timestamp + (d.timestamp.endsWith('Z') ? '' : 'Z')), // Force UTC
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
    
    // Data States
    const [currentSignal, setCurrentSignal] = useState(null);
    const [liveHistory, setLiveHistory] = useState([]);
    const [backtest, setBacktest] = useState(null);
    const [recent, setRecent] = useState(null);
    
    // UI States
    const [loading, setLoading] = useState(true);
    const [locked, setLocked] = useState(false);

    useEffect(() => {
        const fetchAll = async () => {
            setLoading(true);
            try {
                // 1. Fetch Stats & Chart (Public/Auth)
                const [btRes, recRes, liveRes] = await Promise.all([
                    api.get(`/api/signals/${symbol}/backtest`),
                    api.get(`/api/signals/${symbol}/recent`),
                    api.get(`/api/signals/${symbol}/live`)
                ]);
                
                setBacktest(btRes.data);
                setRecent(recRes.data);
                
                // Sort live history by time desc
                const history = liveRes.data.results || liveRes.data;
                if(Array.isArray(history)) {
                    setLiveHistory(history.sort((a,b) => new Date(b.time) - new Date(a.time)));
                }

                // 2. Try Fetch Current Signal (Paywalled)
                try {
                    const curRes = await api.get(`/api/signals/${symbol}/current`);
                    setCurrentSignal(curRes.data);
                    setLocked(false);
                } catch (err) {
                    if (err.response?.status === 403) {
                        setLocked(true);
                    }
                }

            } catch (err) {
                console.error(err);
                toast.error("Failed to load asset data");
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

    if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading analysis for {symbol}...</div>;

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '60px' }}>
            {/* Header */}
            <div style={{ marginBottom: '30px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                <button onClick={() => navigate('/')} style={{ background: 'none', border: '1px solid #ddd', color: '#666' }}>&larr; Back</button>
                <h1 style={{ margin: 0 }}>{symbol} Analysis (1H)</h1>
            </div>

            {/* Current Signal Section */}
            <section style={{ marginBottom: '40px' }}>
                <h3 style={{ borderBottom: '1px solid #eee', paddingBottom: '10px' }}>Current Prediction</h3>
                
                {locked ? (
                    <div style={{ 
                        background: '#f3f4f6', 
                        border: '1px dashed #9ca3af', 
                        borderRadius: '12px', 
                        padding: '40px', 
                        textAlign: 'center',
                        position: 'relative',
                        overflow: 'hidden'
                    }}>
                        <div style={{ filter: 'blur(4px)', opacity: 0.5, userSelect: 'none' }}>
                            <h2>LONG ENTRY @ 99,999</h2>
                            <p>Prediction confidence high.</p>
                        </div>
                        <div style={{ 
                            position: 'absolute', top: '50%', left: '50%', 
                            transform: 'translate(-50%, -50%)', 
                            background: '#fff', padding: '20px', 
                            borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                            textAlign: 'center', width: '80%', maxWidth: '300px'
                        }}>
                            <div style={{ fontWeight: 'bold', marginBottom: '10px' }}>Premium Signal</div>
                            <button onClick={handleSubscribe} style={{ width: '100%' }}>Unlock Now</button>
                        </div>
                    </div>
                ) : (
                    <div style={{ 
                        background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '24px',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px'
                    }}>
                        <div>
                            <div style={{ fontSize: '12px', color: '#6b7280' }}>TIME (UTC)</div>
                            <div style={{ fontSize: '16px', fontWeight: '500' }}>{currentSignal?.time}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '12px', color: '#6b7280' }}>ENTRY PRICE</div>
                            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>${currentSignal?.entry_price}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom:'5px' }}>DIRECTION</div>
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
                
                {/* Stats Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                    <StatBox label="Total Trades" value={backtest?.total_trades} />
                    <StatBox label="Accuracy" value={`${backtest?.accuracy_percent}%`} color="#2563eb" />
                    <StatBox label="Cumulative PnL" value={backtest?.cumulative_pnl?.toFixed(4)} color={backtest?.cumulative_pnl >= 0 ? '#10b981' : '#ef4444'} />
                    <StatBox label="Winning Trades" value={backtest?.correct_trades} color="#10b981" />
                </div>

                {/* Chart */}
                {backtest?.equity_curve && <EquityChart data={backtest.equity_curve} />}
            </section>

            {/* Recent History Table */}
            <section>
                <h3 style={{ borderBottom: '1px solid #eee', paddingBottom: '10px' }}>Recent History</h3>
                <div style={{ overflowX: 'auto', background: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                        <thead style={{ background: '#f9fafb', color: '#6b7280', textTransform: 'uppercase', fontSize: '12px' }}>
                            <tr>
                                <th style={{ padding: '12px', textAlign: 'left' }}>Time</th>
                                <th style={{ padding: '12px', textAlign: 'left' }}>Dir</th>
                                <th style={{ padding: '12px', textAlign: 'left' }}>Entry</th>
                                <th style={{ padding: '12px', textAlign: 'left' }}>Exit</th>
                                <th style={{ padding: '12px', textAlign: 'left' }}>Outcome</th>
                                <th style={{ padding: '12px', textAlign: 'left' }}>PnL</th>
                            </tr>
                        </thead>
                        <tbody>
                            {liveHistory.map((row, i) => (
                                <tr key={i} style={{ borderTop: '1px solid #f3f4f6' }}>
                                    <td style={{ padding: '12px', whiteSpace: 'nowrap' }}>{row.time}</td>
                                    <td style={{ padding: '12px' }}>
                                        {row.pred_dir === 1 ? <span style={{color: '#10b981', fontWeight: 'bold'}}>LONG</span> : 
                                         row.pred_dir === -1 ? <span style={{color: '#ef4444', fontWeight: 'bold'}}>SHORT</span> : 
                                         <span style={{color: '#9ca3af'}}>FLAT</span>}
                                    </td>
                                    <td style={{ padding: '12px', fontFamily: 'monospace' }}>{row.entry_price}</td>
                                    <td style={{ padding: '12px', fontFamily: 'monospace' }}>{row.exit_price || '-'}</td>
                                    <td style={{ padding: '12px' }}>
                                        {row.outcome === true || row.outcome === 'WIN' ? 
                                            <span style={{ background: '#ecfdf5', color: '#065f46', padding: '2px 6px', borderRadius: '4px', fontSize: '11px' }}>WIN</span> :
                                         row.outcome === false || row.outcome === 'LOSS' ? 
                                            <span style={{ background: '#fef2f2', color: '#991b1b', padding: '2px 6px', borderRadius: '4px', fontSize: '11px' }}>LOSS</span> :
                                            <span style={{ background: '#f3f4f6', color: '#374151', padding: '2px 6px', borderRadius: '4px', fontSize: '11px' }}>{row.outcome}</span>
                                        }
                                    </td>
                                    <td style={{ padding: '12px', fontWeight: 'bold', color: row.pnl > 0 ? '#10b981' : (row.pnl < 0 ? '#ef4444' : '#374151') }}>
                                        {row.pnl ? row.pnl.toFixed(5) : '0.00000'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}
