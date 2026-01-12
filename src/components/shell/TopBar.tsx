import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCurrentUser } from '../../providers/CurrentUserProvider';
import { searchUsers } from '../../lib/api/users';
import type { User } from '../../lib/types';
import './TopBar.css';

export function TopBar() {
    const navigate = useNavigate();
    const { currentUser, openIdentityModal } = useCurrentUser();
    const [query, setQuery] = useState('');
    const [suggestions, setSuggestions] = useState<User[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const suggestionsRef = useRef<HTMLDivElement>(null);

    const handleSearch = useCallback(async (value: string) => {
        setQuery(value);
        if (value.length >= 1) {
            const users = await searchUsers(value);
            setSuggestions(users);
            setShowSuggestions(true);
        } else {
            setSuggestions([]);
            setShowSuggestions(false);
        }
    }, []);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && query.trim()) {
            setShowSuggestions(false);
            navigate(`/feed?query=${encodeURIComponent(query.trim())}&period=month`);
        }
        if (e.key === 'Escape') {
            setShowSuggestions(false);
        }
    }, [query, navigate]);

    const handleSelectUser = useCallback((user: User) => {
        setQuery('');
        setShowSuggestions(false);
        navigate(`/feed?personId=${user.id}&personMode=any&period=month`);
    }, [navigate]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (
                suggestionsRef.current &&
                !suggestionsRef.current.contains(e.target as Node) &&
                inputRef.current &&
                !inputRef.current.contains(e.target as Node)
            ) {
                setShowSuggestions(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <header className="topbar">
            <div className="topbar-search">
                <span className="topbar-search-icon">🔍</span>
                <input
                    ref={inputRef}
                    type="text"
                    className="topbar-search-input"
                    placeholder="ユーザー名や本文を検索..."
                    value={query}
                    onChange={e => handleSearch(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                />
                {showSuggestions && suggestions.length > 0 && (
                    <div ref={suggestionsRef} className="topbar-suggestions">
                        {suggestions.map(user => (
                            <button
                                key={user.id}
                                className="topbar-suggestion"
                                onClick={() => handleSelectUser(user)}
                            >
                                <div className="avatar avatar-sm">{user.name.charAt(0)}</div>
                                <div className="topbar-suggestion-info">
                                    <span className="topbar-suggestion-name">{user.name}</span>
                                    {user.dept && (
                                        <span className="topbar-suggestion-dept">{user.dept}</span>
                                    )}
                                </div>
                            </button>
                        ))}
                        {query.trim() && (
                            <button
                                className="topbar-suggestion topbar-suggestion-search"
                                onClick={() => {
                                    setShowSuggestions(false);
                                    navigate(`/feed?query=${encodeURIComponent(query.trim())}&period=month`);
                                }}
                            >
                                <span className="topbar-search-icon">🔍</span>
                                <span>「{query}」で本文を検索</span>
                            </button>
                        )}
                    </div>
                )}
            </div>

            <div className="topbar-actions">
                {currentUser && (
                    <button
                        className="topbar-user-btn"
                        onClick={openIdentityModal}
                        title="ユーザーを変更"
                    >
                        <div className="avatar avatar-sm">{currentUser.name.charAt(0)}</div>
                    </button>
                )}
            </div>
        </header>
    );
}
