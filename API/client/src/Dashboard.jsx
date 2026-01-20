import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from './api';

// --- Utilities ---

const formatDateTime = (dateInput) => {
    if (!dateInput) return '-';
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return dateInput;
    // Format: YYYY-MM-DD HH:mm
    return date.toLocaleString('sv-SE', { 
        year: 'numeric', month: '2-digit', day: '2-digit', 
        hour: '2-digit', minute: '2-digit'
    });
};

// Map USDT symbols to Kraken PF format (e.g., BCHUSDT -> PF_BCHUSD)
// User requirement: "BCHUSDT becomes PF_BCHUSD"
const mapSymbolToLogFormat = (symbol) => {
    // Remove 'USDT'
    const core = symbol.replace('USDT', '');
    // Construct new format
    return `PF_${core}USD`;
};

// --- Custom Chart Component ---
const PnLChart = ({ data }) => {
    if (!data || data.length < 2) return <div style={{height:'200px', display:'flex', alignItems:'center', justifyContent:'center', color:'#ccc'}}>Not enough data</div>;

    const height = 200;
    const width = 800;
    const padding = 20;

    // Sort by time (oldest to newest) for the chart
    const sorted = [...data].sort((a, b) => new Date(a.time) - new Date(b.time));

    // Calculate Cumulative PnL
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
            <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#6b7280' }}>Cumulative PnL</h4>
            <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
                {/* Zero Line */}
                <line x1={padding} y1={zeroY} x2={width - padding} y2={zeroY} stroke="#9ca3af" strokeWidth="1" strokeDasharray="4" opacity="0.5" />
                {/* Chart Line */}
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
                    await api.get('/auth/me'); // Just check auth
                    toast.success("Subscription Active!");
                    navigate('/', { replace: true });
                } catch (e) { navigate('/', { replace: true }); }
            };
            verify();
        }
    }, [searchParams, navigate]);

    useEffect(() => {
        const fetchData = async () => {
            // 1. Live Matrix Fetch (Your JSON format)
            try {
                // Expected response: {"BTCUSDT": {"sum": 0}, "BCHUSDT": {"sum": 1}, ...}
                const res = await api.get('/live_matrix'); 
                
                // Transform the Object into an Array for the UI
                const rawData = res.data; // Depending on how you serve it, this might be res.data directly or res.data.results
                
                // Handle both array wrapper or direct object
                const actualData = rawData.results ? rawData.results : rawData; 
                
                // If it's the specific object structure you pasted:
                // Check if it's an array or object. If object, convert.
                let transformed = [];
                if (!Array.isArray(actualData) && typeof actualData === 'object') {
                    transformed = Object.entries(actualData).map(([key, val]) => ({
                        asset: key,
                        score: val.sum
                    }));
                } else if (Array.isArray(actualData)) {
                    // Fallback if your endpoint returns the old array format
                    transformed = actualData;
                }

                setMatrixData(transformed);
                setMatrixStatus('active');
            } catch (err) {
                console.error("Matrix error", err);
                if (err.response?.status === 403 || err.response?.status === 401) {
                    setMatrixStatus('unpaid');
                }
            }

            // 2. History Fetch (Log File via Proxy)
            try {
                const res = await api.get('/api/proxy/history');
                const rawText = res.data;
                
                // The 20 Assets tracked (USDT base)
                const trackedAssets = [
                    "BTCUSDT", "ETHUSDT", "SOLUSDT", "XRPUSDT", "ADAUSDT", "DOGEUSDT", 
                    "AVAXUSDT", "DOTUSDT", "LINKUSDT", "TRXUSDT", "BCHUSDT", "XLMUSDT", 
                    "LTCUSDT", "SUIUSDT", "HBARUSDT", "SHIBUSDT", "TONUSDT", "UNIUSDT", 
                    "ZECUSDT", "BNBUSDT"
                ];
                
                // Generate lookup set for fast filtering: e.g., "PF_BCHUSD"
                const validLogSymbols = new Set(trackedAssets.map(mapSymbolToLogFormat));
                
                // Also add XBT special case for BTC just in case Kraken uses XBT
                validLogSymbols.add("PF_XBTUSD"); 

                const lines = rawText.split('\n');
                const parsed = [];
                
                // Regex Logic based on user input:
                // "The x/y is position size the number after that is pnl"
                // Line: 2026-01-20 04:01:24 PF_ETHUSD -0.023/-0.024 0.02 Reduced
                // Groups: 
                // 1. Date Time
                // 2. Symbol
                // 3. Size (x/y)
                // 4. PnL
                // 5. Type
                const regex = /^(\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2})\s+(\S+)\s+(\S+)\s+([-\d.]+)\s+(.*)$/;

                lines.forEach(line => {
                    const match = line.match(regex);
                    if (match) {
                        const [_, timeStr, symbol, sizeStr, pnlStr, typeStr] = match;
                        
                        // Strict Filtering: Only include if in our tracked list
                        if (validLogSymbols.has(symbol)) {
                            parsed.push({
                                time: timeStr,
                                asset: symbol,
                                size: sizeStr,          // "-0.023/-0.024"
                                pnl: parseFloat(pnlStr), // 0.02
                                type: typeStr.trim()     // "Reduced"
                            });
                        }
                    }
                });
                
                setHistoryData(parsed.reverse()); // Show newest first
            } catch (err) {
                console.error("History fetch error:", err);
            }
        };
        fetchData();
    }, []);

    // Matrix Logic (Active Signals)
    const activeSignals = useMemo(() => {
        return matrixData
            .filter(d => d.score !== 0) // Only show non-zero sums
            .map(d => ({
                direction: d.score > 0 ? 'Long' : 'Short',
                asset: d.asset,
                strength: Math.abs(d.score)
            }));
    }, [matrixData]);

    // Pagination Logic
    const totalPages = Math.ceil(historyData.length / ITEMS_PER_PAGE);
    const displayedHistory = useMemo(() => {
        if (!historyExpanded) return historyData.slice(0, 10);
        const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
        return historyData.slice(startIdx, startIdx + ITEMS_PER_PAGE);
    }, [historyData, historyExpanded, currentPage]);

    const handleSubscribe = async () => {
        try {
            const res = await api.post('/create-checkout-session');
            window.location.href = res.data.url;
        } catch (err) { 
            toast.error("Unavailable");
        }
    };

    return (
        <div style={{ fontFamily: 'sans-serif', maxWidth: '1000px', margin: '0 auto', padding: '40px 20px' }}>
            
            {/* --- LIVE SIGNALS SECTION --- */}
            <section style={{ marginBottom: '60px' }}>
                <h3 style={{ borderBottom: '2px solid #f0f0f0', paddingBottom: '10px' }}>Active Signals</h3>
                
                {matrixStatus === 'unpaid' ? (
                    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '3rem', textAlign: 'center' }}>
                         <h3>Premium Access Required</h3>
                         <p style={{color:'#666', marginBottom:'1rem'}}>Unlock real-time probability-based signals.</p>
                         <button onClick={handleSubscribe}>Subscribe</button>
                    </div>
                ) : (
                    <>
                        {/* Table */}
                        <div style={{ overflowX: 'auto', marginBottom: '40px' }}>
                            <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                                <thead>
                                    <tr>
                                        <th style={cellStyle}>Direction</th>
                                        <th style={cellStyle}>Asset</th>
                                        <th style={cellStyle}>Strength</th>
                                        <th style={cellStyle}>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {activeSignals.length > 0 ? activeSignals.map((row, i) => (
                                        <tr key={i}>
                                            <td style={{ ...cellStyle, color: row.direction === 'Long' ? '#10b981' : '#ef4444', fontWeight: 'bold' }}>{row.direction}</td>
                                            <td style={cellStyle}>{row.asset}</td>
                                            <td style={cellStyle}>{row.strength}</td>
                                            <td style={cellStyle}>ACTIVE</td>
                                        </tr>
                                    )) : (
                                        <tr><td colSpan="4" style={{ ...cellStyle, textAlign: 'center', color: '#999' }}>No active signals (Market Neutral)</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Chart */}
                        <div style={{ marginBottom: '40px' }}>
                            <PnLChart data={historyData} />
                        </div>
                    </>
                )}
            </section>

            {/* --- HISTORY SECTION --- */}
            <section>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                    <h3 style={{ margin: 0 }}>Trade Log History</h3>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button onClick={() => setHistoryExpanded(!historyExpanded)} style={{ background: 'none', color: '#2563eb', border: 'none' }}>
                            {historyExpanded ? 'Collapse' : 'Expand All'}
                        </button>
                    </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                        <thead>
                            <tr>
                                <th style={cellStyle}>Time</th>
                                <th style={cellStyle}>Asset</th>
                                <th style={cellStyle}>Type</th>
                                <th style={cellStyle}>Pos Size (Cur/Tot)</th>
                                <th style={cellStyle}>PnL</th>
                            </tr>
                        </thead>
                        <tbody>
                            {displayedHistory.length > 0 ? displayedHistory.map((row, i) => (
                                <tr key={i}>
                                    <td style={cellStyle}>{formatDateTime(row.time)}</td>
                                    <td style={cellStyle}>{row.asset}</td>
                                    <td style={{...cellStyle, textTransform: 'capitalize'}}>{row.type}</td>
                                    <td style={{...cellStyle, fontFamily:'monospace', fontSize:'12px'}}>{row.size}</td>
                                    <td style={{ ...cellStyle, fontWeight: 'bold', color: row.pnl >= 0 ? '#10b981' : '#ef4444' }}>
                                        {row.pnl > 0 ? '+' : ''}{row.pnl}
                                    </td>
                                </tr>
                            )) : (
                                <tr><td colSpan="5" style={{ ...cellStyle, textAlign: 'center', color: '#999' }}>No history records found</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                {historyExpanded && (
                    <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center', gap: '10px' }}>
                        <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Prev</button>
                        <span>Page {currentPage} of {totalPages}</span>
                        <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Next</button>
                    </div>
                )}
            </section>
        </div>
    );
}
