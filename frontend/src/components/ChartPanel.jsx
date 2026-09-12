import { useState, useEffect } from 'react';
import {
    ResponsiveContainer,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
} from 'recharts';

const API = 'http://localhost:8000';
const RANGES = ['1D', '7D', '1M', '1Y'];

function formatLabel(timeStr, range) {
    const d = new Date(timeStr);
    if (range === '1D') return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (range === '7D') return d.toLocaleDateString([], { weekday: 'short', hour: '2-digit' });
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function CustomTooltip({ active, payload, label, range }) {
    if (!active || !payload || !payload.length) return null;
    return (
        <div className="chart-tooltip">
            <div className="tooltip-time">{formatLabel(label, range)}</div>
            <div className="tooltip-price">${Number(payload[0].value).toFixed(2)}</div>
        </div>
    );
}

function ChartPanel({ symbol }) {
    const [range, setRange] = useState('1D');
    const [bars, setBars] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!symbol) return;
        setLoading(true);
        setError(null);
        setBars([]);

        fetch(`${API}/api/chart/${symbol}?range=${range}`)
            .then(res => {
                if (!res.ok) throw new Error(`${res.status}`);
                return res.json();
            })
            .then(data => {
                setBars(data);
                setLoading(false);
            })
            .catch(() => {
                setError('Could not load chart data.');
                setLoading(false);
            });
    }, [symbol, range]);

    if (!symbol) return null;

    const isPositive = bars.length >= 2
        ? bars[bars.length - 1].close >= bars[0].close
        : true;

    const lineColor = isPositive ? '#26a69a' : '#ef5350';

    const prices = bars.map(b => b.close);
    const minPrice = prices.length ? Math.min(...prices) : 0;
    const maxPrice = prices.length ? Math.max(...prices) : 0;
    const padding = (maxPrice - minPrice) * 0.05 || 1;

    return (
        <div className="panel chart-panel">
            <div className="chart-header">
                <span className="panel-title">Price Chart</span>
                <div className="range-buttons">
                    {RANGES.map(r => (
                        <button
                            key={r}
                            className={`range-btn ${range === r ? 'active' : ''}`}
                            onClick={() => setRange(r)}
                        >
                            {r}
                        </button>
                    ))}
                </div>
            </div>

            {loading && <div className="loading-state">Loading chart...</div>}
            {error && <div className="error-state">{error}</div>}

            {!loading && !error && bars.length === 0 && (
                <div className="error-state">No chart data available for this range.</div>
            )}

            {!loading && bars.length > 0 && (
                <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={bars} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                        <XAxis
                            dataKey="time"
                            tickFormatter={t => formatLabel(t, range)}
                            tick={{ fill: '#888', fontSize: 11 }}
                            interval="preserveStartEnd"
                            minTickGap={60}
                        />
                        <YAxis
                            domain={[minPrice - padding, maxPrice + padding]}
                            tick={{ fill: '#888', fontSize: 11 }}
                            tickFormatter={v => `$${v.toFixed(2)}`}
                            width={72}
                        />
                        <Tooltip content={<CustomTooltip range={range} />} />
                        <Line
                            type="monotone"
                            dataKey="close"
                            stroke={lineColor}
                            strokeWidth={2}
                            dot={false}
                            activeDot={{ r: 4 }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            )}
        </div>
    );
}

export default ChartPanel;
