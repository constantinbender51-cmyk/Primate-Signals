import React from 'react';

export default function APIDocs() {
    const codeExample = `// Configuration
const API_ENDPOINT = "https://api.primatesignals.com/live_matrix"; 
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
            <h3>API Documentation</h3>
            <p>This page demonstrates how to use the Primate Signals API to fetch live matrix data programmatically.</p>
            
            <pre>{codeExample}</pre>

            <div style={{ marginTop: '20px' }}>
                <strong>Usage Notes</strong>
                <ul>
                    <li>Replace <code>API_ENDPOINT</code> with your production URL.</li>
                    <li>Set <code>API_KEY</code> to your actual API key from the Dashboard.</li>
                    <li>The API requires an active subscription.</li>
                </ul>
            </div>

            <div style={{ marginTop: '20px', border: '1px solid #000', padding: '10px' }}>
                <strong>Important Safety Warnings for Developers</strong>
                <ul>
                    <li><strong>Latency:</strong> Market conditions can change in milliseconds.</li>
                    <li><strong>Fail-Safes:</strong> We strongly recommend implementing your own "Kill Switch" and "Max Daily Loss" logic.</li>
                    <li><strong>Data Integrity:</strong> Your software must handle exceptions gracefully.</li>
                </ul>
            </div>
        </div>
    );
}
