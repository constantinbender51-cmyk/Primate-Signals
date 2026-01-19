import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from './api';

// Timeframes used in the matrix
const TF_ORDER = ['15m', '30m', '60m', '240m', '1d'];

// Helper to calculate Net Score and Action
const calculateNetSignal = (tfData) => {
    let score = 0;
    const details = [];

    TF_ORDER.forEach(tf => {
        const val = tfData[tf] || 0;
        score += val;
        if (val !== 0) {
            details.push({ tf, val });
        }
    });

    return { score, details };
};

const getSignalBadge = (val, mini = false) => {
    const baseStyle = {
        padding: mini ? '2px 6px' : '4px 8px',
        borderRadius: '4px',
        fontSize: mini ? '10px' : '11px',
        fontWeight: '700',
        display: 'inline-block',
        minWidth: mini ? 'auto' : '54px',
        textAlign: 'center',
        marginRight: mini ? '4px' : '0'
    };

    if (val === 1) return <span style={{ ...baseStyle, background: '#dcfce7', color: '#166534' }}>BUY</span>;
    if (val === -1) return <span style={{ ...baseStyle, background: '#fee2e2', color: '#991b1b' }}>SELL</span>;
    return <span style={{ ...baseStyle, background: '#f3f4f6', color: '#374151' }}>WAIT</span>;
};

