import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from './api';

export default function Dashboard() {
    const [matrixData, setMatrixData] = useState([]);
    const [historyData, setHistoryData] = useState([]);
    const [updatedAt, setUpdatedAt] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                await Promise.all([
                    api.get('/live_matrix').then(res => setMatrixData(res.data.results || [])),
                    api.get('/signal_history').then(res => setHistoryData(res.data.results || []))
                ]);
            } catch (e) {
                // Silent error handling
            } finally {
                setUpdatedAt(new Date());
            }
        };

        fetchData();
    }, []);

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
        });
    };

    const getCandleTimes = (dateInput, tf) => {
        const start = new Date(dateInput);
        let duration = 0;

        // Normalize tf to string and handle common abbreviations
        const timeframe = String(tf).toLowerCase();

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
                start.setHours(0, 0, 0, 0);
                duration = 24 * 60 * 60 * 1000;
                break;
            default:
                // Fallback to 15m rounding if tf is undefined or unrecognized
                start.setMinutes(Math.floor(start.getMinutes() / 15) * 15, 0, 0);
                duration = 15 * 60 * 1000;
                break;
        }

        const end = new Date(start.getTime() + duration);
        return { start, end };
    };

    const signals = useMemo(() => {
        const assets = {};
        
        matrixData.forEach(d => {
            if (!assets[d.asset]) {
                // Using d.tf for timeframe
                assets[d.asset] = { score: 0, start: d.updated_at, tf: d.tf || '1d' };
            }
            assets[d.asset].score += d.signal_val;
        });

        return Object.entries(assets)
            .map(([asset, data]) => {
                const { start, end } = getCandleTimes(data.start, data.tf);
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

            // Using row.tf for timeframe calculation
            const { start, end } = getCandleTimes(row.time_str, row.tf || '15m');

            return {
                direction: (row.signal === 'BUY' || row.signal === 1) ? 'Long' : 'Short',
                asset: row.asset,
                start: formatDateTime(start),
                end: formatDateTime(end),
                change: change.toFixed(2) + '%'
            };
        });
    }, [historyData]);

    const cellStyle = { padding: '5px 10px', textAlign: 'left' };

    return (
        <div style={{ fontFamily: 'sans-serif', padding: '20px', position: 'relative' }}>
            <div style={{ position: 'absolute', top: '20px', right: '20px', fontSize: '0.85rem', color: '#555' }}>
                Updated at: {formatDateTime(updatedAt)}
            </div>

            <h2>Trading Signals</h2>
            <p>For educational purposes only.</p>

            <h3>Signals</h3>
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

            <h3 style={{ marginTop: '40px' }}>Order History</h3>
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

            <div style={{ marginTop: '40px', display: 'flex', gap: '15px' }}>
                <Link to="/impressum">Impressum</Link>
                <Link to="/privacy">Privacy</Link>
                <Link to="/terms">Terms</Link>
            </div>
        </div>
    );
}
