import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from './api';

// Included 'ALL' to link to the aggregated portfolio view
const ASSETS = ['BTC', 'XRP', 'SOL', 'ALL'];

// --- Sub-Component: Card View (Visual) ---
const AssetCard = ({ symbol }) => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    const isPortfolio = symbol === 'ALL';
    const displayName = isPortfolio ? "Global Portfolio" : `${symbol} / USD`;

    useEffect(() => {
        const fetchStats = async () => {
            try {
                // Determine correct endpoint. If symbol is ALL, the backend handles aggregation.
                const res = await api.get(`/api/signals/${symbol}/recent`);
                setStats(res.data);
            } catch (err) {
                console.error(`Failed to load ${symbol} stats`);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, [symbol]);

    return (
        <Link to={`/asset/${symbol}`} style={{ textDecoration: 'none', color: 'inherit' }}>
            <div style={{
                background: '#fff',
                border: isPortfolio ? '1px solid #b45309' : '1px solid #e5e7eb', // Highlight portfolio card
                borderRadius: '12px',
                padding: '24px',
                transition: 'transform 0.2s, box-shadow 0.2s',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                height: '100%',
                position: 'relative',
                overflow: 'hidden'
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1)';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
            }}
            >
                {/* Special background accent for Portfolio card */}
                {isPortfolio && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: '#d97706' }}></div>}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, fontSize: '1.5rem', color: isPortfolio ? '#b45309' : '#111827' }}>{displayName}</h3>
                    <span style={{ 
                        background: isPortfolio ? '#fffbeb' : '#eff6ff', 
                        color: isPortfolio ? '#b45309' : '#2563eb', 
                        padding: '4px 12px', borderRadius: '20px', 
                        fontSize: '12px', fontWeight: '600' 
                    }}>
                        {isPortfolio ? 'AGGREGATED' : '1H Signal'}
                    </span>
                </div>
                
                <div style={{ height: '1px', background: '#f3f4f6', margin: '8px 0' }}></div>

                {loading ? (
                    <div style={{ color: '#9ca3af', fontSize: '14px' }}>Loading stats...</div>
                ) : stats ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div>
                            <div style={{ fontSize: '12px', color: '#6b7280', textTransform: 'uppercase' }}>Accuracy</div>
                            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#111827' }}>{stats.accuracy_percent}%</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '12px', color: '#6b7280', textTransform: 'uppercase' }}>Total PnL</div>
                            <div style={{ 
                                fontSize: '18px', fontWeight: 'bold',
                                color: stats.cumulative_pnl >= 0 ? '#10b981' : '#ef4444'
                            }}>
                                {stats.cumulative_pnl >= 0 ? '+' : ''}{parseFloat(stats.cumulative_pnl).toFixed(4)}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div style={{ color: '#ef4444', fontSize: '14px' }}>Unavailable</div>
                )}
            </div>
        </Link>
    );
};

