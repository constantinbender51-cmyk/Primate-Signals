import React from 'react';
import { Link } from 'react-router-dom';

export default function LandingPage() {
    return (
        <div style={{ paddingBottom: '80px', animation: 'fadeIn 0.6s ease-out' }}>
            {/* Hero Section */}
            <section style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                textAlign: 'center', 
                padding: '80px 20px',
                background: `linear-gradient(rgba(255, 255, 255, 0.85), rgba(255, 255, 255, 0.95)), url('https://i.postimg.cc/HLmpLKr1/1769160143954.png ')`,
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
                    AI-Powered Prediction Engine
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
                    Hunt the Market with <br/>
                    <span style={{ color: '#d97706' }}>Primate Precision</span>
                </h1>
                
                <p style={{ 
                    fontSize: '1.25rem', 
                    color: '#4b5563', 
                    maxWidth: '600px', 
                    marginBottom: '40px',
                    lineHeight: '1.6'
                }}>
                    Stop guessing. Start striking. Our advanced models analyze BTC, XRP, and SOL in real-time to deliver high-accuracy entry and exit signals.
                </p>

                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
                    <Link to="/dashboard" style={{ 
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
                        View Live Market
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
                        Create Account
                    </Link>
                </div>
            </section>

            {/* How It Works Section */}
            <section style={{ 
                maxWidth: '900px', 
                margin: '0 auto 80px', 
                padding: '0 20px',
                textAlign: 'center'
            }}>
                <h2 style={{ 
                    fontSize: '2.2rem', 
                    fontWeight: '800', 
                    color: '#111827', 
                    marginBottom: '24px'
                }}>
                    No Magic. Just Market Memory.
                </h2>
                <p style={{ 
                    fontSize: '1.1rem', 
                    color: '#4b5563', 
                    lineHeight: '1.7',
                    marginBottom: '32px'
                }}>
                    Our engine doesn’t rely on lagging indicators or black-box AI. Instead, it scans years of price action to find recurring 4-candle patterns.  
                    Every time a new candle closes, it asks: <em>“When the market looked like this before, what happened next?”</em>  
                    If history shows a strong directional bias, we issue a live <strong>BUY</strong>, <strong>SELL</strong>, or <strong>HOLD</strong> signal—updated every candle.
                </p>
                <div style={{
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    borderRadius: '16px',
                    padding: '20px',
                    display: 'inline-block',
                    fontSize: '0.95rem',
                    color: '#065f46',
                    fontWeight: '600'
                }}>
                    Pure price action • Pattern-based • API-ready for bots
                </div>
            </section>

            {/* Feature / Visual Section */}
            <section style={{ 
                maxWidth: '1100px', 
                margin: '0 auto', 
                padding: '0 20px', 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', 
                gap: '60px', 
                alignItems: 'center' 
            }}>
                <div style={{ order: 2 }}>
                    <div style={{ 
                        position: 'relative', 
                        borderRadius: '24px', 
                        overflow: 'hidden', 
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                        border: '4px solid #fff'
                    }}>
                        <img 
                            src="https://raw.githubusercontent.com/constantinbender51-cmyk/Models/main/img/spearholding.png" 
                            alt="Primate Hunter" 
                            style={{ width: '100%', height: 'auto', display: 'block', background: '#fef3c7' }} 
                        />
                        <div style={{
                            position: 'absolute',
                            bottom: '20px',
                            left: '20px',
                            background: 'rgba(255, 255, 255, 0.9)',
                            padding: '12px 20px',
                            borderRadius: '12px',
                            backdropFilter: 'blur(4px)'
                        }}>
                            <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: '600' }}>SIGNAL ACCURACY</div>
                            <div style={{ fontSize: '24px', fontWeight: '800', color: '#059669' }}>84.2%</div>
                        </div>
                    </div>
                </div>
                
                <div style={{ order: 1 }}>
                    <h2 style={{ fontSize: '2.5rem', fontWeight: '800', marginBottom: '24px', lineHeight: '1.2' }}>
                        Don't Be Prey. <br/>
                        <span style={{ color: '#dc2626' }}>Be the Hunter.</span>
                    </h2>
                    <p style={{ fontSize: '1.1rem', color: '#6b7280', marginBottom: '32px', lineHeight: '1.7' }}>
                        The market is a jungle. Most traders get eaten by volatility. We equip you with the spear—institutional-grade data processing that identifies opportunities before the crowd moves.
                    </p>
                    
                    <div style={{ display: 'grid', gap: '24px' }}>
                        {[
                            { title: 'Real-Time Precision', desc: 'Signals generated every 15 minutes based on live order book data.' },
                            { title: 'Transparent Performance', desc: 'Full historical logs. We don\'t hide our losses, because our wins speak louder.' },
                            { title: 'API Access', desc: 'Connect your own bots directly to our prediction engine.' }
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