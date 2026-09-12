import { useState, useEffect } from 'react';

const API = 'http://localhost:8000';

function timeAgo(isoString) {
    if (!isoString) return '';
    const diff = Math.floor((Date.now() - new Date(isoString)) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}

function NewsPanel({ symbol }) {
    const [articles, setArticles] = useState([]);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!symbol) return;
        setLoading(true);
        setError(null);
        setArticles([]);

        fetch(`${API}/api/news/${symbol}`)
            .then(res => {
                if (!res.ok) throw new Error(`${res.status}`);
                return res.json();
            })
            .then(data => {
                setArticles(data);
                setLoading(false);
            })
            .catch(() => {
                setError('Could not load news.');
                setLoading(false);
            });
    }, [symbol]);

    if (!symbol) return null;

    return (
        <div className="panel news-panel">
            <div className="panel-title">News — {symbol}</div>

            {loading && <div className="loading-state">Loading news...</div>}
            {error && <div className="error-state">{error}</div>}
            {!loading && !error && articles.length === 0 && (
                <div className="error-state">No news found for {symbol}.</div>
            )}

            <div className="news-list">
                {articles.map(a => (
                    <a
                        key={a.id}
                        href={a.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="news-card"
                    >
                        {a.image && (
                            <img className="news-img" src={a.image} alt="" loading="lazy" />
                        )}
                        <div className="news-body">
                            <div className="news-headline">{a.headline}</div>
                            {a.summary && (
                                <div className="news-summary">{a.summary}</div>
                            )}
                            <div className="news-meta">
                                <span className="news-source">{a.source}</span>
                                <span className="news-time">{timeAgo(a.created_at)}</span>
                            </div>
                        </div>
                    </a>
                ))}
            </div>
        </div>
    );
}

export default NewsPanel;
