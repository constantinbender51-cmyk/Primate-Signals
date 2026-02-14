import React, { useEffect, useState } from 'react';
import LandingPage from './LandingPage';
import api from './api';
import toast from 'react-hot-toast';

export default function Dashboard() {
    const token = localStorage.getItem('token');
    
    // Data State
    const [analysisData, setAnalysisData] = useState(null);
    
    // UI State
    const [loading, setLoading] = useState(true);
    const [isSubscribed, setIsSubscribed] = useState(false);

    // If not logged in, show Landing Page immediately
    if (!token) return <LandingPage />;

    // 1. Check Subscription Status (Gatekeeper)
    const checkSubscription = async () => {
        try {
            // We use the existing protected endpoint to verify subscription status
            await api.get('/api/spearhead/signals');
            setIsSubscribed(true);
            return true;
        } catch (err) {
            if (err.response && err.response.status === 403) {
                setIsSubscribed(false);
                setAnalysisData(null);
            }
            return false;
        }
    };

    // 2. Fetch Sentiment Analysis (Premium Content)
    const fetchAnalysis = async () => {
        try {
            const res = await fetch('https://machine-learning.up.railway.app/analysis_result.json');
            if (!res.ok) throw new Error('Failed to fetch analysis');
            const data = await res.json();
            setAnalysisData(data);
        } catch (err) {
            console.error("Analysis fetch error:", err);
            toast.error("Failed to load sentiment data.");
        }
    };

    useEffect(() => {
        const init = async () => {
            setLoading(true);
            const hasAccess = await checkSubscription();
            if (hasAccess) {
                await fetchAnalysis();
            }
            setLoading(false);
        };

        init();
        
        // Polling for updates (every 5 minutes for analysis)
        const interval = setInterval(async () => {
            const hasAccess = await checkSubscription();
            if (hasAccess) fetchAnalysis();
        }, 300000);
        
        return () => clearInterval(interval);
    }, [token]);

    const handleSubscribe = async () => {
        try {
            const res = await api.post('/create-checkout-session');
            window.location.href = res.data.url;
        } catch (err) {
            toast.error("Checkout unavailable");
        }
    };

    // --- RENDERERS ---

    const renderSentimentOverview = () => {
        if (!analysisData) return null;
        const { sentiment_analysis } = analysisData;
        const { sentiment_distribution } = sentiment_analysis;

        return (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '30px' }}>
                <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#64748b', textTransform: 'uppercase' }}>Positive Sentiment</h3>
                    <div style={{ fontSize: '32px', fontWeight: '700', color: '#10b981' }}>{sentiment_distribution.positive}%</div>
                </div>
                <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#64748b', textTransform: 'uppercase' }}>Neutral Sentiment</h3>
                    <div style={{ fontSize: '32px', fontWeight: '700', color: '#94a3b8' }}>{sentiment_distribution.neutral}%</div>
                </div>
                <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#64748b', textTransform: 'uppercase' }}>Negative Sentiment</h3>
                    <div style={{ fontSize: '32px', fontWeight: '700', color: '#ef4444' }}>{sentiment_distribution.negative}%</div>
                </div>
                <div style={{ gridColumn: '1 / -1', background: '#f8fafc', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <strong style={{ display: 'block', marginBottom: '8px', color: '#334155' }}>Core Sentiment:</strong>
                    <p style={{ margin: 0, color: '#475569', fontSize: '16px' }}>"{sentiment_analysis.overall_sentiment}"</p>
                </div>
            </div>
        );
    };

    const renderThemes = () => {
        if (!analysisData) return null;
        
        return (
            <div style={{ marginBottom: '40px' }}>
                <h2 style={{ fontSize: '1.2rem', color: '#1e293b', marginBottom: '20px', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px' }}>Dominant Themes</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                    {analysisData.dominant_themes.map((theme, idx) => (
                        <div key={idx} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#0f172a' }}>{theme.theme}</h3>
                                <span style={{ fontSize: '11px', background: '#f1f5f9', padding: '4px 8px', borderRadius: '12px', color: '#64748b' }}>{theme.prevalence}</span>
                            </div>
                            <ul style={{ paddingLeft: '20px', margin: '0 0 15px 0', fontSize: '13px', color: '#475569' }}>
                                {theme.subthemes.map((st, i) => <li key={i} style={{ marginBottom: '4px' }}>{st}</li>)}
                            </ul>
                            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '15px', fontStyle: 'italic', fontSize: '12px', color: '#64748b' }}>
                                "{theme.representative_quotes[0]}"
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const renderConsensus = () => {
        if (!analysisData) return null;
        
        const { collective_consensus } = analysisData;

        return (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '40px' }}>
                <div>
                    <h2 style={{ fontSize: '1.2rem', color: '#1e293b', marginBottom: '20px', borderBottom: '2px solid #10b981', paddingBottom: '10px' }}>Strong Consensus</h2>
                    <ul style={{ listStyle: 'none', padding: 0 }}>
                        {collective_consensus.strong_agreement.map((item, i) => (
                            <li key={i} style={{ marginBottom: '12px', padding: '12px', background: '#ecfdf5', borderRadius: '6px', color: '#065f46', fontSize: '14px', borderLeft: '4px solid #10b981' }}>
                                {item}
                            </li>
                        ))}
                    </ul>
                </div>
                <div>
                    <h2 style={{ fontSize: '1.2rem', color: '#1e293b', marginBottom: '20px', borderBottom: '2px solid #f59e0b', paddingBottom: '10px' }}>Active Debates</h2>
                    <ul style={{ listStyle: 'none', padding: 0 }}>
                        {collective_consensus.ongoing_debates.map((item, i) => (
                            <li key={i} style={{ marginBottom: '12px', padding: '12px', background: '#fffbeb', borderRadius: '6px', color: '#92400e', fontSize: '14px', borderLeft: '4px solid #f59e0b' }}>
                                {item}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        );
    };

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '80px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}>
            {/* Header */}
            <div style={{ marginBottom: '40px', padding: '40px 0', borderBottom: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h1 style={{ margin: '0 0 10px 0', fontSize: '2rem', color: '#0f172a', letterSpacing: '-0.5px' }}>Collective Intelligence Protocol</h1>
                        <p style={{ margin: 0, color: '#64748b', fontSize: '1.1rem' }}>Real-time sentiment extraction and consensus modeling.</p>
                    </div>
                    {!isSubscribed && (
                        <button 
                            onClick={handleSubscribe}
                            style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', padding: '12px 24px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.2)' }}
                        >
                            Unlock Analysis
                        </button>
                    )}
                </div>
            </div>

            {/* Paywall / Locked State */}
            {!isSubscribed && !loading && (
                <div style={{ textAlign: 'center', padding: '60px 20px', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                    <div style={{ fontSize: '48px', marginBottom: '20px' }}>🔒</div>
                    <h2 style={{ color: '#334155', marginBottom: '10px' }}>Restricted Access</h2>
                    <p style={{ color: '#64748b', maxWidth: '500px', margin: '0 auto 30px auto' }}>
                        Deep-dive sentiment analysis, dominant theme extraction, and collective consensus data are available to subscribers only.
                    </p>
                    <button 
                        onClick={handleSubscribe}
                        style={{ background: '#0f172a', color: '#fff', border: 'none', borderRadius: '6px', padding: '12px 30px', fontSize: '15px', fontWeight: '600', cursor: 'pointer' }}
                    >
                        Subscribe to Unlock
                    </button>
                </div>
            )}

            {/* Content State */}
            {isSubscribed && analysisData && (
                <div style={{ animation: 'fadeIn 0.5s ease-in-out' }}>
                    {renderSentimentOverview()}
                    {renderThemes()}
                    {renderConsensus()}
                    
                    {/* Footer / Meta */}
                    <div style={{ marginTop: '60px', paddingTop: '20px', borderTop: '1px solid #e2e8f0', color: '#94a3b8', fontSize: '12px', display: 'flex', justifyContent: 'space-between' }}>
                        <div>
                            <strong>Community Dynamics:</strong> {analysisData.community_dynamics.support_level}
                        </div>
                        <div>
                            Generated by Collective Intelligence Engine v1.1
                        </div>
                    </div>
                </div>
            )}

            {isSubscribed && !analysisData && loading && (
                <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Processing collective data stream...</div>
            )}
        </div>
    );
}
