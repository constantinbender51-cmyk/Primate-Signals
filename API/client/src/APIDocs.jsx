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
const API_ENDPOINT = "https://api.primatesignals.com/live_matrix"; 
const API_KEY = "${testKey || 'YOUR_API_KEY_HERE'}";

/**
 * Fetches the Live Matrix data from the Primate Signals API.
 */
async function getLiveMatrix() {
  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY
      }
    });

    if (!response.ok) throw new Error("API Request failed: " + response.status);

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Failed to fetch live matrix:", error.message);
  }
}`;

    const handleSimulate = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setConsoleOutput(null);
        setStatus(null);

        try {
            const res = await fetch(`${BASE_URL}/live_matrix`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': testKey
                }
            });
            setStatus(res.status);
            const data = await res.json();
            setConsoleOutput(data);
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
                    Integrate real-time signals into your own trading bots or dashboards.
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
                        padding: '6px 12px'
                    }}
                >
                    {copySuccess || 'Copy Key'}
                </button>
            </div>

            <section style={{ marginBottom: '4rem' }}>
                <h4 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1rem' }}>Authentication</h4>
                <p style={{ fontSize: '14px', color: '#4b5563', marginBottom: '1.5rem' }}>
                    Authenticate your requests by including your API key in the <code>x-api-key</code> header of every request.
                </p>
                <pre>{codeExample}</pre>
            </section>

            <section style={{ marginBottom: '4rem' }}>
                <h4 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1.5rem' }}>Endpoint: Live Matrix</h4>
                <table>
                    <thead>
                        <tr>
                            <th>Field</th>
                            <th>Type</th>
                            <th>Description</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><code>asset</code></td>
                            <td>String</td>
                            <td>The trading pair symbol (e.g., "BTCUSDT").</td>
                        </tr>
                        <tr>
                            <td><code>tf</code></td>
                            <td>String</td>
                            <td>Timeframe (e.g., "15m", "1d").</td>
                        </tr>
                        <tr>
                            <td><code>signal_val</code></td>
                            <td>Integer</td>
                            <td>1: BUY | -1: SELL | 0: WAIT</td>
                        </tr>
                    </tbody>
                </table>
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
                        <form onSubmit={handleSimulate} style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
                            <div style={{ flexGrow: 1 }}>
                                <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#64748b', marginBottom: '6px', textTransform: 'uppercase' }}>
                                    X-API-KEY
                                </label>
                                <input 
                                    type="text" 
                                    value={testKey} 
                                    onChange={(e) => setTestKey(e.target.value)}
                                    placeholder="Paste your API key here"
                                    style={{ margin: 0 }}
                                />
                            </div>
                            <button type="submit" disabled={isLoading} style={{ height: '42px', whiteSpace: 'nowrap' }}>
                                {isLoading ? 'Sending...' : 'Test Request'}
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
                            <pre style={{ background: 'transparent', padding: 0, margin: 0, color: '#38bdf8' }}>
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
