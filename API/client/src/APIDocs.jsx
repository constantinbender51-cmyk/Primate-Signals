import React from 'react';

export default function APIDocs() {
    const codeExample = `// Configuration
const API_ENDPOINT = "https://api.primatesignals.com/live_matrix"; // Replace with production URL
const API_KEY = "YOUR_API_KEY_HERE";

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
      // Handle HTTP errors (e.g., 401 Unauthorized, 429 Rate Limit)
      // FIXED: Added backslashes to escape the dollar signs in the template literal below
      throw new Error(\`API Request failed: \${response.status} \${response.statusText}\`);
    }

    const data = await response.json();
    
    // Process the matrix data
    console.log("Matrix data received:", data);
    return data;

  } catch (error) {
    console.error("Failed to fetch live matrix:", error.message);
  }
}

// Execute
getLiveMatrix();`;

    return (
        <div className="container" style={{ paddingBottom: '4rem' }}>
            <h1 style={{ marginBottom: '2rem' }}>API Documentation</h1>
            <p style={{ marginBottom: '1rem', fontSize: '1rem', color: '#64748b' }}>
                This page demonstrates how to use the Primate Signals API to fetch live matrix data programmatically.
            </p>
            <div style={{ background: '#f8fafc', border: '1px solid var(--border)', borderRadius: '8px', padding: '1.5rem', overflowX: 'auto' }}>
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordWrap: 'break-word', fontFamily: 'monospace', fontSize: '0.9rem', lineHeight: '1.5' }}>
                    {codeExample}
                </pre>
            </div>
            <div style={{ marginTop: '2rem', padding: '1rem', background: '#f1f5f9', borderRadius: '8px' }}>
                <h3>Usage Notes</h3>
                <ul style={{ fontSize: '0.95rem', color: '#64748b' }}>
                    <li>Replace <code>API_ENDPOINT</code> with your production URL if different.</li>
                    <li>Set <code>API_KEY</code> to your actual API key from the Dashboard.</li>
                    <li>The API requires an active subscription and valid API key in the <code>x-api-key</code> header.</li>
                    <li>Handle errors appropriately in your application (e.g., 401 for unauthorized, 403 for subscription required).</li>
                    <li>This is a GET request returning JSON data with the live matrix results.</li>
                </ul>
            </div>
            <div style={{ marginTop: '2rem', padding: '1rem', background: '#fff3cd', border: '1px solid #ffc107', borderRadius: '8px' }}>
                <h3 style={{ color: '#856404' }}>Important Safety Warnings for Developers</h3>
                <ul style={{ fontSize: '0.95rem', color: '#856404' }}>
                    <li><strong>Latency:</strong> Market conditions can change in milliseconds. The price at the time of the signal generation may differ from the current market price.</li>
                    <li><strong>Fail-Safes:</strong> We strongly recommend implementing your own "Kill Switch" and "Max Daily Loss" logic in your trading bot. Do not rely solely on this API for risk management.</li>
                    <li><strong>Data Integrity:</strong> Occasionally, API responses may be delayed or return null. Your software must handle these exceptions gracefully without executing unintended trades.</li>
                </ul>
            </div>
        </div>
    );
}
