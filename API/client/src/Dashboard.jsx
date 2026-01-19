import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from './api';

export default function Dashboard() {
    const [matrixData, setMatrixData] = useState([]);
    const [historyData, setHistoryData] = useState([]);

    useEffect(() => {
        api.get('/live_matrix').then(res => setMatrixData(res.data.results || [])).catch(() => {});
        api.get('/signal_history').then(res => setHistoryData(res.data.results || [])).catch(() => {});
    }, []);

    // Format: YYYY-MM-DD HH:mm:ss
    const formatDateTime = (dateInput) => {
        if (!dateInput) return '-';
        const date = new Date(dateInput);
        if (isNaN(date.getTime())) return '-';

        return date.toLocaleString('sv-SE', { 
            year: 'numeric', 
            month: '2-digit', 
            day: '2-digit', 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit' 
        }).replace(' ', ' ');
    };

    // Helper to calculate Start (floor) and End (start + duration) based on timeframe
    const getCandleTimes = (dateInput, timeframe) => {
        const start = new Date(dateInput);
        let duration = 0;

        switch (timeframe) {
            case '15m':
                start.setMinutes(Math.floor(start.getMinutes() / 15) * 15, 0, 0);
                duration = 15 * 60 * 1000;
                break;
            case '30m':
                start.setMinutes(Math.floor(start.getMinutes() / 30) * 30, 0, 0);
                duration = 30 * 60 * 1000;
                break;
            case '1h':
                start.setMinutes(0, 0, 0);
                duration = 60 * 60 * 1000;
                break;
            case '4h':
                start.setHours(Math.floor(start.getHours() / 4) * 4, 0, 0, 0);
                duration = 4 * 60 * 60 * 1000;
                break;
            case '1d':
            default:
                start.setHours(0, 0, 0, 0);
                duration = 24 * 60 * 60 * 1000;
                break;
        }

        const end = new Date(start.getTime() + duration);
        return { start, end };
    };

    const signals = useMemo(() => {
        const assets = {};
        
        matrixData.forEach(d => {
            if (!assets[d.asset]) {
                // Default to '1d' if d.timeframe is missing
                assets[d.asset] = { score: 0, start: d.updated_at, timeframe: d.timeframe || '1d' };
            }
            assets[d.asset].score += d.signal_val;
        });

        return Object.entries(assets)
            .map(([asset, data]) => {
                const { start, end } = getCandleTimes(data.start, data.timeframe);

                return {
                    direction: data.score > 0 ? 'Long' : (data.score < 0 ? 'Short' : null),
                    asset,
                    start: formatDateTime(start),
                    end: formatDateTime(end)
                };
            })
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
                start: formatDateTime(row.time_str),
                end: formatDateTime(row.closed_at),
                change: change.toFixed(2) + '%'
            };
        });
    }, [historyData]);

    const cellStyle = { padding: '5px 10px', textAlign: 'left' };

    return (
        <div style={{ fontFamily: 'sans-serif', padding: '20px' }}>
            <h1></h1>
            <h2>Trading Signals</h2>
            <p>For educational purposes only.</p>

            <h3>Signals</h3>
            <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                <thead>
                    <tr>
                        <th style={cellStyle}>Direction</th>
                        <th style={cellStyle}>Asset</th>
                        <th style={cellStyle}>Start</th>
                        <th style={cellStyle}>End (Exp)</th>
                    </tr>
                </thead>
                <tbody>
                    {signals.map((row, i) => (
                        <tr key={i}>
                            <td style={cellStyle}>{row.direction}</td>
                            <td style={cellStyle}>{row.asset}</td>
                            <td style={cellStyle}>{row.start}</td>
                            <td style={cellStyle}>{row.end}</td>
                        </tr>
                    ))}
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
                            <td style={cellStyle}>{row.direction}</td>
                            <td style={cellStyle}>{row.asset}</td>
                            <td style={cellStyle}>{row.start}</td>
                            <td style={cellStyle}>{row.end}</td>
                            <td style={cellStyle}>{row.change}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <div style={{ marginTop: '20px', display: 'flex', gap: '15px' }}>
                <Link to="/impressum">Impressum</Link>
                <Link to="/privacy">Privacy</Link>
                <Link to="/terms">Terms</Link>
            </div>
        </div>
    );
}
