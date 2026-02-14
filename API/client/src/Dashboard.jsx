import React, { useEffect, useState } from 'react';
import LandingPage from './LandingPage';
import api from './api';
import toast from 'react-hot-toast';

// --- Recursive JSON Component ---
const JsonNode = ({ k, v, isLast }) => {
    const [expanded, setExpanded] = useState(true); // Default open for visibility
    const isObject = v && typeof v === 'object';
    const isArray = Array.isArray(v);
    
    // Style constants
    const styles = {
        container: { marginLeft: '20px', fontFamily: 'Menlo, Monaco, "Courier New", monospace', fontSize: '13px', lineHeight: '1.6' },
        key: { color: '#0f172a', fontWeight: '700', cursor: isObject ? 'pointer' : 'default' },
        string: { color: '#16a34a' }, // Green
        number: { color: '#d97706' }, // Orange
        boolean: { color: '#dc2626' }, // Red
        bracket: { color: '#94a3b8', fontWeight: 'bold' },
        toggle: { display: 'inline-block', width: '12px', marginRight: '6px', cursor: 'pointer', color: '#64748b', fontSize: '10px' }
    };

    if (isObject) {
        const keys = Object.keys(v);
        const isEmpty = keys.length === 0;
        const openBracket = isArray ? '[' : '{';
        const closeBracket = isArray ? ']' : '}';

        return (
            <div style={styles.container}>
                <span onClick={() => setExpanded(!expanded)} style={styles.key}>
                    <span style={styles.toggle}>{expanded ? '▼' : '▶'}</span>
                    {k && <span>{k}: </span>}
                    <span style={styles.bracket}>{openBracket}</span>
                </span>
                
                {!expanded && <span style={{color: '#94a3b8', fontStyle: 'italic'}}> ... {closeBracket}</span>}
                
                {expanded && (
                    <div>
                        {keys.map((key, i) => (
                            <JsonNode 
                                key={key} 
                                k={isArray ? null : key} 
                                v={v[key]} 
                                isLast={i === keys.length - 1} 
                            />
                        ))}
                    </div>
                )}
                
                {expanded && (
                    <div style={{ marginLeft: '18px' }}>
                        <span style={styles.bracket}>{closeBracket}</span>
                        {!isLast && <span style={styles.bracket}>,</span>}
                    </div>
                )}
            </div>
        );
    }

    // Primitives
    let valColor = styles.string;
    let displayVal = JSON.stringify(v);
    
    if (typeof v === 'number') valColor = styles.number;
    if (typeof v === 'boolean') valColor = styles.boolean;
    if (v === null) { displayVal = 'null'; valColor = styles.boolean; }

    // Strip quotes if simple string for cleaner look (optional, but looks nicer)
    if (typeof v === 'string') displayVal = `"${v}"`;

    return (
        <div style={styles.container}>
            {k && <span style={styles.key}>{k}: </span>}
            <span style={valColor}>{displayVal}</span>
            {!isLast && <span style={styles.bracket}>,</span>}
        </div>
    );
};

export default function Dashboard() {
    const token = localStorage.getItem('token');
    
    // Data State
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [lastUpdated, setLastUpdated] = useState(null);

    // If not logged in, show Landing Page immediately
    if (!token) return <LandingPage />;

    const fetchData = async () => {
        try {
            // Try to fetch the full signals (Protected)
            const res = await api.get('/api/spearhead/signals');
            setData(res.data);
            setIsSubscribed(true);
            setLastUpdated(new Date());
        } catch (err) {
            // If forbidden (403), fetch the public structure (Redacted)
            if (err.response && err.response.status === 403) {
                setIsSubscribed(false);
                try {
                    const publicRes = await api.get('/api/spearhead/history');
                    setData(publicRes.data); // Should contain keys but no values
                    setLastUpdated(new Date());
                } catch (e) {
                    toast.error("Unable to connect to analysis engine.");
                }
            }
        }
    };

    useEffect(() => {
        const init = async () => {
            setLoading(true);
            await fetchData();
            setLoading(false);
        };
        init();
        
        // Poll every 5 seconds
        const interval = setInterval(fetchData, 5000); 
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

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '80px', fontFamily: 'Inter, sans-serif' }}>
            
            {/* Header */}
            <div style={{ 
                marginBottom: '30px', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'flex-end',
                borderBottom: '1px solid #e2e8f0',
                paddingBottom: '20px'
            }}>
                <div>
                    <h1 style={{ margin: '0 0 8px 0', fontSize: '1.8rem', color: '#0f172a', fontWeight: '800' }}>
                        Live Neural Output
                    </h1>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ 
                                height: '8px', width: '8px', borderRadius: '50%', 
                                background: loading ? '#f59e0b' : '#10b981',
                                boxShadow: loading ? 'none' : '0 0 8px #10b981'
                            }}></span>
                            <span style={{ fontSize: '12px', color: '#64748b', fontFamily: 'monospace' }}>
                                {loading ? 'SYNCING...' : 'ONLINE'}
                            </span>
                        </div>
                        {lastUpdated && (
                            <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                                Updated: {lastUpdated.toLocaleTimeString()}
                            </span>
                        )}
                    </div>
                </div>

                {!isSubscribed && (
                    <button 
                        onClick={handleSubscribe}
                        style={{ 
                            background: '#2563eb', 
                            color: '#fff',
                            border: 'none',
                            padding: '12px 24px', 
                            borderRadius: '8px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.3)'
                        }}
                    >
                        Unlock Full Payload
                    </button>
                )}
            </div>

            {/* Locked State Warning */}
            {!isSubscribed && !loading && (
                <div style={{ 
                    background: '#fff7ed', 
                    border: '1px solid #fed7aa', 
                    padding: '16px', 
                    borderRadius: '8px', 
                    marginBottom: '24px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '16px' 
                }}>
                    <div style={{ background: '#ffedd5', padding: '8px', borderRadius: '50%' }}>🔒</div>
                    <div>
                        <h3 style={{ margin: '0 0 4px 0', fontSize: '15px', color: '#9a3412' }}>Redacted View</h3>
                        <p style={{ margin: 0, fontSize: '13px', color: '#c2410c' }}>
                            You are viewing the raw structure of the analysis. Values are hidden. Subscribe to decrypt the live data stream.
                        </p>
                    </div>
                </div>
            )}

            {/* The Main Data Container */}
            <div style={{ 
                background: '#fff', 
                borderRadius: '12px', 
                boxShadow: '0 4px 20px -5px rgba(0,0,0,0.1)', 
                border: '1px solid #e2e8f0',
                overflow: 'hidden'
            }}>
                <div style={{ 
                    padding: '12px 20px', 
                    background: '#f8fafc', 
                    borderBottom: '1px solid #e2e8f0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>JSON Stream</span>
                    <span style={{ fontSize: '12px', fontFamily: 'monospace', color: '#94a3b8' }}>
                        {data ? `${JSON.stringify(data).length} bytes` : '0 bytes'}
                    </span>
                </div>
                
                <div style={{ padding: '20px', overflowX: 'auto', background: '#ffffff' }}>
                    {data ? (
                        <JsonNode k="root" v={data} isLast={true} />
                    ) : (
                        <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}>
                            Waiting for neural engine...
                        </div>
                    )}
                </div>
            </div>

        </div>
    );
}
