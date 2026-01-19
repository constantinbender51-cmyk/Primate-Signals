import { useEffect, useState, useMemo } from 'react';
import api from './api';

export default function Dashboard() {
    const [matrixData, setMatrixData] = useState([]);
    const [historyData, setHistoryData] = useState([]);

    useEffect(() => {
        api.get('/live_matrix').then(res => setMatrixData(res.data.results || [])).catch(() => {});
        api.get('/signal_history').then(res => setHistoryData(res.data.results || [])).catch(() => {});
    }, []);

    const signals = useMemo(() => {
        const assets = {};
        matrixData.forEach(d => {
            if (!assets[d.asset]) assets[d.asset] = { score: 0, start: d.updated_at };
            assets[d.asset].score += d.signal_val;
        });

        return Object.entries(assets)
            .map(([asset, data]) => ({
                direction: data.score > 0 ? 'Long' : (data.score < 0 ? 'Short' : null),
                asset,
                start: data.start,
                end: '-' 
            }))
            .filter(item => item.direction !== null);
    }, [matrixData]);

    const history = useMemo(() => {
        return historyData.map(row => {
            const entry = parseFloat(row.price_at_signal);
            const close = parseFloat(row.close_price);
            let change = 0;
            if (entry && close) {
                change = (row.signal === 'BUY' || row.signal === 1) 
                    ? ((close - entry) / entry) * 100 
                    : ((entry - close) / entry) * 100;
            }
            return {
                direction: (row.signal === 'BUY' || row.signal === 1) ? 'Long' : 'Short',
                asset: row.asset,
                start: row.time_str,
                end: row.closed_at || '-',
                change: change.toFixed(2) + '%'
            };
        });
    }, [historyData]);

    const cellStyle = { padding: '5px 10px', textAlign: 'left' };

    return (
        <div style={{ padding: '0 0 20px 0' }}>
            {/* View Title */}
            <h2>Trading Signals</h2>
            <p className="tiny" style={{ marginBottom: '2rem' }}>
                Real-time market analysis. For educational purposes only.
            </p>

            <h3>Active Signals</h3>
            <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                <thead>
                    <tr>
                        <th style={cellStyle}>Direction</th>
                        <th style={cellStyle}>Asset</th>
                        <th style={cellStyle}>Start</th>
                        <th style={cellStyle}>End</th>
                    </tr>
                </thead>
                <tbody>
                    {signals.length > 0 ? signals.map((row, i) => (
                        <tr key={i}>
                            <td style={{...cellStyle, color: row.direction === 'Long' ? 'var(--success)' : 'var(--danger)', fontWeight: 'bold'}}>
                                {row.direction}
                            </td>
                            <td style={cellStyle}>{row.asset}</td>
                            <td style={cellStyle}>{row.start}</td>
                            <td style={cellStyle}>{row.end}</td>
                        </tr>
                    )) : (
                        <tr><td colSpan="4" style={{textAlign: 'center', padding: '2rem', color: '#9ca3af'}}>No active signals</td></tr>
                    )}
                </tbody>
            </table>

            <h3>Order History</h3>
            <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                <thead>
                    <tr>
                        <th style={cellStyle}>Direction</th>
                        <th style={cellStyle}>Asset</th>
                        <th style={cellStyle}>Start</th>
                        <th style={cellStyle}>End</th>
                        <th style={cellStyle}>%Change</th>
                    </tr>
                </thead>
                <tbody>
                    {history.map((row, i) => (
                        <tr key={i}>
                            <td style={{...cellStyle, color: row.direction === 'Long' ? 'var(--success)' : 'var(--danger)'}}>
                                {row.direction}
                            </td>
                            <td style={cellStyle}>{row.asset}</td>
                            <td style={cellStyle}>{row.start}</td>
                            <td style={cellStyle}>{row.end}</td>
                            <td style={{...cellStyle, fontWeight: 'bold'}}>{row.change}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
