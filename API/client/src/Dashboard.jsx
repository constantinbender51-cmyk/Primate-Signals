import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from './api';

// Helper to determine direction from the raw matrix data
const calculateDirection = (assetData) => {
    // Summing timeframe signals to determine net direction
    const score = Object.values(assetData).reduce((a, b) => a + b, 0);
    if (score > 0) return 'Long';
    if (score < 0) return 'Short';
    return 'Neutral';
};

export default function Dashboard() {
    const [matrixData, setMatrixData] = useState([]);
    const [historyData, setHistoryData] = useState([]);

    // --- Data Fetching ---
    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch History
                const historyRes = await api.get('/signal_history');
                setHistoryData(historyRes.data.results || []);
                
                // Fetch Live Signals
                const matrixRes = await api.get('/live_matrix');
                setMatrixData(matrixRes.data.results || []);
            } catch (err) {
                console.error("Data fetch error", err);
            }
        };
        fetchData();
    }, []);

    // --- Process Live Signals ---
    const liveSignals = useMemo(() => {
        if (!matrixData.length) return [];
        
        // Group by asset to find net direction
        const assets = {};
        matrixData.forEach(d => {
            if (!assets[d.asset]) assets[d.asset] = {};
            assets[d.asset][d.tf] = d.signal_val;
            // Capture the latest update time as "Start"
            if (!assets[d.asset].start || new Date(d.updated_at) > new Date(assets[d.asset].start)) {
                assets[d.asset].start = d.updated_at;
            }
        });

        return Object.keys(assets).map(asset => {
            const direction = calculateDirection(assets[asset]);
            return {
                direction,
                asset,
                start: assets[asset].start,
                end: '-' // Live signals are open
            };
        }).filter(item => item.direction !== 'Neutral');
    }, [matrixData]);

    // --- Process History ---
    const orderHistory = useMemo(() => {
        return historyData.map(row => {
            const entry = parseFloat(row.price_at_signal);
            const close = parseFloat(row.close_price);
            let change = 0;
            
            // Calculate % Change
            if (!isNaN(entry) && !isNaN(close) && entry !== 0) {
                change = (row.signal === 'BUY' || row.signal === 1) 
                    ? ((close - entry) / entry) * 100 
                    : ((entry - close) / entry) * 100;
            }

            return {
                direction: (row.signal === 'BUY' || row.signal === 1) ? 'Long' : 'Short',
                asset: row.asset,
                start: row.time_str,
                end: row.closed_at || 'Closed', // Assuming API has a closed_at, otherwise static text
                change: change.toFixed(2) + '%'
            };
        });
    }, [historyData]);

    const styles = {
        container: { maxWidth: '800px', margin: '0 auto', padding: '2rem', fontFamily: 'monospace' },
        header: { marginBottom: '3rem' },
        title: { fontSize: '2rem', fontWeight: 'bold', margin: '0' },
        subtitle: { fontSize: '1.5rem', margin: '0 0 1rem 0' },
        disclaimer: { fontSize: '0.8rem', color: '#666', fontStyle: 'italic' },
        sectionTitle: { fontSize: '1.2rem', borderBottom: '1px solid #000', paddingBottom: '0.5rem', marginTop: '3rem', marginBottom: '1rem' },
        table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' },
        th: { textAlign: 'left', padding: '8px', borderBottom: '1px solid #ddd' },
        td: { padding: '8px', borderBottom: '1px solid #eee' },
        footer: { marginTop: '4rem', paddingTop: '1rem', borderTop: '1px solid #eee', display: 'flex', gap: '2rem', fontSize: '0.8rem' },
        link: { color: '#333', textDecoration: 'none' },
        green: { color: 'green' },
        red: { color: 'red' }
    };

    return (
        <div style={styles.container}>
            {/* HEADER */}
            <div style={styles.header}>
                <h1 style={styles.title}>Primate</h1>
                <h2 style={styles.subtitle}>Trading Signals</h2>
                <p style={styles.disclaimer}>For educational purposes only.</p>
            </div>

            {/* SECTION 1: LIVE SIGNALS */}
            <h3 style={styles.sectionTitle}>Signals</h3>
            <table style={styles.table}>
                <thead>
                    <tr>
                        <th style={styles.th}>Direction</th>
                        <th style={styles.th}>Asset</th>
                        <th style={styles.th}>Start</th>
                        <th style={styles.th}>End</th>
                    </tr>
                </thead>
                <tbody>
                    {liveSignals.length > 0 ? liveSignals.map((row, i) => (
                        <tr key={i}>
                            <td style={{...styles.td, color: row.direction === 'Long' ? 'green' : 'red'}}>
                                {row.direction}
                            </td>
                            <td style={styles.td}>{row.asset}</td>
                            <td style={styles.td}>{new Date(row.start).toLocaleTimeString()}</td>
                            <td style={styles.td}>{row.end}</td>
                        </tr>
                    )) : (
                        <tr><td colSpan="4" style={styles.td}>No active signals</td></tr>
                    )}
                </tbody>
            </table>

            {/* SECTION 2: ORDER HISTORY */}
            <h3 style={styles.sectionTitle}>Order History</h3>
            <table style={styles.table}>
                <thead>
                    <tr>
                        <th style={styles.th}>Direction</th>
                        <th style={styles.th}>Asset</th>
                        <th style={styles.th}>Start</th>
                        <th style={styles.th}>End</th>
                        <th style={styles.th}>%Change</th>
                    </tr>
                </thead>
                <tbody>
                    {orderHistory.length > 0 ? orderHistory.map((row, i) => (
                        <tr key={i}>
                            <td style={{...styles.td, color: row.direction === 'Long' ? 'green' : 'red'}}>
                                {row.direction}
                            </td>
                            <td style={styles.td}>{row.asset}</td>
                            <td style={styles.td}>{row.start}</td>
                            <td style={styles.td}>{row.end}</td>
                            <td style={{...styles.td, color: row.change.includes('-') ? 'red' : 'green'}}>
                                {row.change}
                            </td>
                        </tr>
                    )) : (
                        <tr><td colSpan="5" style={styles.td}>No history available</td></tr>
                    )}
                </tbody>
            </table>

            {/* FOOTER */}
            <div style={styles.footer}>
                <Link to="/impressum" style={styles.link}>Impressum</Link>
                <Link to="/privacy" style={styles.link}>Privacy policy</Link>
                <Link to="/terms" style={styles.link}>Terms of service</Link>
            </div>
        </div>
    );
}
