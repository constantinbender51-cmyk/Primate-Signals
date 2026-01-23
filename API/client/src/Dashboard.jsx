import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from './api';
import toast from 'react-hot-toast';

const ASSETS = ['BTC', 'XRP', 'SOL'];

const AssetCard = ({ symbol }) => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                // Fetch recent stats to show on the dashboard card
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
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                padding: '24px',
                transition: 'transform 0.2s, box-shadow 0.2s',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, fontSize: '1.5rem' }}>{symbol} / USD</h3>
                    <span style={{ 
                        background: '#eff6ff', color: '#2563eb', 
                        padding: '4px 12px', borderRadius: '20px', 
                        fontSize: '12px', fontWeight: '600' 
                    }}>1H Signal</span>
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

export default function Dashboard() {
    const navigate = useNavigate();
    // Simple UTC clock
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const t = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(t);
    }, []);

    const formatUTC = (d) => d.toLocaleString('sv-SE', { timeZone: 'UTC' }).replace(' ', ' T ') + 'Z';

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
                <div>
                    <h2 style={{ fontSize: '1.8rem', fontWeight: '800', margin: '0 0 8px 0' }}>Market Overview</h2>
                    <p style={{ margin: 0, color: '#6b7280' }}>Select an asset to view detailed signals and backtests.</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: '600' }}>UTC TIME</div>
                    <div style={{ fontFamily: 'monospace', fontSize: '16px', fontWeight: '500' }}>{formatUTC(time)}</div>
                </div>
            </header>

            <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
                gap: '24px' 
            }}>
                {ASSETS.map(symbol => (
                    <AssetCard key={symbol} symbol={symbol} />
                ))}
            </div>
        </div>
    );
}