// --- Sub-Component: Table Row (Data) ---
const AssetRow = ({ symbol }) => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const isPortfolio = symbol === 'ALL';

    useEffect(() => {
        api.get(`/api/signals/${symbol}/recent`)
            .then(res => setStats(res.data))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [symbol]);

    if (loading) return (
        <tr>
            <td colSpan="6" style={{ padding: '16px', textAlign: 'center', color: '#9ca3af' }}>Loading {symbol}...</td>
        </tr>
    );

    if (!stats) return null;

    return (
        <tr 
            onClick={() => navigate(`/asset/${symbol}`)}
            style={{ cursor: 'pointer', transition: 'background 0.1s', background: isPortfolio ? '#fffbeb' : 'transparent' }}
            onMouseEnter={(e) => e.currentTarget.style.background = isPortfolio ? '#fef3c7' : '#f8fafc'}
            onMouseLeave={(e) => e.currentTarget.style.background = isPortfolio ? '#fffbeb' : 'transparent'}
        >
            <td style={{ fontWeight: '600', color: '#111827' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ 
                        width: '8px', height: '8px', borderRadius: '50%', 
                        background: isPortfolio ? '#d97706' : '#10b981' 
                    }}></div>
                    {isPortfolio ? 'TOTAL PORTFOLIO' : symbol}
                </div>
            </td>
            <td>
                <span style={{ 
                    background: isPortfolio ? '#fff7ed' : '#f3f4f6', 
                    color: isPortfolio ? '#9a3412' : '#374151',
                    padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: '600' 
                }}>
                    {isPortfolio ? 'MIX' : '1H'}
                </span>
            </td>
            <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ 
                        width: '100%', maxWidth: '60px', height: '6px', background: '#e5e7eb', borderRadius: '3px', overflow: 'hidden' 
                    }}>
                        <div style={{ width: `${stats.accuracy_percent}%`, height: '100%', background: isPortfolio ? '#d97706' : '#2563eb' }}></div>
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: '600' }}>{stats.accuracy_percent}%</span>
                </div>
            </td>
            <td>{stats.total_trades}</td>
            <td style={{ fontWeight: 'bold', color: stats.cumulative_pnl >= 0 ? '#10b981' : '#ef4444' }}>
                {stats.cumulative_pnl >= 0 ? '+' : ''}{parseFloat(stats.cumulative_pnl).toFixed(4)}
            </td>
            <td style={{ textAlign: 'right' }}>
                <button 
                    style={{ 
                        background: '#fff', border: '1px solid #e5e7eb', color: '#374151', 
                        padding: '4px 10px', fontSize: '12px', borderRadius: '4px' 
                    }}
                >
                    View
                </button>
            </td>
        </tr>
    );
};

// --- Main Dashboard Component ---
export default function Dashboard() {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const t = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(t);
    }, []);

    const formatUTC = (d) => d.toLocaleString('sv-SE', { timeZone: 'UTC' }).replace(' ', ' T ') + 'Z';

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '80px', animation: 'fadeIn 0.5s ease-out' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
                <div>
                    <h2 style={{ fontSize: '1.8rem', fontWeight: '800', margin: '0 0 8px 0', color: '#111827' }}>Market Overview</h2>
                    <p style={{ margin: 0, color: '#6b7280' }}>Real-time signal performance tracking.</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: '600', marginBottom: '4px' }}>UTC SYSTEM TIME</div>
                    <div style={{ fontFamily: 'monospace', fontSize: '16px', fontWeight: '500', color: '#374151' }}>{formatUTC(time)}</div>
                </div>
            </header>

            {/* Section 1: Quick Cards */}
            <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
                gap: '24px',
                marginBottom: '48px'
            }}>
                {ASSETS.map(symbol => (
                    <AssetCard key={symbol} symbol={symbol} />
                ))}
            </div>

            {/* Section 2: Detailed Table */}
            <section>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                    <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '700' }}>Performance Matrix</h3>
                    <span style={{ fontSize: '13px', color: '#6b7280' }}>Updates automatically</span>
                </div>

                <div style={{ 
                    background: '#fff', 
                    borderRadius: '12px', 
                    border: '1px solid #e5e7eb', 
                    overflow: 'hidden', 
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)' 
                }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', margin: 0, border: 'none' }}>
                        <thead>
                            <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                                <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', color: '#6b7280', textTransform: 'uppercase' }}>Asset</th>
                                <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', color: '#6b7280', textTransform: 'uppercase' }}>Interval</th>
                                <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', color: '#6b7280', textTransform: 'uppercase' }}>Accuracy</th>
                                <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', color: '#6b7280', textTransform: 'uppercase' }}>Total Trades</th>
                                <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', color: '#6b7280', textTransform: 'uppercase' }}>Net PnL</th>
                                <th style={{ padding: '16px', textAlign: 'right', fontSize: '12px', color: '#6b7280', textTransform: 'uppercase' }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {ASSETS.map(symbol => (
                                <AssetRow key={symbol} symbol={symbol} />
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}
