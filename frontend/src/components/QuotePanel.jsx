import { useState, useEffect, useRef } from 'react';

const API = 'http://localhost:8000';
const POLL_INTERVAL = 10000; // 10 seconds per SRS FR-3

function formatTime(isoString) {
    if (!isoString) return '—';
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function formatVolume(n) {
    if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toString();
}

function QuotePanel({ symbol }) {
    const [quote, setQuote] = useState(null);
    const [error, setError] = useState(null);
    const [flash, setFlash] = useState(null); // 'up' | 'down' | null
    const prevPrice = useRef(null);

    async function fetchQuote() {
        try {
            const res = await fetch(`${API}/api/quote/${symbol}`);
            if (!res.ok) throw new Error(`${res.status}`);
            const data = await res.json();

            // Trigger flash animation on price change
            if (prevPrice.current !== null && data.price !== prevPrice.current) {
                setFlash(data.price > prevPrice.current ? 'up' : 'down');
                setTimeout(() => setFlash(null), 600);
            }
            prevPrice.current = data.price;
            setQuote(data);
            setError(null);
        } catch (e) {
            setError('Could not load quote. Retrying...');
        }
    }

    useEffect(() => {
        if (!symbol) return;
        prevPrice.current = null;
        setQuote(null);
        setError(null);
        fetchQuote();
        const interval = setInterval(fetchQuote, POLL_INTERVAL);
        return () => clearInterval(interval);
    }, [symbol]);

    if (!symbol) return null;

    if (error && !quote) {
        return <div className="panel quote-panel error-state">{error}</div>;
    }

    if (!quote) {
        return <div className="panel quote-panel loading-state">Loading quote...</div>;
    }

    const positive = quote.change >= 0;

    return (
        <div className="panel quote-panel">
            <div className="quote-header">
                <span className="quote-symbol">{quote.symbol}</span>
                <span className="quote-updated">Updated {formatTime(quote.timestamp)}</span>
            </div>

            <div className={`quote-price ${flash === 'up' ? 'flash-up' : flash === 'down' ? 'flash-down' : ''}`}>
                ${quote.price.toFixed(2)}
            </div>

            <div className={`quote-change ${positive ? 'positive' : 'negative'}`}>
                {positive ? '▲' : '▼'} {Math.abs(quote.change).toFixed(2)} ({Math.abs(quote.change_pct).toFixed(2)}%)
            </div>

            <div className="quote-meta">
                <span>Bid: <strong>${quote.bid.toFixed(2)}</strong></span>
                <span>Ask: <strong>${quote.ask.toFixed(2)}</strong></span>
                <span>Vol: <strong>{formatVolume(quote.volume)}</strong></span>
            </div>

            {error && <div className="inline-error">{error}</div>}
        </div>
    );
}

export default QuotePanel;
