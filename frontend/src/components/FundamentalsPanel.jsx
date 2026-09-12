import { useState, useEffect } from 'react';

const API = 'http://localhost:8000';

function fmt(n) {
    if (!n && n !== 0) return '—';
    return `$${Number(n).toFixed(2)}`;
}

function fmtVol(n) {
    if (!n && n !== 0) return '—';
    if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toString();
}

function Row({ label, value }) {
    return (
        <div className="fund-row">
            <span className="fund-label">{label}</span>
            <span className="fund-value">{value}</span>
        </div>
    );
}

function FundamentalsPanel({ symbol }) {
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!symbol) return;
        setData(null);
        setError(null);

        fetch(`${API}/api/fundamentals/${symbol}`)
            .then(res => {
                if (!res.ok) throw new Error(`${res.status}`);
                return res.json();
            })
            .then(setData)
            .catch(() => setError('Could not load fundamentals.'));
    }, [symbol]);

    if (!symbol) return null;

    if (error && !data) return (
        <div className="panel fund-panel error-state">{error}</div>
    );

    if (!data) return (
        <div className="panel fund-panel loading-state">Loading fundamentals...</div>
    );

    return (
        <div className="panel fund-panel">
            <div className="panel-title">Key Metrics</div>
            <div className="fund-grid">
                <Row label="Open"       value={fmt(data.open)} />
                <Row label="High"       value={fmt(data.high)} />
                <Row label="Low"        value={fmt(data.low)} />
                <Row label="Prev Close" value={fmt(data.prev_close)} />
                <Row label="Volume"     value={fmtVol(data.volume)} />
                <Row label="Bid"        value={fmt(data.bid)} />
                <Row label="Ask"        value={fmt(data.ask)} />
            </div>
            <div className="fund-attribution">Market data provided by Alpaca</div>
        </div>
    );
}

export default FundamentalsPanel;