export default function Dashboard() {
    const [matrixData, setMatrixData] = useState([]);
    const [historyData, setHistoryData] = useState([]);
    const [matrixStatus, setMatrixStatus] = useState('loading');
    const [apiKey, setApiKey] = useState(null);
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    // --- Authentication & Session Handling ---
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
                    toast.error("Activation pending.", { id: toastId });
                    navigate('/', { replace: true });
                }
            };
            refreshProfile();
        }
    }, [searchParams, navigate]);

    // --- Data Fetching ---
    useEffect(() => {
        const fetchData = async () => {
            try {
                const historyRes = await api.get('/signal_history');
                setHistoryData(historyRes.data.results);
            } catch (err) { /* Silent fail */ }

            try {
                const matrixRes = await api.get('/live_matrix');
                setMatrixData(matrixRes.data.results);
                setMatrixStatus('active');
            } catch (err) {
                if (err.response?.status === 403 || err.response?.status === 401) {
                    setMatrixStatus('unpaid');
                    setMatrixData([]); 
                }
            }
            
            const userStr = localStorage.getItem('user');
            if (userStr) setApiKey(JSON.parse(userStr).api_key);
        };
        fetchData();
    }, [navigate]);

    // --- Data Processing for List View ---
    const processedAssets = useMemo(() => {
        if (!matrixData.length) return [];
        
        const uniqueAssets = [...new Set(matrixData.map(d => d.asset))].sort();
        
        return uniqueAssets.map(asset => {
            // Build a lookup for this specific asset's timeframes
            const assetTfs = {};
            TF_ORDER.forEach(tf => {
                const point = matrixData.find(d => d.asset === asset && d.tf === tf);
                assetTfs[tf] = point ? point.signal_val : 0;
            });

            const { score, details } = calculateNetSignal(assetTfs);

            return {
                asset,
                score,
                details,
                rawGrid: assetTfs
            };
        });
    }, [matrixData]);

    // --- History Stats Calculation ---
    const { accuracy, totalPnL, enrichedHistory } = useMemo(() => {
        let wins = 0, losses = 0, cumulativePnL = 0;
        const processed = historyData.map(row => {
            const entry = parseFloat(row.price_at_signal);
            const close = parseFloat(row.close_price);
            let pnlPercent = 0;
            if (!isNaN(entry) && !isNaN(close) && entry !== 0) {
                pnlPercent = (row.signal === 'BUY' || row.signal === 1) 
                    ? ((close - entry) / entry) * 100 
                    : ((entry - close) / entry) * 100;
            }
            if (row.outcome === 'WIN') wins++;
            else if (row.outcome === 'LOSS') losses++;
            cumulativePnL += pnlPercent;
            return { ...row, pnlVal: pnlPercent };
        });
        const total = wins + losses;
        return { 
            accuracy: total > 0 ? ((wins / total) * 100).toFixed(2) : 0,
            totalPnL: cumulativePnL.toFixed(2),
            enrichedHistory: processed
        };
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

    const isMatrixLocked = matrixStatus === 'unpaid';

    return (
        <div style={{ animation: 'fadeIn 0.5s ease-in', maxWidth: '1000px', margin: '0 auto' }}>
            
            {/* HEADER */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h2 style={{ margin: 0 }}>Live Signal Action List</h2>
                    <p style={{ margin: '4px 0 0 0', color: '#6b7280', fontSize: '14px' }}>
                        Rebalance Interval: Every 15 minutes (XX:00, XX:15, XX:30, XX:45)
                    </p>
                </div>
                <span className="tiny">
                    Last Update: {matrixData.length > 0 ? new Date(matrixData[0].updated_at).toLocaleTimeString() : '-'}
                </span>
            </div>

            {/* LOCKED STATE */}
            {isMatrixLocked && (
                <div style={{ 
                    background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '3rem 2rem', 
                    textAlign: 'center', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', marginBottom: '2rem'
                }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🔒</div>
                    <h3 style={{ margin: '0 0 0.5rem 0', border: 'none' }}>Premium Access Required</h3>
                    <p style={{ color: '#6b7280', marginBottom: '2rem', fontSize: '15px' }}>
                        Unlock real-time probability-based signals and actionable unit sizing.
                    </p>
                    <button onClick={handleSubscribe} style={{ padding: '12px 32px', fontSize: '15px' }}>
                        Start Free Trial — 49.90€/mo
                    </button>
                </div>
            )}

            {/* SIGNAL LIST (ACTIVE) */}
            {!isMatrixLocked && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '3rem' }}>
                    {processedAssets.length > 0 ? processedAssets.map((item) => (
                        <div key={item.asset} style={{ 
                            background: '#fff', 
                            border: '1px solid #e5e7eb', 
                            borderRadius: '8px', 
                            padding: '1.25rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: '1rem'
                        }}>
                            {/* Left: Asset & Breakdown */}
                            <div style={{ flex: '1 1 300px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                                    <h3 style={{ margin: 0, fontSize: '1.2rem' }}>{item.asset}</h3>
                                    <span style={{ 
                                        background: item.score > 0 ? '#dcfce7' : item.score < 0 ? '#fee2e2' : '#f3f4f6',
                                        color: item.score > 0 ? '#166534' : item.score < 0 ? '#991b1b' : '#374151',
                                        padding: '2px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: '700'
                                    }}>
                                        Net Score: {item.score > 0 ? '+' : ''}{item.score}
                                    </span>
                                </div>
                                <div style={{ fontSize: '13px', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                                    <span>Composite:</span>
                                    {item.details.length > 0 ? item.details.map((d, idx) => (
                                        <span key={d.tf} style={{ display: 'inline-flex', alignItems: 'center' }}>
                                            {idx > 0 && <span style={{ margin: '0 4px' }}>+</span>}
                                            <span style={{ fontWeight: '600', color: '#374151' }}>{d.tf}</span>
                                            ({d.val === 1 ? 'BUY' : 'SELL'})
                                        </span>
                                    )) : <span>Neutral (All Wait)</span>}
                                </div>
                            </div>

                            {/* Right: Action Instruction */}
                            <div style={{ 
                                flex: '0 0 auto', 
                                textAlign: 'right', 
                                background: '#f8fafc', 
                                padding: '1rem', 
                                borderRadius: '6px',
                                borderLeft: `4px solid ${item.score > 0 ? '#10b981' : item.score < 0 ? '#ef4444' : '#9ca3af'}`
                            }}>
                                <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#6b7280', fontWeight: '700', marginBottom: '4px' }}>
                                    Current Instruction
                                </div>
                                <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#1f2937' }}>
                                    {item.score === 0 ? 'CLOSE / WAIT' : (
                                        <>
                                            {item.score > 0 ? 'BUY' : 'SELL'} <span style={{ textDecoration: 'underline' }}>{Math.abs(item.score)} UNITS</span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    )) : (
                        <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>Loading market data...</div>
                    )}
                </div>
            )}

            {/* STRATEGY GUIDE */}
            <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '2rem', marginBottom: '3rem', border: '1px solid #e2e8f0' }}>
                <h3 style={{ marginTop: 0 }}>Strategy Execution Guide</h3>
                
                <div style={{ display: 'grid', gap: '1.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
                    <div>
                        <h4 style={{ fontSize: '16px', marginBottom: '0.5rem', color: '#1f2937' }}>1. Position Sizing (The "Units")</h4>
                        <p style={{ fontSize: '14px', color: '#4b5563', lineHeight: '1.5' }}>
                            Your total trade size is dynamic. <strong>1 Unit</strong> represents your base risk size (e.g., $100 or 0.5% of equity). 
                            <br/><br/>
                            <em>Example:</em> If the list says <strong>BUY 3 UNITS</strong>, and your base unit is $100, you open a LONG position worth <strong>$300</strong>. 
                        </p>
                    </div>

                    <div>
                        <h4 style={{ fontSize: '16px', marginBottom: '0.5rem', color: '#1f2937' }}>2. Timing & Rebalancing</h4>
                        <p style={{ fontSize: '14px', color: '#4b5563', lineHeight: '1.5' }}>
                            Markets change fast. This strategy requires <strong>rebalancing every 15 minutes</strong>.
                            <br/><br/>
                            <strong>Execution Time:</strong> Check this page at XX:00, XX:15, XX:30, XX:45. Execute trades <strong>30 seconds after</strong> the interval (e.g., 14:15:30) to ensure candle closure.
                        </p>
                    </div>

                    <div>
                        <h4 style={{ fontSize: '16px', marginBottom: '0.5rem', color: '#1f2937' }}>3. Automation vs Manual</h4>
                        <p style={{ fontSize: '14px', color: '#4b5563', lineHeight: '1.5' }}>
                            <strong>Manual:</strong> Adjust your position size to match the "Instruction" every 15m. If instruction drops from Buy 3 to Buy 1, close 2 units.
                            <br/>
                            <strong>Automated (Recommended):</strong> Use the API Key below. Program a bot to poll the endpoint every 15m and sync your exchange position to the Net Score.
                        </p>
                    </div>
                </div>

                <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid #e2e8f0' }}>
                    <h4 style={{ fontSize: '14px', color: '#991b1b', margin: '0 0 0.5rem 0' }}>⚠️ Regulatory Disclaimer & Risk Warning</h4>
                    <p style={{ fontSize: '12px', color: '#6b7280', lineHeight: '1.6', margin: 0 }}>
                        <strong>Not Financial Advice:</strong> This interface acts as a data aggregation tool for educational probabilistic modeling. It does not constitute investment advice, financial promotion, or a solicitation to trade. 
                        <br/><br/>
                        <strong>Signal Provision Regulations:</strong> The "Instructions" (Buy X Units) are strictly output variables of a mathematical model and must not be followed blindly. We are not a licensed financial advisor or broker.
                        <br/><br/>
                        <strong>Risk:</strong> Trading with leverage involves significant risk. You are solely responsible for setting Stop Losses (Recommended: 1.5% hard stop) and managing your capital. Past performance of the algorithm does not guarantee future results.
                    </p>
                </div>
            </div>

            {/* HISTORY SECTION */}
            <h3 style={{ border: 'none', marginBottom: '1.5rem' }}>Performance History (7D)</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                <div style={{ background: '#fff', padding: '1.25rem', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                    <div className="tiny" style={{ marginBottom: '4px' }}>ACCURACY</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: '800' }}>{accuracy}%</div>
                </div>
                <div style={{ background: '#fff', padding: '1.25rem', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                    <div className="tiny" style={{ marginBottom: '4px' }}>TOTAL PNL</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: '800', color: totalPnL >= 0 ? '#10b981' : '#ef4444' }}>
                        {totalPnL > 0 ? '+' : ''}{totalPnL}%
                    </div>
                </div>
            </div>
            
            <div style={{ overflowX: 'auto', marginBottom: '4rem' }}>
                <table>
                    <thead>
                        <tr>
                            <th>Time (UTC)</th>
                            <th>Asset</th>
                            <th>TF</th>
                            <th>Signal</th>
                            <th>PnL %</th>
                            <th>Result</th>
                        </tr>
                    </thead>
                    <tbody>
                        {enrichedHistory.length > 0 ? enrichedHistory.map((row, i) => (
                            <tr key={i}>
                                <td style={{ fontSize: '12px' }}>{row.time_str}</td>
                                <td style={{ fontWeight: '500' }}>{row.asset}</td>
                                <td>{row.tf}</td>
                                <td>{row.signal}</td>
                                <td style={{ fontWeight: '700', color: row.pnlVal >= 0 ? '#10b981' : '#ef4444' }}>
                                    {row.pnlVal ? `${row.pnlVal > 0 ? '+' : ''}${row.pnlVal.toFixed(2)}%` : '-'}
                                </td>
                                <td>
                                    <span style={{ color: row.outcome === 'WIN' ? '#10b981' : '#ef4444', fontWeight: '600' }}>
                                        {row.outcome}
                                    </span>
                                </td>
                            </tr>
                        )) : (
                            <tr><td colSpan="6" style={{ textAlign: 'center', padding: '1rem' }}>No history recorded</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {!isMatrixLocked && apiKey && (
                <div style={{ padding: '1.5rem', background: '#f1f5f9', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                    <h4 style={{ margin: '0 0 0.5rem 0' }}>Developer API</h4>
                    <p className="tiny" style={{ marginBottom: '1rem' }}>Use this key to fetch the JSON matrix and automate the strategy.</p>
                    <code style={{ wordBreak: 'break-all', display: 'block', padding: '1rem', background: '#fff', borderRadius: '4px' }}>
                        Authorization: {apiKey}
                    </code>
                </div>
            )}
        </div>
    );
}
