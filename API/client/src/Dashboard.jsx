import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from './api';

const TF_ORDER = ['15m', '30m', '60m', '240m', '1d'];

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

export default function Dashboard() {
    const [matrixData, setMatrixData] = useState([]);
    const [historyData, setHistoryData] = useState([]);
    const [matrixStatus, setMatrixStatus] = useState('loading');
    const [apiKey, setApiKey] = useState(null);
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

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
        <div style={{ animation: 'fadeIn 0.5s ease-in' }}>
            <div style={{ marginBottom: '2.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ margin: 0, border: 'none' }}>Live Signal Matrix</h3>
                    <span className="tiny">
                        Updated: {matrixData.length > 0 ? new Date(matrixData[0].updated_at).toLocaleTimeString() : '-'}
                    </span>
                </div>

                {!isMatrixLocked ? (
                    <>
                        <table>
                            <thead>
                                <tr>
                                    <th>Asset</th>
                                    {TF_ORDER.map(tf => <th key={tf}>{tf}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {assets.length > 0 ? assets.map(asset => (
                                    <tr key={asset}>
                                        <td style={{ fontWeight: '600' }}>{asset}</td>
                                        {TF_ORDER.map(tf => (
                                            <td key={tf}>{getSignalBadge(grid[asset]?.[tf])}</td>
                                        ))}
                                    </tr>
                                )) : (
                                    <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>Fetching market data...</td></tr>
                                )}
                            </tbody>
                        </table>

                        {/* FULL DISCLAIMER TEXT BELOW TABLE */}
                        <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '1.5rem', lineHeight: '1.5', whiteSpace: 'pre-line' }}>
                            <strong>Disclaimer: </strong>Educational Purposes Only{"\n"}
                            The information provided is for educational and informational purposes only and should not be construed as financial, investment, or legal advice. Trading financial instruments carries a high level of risk and may not be suitable for all investors. You could lose some or all of your initial investment; do not trade with capital you cannot afford to lose.{"\n\n"}
                            <strong></strong>Methodology & Performance{"\n"}
                            Signals are generated through discrete probabilistic modeling. These models represent theoretical outcomes and are not guarantees of future market movement. Please note that past performance is not indicative of future results. Data presented may be hypothetical or simulated and does not represent actual trade execution or performance.{"\n\n"}
                            <strong></strong>Conflict of Interest{"\n"}
                            The publisher and its affiliates may hold positions in, or actively trade, the assets mentioned herein. This may create a conflict of interest, and readers should perform their own due diligence before making any financial decisions.
                        </p>
<p>Strategy Execution
​Signal Aggregation: Sum the signals across all timeframes for each asset to derive a Net Signal Score.
​Position Sizing: Calculate your trade size by multiplying your standard risk unit by the Net Signal Score.
​Timing: Rebalance positions every 15 minutes. Execute trades at 30 seconds past the interval (e.g., XX:00:30) to ensure signal synchronization.
​Risk Management: We explicitly recommend a 1.5% stop-loss on all open positions. Users are solely responsible for risk management; we accept no liability for losses incurred.
</p>
                    </>
                ) : (
                    <div style={{ 
                        background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '3rem 2rem', 
                        textAlign: 'center', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' 
                    }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🔒</div>
                        <h3 style={{ margin: '0 0 0.5rem 0', border: 'none' }}>Premium Access Required</h3>
                        <p style={{ color: '#6b7280', marginBottom: '2rem', fontSize: '15px' }}>
                            Unlock real-time probability-based signals for all timeframes.
                        </p>
                        <button onClick={handleSubscribe} style={{ padding: '12px 32px', fontSize: '15px' }}>
                            Start Free Trial — 49.90€/mo
                        </button>
                    </div>
                )}
            </div>

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
            
            <div style={{ overflowX: 'auto' }}>
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
                <div style={{ marginTop: '4rem', padding: '1.5rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <h4 style={{ margin: '0 0 0.5rem 0' }}>Developer Access</h4>
                    <p className="tiny" style={{ marginBottom: '1rem' }}>Your private API key for raw JSON integration</p>
                    <code style={{ wordBreak: 'break-all', display: 'block', padding: '1rem' }}>{apiKey}</code>
                </div>
            )}
        </div>
    );
}
