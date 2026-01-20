import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from './api';

// --- Utilities ---

const formatDateTime = (dateInput) => {
    if (!dateInput) return '-';
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return dateInput;
    // Format: YYYY-MM-DD HH:mm:ss
    return date.toLocaleString('sv-SE', { 
        year: 'numeric', month: '2-digit', day: '2-digit', 
        hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
};

const formatTimeOnly = (dateInput) => {
    if (!dateInput) return '-';
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });
};

const calculateExpiry = (baseDateStr, minutesToAdd) => {
    const date = new Date(baseDateStr);
    if (isNaN(date.getTime())) return null;
    return new Date(date.getTime() + minutesToAdd * 60000);
};

// Map USDT symbols to Kraken PF format (e.g., BCHUSDT -> PF_BCHUSD) for the CHART log matching
const mapSymbolToLogFormat = (symbol) => {
    if (!symbol) return '';
    const core = symbol.replace('USDT', '');
    return `PF_${core}USD`;
};

// --- Custom Chart Component ---
const PnLChart = ({ data }) => {
    if (!data || data.length < 2) return <div style={{height:'200px', display:'flex', alignItems:'center', justifyContent:'center', color:'#ccc'}}>Not enough data</div>;

    const height = 200;
    const width = 800;
    const padding = 20;

    const sorted = [...data].sort((a, b) => new Date(a.time) - new Date(b.time));

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
        <div style={{ position: 'relative', width: '100%', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '20px', background: '#fff' }}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#6b7280' }}>Cumulative PnL (GitHub Source)</h4>
            <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
                <line x1={padding} y1={zeroY} x2={width - padding} y2={zeroY} stroke="#9ca3af" strokeWidth="1" strokeDasharray="4" opacity="0.5" />
                <path d={pathD} fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div style={{ display:'flex', justifyContent:'space-between', marginTop: '5px', fontSize: '11px', color: '#9ca3af' }}>
                <span>{formatDateTime(points[0].time)}</span>
                <span>{formatDateTime(points[points.length-1].time)}</span>
            </div>
        </div>
    );
};

