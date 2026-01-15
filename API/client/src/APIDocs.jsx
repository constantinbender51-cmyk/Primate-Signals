import React from 'react';

export default function APIDocs() {
    // 1. Get Key from Local Storage
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : {};
    const apiKey = user.api_key || "YOUR_API_KEY_HERE";

    const codeExample = `// Configuration
const API_ENDPOINT = "https://api.primatesignals.com/live_matrix"; 
const API_KEY = "${apiKey}"; // Your Key Auto-filled

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

    return (
        <div>
            <div style={{ display:'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3>API Documentation</h3>
                {/* 2. Display Key at Top */}
                <div style={{ background: '#f0f0f0', padding: '5px 10px', border: '1px solid #ccc', fontSize: '12px' }}>
                    <strong>YOUR KEY: </strong> 
                    <code style={{ background: 'none', border: 'none', padding: 0 }}>{apiKey}</code>
                </div>
            </div>
            
            <p>Authentication requires the <code>x-api-key</code> header.</p>

            <pre>{codeExample}</pre>
        </div>
    );
}
