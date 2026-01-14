import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from './api'; [span_2](start_span)//[span_2](end_span)

const getSignalUI = (val) => {
    // These classes now map to Green (buy) and Red (sell) in your new CSS
    if (val === 1) return { text: 'BUY', className: 'badge badge-buy' }; [span_3](start_span)//[span_3](end_span)
    if (val === -1) return { text: 'SELL', className: 'badge badge-sell' }; [span_4](start_span)//[span_4](end_span)
    return { text: '—', className: '' };
};

const TF_ORDER = ['15m', '30m', '60m', '240m', '1d']; [span_5](start_span)//[span_5](end_span)

export default function Dashboard() {
    const [matrixData, setMatrixData] = useState([]);
    const [historyData, setHistoryData] = useState([]); [span_6](start_span)//[span_6](end_span)
    const [matrixStatus, setMatrixStatus] = useState('loading'); 
    const [apiKey, setApiKey] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const historyRes = await api.get('/signal_history');
                [span_7](start_span)setHistoryData(historyRes.data.results); //[span_7](end_span)
            } catch (err) {
                console.error("History fetch failed", err);
                toast.error("Could not load history"); [span_8](start_span)//[span_8](end_span)
            }

            try {
                const matrixRes = await api.get('/live_matrix');
                setMatrixData(matrixRes.data.results);
                setMatrixStatus('active'); [span_9](start_span)//[span_9](end_span)
            } catch (err) {
                if (err.response?.status === 403 || err.response?.status === 401) {
                    setMatrixStatus('unpaid');
                    setMatrixData([]); 
                } else {
                    console.error(err);
                    setMatrixStatus('loading'); [span_10](start_span)//[span_10](end_span)
                }
            }
            
            const userStr = localStorage.getItem('user');
            if (userStr) {
                const user = JSON.parse(userStr);
                setApiKey(user.api_key); [span_11](start_span)//[span_11](end_span)
            }
        };

        fetchData();
    }, [navigate]);

    const { assets, timeframes, grid } = useMemo(() => {
        if (!matrixData.length) return { assets: [], timeframes: TF_ORDER, grid: {} };

        const uniqueAssets = [...new Set(matrixData.map(d => d.asset))].sort();
        const lookup = {};
        uniqueAssets.forEach(asset => {
            lookup[asset] = {};
            TF_ORDER.forEach(tf => {
                [span_12](start_span)const point = matrixData.find(d => d.asset === asset && d.tf === tf); //[span_12](end_span)
                lookup[asset][tf] = point ? point.signal_val : 0;
            });
        });

        return { assets: uniqueAssets, timeframes: TF_ORDER, grid: lookup };
    }, [matrixData]);

    const { accuracy } = useMemo(() => {
        let wins = 0;
        let losses = 0;
        historyData.forEach(row => {
            if (row.outcome === 'WIN') wins++;
            else if (row.outcome === 'LOSS') losses++;
        });
        const total = wins + losses;
        [span_13](start_span)return { accuracy: total > 0 ? ((wins / total) * 100).toFixed(2) : 0 }; //[span_13](end_span)
    }, [historyData]);

    const handleSubscribe = async () => { 
        try {
            const res = await api.post('/create-checkout-session');
            window.location.href = res.data.url; [span_14](start_span)//[span_14](end_span)
        } catch (err) { 
            if (!localStorage.getItem('token')) navigate('/login');
            else toast.error("Payment Service Unavailable"); [span_15](start_span)//[span_15](end_span)
        }
    };
    
    const handleManage = async () => { 
        try {
            const res = await api.post('/create-portal-session');
            window.location.href = res.data.url; [span_16](start_span)//[span_16](end_span)
        } catch (err) { toast.error("Portal Error"); }
    };

    const isMatrixLocked = matrixStatus === 'unpaid';

    return (
        <div>
            {/* --- HEADER --- */}
            <div style={{ marginBottom: '4rem', marginTop: '2rem' }}>
                <h1 style={{ margin: 0 }}>Market Signals</h1>
                <p style={{ color: 'var(--text-subtle)', marginTop: '0.5rem' }}>Automated Quantitative Analysis</p>
            </div>

            {/* --- EDUCATIONAL BANNER --- */}
            <div style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: '1rem', marginBottom: '3rem', fontSize: '0.85rem', color: 'var(--text-subtle)' }}>
                [NOTE] Educational Use Only. These signals are strictly for informational purposes. Verify all market conditions.
            </div>

            [span_17](start_span)<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '20px' }}> {/*[span_17](end_span) */}
                <div>
                    <h3>Live Matrix</h3>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-subtle)' }}>
                        [span_18](start_span)Last Update: {matrixData.length > 0 ? new Date(matrixData[0].updated_at).toLocaleTimeString() : '-'} {/*[span_18](end_span) */}
                    </span>
                </div>
                {!isMatrixLocked && <button className="secondary" onClick={handleManage}>Manage Subscription</button>}
            </div>

            {/* --- LIVE MATRIX --- */}
            <div className="table-container" style={{ minHeight: '300px' }}>
                {isMatrixLocked && (
                    <div className="paywall-overlay">
                        <p style={{ marginBottom: '2rem', textTransform: 'uppercase', letterSpacing: '0.2rem' }}>Access Restricted</p>
                        [span_19](start_span)<button onClick={handleSubscribe}>Unlock Matrix</button> {/*[span_19](end_span) */}
                    </div>
                )}
                
                <table className={isMatrixLocked ? [span_20](start_span)'blurred-content' : ''}> {/*[span_20](end_span) */}
                    <thead>
                        <tr>
                            <th>Asset</th>
                            [span_21](start_span){timeframes.map(tf => <th key={tf} style={{textAlign:'center'}}>{tf}</th>)} {/*[span_21](end_span) */}
                        </tr>
                    </thead>
                    <tbody>
                        [span_22](start_span){assets.length > 0 ? assets.map(asset => ( //[span_22](end_span)
                            <tr key={asset}>
                                <td style={{ fontWeight: '400' }}>{asset}</td>
                                {timeframes.map(tf => {
                                    const val = grid[asset]?.[tf];
                                    const ui = getSignalUI(val);
                                    return (
                                        <td key={`${asset}-${tf}`} style={{ textAlign: 'center' }}>
                                            [span_23](start_span)<span className={ui.className}>{ui.text}</span> {/*[span_23](end_span) */}
                                        </td>
                                    );
                                })}
                            </tr>
                        )) : (
                            [span_24](start_span)!isMatrixLocked && <tr><td colSpan={timeframes.length + 2} style={{textAlign:'center', padding: '3rem'}}>Waiting for market data...</td></tr> //[span_24](end_span)
                        )}
                    </tbody>
                </table>
            </div>

            {/* --- METHODOLOGY --- */}
            <div className="disclaimer-box">
                <p style={{ marginTop: 0 }}><strong>SUBSCRIPTION:</strong> 49.90€ / MO</p>
                <br />
                <p><strong>METHODOLOGY</strong></p>
                <p style={{ color: 'var(--text-subtle)' }}>
                    Proprietary model analyzing Price Action and Volume on 4H timeframes.
                    Identifies statistical trend reversals via Momentum Oscillators. 
                    Zero human intervention. [span_25](start_span){/*[span_25](end_span) */}
                </p>
                <br />
                <p style={{fontSize: '0.8rem'}}>
                    DISCLAIMER: Results based on simulated backtests.
                    Past performance does not guarantee future results. [span_26](start_span){/*[span_26](end_span) */}
                </p>
            </div>

            {/* --- HISTORY --- */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <h3>Signal History</h3>
                [span_27](start_span)<p>Accuracy: <strong>{accuracy}%</strong></p> {/*[span_27](end_span) */}
            </div>
            
            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Time (UTC)</th>
                            <th>Asset</th>
                            <th>TF</th>
                            <th>Signal</th>
                            <th>Price</th>
                            <th>Result</th>
                        </tr>
                    </thead>
                    <tbody>
                        [span_28](start_span){historyData.length > 0 ? historyData.map((row, i) => ( //[span_28](end_span)
                            <tr key={i}>
                                <td>{row.time_str}</td>
                                <td>{row.asset}</td>
                                <td>{row.tf}</td>
                                <td>
                                    <span className={row.signal === 'BUY' ? [span_29](start_span)'badge badge-buy' : 'badge badge-sell'}> {/*[span_29](end_span) */}
                                        {row.signal}
                                    </span>
                                </td>
                                <td>{row.price_at_signal}</td>
                                <td>
                                    {/* UPDATED: Uses Green/Red colors instead of Strikethrough */}
                                    <span style={{ 
                                        fontWeight: 'bold',
                                        color: row.outcome === 'WIN' ? 'var(--color-green)' : (row.outcome === 'LOSS' ? 'var(--color-red)' : 'inherit')
                                    }}>
                                        {row.outcome}
                                    </span>
                                </td>
                            </tr>
                        )) : (
                            [span_30](start_span)<tr><td colSpan="6" style={{textAlign:'center', padding:'3rem'}}>No history recorded</td></tr> //[span_30](end_span)
                        )}
                    </tbody>
                </table>
            </div>

            {/* --- API KEY --- */}
            {!isMatrixLocked && apiKey && (
                <div style={{ marginTop: '4rem', paddingTop: '2rem', borderTop: '1px solid var(--border-light)' }}>
                    <h4>Developer Access</h4>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-subtle)', marginBottom: '1rem' }}>Raw JSON Feed Key</p>
                    <code>{apiKey}</code>
                </div>
            )}
        </div>
    );
}
