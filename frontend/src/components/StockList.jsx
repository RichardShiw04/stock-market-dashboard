import { useState, useEffect } from 'react';

const API = 'http://localhost:8000';
const POLL_INTERVAL = 10000;

const FEATURED = [
    { symbol: 'AAPL',  name: 'Apple' },
    { symbol: 'MSFT',  name: 'Microsoft' },
    { symbol: 'NVDA',  name: 'NVIDIA' },
    { symbol: 'GOOGL', name: 'Alphabet' },
    { symbol: 'AMZN',  name: 'Amazon' },
    { symbol: 'META',  name: 'Meta' },
    { symbol: 'TSLA',  name: 'Tesla' },
    { symbol: 'JPM',   name: 'JPMorgan' },
    { symbol: 'NFLX',  name: 'Netflix' },
    { symbol: 'AMD',   name: 'AMD' },
    { symbol: 'DIS',   name: 'Disney' },
    { symbol: 'UBER',  name: 'Uber' },
    { symbol: 'COIN',  name: 'Coinbase' },
    { symbol: 'PYPL',  name: 'PayPal' },
    { symbol: 'ADBE',  name: 'Adobe' },
];

const SYMBOLS = FEATURED.map(s => s.symbol).join(',');

function StockList({ onSelect }) {
    const [quotes, setQuotes] = useState({});
    const [loading, setLoading] = useState(true);

    async function fetchAll() {
        try {
            const res = await fetch(`${API}/api/quotes?symbols=${SYMBOLS}`);
            if (res.ok) {
                const data = await res.json();
                setQuotes(data);
            }
        } catch {
            // silently retry on next poll
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchAll();
        const id = setInterval(fetchAll, POLL_INTERVAL);
        return () => clearInterval(id);
    }, []);

    return (
        <section className="stock-list-section">
            <h2 className="stock-list-title">Market Overview</h2>
            {loading ? (
                <div className="loading-state">Loading market data...</div>
            ) : (
                <div className="stock-grid">
                    {FEATURED.map(({ symbol, name }) => {
                        const q = quotes[symbol];
                        const positive = q ? q.change >= 0 : true;
                        return (
                            <button
                                key={symbol}
                                className="stock-card"
                                onClick={() => onSelect(symbol)}
                            >
                                <div className="sc-top">
                                    <span className="sc-symbol">{symbol}</span>
                                    <span className={`sc-change ${positive ? 'positive' : 'negative'}`}>
                                        {q ? `${positive ? '+' : ''}${q.change_pct.toFixed(2)}%` : '—'}
                                    </span>
                                </div>
                                <div className="sc-name">{name}</div>
                                <div className="sc-price">
                                    {q ? `$${q.price.toFixed(2)}` : '—'}
                                </div>
                                <div className={`sc-abs-change ${positive ? 'positive' : 'negative'}`}>
                                    {q ? `${positive ? '+' : ''}${q.change.toFixed(2)}` : ''}
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}
        </section>
    );
}

export default StockList;
