import React, { useState, useEffect } from 'react';

// specific URL handling for Vite vs Production
const BASE_URL = import.meta.env.VITE_API_URL || '';

export default function APIDocs() {
    // 1. Get Key from Local Storage for display only
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : {};
    const initialKey = user.api_key || "";

    // 2. State for the Interactive Console
    const [testKey, setTestKey] = useState("");
    const [consoleOutput, setConsoleOutput] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState(null); 

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

    if (!response.ok) {
      throw new Error("API Request failed: " + response.status);
    }

    const data = await response.json();
    console.log("Matrix data received:", data);
    return data;

  } catch (error) {
    console.error("Failed to fetch live matrix:", error.message);
  }
}

// Execute
getLiveMatrix();`;

    const responseExample = `[
  {
    "asset": "BCHUSDT",
    "tf": "60m",
    "signal_val": 0,       // 0 = WAIT
    "updated_at": "2026-01-15T10:15:25.381Z",
    "last_updated": "2026-01-15T10:15:25.367Z"
  },
  {
    "asset": "BCHUSDT",
    "tf": "240m",
    "signal_val": -1,      // -1 = SELL
    "updated_at": "2026-01-15T10:15:25.381Z",
    "last_updated": "2026-01-15T10:15:25.367Z"
  },
  {
    "asset": "ETHUSDT",
    "tf": "1d",
    "signal_val": 1,       // 1 = BUY
    "updated_at": "2026-01-15T10:15:25.381Z",
    "last_updated": "2026-01-15T10:15:25.367Z"
  }
]`;

    // 3. Simulation Handler
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
        <div style={{ paddingBottom: '50px' }}>
            <h3>API Documentation</h3>
            
            {/* Display Key underneath the title */}
            <div style={{ background: '#f0f0f0', padding: '5px 10px', border: '1px solid #ccc', fontSize: '12px', marginBottom: '15px' }}>
                <strong>YOUR KEY: </strong> 
                <code style={{ background: 'none', border: 'none', padding: 0 }}>{initialKey || 'NOT FOUND'}</code>
            </div>
            
            <p>Authentication requires the <code>x-api-key</code> header.</p>

            {/* Request Code Block */}
            <pre style={{ marginBottom: '30px' }}>{codeExample}</pre>

            {/* Response Structure Section */}
            <h3>Response Structure</h3>
            <p>The API returns a JSON array containing signal objects. Each object represents a specific asset on a specific timeframe.</p>
            
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px', fontSize: '14px' }}>
                <thead>
                    <tr style={{ background: '#f0f0f0', textAlign: 'left' }}>
                        <th style={{ border: '1px solid #ddd', padding: '8px' }}>Field</th>
                        <th style={{ border: '1px solid #ddd', padding: '8px' }}>Type</th>
                        <th style={{ border: '1px solid #ddd', padding: '8px' }}>Description</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td style={{ border: '1px solid #ddd', padding: '8px' }}><code>asset</code></td>
                        <td style={{ border: '1px solid #ddd', padding: '8px' }}>String</td>
                        <td style={{ border: '1px solid #ddd', padding: '8px' }}>The trading pair symbol (e.g., "BTCUSDT").</td>
                    </tr>
                    <tr>
                        <td style={{ border: '1px solid #ddd', padding: '8px' }}><code>tf</code></td>
                        <td style={{ border: '1px solid #ddd', padding: '8px' }}>String</td>
                        <td style={{ border: '1px solid #ddd', padding: '8px' }}>Timeframe (e.g., "15m", "60m", "240m", "1d").</td>
                    </tr>
                    <tr>
                        <td style={{ border: '1px solid #ddd', padding: '8px' }}><code>signal_val</code></td>
                        <td style={{ border: '1px solid #ddd', padding: '8px' }}>Integer</td>
                        <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                            <strong>1</strong>: BUY<br/>
                            <strong>-1</strong>: SELL<br/>
                            <strong>0</strong>: WAIT / NEUTRAL
                        </td>
                    </tr>
                    <tr>
                        <td style={{ border: '1px solid #ddd', padding: '8px' }}><code>updated_at</code></td>
                        <td style={{ border: '1px solid #ddd', padding: '8px' }}>String</td>
                        <td style={{ border: '1px solid #ddd', padding: '8px' }}>ISO 8601 Timestamp of the last signal calculation.</td>
                    </tr>
                </tbody>
            </table>

            <pre style={{ background: '#f9f9f9', border: '1px solid #ddd', padding: '15px' }}>
                {responseExample}
            </pre>

            {/* Interactive Console Section */}
            <hr style={{ margin: '40px 0' }} />
            <h3>Live API Console</h3>
            <p style={{ fontSize: '14px' }}>Test your key directly from the browser.</p>

            <div style={{ 
                border: '1px solid #000', 
                padding: '20px', 
                background: '#fff' 
            }}>
                <form onSubmit={handleSimulate} style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '12px' }}>
                        X-API-KEY
                    </label>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <input 
                            type="text" 
                            value={testKey} 
                            onChange={(e) => setTestKey(e.target.value)}
                            placeholder="Enter API Key"
                            style={{ margin: 0, flexGrow: 1 }}
                        />
                        <button type="submit" disabled={isLoading} style={{ width: 'auto', whiteSpace: 'nowrap' }}>
                            {isLoading ? 'Sending...' : 'Run Request'}
                        </button>
                    </div>
                </form>

                <div style={{ 
                    background: '#000', 
                    color: '#0f0', 
                    padding: '15px', 
                    fontFamily: 'monospace', 
                    fontSize: '12px',
                    minHeight: '150px',
                    overflowX: 'auto'
                }}>
                    <div style={{ borderBottom: '1px solid #333', paddingBottom: '5px', marginBottom: '10px', color: '#fff' }}>
                        Console Output {status && <span style={{ float: 'right', color: status === 200 ? '#0f0' : '#f00' }}>HTTP {status}</span>}
                    </div>
                    {consoleOutput ? (
                        <pre style={{ background: 'transparent', border: 'none', padding: 0, color: 'inherit', whiteSpace: 'pre-wrap' }}>
                            {JSON.stringify(consoleOutput, null, 2)}
                        </pre>
                    ) : (
                        <span style={{ color: '#555' }}>// Waiting for execution...</span>
                    )}
                </div>
            </div>
        </div>
    );
}
