import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function LandingPage() {
    const [sentiment, setSentiment] = useState(null);

    useEffect(() => {
        fetch('https://machine-learning.up.railway.app/analysis_result.json')
            .then(res => res.json())
            .then(data => setSentiment(data))
            .catch(() => setSentiment(null));
    }, []);

    return (
        <div style={{ paddingBottom: '80px', animation: 'fadeIn 0.6s ease-out' }}>
            {/* Hero Section */}
            <section style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                textAlign: 'center', 
                padding: '80px 20px',
                background: `linear-gradient(rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.95)), url('https://i.postimg.cc/HLmpLKr1/1769160143954.png')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                borderRadius: '0 0 40px 40px',
                marginBottom: '60px',
                borderBottom: '1px solid #fef3c7'
            }}>
                <div style={{ 
                    background: '#fef9c3', 
                    color: '#b45309', 
                    padding: '6px 16px', 
                    borderRadius: '20px', 
                    fontSize: '13px', 
                    fontWeight: '700',
                    marginBottom: '24px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    border: '1px solid #fde68a'
                }}>
                    Community scraping
                </div>
                
                <h1 style={{ 
                    fontSize: '3.5rem', 
                    fontWeight: '900', 
                    color: '#111827', 
                    marginBottom: '24px', 
                    lineHeight: '1.1',
                    maxWidth: '800px',
                    letterSpacing: '-0.02em'
                }}>
                    Crypto Sentiment <br/>
                    <span style={{ color: '#d97706' }}> Analysis</span>
                </h1>

                {sentiment && (
                    <div style={{
                        marginBottom: '24px',
                        padding: '12px 20px',
                        background: '#f3f4f6',
                        borderRadius: '12px',
                        border: '1px solid #e5e7eb',
                        fontSize: '14px',
                        fontFamily: 'monospace',
                        color: '#374151'
                    }}>
                        <strong>LLM Sentiment Analysis:</strong> {JSON.stringify(sentiment)}
                    </div>
                )}
                
                <p style={{ 
                    fontSize: '1.25rem', 
                    color: '#4b5563', 
                    maxWidth: '600px', 
                    marginBottom: '40px',
                    lineHeight: '1.6'
                }}>
                    Data aquisition, proccessing and overview.
                </p>

                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
                    <Link to="/" style={{ 
                        textDecoration: 'none', 
                        background: '#d97706', 
                        color: '#fff', 
                        padding: '16px 32px', 
                        borderRadius: '8px', 
                        fontWeight: '700',
                        fontSize: '18px',
                        transition: 'transform 0.2s',
                        boxShadow: '0 10px 15px -3px rgba(217, 119, 6, 0.3)'
                    }}>
                        Performance 
                    </Link>
                    <Link to="/register" style={{ 
                        textDecoration: 'none', 
                        background: '#fff', 
                        color: '#111827', 
                        border: '1px solid #e5e7eb',
                        padding: '16px 32px', 
                        borderRadius: '8px', 
                        fontWeight: '700',
                        fontSize: '18px'
                    }}>
                        Start Trial
                    </Link>
                </div>
            </section>

            {/* Feature / Visual Section */}
            <section style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '60px', alignItems: 'center' }}>
                <div style={{ order: 2 }}> 
                    <div style={{ 
                        position: 'relative', 
                        borderRadius: '24px', 
                        overflow: 'hidden', 
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                        border: '4px solid #fff'
                    }}>
                        <img 
                            src="https://i.postimg.cc/G3g5y2Sw/IMG-20260128-070021.pg" 
                            alt="chart" 
                            style={{ width: '100%', height: 'auto', display: 'block', background: '#fef3c7' }} 
                        />
                    </div>
                </div>
                
                <div style={{ order: 1 }}>
                    <h2 style={{ fontSize: '2.5rem', fontWeight: '800', marginBottom: '24px', lineHeight: '1.2' }}>
                        Valuable information <span style={{ color: '#dc2626' }}>Whats the overall sentiment? Optimistic?</span>
                    </h2>
                    <p style={{ fontSize: '1.1rem', color: '#6b7280', marginBottom: '32px', lineHeight: '1.7' }}>
                        Sentiment driven markets act on emotions, ipinions and beliefs. Nearly packed and presented to you. 
                    </p>
                    
                    <div style={{ display: 'grid', gap: '24px' }}>
                        {[
                            { title: 'Global Coverage', desc: 'Simultaneous tracking of top 15 assets by volume.' },
                            { title: 'Transparent History', desc: 'Full public access to historical trade logs and PnL.' },
                            { title: 'API First', desc: 'Programmatic access for your execution bots.' },
                            { title: 'Live Signals', desc: 'Real-time entry, stop-loss, and take-profit updates.' }
                        ].map((item, i) => (
                            <div key={i} style={{ display: 'flex', gap: '16px' }}>
                                <div style={{ 
                                    minWidth: '24px', height: '24px', 
                                    background: '#ecfdf5', color: '#059669', 
                                    borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '14px' 
                                }}>✓</div>
                                <div>
                                    <h4 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: '700' }}>{item.title}</h4>
                                    <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>{item.desc}</p>
                                </div>
                            </div> 
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );
}
