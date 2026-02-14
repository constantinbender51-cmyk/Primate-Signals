import React, { useEffect, useState } from 'react';
import LandingPage from './LandingPage';
import api from './api';
import toast from 'react-hot-toast';

export default function Dashboard() {
    const token = localStorage.getItem('token');
    
    // Data State
    const [historyData, setHistoryData] = useState(null);
    const [signalData, setSignalData] = useState(null);
    
    // UI State
    const [loading, setLoading] = useState(true);
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [expandedRow, setExpandedRow] = useState(null);

    // If not logged in, show Landing Page immediately
    if (!token) return <LandingPage />;

    // 1. Fetch Public Asset List
    const fetchHistory = async () => {
        try {
            const res = await api.get('/api/spearhead/history');
            setHistoryData(res.data);
        } catch (err) {
            console.error("Asset list fetch error:", err);
            toast.error("Failed to load asset list.");
        }
    };

    // 2. Fetch Protected Sentiment Analysis (Live Data)
    const fetchSignals = async () => {
        try {
            const res = await api.get('/api/spearhead/signals');
            setSignalData(res.data);
            setIsSubscribed(true); // If this succeeds, user is subscribed
        } catch (err) {
            if (err.response && err.response.status === 403) {
                setIsSubscribed(false);
                setSignalData(null);
            }
        }
    };

    useEffect(() => {
        const init = async () => {
            setLoading(true);
            await fetchHistory();
            await fetchSignals();
            setLoading(false);
        };

        init();
        
        const signalInterval = setInterval(fetchSignals, 5000); 
        const historyInterval = setInterval(fetchHistory, 60000);
        
        return () => {
            clearInterval(signalInterval);
            clearInterval(historyInterval);
        };
    }, [token]);

    const handleSubscribe = async () => {
        try {
            const res = await api.post('/create-checkout-session');
            window.location.href = res.data.url;
        } catch (err) {
            toast.error("Checkout unavailable");
        }
    };

    const toggleRow = (symbol) => {
        if (!isSubscribed) return;
        setExpandedRow(expandedRow === symbol ? null : symbol);
    };

    // --- RENDERERS ---

    const renderDetail = (symbol) => {
        if (!signalData || !signalData[symbol]) return null;
        
        const data = signalData[symbol];

        return (
            <div style={{ padding: '20px', background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
                <h4 style={{ fontSize: '14px', textTransform: 'uppercase', color: '#64748b', marginBottom: '15px' }}>
                    Live Sentiment Details ({symbol})
                </h4>
                <div style={{ fontSize: '13px', fontFamily: 'monospace' }}>
                    <pre>{JSON.stringify(data, null, 2)}</pre>
                </div>
            </div>
        );
    };

    const renderTable = () => {
        if (!historyData) return <div style={{ textAlign: 'center', padding: '40px' }}>Loading Analysis Engine...</div>;

        const symbols = Object.keys(historyData).sort();

        return (
            <div style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }}>
                            <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', color: '#64748b' }}>ASSET</th>
                            <th style={{ padding: '16px', textAlign: 'center', fontSize: '12px', color: '#64748b' }}>STATUS</th>
                            <th style={{ padding: '16px', textAlign: 'right', fontSize: '12px', color: '#64748b' }}>SENTIMENT SCORE</th>
                            <th style={{ padding: '16px', textAlign: 'right', fontSize: '12px', color: '#64748b' }}>SUMMARY</th>
                            <th style={{ padding: '16px', width: '40px' }}></th>
                        </tr>
                    </thead>
                    <tbody>
                        {symbols.map(sym => {
                            const sig = signalData ? signalData[sym] : null;
                            const isLocked = !isSubscribed || !sig;

                            // Live Signal Badge
                            let signalBadge = <span style={{ fontSize: '12px', color: '#94a3b8' }}>Waiting...</span>;
                            if (isLocked) {
                                signalBadge = <span style={{ fontSize: '12px', color: '#64748b', background: '#e2e8f0', padding: '4px 8px', borderRadius: '12px' }}>🔒 Locked</span>;
                            } else if (sig) {
                                // Assume sig.sentiment or default to keys found in JSON
                                const sentimentText = sig.sentiment || sig.direction || "NEUTRAL";
                                const isBullish = sentimentText.toLowerCase().includes('bull');
                                const isBearish = sentimentText.toLowerCase().includes('bear');
                                
                                const bg = isBullish ? '#dcfce7' : (isBearish ? '#fee2e2' : '#f1f5f9');
                                const col = isBullish ? '#166534' : (isBearish ? '#991b1b' : '#64748b');
                                signalBadge = (
                                    <span style={{ fontSize: '11px', fontWeight: '700', background: bg, color: col, padding: '4px 10px', borderRadius: '12px', display: 'inline-block', minWidth: '60px' }}>
                                        {sentimentText}
                                    </span>
                                );
                            }

                            // Live Score
                            let liveScore = <span style={{ color: '#cbd5e1' }}>---</span>;
                            if (!isLocked && sig) {
                                liveScore = <span style={{ fontWeight: '600' }}>{sig.score || sig.value || 'N/A'}</span>;
                            }
                            
                            // Summary
                            let summary = <span style={{ color: '#cbd5e1' }}>---</span>;
                            if (!isLocked && sig) {
                                summary = <span style={{ fontSize: '12px', color: '#475569' }}>{sig.summary || sig.analysis || 'Available'}</span>;
                            }

                            return (
                                <React.Fragment key={sym}>
                                    <tr 
                                        onClick={() => toggleRow(sym)}
                                        style={{ 
                                            borderBottom: '1px solid #f1f5f9', 
                                            cursor: isSubscribed ? 'pointer' : 'default',
                                            transition: 'background 0.2s'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = '#fff'}
                                    >
                                        <td style={{ padding: '16px', fontWeight: '700', color: '#1e293b' }}>{sym}</td>
                                        <td style={{ padding: '16px', textAlign: 'center' }}>{signalBadge}</td>
                                        <td style={{ padding: '16px', textAlign: 'right', fontFamily: 'monospace' }}>{liveScore}</td>
                                        <td style={{ padding: '16px', textAlign: 'right' }}>{summary}</td>
                                        <td style={{ padding: '16px', textAlign: 'center', color: '#94a3b8' }}>
                                            {isSubscribed && (expandedRow === sym ? '▲' : '▼')}
                                        </td>
                                    </tr>
                                    {expandedRow === sym && (
                                        <tr>
                                            <td colSpan="5" style={{ padding: 0 }}>
                                                {renderDetail(sym)}
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '80px' }}>
            <div style={{ marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                    <h1 style={{ margin: '0 0 8px 0', fontSize: '1.8rem', color: '#0f172a' }}>Sentiment Control Center</h1>
                    <p style={{ margin: 0, color: '#64748b' }}>Real-time ML Sentiment Scoring.</p>
                </div>
                {!isSubscribed && (
                    <button 
                        onClick={handleSubscribe}
                        style={{ background: '#2563eb', padding: '10px 20px', boxShadow: '0 4px 6px -2px rgba(37, 99, 235, 0.3)' }}
                    >
                        Unlock Live Analysis
                    </button>
                )}
            </div>

            {!isSubscribed && !loading && (
                <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', padding: '12px 20px', borderRadius: '8px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '20px' }}>🔒</span>
                    <div style={{ fontSize: '14px', color: '#9a3412' }}>
                        <strong>View Only Mode:</strong> You are viewing the asset list. Subscribe to see live ML sentiment analysis and scores.
                    </div>
                </div>
            )}

            {renderTable()}
        </div>
    );
}
