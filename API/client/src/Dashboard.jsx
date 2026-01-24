import { Link, useNavigate } from 'react-router-dom';
import api from './api';
import LandingPage from './LandingPage'; // Import Landing Page

const ASSETS = ['BTC', 'XRP', 'SOL'];

// --- Sub-Component: Asset Card ---
const AssetCard = ({ symbol }) => {
    return (
        <Link 
            to={`/asset/${symbol}`} 
            style={{
                textDecoration: 'none',
                color: 'inherit',
                background: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                padding: '16px', // Reduced padding
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                minHeight: '80px',
                cursor: 'pointer',
                transition: 'border-color 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.borderColor = '#2563eb'}
            onMouseOut={(e) => e.currentTarget.style.borderColor = '#e5e7eb'}
        >
            <h3 style={{ margin: 0, fontSize: '1.5rem' }}>{symbol} / USD</h3>
        </Link>
    );
};

// --- Main Dashboard Component ---
export default function Dashboard() {
    const navigate = useNavigate();
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;
    
    // 1. If not logged in, show Landing Page
    if (!token) {
        return <LandingPage />;
    }

    const isActive = user && (user.subscription_status === 'active' || user.subscription_status === 'trialing');

    const handleSubscribe = async () => {
        try {
            const res = await api.post('/create-checkout-session');
            window.location.href = res.data.url;
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '80px', animation: 'fadeIn 0.5s ease-out' }}>
            <header style={{ marginBottom: '40px' }}>
                <h2 style={{ fontSize: '1.8rem', fontWeight: '800', margin: '0 0 8px 0', color: '#111827' }}>Market Overview</h2>
                <p style={{ margin: 0, color: '#6b7280' }}>
                    Real-time AI signals for major assets. {isActive ? "Active Plan" : "Free Account"}
                </p>
            </header>

            {/* Asset Cards */}
            <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', 
                gap: '24px',
                marginBottom: '48px'
            }}>
                {ASSETS.map(symbol => (
                    <AssetCard 
                        key={symbol} 
                        symbol={symbol} 
                    />
                ))}
            </div>
        </div>
    );
}
import { Link, useNavigate } from 'react-router-dom';
import api from './api';
import LandingPage from './LandingPage'; // Import Landing Page

const ASSETS = ['BTC', 'XRP', 'SOL'];

// --- Sub-Component: Asset Card ---
const AssetCard = ({ symbol }) => {
    return (
        <Link 
            to={`/asset/${symbol}`} 
            style={{
                textDecoration: 'none',
                color: 'inherit',
                background: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                padding: '16px', // Reduced padding
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                minHeight: '80px',
                cursor: 'pointer',
                transition: 'border-color 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.borderColor = '#2563eb'}
            onMouseOut={(e) => e.currentTarget.style.borderColor = '#e5e7eb'}
        >
            <h3 style={{ margin: 0, fontSize: '1.5rem' }}>{symbol} / USD</h3>
        </Link>
    );
};

// --- Main Dashboard Component ---
export default function Dashboard() {
    const navigate = useNavigate();
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;
    
    // 1. If not logged in, show Landing Page
    if (!token) {
        return <LandingPage />;
    }

    const isActive = user && (user.subscription_status === 'active' || user.subscription_status === 'trialing');

    const handleSubscribe = async () => {
        try {
            const res = await api.post('/create-checkout-session');
            window.location.href = res.data.url;
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '80px', animation: 'fadeIn 0.5s ease-out' }}>
            <header style={{ marginBottom: '40px' }}>
                <h2 style={{ fontSize: '1.8rem', fontWeight: '800', margin: '0 0 8px 0', color: '#111827' }}>Market Overview</h2>
                <p style={{ margin: 0, color: '#6b7280' }}>
                    Real-time AI signals for major assets. {isActive ? "Active Plan" : "Free Account"}
                </p>
            </header>

            {/* Asset Cards */}
            <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', 
                gap: '24px',
                marginBottom: '48px'
            }}>
                {ASSETS.map(symbol => (
                    <AssetCard 
                        key={symbol} 
                        symbol={symbol} 
                    />
                ))}
            </div>
        </div>
    );
}
