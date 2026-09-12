import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import SearchBar from './components/Searchbar';
import QuotePanel from './components/QuotePanel';
import ChartPanel from './components/ChartPanel';
import FundamentalsPanel from './components/FundamentalsPanel';
import NewsPanel from './components/NewsPanel';
import StockList from './components/StockList';
import Login from './components/Login';
import Signup from './components/Signup';
import Profile from './components/Profile';
import './App.css';

function AppContent() {
    const [symbol, setSymbol] = useState('');
    const [view, setView] = useState('login');
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="app">
                <div className="loading-screen">
                    <div className="loading-spinner"></div>
                    <p>Loading...</p>
                </div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="app">
                {view === 'login' ? (
                    <Login onSwitchToSignup={() => setView('signup')} />
                ) : (
                    <Signup onSwitchToLogin={() => setView('login')} />
                )}
            </div>
        );
    }

    if (view === 'profile') {
        return (
            <div className="app">
                <Profile onBack={() => setView('dashboard')} />
            </div>
        );
    }

    return (
        <div className="app">
            {/* Navbar */}
            <header className="navbar">
                <span className="nav-logo">Hofstra Finance</span>
                <SearchBar onSelect={setSymbol} />
                <button
                    onClick={() => setView('profile')}
                    className="profile-nav-btn"
                >
                    {user?.full_name || user?.email || 'Profile'}
                </button>
            </header>

            {/* Homepage — stock list shown before any symbol is selected */}
            {!symbol && (
                <div className="homepage">
                    <div className="hero">
                        <h2>Real-Time Stock Market Dashboard</h2>
                        <p>Search for a symbol above or click any stock to view live data.</p>
                    </div>
                    <StockList onSelect={setSymbol} />
                </div>
            )}

            {/* Dashboard — shown after a symbol is selected */}
            {symbol && (
                <main className="dashboard">
                    {/* Top row: quote full width */}
                    <QuotePanel symbol={symbol} />

                    {/* Middle row: chart (wide) + fundamentals (narrow) */}
                    <div className="dashboard-mid">
                        <ChartPanel symbol={symbol} />
                        <FundamentalsPanel symbol={symbol} />
                    </div>

                    {/* Bottom row: news full width */}
                    <NewsPanel symbol={symbol} />
                </main>
            )}
        </div>
    );
}

function App() {
    return (
        <AuthProvider>
            <AppContent />
        </AuthProvider>
    );
}

export default App;
