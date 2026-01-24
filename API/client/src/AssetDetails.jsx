import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from './api';
import toast from 'react-hot-toast';

// --- Reusable Components ---

const StatBox = ({ label, value, color, sub }) => (
    <div style={{ background: '#f9fafb', padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
        <div style={{ fontSize: '11px', color: '#6b7280', textTransform: 'uppercase', marginBottom: '4px', fontWeight: '600' }}>{label}</div>
        <div style={{ fontSize: '18px', fontWeight: 'bold', color: color || '#111827' }}>{value}</div>
        {sub && <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>{sub}</div>}
    </div>
);

const SectionStats = ({ data, timeSpanLabel }) => {
    if (!data) return null;
    const isPositive = data.cumulative_pnl >= 0;
    const wins = data.correct_trades || 0;
    const total = data.total_trades || 0;
    // PnL already multiplied by 100 in logic below before being passed here
    const pnlVal = parseFloat(data.cumulative_pnl).toFixed(2);
    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <StatBox label="Time Span" value={timeSpanLabel || 'N/A'} />
            <StatBox label="Net PnL" value={(isPositive ? '+' : '') + pnlVal + '%'} color={isPositive ? '#10b981' : '#ef4444'} />
            <StatBox label="Accuracy" value={`${data.accuracy_percent}%`} color="#2563eb" />
            <StatBox label="Win / Total" 
                value={`${wins} / ${total}`} sub={`Win Rate: ${Math.round((wins/total)*100) || 0}%`} />
        </div>
    );
};

const EquityChart = ({ data }) => {
    if (!data || data.length === 0) return <div style={{ height: '200px', background: '#f9fafb', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', marginBottom: '24px' }}>No Chart Data</div>;
    const height = 250;
    const width = 800;
    const padding = 20;
    // Normalize data
    const points = data.map(d => ({
        time: new Date(d.timestamp || d.time), 
        // Ensure val is multiplied by 100 if it hasn't been already. 
        val: (d.cum_pnl || d.pnl) * 100 
    })).sort((a,b) => a.time - b.time);

    if (points.length < 2) return null;

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
        <div style={{ border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px', background: '#fff', marginBottom: '24px', overflow: 'hidden' }}>
            <h4 style={{ margin: '0 0 15px 0', color: '#374151', fontSize: '14px', textTransform: 'uppercase' }}>Equity Curve</h4>
            <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
                <line x1={padding} y1={zeroY} x2={width-padding} y2={zeroY} stroke="#9ca3af" strokeWidth="1" strokeDasharray="4" opacity="0.5" 
                />
                <path d={pathD} fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        </div>
    );
};

const HistoryTable = ({ trades }) => {
    const [page, setPage] = useState(1);
    const ITEMS = 10;
    
    if (!trades || trades.length === 0) return <div style={{ fontStyle: 'italic', color: '#9ca3af' }}>No history available.</div>;
    const totalPages = Math.ceil(trades.length / ITEMS);
    const currentData = trades.slice((page - 1) * ITEMS, page * ITEMS);
    return (
        <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden', background: '#fff' }}>
            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>
                        <tr>
                            <th style={{ padding: '12px', textAlign: 'left', color: '#64748b' }}>Time</th>
                            <th style={{ padding: '12px', textAlign: 'left', color: '#64748b' }}>Signal</th>
                            <th style={{ padding: '12px', textAlign: 'right', color: '#64748b' }}>Entry</th>
                            <th style={{ padding: '12px', textAlign: 'right', color: '#64748b' }}>Exit</th>
                            <th style={{ padding: '12px', textAlign: 'right', color: '#64748b' }}>PnL</th>
                        </tr>
                    </thead>
                    <tbody>
                        {currentData.map((t, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                <td style={{ padding: '12px' }}>{new Date(t.time ||
                                t.timestamp).toLocaleDateString()} <span style={{color:'#94a3b8'}}>{new Date(t.time || t.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span></td>
                                <td style={{ padding: '12px' }}>
                                    {t.pred_dir === 1 ?
                                    <span style={{color: '#10b981', fontWeight: '600'}}>LONG</span> : 
                                     t.pred_dir === -1 ?
                                    <span style={{color: '#dc2626', fontWeight: '600'}}>SHORT</span> : 'FLAT'}
                                </td>
                                <td style={{ padding: '12px', textAlign: 'right' }}>{t.entry_price}</td>
                                <td style={{ padding: '12px', textAlign: 'right' }}>{t.exit_price || '-'}</td>
                                <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: t.pnl > 0 ?
                                '#10b981' : t.pnl < 0 ? '#ef4444' : '#64748b' }}>
                                    {t.pnl ?
                                        // Multiply PnL by 100 here for display
                                        (t.pnl > 0 ? '+' : '') + (Number(t.pnl) * 100).toFixed(2) + '%' 
                                        : '-'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {totalPages > 1 && (
                <div style={{ padding: '10px', display: 'flex', justifyContent: 'flex-end', gap: '8px', background: '#f8fafc', borderTop: '1px solid #e5e7eb' }}>
                    <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page===1} style={{ padding: '4px 10px', fontSize: '12px', background: '#fff', border: '1px solid #cbd5e1', color: '#334155' }}>Prev</button>
                    <span style={{ fontSize: '12px', alignSelf: 'center', color: '#64748b' }}>{page} / {totalPages}</span>
                    <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page===totalPages} style={{ padding: '4px 10px', fontSize: '12px', background: '#fff', border: '1px solid #cbd5e1', color: '#334155' }}>Next</button>
                </div>
            )}
        </div>
    );
};

// --- Main Page Component ---

export default function AssetDetails() {
    const { symbol } = useParams();
    const navigate = useNavigate();
    
    // Data State
    const [backtest, setBacktest] = useState(null);
    const [recent, setRecent] = useState(null);
    const [liveHistory, setLiveHistory] = useState([]);
    const [liveStats, setLiveStats] = useState(null);
    // Derived stats for live
    const [currentSignal, setCurrentSignal] = useState(null);
    
    // Fee Calculation State
    const [fee, setFee] = useState(0.06);

    const [loading, setLoading] = useState(true);
    const [locked, setLocked] = useState(false);

    useEffect(() => {
        const fetchAll = async () => {
            setLoading(true);
            try {
                const [btRes, recRes, liveRes] = await Promise.all([
                    api.get(`/api/signals/${symbol}/backtest`),
                    api.get(`/api/signals/${symbol}/recent`),
                    api.get(`/api/signals/${symbol}/live`)
                ]);
                
                const formatStats = (data) => {
                    if (!data) return null;
                    return {
                        ...data,
                        cumulative_pnl: (parseFloat(data.cumulative_pnl) || 0) * 100
                    };
                };

                setBacktest(formatStats(btRes.data));
                setRecent(formatStats(recRes.data));
                
                const lHist = Array.isArray(liveRes.data) ?
                liveRes.data : (liveRes.data.results || []);
                setLiveHistory(lHist.sort((a,b) => new Date(b.time) - new Date(a.time)));
                
                // Derive stats for Live
                if(lHist.length > 0) {
                     const total = lHist.length;
                     const wins = lHist.filter(t => t.pnl > 0).length;
                     
                     // Sum RAW pnl then multiply by 100
                     const rawCumPnl = lHist.reduce((acc, t) => acc + (parseFloat(t.pnl)||0), 0);
                     const cumPnl = rawCumPnl * 100;

                     setLiveStats({
                         cumulative_pnl: cumPnl,
                         total_trades: total,
                         correct_trades: wins,
                         accuracy_percent: ((wins/total)*100).toFixed(1)
                     });
                }

                // Private Data
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
                toast.error("Could not load asset data.");
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

    const getDateRange = (list) => {
        if(!list || list.length === 0) return "N/A";
        const start = new Date(list[list.length-1].time || list[list.length-1].timestamp);
        const end = new Date(list[0].time || list[0].timestamp);
        return `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
    };

    // Filter out flat predictions (0 or null)
    const activeLiveTrades = liveHistory.filter(t => t.pred_dir === 1 || t.pred_dir === -1);

    // Calculate Realistic PnL
    const calculateRealisticPnL = () => {
        if (!activeLiveTrades.length) return "0.00";
        // Gross PnL in percentage (e.g. 15.5)
        const grossPnL = activeLiveTrades.reduce((acc, t) => acc + (parseFloat(t.pnl) || 0), 0) * 100;
        // Total Fees = Number of trades * Fee per trade
        const totalFees = activeLiveTrades.length * parseFloat(fee || 0);
        return (grossPnL - totalFees).toFixed(2);
    };

    if (loading) return <div style={{ padding: '80px', textAlign: 'center', color: '#6b7280' }}>Initializing Primate data stream...</div>;

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '80px', animation: 'fadeIn 0.4s ease-out' }}>
            {/* Header / Nav */}
            <div style={{ marginBottom: '30px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                <button onClick={() => navigate('/')} style={{ background: 'none', border: '1px solid #ddd', color: '#666', padding: '6px 12px' }}>&larr; Dashboard</button>
                <h1 style={{ margin: 0, fontSize: '2rem' }}>{symbol} Analysis</h1>
            </div>

            {/* SECTION 1: LIVE ANALYSIS */}
            <div style={{ marginBottom: '60px' }}>
                <h2 style={{ fontSize: '1.5rem', borderBottom: '2px solid #e5e7eb', paddingBottom: '10px', marginBottom: '24px', color: '#111827' }}>Live Analysis</h2>
                
                <section style={{ marginBottom: '32px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '15px' }}>
                         <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#374151' }}>Current Signal</h3>
                         <span style={{ fontSize: '12px', background: '#dbeafe', color: '#1e40af', padding: '4px 10px', borderRadius: '20px', fontWeight: '600' }}>REAL-TIME</span>
                    </div>
                    
                    {locked ? (
                        <div style={{ 
                            background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '12px', padding: '40px', 
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' 
                        }}>
                            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#475569', marginBottom: '16px' }}>Signal Data Locked</div>
                            <p style={{ color: '#64748b', marginBottom: '24px' }}>Start your free trial to view real-time entry and exit signals.</p>
                            <button onClick={handleSubscribe} style={{ padding: '12px 32px', fontSize: '16px' }}>Try for Free</button>
                        </div>
                    ) : (
                        <div style={{ 
                            background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '24px',
                            display: 'flex', flexWrap: 'wrap', gap: '40px', alignItems: 'center', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
                        }}>
                             <div>
                                 <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: '700', textTransform: 'uppercase' }}>Direction</div>
                                 <div style={{ fontSize: '24px', fontWeight: '800', marginTop: '4px' }}>
                                      {currentSignal?.pred_dir === 1 ?
                                      <span style={{color: '#059669'}}>LONG</span> : 
                                      currentSignal?.pred_dir === -1 ?
                                      <span style={{color: '#dc2626'}}>SHORT</span> : 'NEUTRAL'}
                                 </div>
                             </div>
                             <div>
                                 <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: '700', textTransform: 'uppercase' }}>Entry Price</div>
                                 <div style={{ fontSize: '24px', fontWeight: '600', color: '#111827', marginTop: '4px' }}>
                                     ${currentSignal?.entry_price}
                                 </div>
                             </div>
                             <div>
                                 <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: '700', textTransform: 'uppercase' }}>Generated At</div>
                                 <div style={{ fontSize: '16px', color: '#374151', marginTop: '8px' }}>
                                     {currentSignal?.time}
                                 </div>
                             </div>
                        </div>
                    )}
                </section>

                <section>
                    <h3 style={{ margin: '0 0 15px 0', fontSize: '1.1rem', color: '#374151' }}>Live Prediction History</h3>
                    <SectionStats 
                        data={liveStats} 
                        timeSpanLabel={getDateRange(activeLiveTrades)} 
                    />
                    {/* Exclude flat predictions (passed activeLiveTrades instead of liveHistory) */}
                    <HistoryTable trades={activeLiveTrades} />
                </section>
            </div>

            {/* SECTION 2: PROOF */}
            <div style={{ marginBottom: '60px' }}>
                <h2 style={{ fontSize: '1.5rem', borderBottom: '2px solid #e5e7eb', paddingBottom: '10px', marginBottom: '24px', color: '#111827' }}>Strategy Proof</h2>

                <section style={{ marginBottom: '40px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '15px' }}>
                         <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#374151' }}>Recent Validation (14 Days)</h3>
                         <span style={{ fontSize: '12px', background: '#f3f4f6', color: '#4b5563', padding: '4px 10px', borderRadius: '20px', fontWeight: '600' }}>OUT-OF-SAMPLE</span>
                    </div>
                    <SectionStats 
                        data={recent} 
                        timeSpanLabel="Last 14 Days" 
                    />
                    <EquityChart data={recent?.equity_curve} />
                </section>

                <section>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '15px' }}>
                         <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#374151' }}>Historical Backtest</h3>
                         <span style={{ fontSize: '12px', background: '#f3f4f6', color: '#4b5563', padding: '4px 10px', borderRadius: '20px', fontWeight: '600' }}>IN-SAMPLE</span>
                    </div>
                    <SectionStats 
                        data={backtest} 
                        timeSpanLabel={backtest ? "2020 - 2023" : "All Time"} 
                    />
                    <EquityChart data={backtest?.equity_curve} />
                </section>
            </div>

            {/* SECTION 3: FEE CALCULATION */}
            <div style={{ borderTop: '4px solid #3b82f6', background: '#eff6ff', borderRadius: '8px', padding: '24px' }}>
                <h3 style={{ margin: '0 0 16px 0', color: '#1e3a8a' }}>Fee Calculation (Live Predictions)</h3>
                <p style={{ fontSize: '14px', color: '#475569', marginBottom: '20px' }}>
                    Calculate your realistic PnL by applying your exchange fee per trade to the live history. 
                    Calculated on {activeLiveTrades.length} non-flat predictions.
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'flex-end' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>
                            Fee per Trade (%)
                        </label>
                        <input 
                            type="number" 
                            step="0.01"
                            value={fee}
                            onChange={(e) => setFee(e.target.value)}
                            style={{ 
                                padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px', width: '120px',
                                fontSize: '16px', fontWeight: '600', color: '#334155'
                            }} 
                        />
                    </div>
                    <div style={{ flex: 1, minWidth: '200px', background: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                        <div style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', fontWeight: '700' }}>Realistic Net PnL</div>
                        <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#2563eb', marginTop: '4px' }}>
                            {calculateRealisticPnL()}%
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
}
