import React, { useState } from 'react';

const BASE_URL = import.meta.env.VITE_API_URL || '';

export default function APIDocs() {
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : {};
    const initialKey = user.api_key || "";

    const [testKey, setTestKey] = useState(""); 
    const [consoleOutput, setConsoleOutput] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState(null);
    const [copySuccess, setCopySuccess] = useState('');

    const handleCopy = () => {
        if (initialKey) {
            navigator.clipboard.writeText(initialKey);
            setCopySuccess('Copied!');
            setTimeout(() => setCopySuccess(''), 2000); 
        }
    };

    const codeExample = `// Configuration
const BASE_URL = "https://your-domain.com/api";
const API_KEY = "${testKey || 'YOUR_API_KEY_HERE'}";

/**
 * Fetch live Spearhead Signals for all assets.
 * Returns positions, entry prices, and current stops.
 */
async function getSignals() {
  try {
    const response = await fetch(\`\${BASE_URL}/spearhead/signals\`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY
      }
    });

    if (!response.ok) throw new Error("API Request failed: " + response.status);

    const data = await response.json();
    console.log("BTC Signal:", data['BTC']);
    return data;
  } catch (error) {
    console.error("Failed to fetch signals:", error.message);
  }
}`;

    const handleSimulate = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setConsoleOutput(null);
        setStatus(null);
        
        try {
            // Point to new Spearhead Signals endpoint
            const res = await fetch(`${BASE_URL}/api/spearhead/signals`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': testKey
                }
            });
            setStatus(res.status);
            
            const contentType = res.headers.get("content-type");
            if (contentType && contentType.indexOf("application/json") !== -1) {
                const data = await res.json();
                setConsoleOutput(data);
            } else {
                const text = await res.text();
                setConsoleOutput({ error: text });
            }
        } catch (err) {
            setConsoleOutput({ error: "Network/Fetch Error", details: err.message });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div style={{ paddingBottom: '100px', animation: 'fadeIn 0.5s ease-in' }}>
            <header style={{ marginBottom: '3rem' }}>
                <h3 style={{ border: 'none', margin: '0 0 0.5rem 0', fontSize: '1.75rem' }}>API Reference</h3>
                <p style={{ color: '#6b7280', fontSize: '15px' }}>
                    Integrate Spearhead signals directly into your trading bots.
                </p>
            </header>
            
            <div style={{ 
                background: '#f8fafc', 
                border: '1px solid #e2e8f0', 
                borderRadius: '8px', 
                padding: '1.25rem', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                marginBottom: '3rem'
            }}>
                <div>
                    <span style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>Your Private API Key</span>
                    <code style={{ fontSize: '14px', color: '#1e293b', fontWeight: '600' }}>{initialKey || 'KEY_NOT_FOUND'}</code>
                </div>
                <button 
                    onClick={handleCopy}
                    disabled={!initialKey}
                    style={{
                        background: '#fff',
                        border: '1px solid #d1d5db',
                        color: '#374151',
                        fontSize: '13px',
                        padding: '6px 12px',
                        cursor: 'pointer'
                    }}
                >
                    {copySuccess || 'Copy Key'}
                </button>
            </div>

            <section style={{ marginBottom: '4rem' }}>
                <h4 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1rem' }}>Endpoints</h4>
                <div style={{ marginBottom: '1.5rem', fontSize: '14px' }}>
                    <div style={{ marginBottom: '8px' }}>
                        <code style={{ background: '#dbeafe', color: '#1e40af' }}>GET /api/spearhead/history</code>
                        <span style={{ marginLeft: '10px', color: '#4b5563' }}>Public. Returns aggregate trade stats and PnL.</span>
                    </div>
                    <div>
                        <code style={{ background: '#fee2e2', color: '#991b1b' }}>GET /api/spearhead/signals</code>
                        <span style={{ marginLeft: '10px', color: '#4b5563' }}>Protected. Returns live positions and targets.</span>
                    </div>
                </div>
                <pre>{codeExample}</pre>
            </section>

            <section style={{ marginBottom: '4rem' }}>
                <h4 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1.5rem' }}>Signal Response Object</h4>
                <pre style={{ marginBottom: '2rem' }}>
{`{
  "BTC": {
    "timestamp": "2026-01-28 10:55:01.123456",
    "position": "LONG",
    "position_int": 1,
    "entry_price": 95120.50,
    "current_price": 95450.00,
    "unrealized_pnl_pct": 0.0034,
    "stop_loss_price": 94100.00,
    "take_profit_price": 96500.00
  },
  "ETH": { ... }
}`}
                </pre>
            </section>

            <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '4rem 0' }} />

            <section>
                <h3 style={{ border: 'none', margin: '0 0 0.5rem 0' }}>Live Console</h3>
                <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '1.5rem' }}>Test your key against the live signals endpoint.</p>

                <div style={{ 
                    background: '#fff', 
                    border: '1px solid #e5e7eb', 
                    borderRadius: '12px', 
                    overflow: 'hidden',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
                }}>
                    <div style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb' }}>
                        <form onSubmit={handleSimulate} style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                            <div style={{ flexGrow: 1, minWidth: '200px' }}>
                                <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#64748b', marginBottom: '6px', textTransform: 'uppercase' }}>
                                    X-API-KEY
                                </label>
                                <input 
                                    type="text" 
                                    value={testKey} 
                                    onChange={(e) => setTestKey(e.target.value)}
                                    placeholder="Paste your API key here"
                                    style={{ margin: 0, width: '100%', boxSizing: 'border-box', padding: '10px', borderRadius: '6px', border: '1px solid #e5e7eb' }}
                                />
                            </div>
                            
                            <button type="submit" disabled={isLoading} style={{ height: '42px', whiteSpace: 'nowrap', cursor: 'pointer', padding: '0 20px' }}>
                                {isLoading ? 'Sending...' : 'GET /spearhead/signals'}
                            </button>
                        </form>
                    </div>

                    <div style={{ background: '#0f172a', padding: '1.5rem', minHeight: '200px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid #1e293b', paddingBottom: '0.5rem' }}>
                            <span style={{ color: '#94a3b8', fontSize: '11px', fontWeight: '700' }}>OUTPUT</span>
                            {status && (
                                <span style={{ color: status === 200 ? '#10b981' : '#ef4444', fontSize: '11px', fontWeight: '700' }}>
                                    HTTP {status}
                                </span>
                            )}
                        </div>
                        {consoleOutput ? (
                            <pre style={{ background: 'transparent', padding: 0, margin: 0, color: '#38bdf8', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                                {JSON.stringify(consoleOutput, null, 2)}
                            </pre>
                        ) : (
                            <span style={{ color: '#475569', fontSize: '13px', fontStyle: 'italic' }}>// Ready for execution...</span>
                        )}
                    </div>
                </div>
            </section>
        </div>
    );
}