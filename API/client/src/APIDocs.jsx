import React, { useState } from 'react';

const BASE_URL = import.meta.env.VITE_API_URL || '';

export default function APIDocs() {
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : {};
    const initialKey = user.api_key || "";

    // State for the Live Console
    const [testKey, setTestKey] = useState(""); 
    const [testSymbol, setTestSymbol] = useState("BTC"); // New state for symbol
    
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

    // Updated Code Example to reflect the /status/:symbol endpoint
    const codeExample = `// Configuration
const BASE_URL = "https://your-domain.com/api";
const API_KEY = "${testKey || 'YOUR_API_KEY_HERE'}";

/**
 * Fetch live Octopus Strategy status for a specific asset.
 * @param {string} symbol - The asset symbol (e.g., 'BTC', 'ETH', 'SOL')
 */
async function getStrategyStatus(symbol) {
  try {
    // Endpoint: /octopus/status/:symbol
    const response = await fetch(\`\${BASE_URL}/octopus/status/\${symbol}\`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY
      }
    });

    if (!response.ok) throw new Error("API Request failed: " + response.status);

    const data = await response.json();
    console.log(\`[\${symbol}] Active Params:\`, data.params);
    return data;
  } catch (error) {
    console.error("Failed to fetch strategy data:", error.message);
  }
}

// Example Usage
getStrategyStatus('BTC');`;

    const handleSimulate = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setConsoleOutput(null);
        setStatus(null);
        
        try {
            // Updated fetch to use the dynamic symbol
            const res = await fetch(`${BASE_URL}/api/octopus/status/${testSymbol}`, {
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
                    Integrate live Octopus Strategy grid parameters, trade logs, and equity curves into your own applications.
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
                <h4 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1rem' }}>Authentication</h4>
                <p style={{ fontSize: '14px', color: '#4b5563', marginBottom: '1.5rem' }}>
                     Authenticate by including your API key in the <code>x-api-key</code> header.
                     <br/>
                     <span style={{ color: '#ef4444', fontSize: '12px', fontWeight: '600' }}>NOTE:</span> Active subscription required.
                </p>
                <pre>{codeExample}</pre>
            </section>

            <section style={{ marginBottom: '4rem' }}>
                <h4 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1.5rem' }}>Endpoint Structure</h4>
                <p style={{ fontSize: '14px', color: '#4b5563', marginBottom: '1.5rem', lineHeight: '1.6' }}>
                    <code>GET /api/octopus/status/:symbol</code><br/>
                    Returns the full execution state for the requested symbol.
                </p>

                <h5 style={{ fontSize: '0.95rem', fontWeight: '700', marginBottom: '1rem', color: '#334155' }}>Response Object (JSON)</h5>
                <pre style={{ marginBottom: '2rem' }}>
{`{
  "status": "Running",
  "params": {
    "stop_pct": 0.02,
    "profit_pct": 0.015,
    "lines": [ ... ]
  },
  "live_logs": [
    {
      "timestamp": "2023-10-27 10:00:00",
      "price": 34500.50,
      "position": "LONG",
      "active_sl": 33810.00
    }
  ],
  "equity_curve": [ ... ] 
}`}
                </pre>
            </section>

            <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '4rem 0' }} />

            <section>
                <h3 style={{ border: 'none', margin: '0 0 0.5rem 0' }}>Live Console</h3>
                <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '1.5rem' }}>Test your integration directly from the browser.</p>

                <div style={{ 
                    background: '#fff', 
                    border: '1px solid #e5e7eb', 
                    borderRadius: '12px', 
                    overflow: 'hidden',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
                }}>
                    <div style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb' }}>
                        <form onSubmit={handleSimulate} style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                            {/* API Key Input */}
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

                            {/* Symbol Input */}
                            <div style={{ width: '100px' }}>
                                <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#64748b', marginBottom: '6px', textTransform: 'uppercase' }}>
                                    SYMBOL
                                </label>
                                <input 
                                    type="text" 
                                    value={testSymbol} 
                                    onChange={(e) => setTestSymbol(e.target.value.toUpperCase())}
                                    placeholder="BTC"
                                    style={{ margin: 0, width: '100%', boxSizing: 'border-box', padding: '10px', borderRadius: '6px', border: '1px solid #e5e7eb', textAlign: 'center' }}
                                />
                            </div>
                            
                            <button type="submit" disabled={isLoading} style={{ height: '42px', whiteSpace: 'nowrap', cursor: 'pointer', padding: '0 20px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px' }}>
                                {isLoading ? 'Sending...' : 'GET Status'}
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
                            <pre style={{ background: 'transparent', padding: 0, margin: 0, color: '#38bdf8', whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontSize: '12px' }}>
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
