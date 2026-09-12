import { useState, useEffect, useRef } from 'react';

const API = 'http://localhost:8000';

function SearchBar({ onSelect }) {
    const [query, setQuery] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const debounceRef = useRef(null);
    const containerRef = useRef(null);

    useEffect(() => {
        if (query.trim().length === 0) {
            setSuggestions([]);
            setOpen(false);
            return;
        }

        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(async () => {
            setLoading(true);
            try {
                const res = await fetch(`${API}/api/search?q=${encodeURIComponent(query)}`);
                if (res.ok) {
                    const data = await res.json();
                    setSuggestions(data);
                    setOpen(data.length > 0);
                }
            } catch {
                setSuggestions([]);
            } finally {
                setLoading(false);
            }
        }, 300);

        return () => clearTimeout(debounceRef.current);
    }, [query]);

    // Close dropdown on outside click
    useEffect(() => {
        function handleClick(e) {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    function handleSelect(item) {
        setQuery(item.symbol);
        setOpen(false);
        setSuggestions([]);
        onSelect(item.symbol);
    }

    function handleSubmit(e) {
        e.preventDefault();
        if (query.trim()) {
            setOpen(false);
            onSelect(query.trim().toUpperCase());
        }
    }

    return (
        <div className="search-wrapper" ref={containerRef}>
            <form className="search-form" onSubmit={handleSubmit}>
                <input
                    className="search-input"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Search symbol or company..."
                    autoComplete="off"
                />
                <button className="search-btn" type="submit">Search</button>
            </form>

            {open && (
                <ul className="autocomplete-list">
                    {suggestions.map(s => (
                        <li
                            key={s.symbol}
                            className="autocomplete-item"
                            onMouseDown={() => handleSelect(s)}
                        >
                            <span className="ac-symbol">{s.symbol}</span>
                            <span className="ac-name">{s.name}</span>
                            <span className="ac-exchange">{s.exchange}</span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

export default SearchBar;
