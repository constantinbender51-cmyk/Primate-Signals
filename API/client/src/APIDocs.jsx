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
            
            <pre>{codeExample}</pre>


        </div>
    );
}
