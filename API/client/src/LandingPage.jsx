import React from 'react';
import { Link } from 'react-router-dom';

export default function LandingPage() {
    return (
        <div style={{ paddingBottom: '80px', animation: 'fadeIn 0.6s ease-out', fontFamily: 'Inter, sans-serif' }}>
            {/* Hero Section */}
            <section style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                textAlign: 'center', 
                padding: '100px 20px',
                background: `linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(240,249,255,0.95) 100%), url('https://i.postimg.cc/HLmpLKr1/1769160143954.png')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                borderRadius: '0 0 60px 60px',
                marginBottom: '80px',
                borderBottom: '1px solid #bfdbfe'
            }}>
                <div style={{ 
                    background: '#eff6ff', 
                    color: '#1d4ed8', 
                    padding: '8px 20px', 
                    borderRadius: '30px', 
                    fontSize: '12px', 
                    fontWeight: '800',
                    marginBottom: '32px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    border: '1px solid #bfdbfe',
                    boxShadow: '0 4px 6px -1px rgba(29, 78, 216, 0.1)'
                }}>
                    v2.0 Neural Sentiment Engine
                </div>
                
                <h1 style={{ 
                    fontSize: '4rem', 
                    fontWeight: '900', 
                    color: '#0f172a', 
                    marginBottom: '32px', 
                    lineHeight: '1.05',
                    maxWidth: '900px',
                    letterSpacing: '-0.03em'
                }}>
                    Quantify the <br/>
                    <span style={{ 
                        background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent'
                    }}>Collective Unconscious</span>
                </h1>
                
                <p style={{ 
                    fontSize: '1.35rem', 
                    color: '#475569', 
                    maxWidth: '680px', 
                    marginBottom: '48px',
                    lineHeight: '1.6',
                    fontWeight: '400'
                }}>
                    We scrape, parse, and score global market chatter in real-time. 
                    Stop guessing the trend. Measure the raw human emotion driving the price action.
                </p>

                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
                    <Link to="/" style={{ 
                        textDecoration: 'none', 
                        background: '#0f172a', 
                        color: '#fff', 
                        padding: '18px 40px', 
                        borderRadius: '12px', 
                        fontWeight: '700',
                        fontSize: '16px',
                        transition: 'all 0.2s',
                        boxShadow: '0 20px 25px -5px rgba(15, 23, 42, 0.3)'
                    }}>
                        Live Analysis
                    </Link>
                    <Link to="/register" style={{ 
                        textDecoration: 'none', 
                        background: '#fff', 
                        color: '#0f172a', 
                        border: '1px solid #cbd5e1',
                        padding: '18px 40px', 
                        borderRadius: '12px', 
                        fontWeight: '700',
                        fontSize: '16px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
                    }}>
                        Start Trial
                    </Link>
                </div>
            </section>

            {/* Technical Section */}
            <section style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '80px', alignItems: 'center' }}>
                
                {/* Visualizer */}
                <div style={{ order: 1 }}>
                    <div style={{ 
                        position: 'relative', 
                        borderRadius: '24px', 
                        overflow: 'hidden', 
                        boxShadow: '0 25px 50px -12px rgba(37, 99, 235, 0.15)',
                        border: '1px solid #e2e8f0',
                        background: '#f8fafc'
                    }}>
                        <div style={{ padding: '20px', borderBottom: '1px solid #e2e8f0', background: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444' }}></div>
                                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f59e0b' }}></div>
                                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981' }}></div>
                            </div>
                            <div style={{ fontSize: '12px', fontFamily: 'monospace', color: '#64748b' }}>processing_nodes: 12,401</div>
                        </div>
                        <img 
                            src="https://i.postimg.cc/G3g5y2Sw/IMG-20260128-070021.png" 
                            alt="sentiment-data-vis" 
                            style={{ width: '100%', height: 'auto', display: 'block', opacity: 0.9, mixBlendMode: 'multiply' }} 
                        />
                        <div style={{ position: 'absolute', bottom: '20px', left: '20px', background: 'rgba(255,255,255,0.9)', padding: '10px 16px', borderRadius: '8px', backdropFilter: 'blur(4px)', border: '1px solid #fff' }}>
                            <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: '700' }}>Current BTC Sentiment</div>
                            <div style={{ fontSize: '24px', color: '#10b981', fontWeight: '800' }}>88.4 / 100</div>
                        </div>
                    </div>
                </div>
                
                {/* Copy */}
                <div style={{ order: 2 }}>
                    <h2 style={{ fontSize: '2.75rem', fontWeight: '800', marginBottom: '24px', lineHeight: '1.1', color: '#1e293b' }}>
                        Data over <br/>
                        <span style={{ color: '#2563eb' }}>Dogma.</span>
                    </h2>
                    <p style={{ fontSize: '1.15rem', color: '#64748b', marginBottom: '40px', lineHeight: '1.7' }}>
                        Price is a lagging indicator. Sentiment is a leading indicator. By the time a candle prints, the crowd has already moved. We give you the map to the crowd's intent before they execute.
                    </p>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
                        {[
                            { 
                                title: 'NLP Processing', 
                                desc: 'Proprietary language models trained on crypto-specific vernacular and slang.',
                                icon: '🧠' 
                            },
                            { 
                                title: 'Source Agnostic', 
                                desc: 'Aggregated data from X, Reddit, Telegram, and on-chain governance forums.',
                                icon: '🌐' 
                            },
                            { 
                                title: 'API Access', 
                                desc: 'Feed the raw sentiment scores directly into your execution algos via JSON.',
                                icon: '⚡' 
                            },
                            { 
                                title: 'Bot Protection', 
                                desc: 'Advanced filtering to remove spam bots and engagement farming from the dataset.',
                                icon: '🛡️' 
                            }
                        ].map((item, i) => (
                            <div key={i}>
                                <div style={{ fontSize: '24px', marginBottom: '12px' }}>{item.icon}</div>
                                <h4 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '700', color: '#0f172a' }}>{item.title}</h4>
                                <p style={{ margin: 0, fontSize: '13px', color: '#64748b', lineHeight: '1.5' }}>{item.desc}</p>
                            </div> 
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );
}