export default function Dashboard() {
    const [matrixData, setMatrixData] = useState([]);
    const [chartData, setChartData] = useState([]);  // Data from GitHub
    const [tableData, setTableData] = useState([]);  // Data from /history endpoint
    const [matrixStatus, setMatrixStatus] = useState('loading');
    const [searchParams] = useSearchParams();
    
    // Pagination for Table
    const [historyExpanded, setHistoryExpanded] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;
    
    const navigate = useNavigate();
    const cellStyle = { padding: '12px 10px', textAlign: 'left', borderBottom: '1px solid #eee', verticalAlign: 'top', fontSize: '14px' };

    useEffect(() => {
        const sessionId = searchParams.get('session_id');
        if (sessionId) {
            const verify = async () => {
                try {
                    await api.get('/auth/me'); 
                    toast.success("Subscription Active!");
                    navigate('/', { replace: true });
                } catch (e) { navigate('/', { replace: true }); }
            };
            verify();
        }
    }, [searchParams, navigate]);

    useEffect(() => {
        const fetchData = async () => {
            // 1. Live Matrix Fetch
            try {
                const res = await api.get('/live_matrix'); 
                const rawPayload = res.data.results || res.data;
                const transformed = Object.entries(rawPayload).map(([asset, data]) => ({
                    asset: asset,
                    sum: data.sum,
                    comp: data.comp || [0,0,0,0,0],
                    upd: data.upd
                }));
                setMatrixData(transformed);
                setMatrixStatus('active');
            } catch (err) {
                console.error("Matrix error", err);
                if (err.response?.status === 403 || err.response?.status === 401) setMatrixStatus('unpaid');
            }

            // 2. Chart Data Fetch (Keep GitHub Source)
            try {
                const res = await api.get('/api/proxy/history');
                const rawText = res.data;
                const trackedAssets = [
                    "BTCUSDT", "ETHUSDT", "SOLUSDT", "XRPUSDT", "ADAUSDT", "DOGEUSDT", 
                    "AVAXUSDT", "DOTUSDT", "LINKUSDT", "TRXUSDT", "BCHUSDT", "XLMUSDT", 
                    "LTCUSDT", "SUIUSDT", "HBARUSDT", "SHIBUSDT", "TONUSDT", "UNIUSDT", 
                    "ZECUSDT", "BNBUSDT"
                ];
                const validLogSymbols = new Set(trackedAssets.map(mapSymbolToLogFormat));
                validLogSymbols.add("PF_XBTUSD"); 

                const lines = rawText.split('\n');
                const parsedChart = [];
                const regex = /^(\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2})\s+(\S+)\s+(\S+)\s+([-\d.]+)\s+(.*)$/;

                lines.forEach(line => {
                    const match = line.match(regex);
                    if (match) {
                        const [_, timeStr, symbol, sizeStr, pnlStr, typeStr] = match;
                        if (validLogSymbols.has(symbol)) {
                            parsedChart.push({
                                time: timeStr,
                                asset: symbol,
                                size: sizeStr,
                                pnl: parseFloat(pnlStr),
                                type: typeStr.trim()
                            });
                        }
                    }
                });
                setChartData(parsedChart.reverse());
            } catch (err) { console.error("Chart fetch error:", err); }

            // 3. Table Data Fetch (New /trade_history Endpoint)
            try {
                const res = await api.get('/trade_history');
                // Expecting array of objects from the new endpoint
                const rawHistory = res.data.results || res.data; 
                if (Array.isArray(rawHistory)) {
                    // Sort newest first
                    const sorted = [...rawHistory].sort((a, b) => new Date(b.time) - new Date(a.time));
                    setTableData(sorted);
                }
            } catch (err) { console.error("Table history error:", err); }
        };
        fetchData();
    }, []);

    // Matrix Logic
    const activeSignals = useMemo(() => {
        const timeframes = [
            { label: '15m', mins: 15 },
            { label: '30m', mins: 30 },
            { label: '1h', mins: 60 },
            { label: '4h', mins: 240 },
            { label: '1d', mins: 1440 }
        ];

        return matrixData
            .filter(d => d.sum !== 0)
            .map(d => {
                const components = d.comp.map((val, idx) => {
                    const tf = timeframes[idx];
                    const expiryDate = calculateExpiry(d.upd, tf.mins);
                    return { label: tf.label, val: val, expiry: formatTimeOnly(expiryDate) };
                });
                return {
                    asset: d.asset,
                    sum: d.sum,
                    direction: d.sum > 0 ? 'Long' : 'Short',
                    components: components,
                    upd: d.upd
                };
            })
            .sort((a, b) => Math.abs(b.sum) - Math.abs(a.sum));
    }, [matrixData]);

    // Pagination Logic for Table
    const totalPages = Math.ceil(tableData.length / ITEMS_PER_PAGE);
    const displayedHistory = useMemo(() => {
        if (!historyExpanded) return tableData.slice(0, 10);
        const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
        return tableData.slice(startIdx, startIdx + ITEMS_PER_PAGE);
    }, [tableData, historyExpanded, currentPage]);

    const handleSubscribe = async () => {
        try {
            const res = await api.post('/create-checkout-session');
            window.location.href = res.data.url;
        } catch (err) { toast.error("Unavailable"); }
    };

    return (
        <div style={{ fontFamily: 'sans-serif', maxWidth: '1000px', margin: '0 auto', padding: '40px 20px' }}>
            
            {/* --- LIVE SIGNALS SECTION --- */}
            <section style={{ marginBottom: '60px' }}>
                <h3 style={{ borderBottom: '2px solid #f0f0f0', paddingBottom: '10px' }}>Active Matrix Signals</h3>
                
                {matrixStatus === 'unpaid' ? (
                    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '3rem', textAlign: 'center' }}>
                         <h3>Premium Access Required</h3>
                         <button onClick={handleSubscribe}>Subscribe</button>
                    </div>
                ) : (
                    <>
                        <div style={{ overflowX: 'auto', marginBottom: '40px' }}>
                            <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                                <thead>
                                    <tr>
                                        <th style={cellStyle}>Asset</th>
                                        <th style={cellStyle}>Direction</th>
                                        <th style={{...cellStyle, width: '50%'}}>Components (Expire)</th>
                                        <th style={cellStyle}>Sum</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {activeSignals.length > 0 ? activeSignals.map((row, i) => (
                                        <tr key={i}>
                                            <td style={{ ...cellStyle, fontWeight: 'bold' }}>{row.asset}</td>
                                            <td style={cellStyle}>
                                                <span style={{ 
                                                    color: row.direction === 'Long' ? '#10b981' : '#ef4444', 
                                                    fontWeight: 'bold',
                                                    background: row.direction === 'Long' ? '#ecfdf5' : '#fef2f2',
                                                    padding: '4px 8px', borderRadius: '4px', fontSize: '12px'
                                                }}>
                                                    {row.direction.toUpperCase()}
                                                </span>
                                            </td>
                                            <td style={cellStyle}>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', fontSize: '12px' }}>
                                                    {row.components.map((c, idx) => (
                                                        <div key={idx} style={{ 
                                                            background: '#f9fafb', border: '1px solid #e5e7eb', 
                                                            padding: '4px 8px', borderRadius: '4px', whiteSpace: 'nowrap' 
                                                        }}>
                                                            <span style={{color: '#6b7280', fontWeight: '500'}}>{c.label}:</span> 
                                                            <span style={{fontWeight: 'bold', margin: '0 4px', color: c.val !== 0 ? (c.val > 0 ? '#10b981' : '#ef4444') : '#374151'}}>
                                                                {c.val}
                                                            </span>
                                                            <span style={{color: '#9ca3af', fontSize: '11px'}}>{c.expiry}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </td>
                                            <td style={{ ...cellStyle, fontWeight: 'bold', fontSize: '16px' }}>
                                                {row.sum > 0 ? '+' : ''}{row.sum}
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr><td colSpan="4" style={{ ...cellStyle, textAlign: 'center', color: '#999', padding: '20px' }}>No active signals</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div style={{ marginBottom: '40px' }}>
                            <PnLChart data={chartData} />
                        </div>
                    </>
                )}
            </section>

            {/* --- HISTORY SECTION --- */}
            <section>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                    <h3 style={{ margin: 0 }}>Trade Log History</h3>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button onClick={() => setHistoryExpanded(!historyExpanded)} style={{ background: 'none', color: '#2563eb', border: 'none', cursor: 'pointer', fontWeight:'500' }}>
                            {historyExpanded ? 'Collapse View' : 'View All'}
                        </button>
                    </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                        <thead>
                            <tr>
                                <th style={cellStyle}>Time</th>
                                <th style={cellStyle}>Asset</th>
                                <th style={cellStyle}>TF</th>
                                <th style={cellStyle}>Signal</th>
                                <th style={cellStyle}>Price</th>
                                <th style={cellStyle}>PnL</th>
                                <th style={cellStyle}>Outcome</th>
                            </tr>
                        </thead>
                        <tbody>
                            {displayedHistory.length > 0 ? displayedHistory.map((row, i) => (
                                <tr key={i}>
                                    <td style={{...cellStyle, fontSize:'13px', color:'#374151', whiteSpace:'nowrap'}}>
                                        {formatDateTime(row.time)}
                                    </td>
                                    <td style={{...cellStyle, fontWeight:'500'}}>{row.asset}</td>
                                    <td style={cellStyle}>{row.tf}</td>
                                    <td style={cellStyle}>
                                        <span style={{ 
                                            color: row.signal === 'BUY' ? '#10b981' : '#ef4444',
                                            fontWeight: 'bold',
                                            fontSize: '12px'
                                        }}>
                                            {row.signal}
                                        </span>
                                    </td>
                                    <td style={{...cellStyle, fontFamily:'monospace'}}>{row.price}</td>
                                    <td style={{ ...cellStyle, fontWeight: 'bold', color: row.pnl >= 0 ? '#10b981' : '#ef4444' }}>
                                        {row.pnl > 0 ? '+' : ''}{typeof row.pnl === 'number' ? row.pnl.toFixed(4) : row.pnl}
                                    </td>
                                    <td style={cellStyle}>
                                        <span style={{
                                            background: row.outcome === 'WIN' ? '#ecfdf5' : (row.outcome === 'LOSS' ? '#fef2f2' : '#f3f4f6'),
                                            color: row.outcome === 'WIN' ? '#047857' : (row.outcome === 'LOSS' ? '#b91c1c' : '#374151'),
                                            padding: '2px 6px',
                                            borderRadius: '4px',
                                            fontSize: '11px',
                                            fontWeight: '500'
                                        }}>
                                            {row.outcome}
                                        </span>
                                    </td>
                                </tr>
                            )) : (
                                <tr><td colSpan="7" style={{ ...cellStyle, textAlign: 'center', color: '#999' }}>No history records found</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {historyExpanded && (
                    <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center', gap: '15px', alignItems:'center' }}>
                        <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Prev</button>
                        <span style={{ fontSize:'14px', color:'#666' }}>Page {currentPage} of {totalPages}</span>
                        <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Next</button>
                    </div>
                )}
            </section>
        </div>
    );
}
