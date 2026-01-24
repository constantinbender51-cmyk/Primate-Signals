import { useEffect, useState, useMemo } from 'react';
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
        // Note: Logic in useEffect handles live stats, but if 'backtest' returns raw, we might need check. 
        // Assuming backtest/recent endpoints return same RAW format, we multiply here to be safe or ensure backend sends %
     
        // Based on user prompt "PnL from the API is a raw number", we multiply.
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
                        
                                <td style={{ padding: '12px', textAlign: 'right' }}>{t.exit_price ||
'-'}</td>
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
    
    // Fee State
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
                
                // Process Backtest & Recent
                // Multiply RAW PnL by 100 for display
                const btData = btRes.data;
                if (btData && btData.cumulative_pnl != null) {
                    btData.cumulative_pnl = btData.cumulative_pnl * 100;
                }

                const recData = recRes.data;
                if (recData && recData.cumulative_pnl != null) {
                    recData.cumulative_pnl = recData.cumulative_pnl * 100;
                }

                setBacktest(btData);
                setRecent(recData);
                
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

    // Calculate Fee Adjusted Curve for Live Data
    const { feeAdjustedData, feeAdjustedPnL } = useMemo(() => {
        if (!liveHistory || liveHistory.length === 0) return { feeAdjustedData: [], feeAdjustedPnL: 0 };
        
        let running = 0;
        // Sort ascending for chart
        const sorted = [...liveHistory].sort((a, b) => new Date(a.time) - new Date(b.time));
        
        const curve = sorted.map(t => {
            const rawPnl = parseFloat(t.pnl) || 0;
            // Fee is treated as a percentage input (e.g. 0.06%), so divide by 100 to subtract from raw
            const netTrade = rawPnl - (fee / 100); 
            running += netTrade;
            
            return {
                time: t.time || t.timestamp,
                // EquityChart expects raw number that it will multiply by 100
                cum_pnl: running 
            };
        });

        return { feeAdjustedData: curve, feeAdjustedPnL: (running * 100).toFixed(2) };
    }, [liveHistory, fee]);

    const handleSubscribe = async () => {
        try {
            const res = await api.post('/create-checkout-session');
            window.location.href = res.data.url;
        } catch (err) { toast.error("Checkout unavailable"); }
    };
    // Helper to get date range string
    const getDateRange = (list) => {
        if(!list || list.length === 0) return "N/A";
        const start = new Date(list[list.length-1].time || list[list.length-1].timestamp);
        const end = new Date(list[0].time || list[0].timestamp);
        return `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
    };
    if (loading) return <div style={{ padding: '80px', textAlign: 'center', color: '#6b7280' }}>Initializing Primate data stream...</div>;
    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '80px', animation: 'fadeIn 0.4s ease-out' }}>
            {/* Header / Nav */}
            <div style={{ marginBottom: '30px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                <button onClick={() => navigate('/')} style={{ background: 'none', border: '1px solid #ddd', color: '#666', padding: '6px 12px' }}>&larr; Dashboard</button>
       
                <h1 style={{ margin: 0, fontSize: '2rem' }}>{symbol} Analysis</h1>
            </div>

            {/* 1. TOP: Current Signal Status */}
            <section style={{ marginBottom: '50px' }}>
                <h3 style={{ borderBottom: '1px solid #e5e7eb', paddingBottom: '10px', marginTop: 0 }}>Current Signal</h3>
           
      
                {locked ? (
                    <div style={{ 
                        background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '12px', padding: '40px', 
                     
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' 
                    }}>
                        <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#475569', marginBottom: '16px' }}>Signal Data Locked</div>
                        <p style={{ color: '#64748b', marginBottom: '24px' }}>Start your free 
                                    trial to view real-time entry and exit signals.</p>
                        <button onClick={handleSubscribe} style={{ padding: '12px 32px', fontSize: '16px' }}>Try for Free</button>
                    </div>
                ) : (
                    <div 
                        style={{ 
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

            {/* 2. LIVE SECTION */}
            <section style={{ marginBottom: '50px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '15px' }}>
                     <h3 style={{ margin: 0 }}>Live Performance</h3>
                     <span style={{ fontSize: '12px', background: '#dbeafe', color: '#1e40af', padding: 
'4px 10px', borderRadius: '20px', fontWeight: '600' }}>REAL-TIME</span>
                </div>
                <SectionStats 
                    data={liveStats} 
                    timeSpanLabel={getDateRange(liveHistory)} 
                />

                {/* FEE CALCULATOR SECTION */}
                <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                        <h4 style={{ margin: 0, color: '#334155', fontSize: '15px' }}>Fee Simulation</h4>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <label style={{ fontSize: '13px', color: '#64748b' }}>Fee per Trade (%):</label>
                            <input 
                                type="number" 
                                step="0.01" 
                                value={fee} 
                                onChange={(e) => setFee(Number(e.target.value))}
                                style={{ padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', width: '80px', fontWeight: 'bold' }} 
                            />
                        </div>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '20px', alignItems: 'center', marginBottom: '15px' }}>
                         <div style={{ fontSize: '13px', color: '#64748b' }}>Adjusted Net PnL:</div>
                         <div style={{ fontSize: '20px', fontWeight: '800', color: feeAdjustedPnL >= 0 ? '#10b981' : '#ef4444' }}>
                             {feeAdjustedPnL > 0 ? '+' : ''}{feeAdjustedPnL}%
                         </div>
                    </div>
                    <EquityChart data={feeAdjustedData} />
                </div>
                
                <HistoryTable trades={liveHistory} />
            </section>

            {/* 3. RECENT SECTION (14 DAYS) */}
            <section style={{ marginBottom: '50px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '15px' }}>
             
                     <h3 style={{ margin: 0 }}>Recent Validation (14 Days)</h3>
                     <span style={{ fontSize: '12px', background: '#f3f4f6', color: '#4b5563', padding: '4px 10px', borderRadius: '20px', fontWeight: '600' }}>OUT-OF-SAMPLE</span>
                </div>
                <SectionStats 
                
                    data={recent} 
                    timeSpanLabel="Last 14 Days" 
                />
                <EquityChart data={recent?.equity_curve} />
                <HistoryTable trades={recent?.trades ||
[]} />
            </section>

            {/* 4. BACKTEST SECTION */}
            <section>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '15px' }}>
                     <h3 style={{ margin: 0 }}>Historical Backtest</h3>
       
                      <span style={{ fontSize: '12px', background: '#f3f4f6', color: '#4b5563', padding: '4px 10px', borderRadius: '20px', fontWeight: '600' }}>IN-SAMPLE</span>
                </div>
                <SectionStats 
                    data={backtest} 
                 
                    timeSpanLabel={backtest ? "2020 - 2023" : "All Time"} 
                />
                <EquityChart data={backtest?.equity_curve} />
                <HistoryTable trades={backtest?.trades ||
[]} />
            </section>

        </div>
    );
}
