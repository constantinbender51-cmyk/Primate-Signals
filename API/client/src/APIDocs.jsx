import React from 'react';

export default function APIDocs() {
    return (
        <div>
            {/* Title matches the dashboard aesthetic */}
            <div style={{ fontWeight: 'bold', marginBottom: '10px' }}>API Documentation</div>

            <p style={{ marginBottom: '10px' }}>
                Fetch live matrix data programmatically.
            </p>

            <div style={{ marginBottom: '15px' }}>
                <div><strong>Endpoint:</strong> GET <code>/live_matrix</code></div>
                <div><strong>Header:</strong> <code>x-api-key: YOUR_API_KEY</code></div>
            </div>

            {/* The Code Block: Grey box, black text, monospace font. */}
            <pre style={{ 
                background: '#f0f0f0', 
                padding: '10px', 
                border: '1px solid #000', 
                fontSize: '12px',
                fontFamily: 'monospace',
                overflowX: 'auto',
                whiteSpace: 'pre-wrap' // Wraps text so no horizontal scroll
            }}>
{`// Javascript Example
const API_URL = "https://api.primatesignals.com/live_matrix";
const API_KEY = "YOUR_KEY_HERE";

async function getSignals() {
  const res = await fetch(API_URL, {
    headers: { "x-api-key": API_KEY }
  });
  
  if (!res.ok) throw new Error("Failed");
  
  const data = await res.json();
  console.log(data);
}

getSignals();`}
            </pre>

            <div className="tiny" style={{ marginTop: '10px', color: '#000' }}>
                Note: Rate limited to 60 req/min.
            </div>
        </div>
    );
}
