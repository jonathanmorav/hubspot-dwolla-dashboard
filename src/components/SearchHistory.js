import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useCallback } from 'react';
import { searchHistoryService } from '../utils/searchHistory';
import './SearchHistory.css';
export const SearchHistory = ({ onSelectSearch, currentQuery, isVisible, onClose }) => {
    const [recentSearches, setRecentSearches] = useState([]);
    const [suggestions, setSuggestions] = useState([]);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const [loading, setLoading] = useState(false);
    // Load recent searches
    const loadRecentSearches = useCallback(async () => {
        try {
            const recent = await searchHistoryService.getRecentSearches();
            setRecentSearches(recent);
        }
        catch (error) {
            console.error('Failed to load recent searches:', error);
        }
    }, []);
    // Load suggestions based on current query
    const loadSuggestions = useCallback(async (query) => {
        if (query.length < 2) {
            setSuggestions([]);
            return;
        }
        try {
            const suggestions = await searchHistoryService.getSuggestions(query);
            setSuggestions(suggestions);
        }
        catch (error) {
            console.error('Failed to load suggestions:', error);
            setSuggestions([]);
        }
    }, []);
    // Load data when visible
    useEffect(() => {
        if (isVisible) {
            loadRecentSearches();
            if (currentQuery) {
                loadSuggestions(currentQuery);
            }
        }
    }, [isVisible, currentQuery, loadRecentSearches, loadSuggestions]);
    // Handle keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!isVisible)
                return;
            const items = suggestions.length > 0 ? suggestions : recentSearches.map(s => s.query);
            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    setSelectedIndex(prev => (prev + 1) % items.length);
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    setSelectedIndex(prev => prev <= 0 ? items.length - 1 : prev - 1);
                    break;
                case 'Enter':
                    e.preventDefault();
                    if (selectedIndex >= 0 && selectedIndex < items.length) {
                        onSelectSearch(items[selectedIndex]);
                        onClose();
                    }
                    break;
                case 'Escape':
                    e.preventDefault();
                    onClose();
                    break;
                // Keyboard shortcuts for recent searches (Cmd/Ctrl + 1-5)
                case '1':
                case '2':
                case '3':
                case '4':
                case '5':
                    if (e.metaKey || e.ctrlKey) {
                        e.preventDefault();
                        const index = parseInt(e.key) - 1;
                        if (recentSearches[index]) {
                            onSelectSearch(recentSearches[index].query);
                            onClose();
                        }
                    }
                    break;
            }
        };
        if (isVisible) {
            document.addEventListener('keydown', handleKeyDown);
            return () => document.removeEventListener('keydown', handleKeyDown);
        }
    }, [isVisible, selectedIndex, suggestions, recentSearches, onSelectSearch, onClose]);
    // Clear history
    const handleClearHistory = useCallback(async () => {
        setLoading(true);
        try {
            await searchHistoryService.clearHistory();
            setRecentSearches([]);
            setSuggestions([]);
        }
        catch (error) {
            console.error('Failed to clear history:', error);
        }
        finally {
            setLoading(false);
        }
    }, []);
    // Format relative time
    const formatRelativeTime = (timestamp) => {
        const now = Date.now();
        const diff = now - timestamp;
        const minutes = Math.floor(diff / (1000 * 60));
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        if (minutes < 1)
            return 'Just now';
        if (minutes < 60)
            return `${minutes}m ago`;
        if (hours < 24)
            return `${hours}h ago`;
        if (days < 7)
            return `${days}d ago`;
        return new Date(timestamp).toLocaleDateString();
    };
    // Get query type icon
    const getQueryTypeIcon = (type) => {
        switch (type) {
            case 'email': return '📧';
            case 'business': return '🏢';
            case 'name': return '👤';
            case 'phone': return '📞';
            default: return '🔍';
        }
    };
    // Get result count color
    const getResultCountClass = (count) => {
        if (count === 0)
            return 'no-results';
        if (count < 3)
            return 'few-results';
        if (count < 10)
            return 'some-results';
        return 'many-results';
    };
    if (!isVisible)
        return null;
    const showSuggestions = suggestions.length > 0;
    const showRecentSearches = recentSearches.length > 0;
    return (_jsx("div", { className: "search-history-overlay", onClick: onClose, children: _jsxs("div", { className: "search-history-panel", onClick: e => e.stopPropagation(), children: [_jsxs("div", { className: "search-history-header", children: [_jsx("h3", { children: showSuggestions ? '💡 Suggestions' : '🕐 Recent Searches' }), _jsx("button", { className: "close-button", onClick: onClose, "aria-label": "Close search history", children: "\u2715" })] }), _jsxs("div", { className: "search-history-content", children: [showSuggestions && (_jsx("div", { className: "suggestions-section", children: _jsx("ul", { className: "search-list", children: suggestions.map((suggestion, index) => (_jsxs("li", { className: `search-item suggestion ${selectedIndex === index ? 'selected' : ''}`, onClick: () => {
                                        onSelectSearch(suggestion);
                                        onClose();
                                    }, children: [_jsx("div", { className: "search-icon", children: "\uD83D\uDCA1" }), _jsxs("div", { className: "search-details", children: [_jsx("div", { className: "search-query", children: suggestion }), _jsx("div", { className: "search-type", children: "Suggestion" })] })] }, suggestion))) }) })), showRecentSearches && (_jsxs("div", { className: "recent-searches-section", children: [showSuggestions && (_jsx("div", { className: "section-divider", children: _jsx("span", { children: "Recent Searches" }) })), _jsx("ul", { className: "search-list", children: recentSearches.map((search, index) => {
                                        const adjustedIndex = showSuggestions ? index + suggestions.length : index;
                                        return (_jsxs("li", { className: `search-item recent ${selectedIndex === adjustedIndex ? 'selected' : ''}`, onClick: () => {
                                                onSelectSearch(search.query);
                                                onClose();
                                            }, children: [_jsx("div", { className: "search-icon", children: getQueryTypeIcon(search.queryType) }), _jsxs("div", { className: "search-details", children: [_jsx("div", { className: "search-query", children: search.query }), _jsxs("div", { className: "search-meta", children: [_jsx("span", { className: "search-time", children: formatRelativeTime(search.timestamp) }), _jsxs("span", { className: `result-count ${getResultCountClass(search.resultCount)}`, children: [search.resultCount, " result", search.resultCount !== 1 ? 's' : ''] }), search.linkedAccounts > 0 && (_jsxs("span", { className: "linked-accounts", children: ["\uD83D\uDD17 ", search.linkedAccounts, " linked"] }))] })] }), index < 5 && (_jsxs("div", { className: "keyboard-shortcut", children: ["\u2318", index + 1] }))] }, search.id));
                                    }) })] })), !showSuggestions && !showRecentSearches && (_jsxs("div", { className: "empty-state", children: [_jsx("div", { className: "empty-icon", children: "\uD83D\uDD0D" }), _jsx("p", { children: "No search history yet" }), _jsx("small", { children: "Your recent searches will appear here" })] }))] }), showRecentSearches && (_jsxs("div", { className: "search-history-footer", children: [_jsxs("div", { className: "keyboard-hints", children: [_jsx("span", { children: "\u2191\u2193 Navigate" }), _jsx("span", { children: "Enter Select" }), _jsx("span", { children: "\u23181-5 Quick select" }), _jsx("span", { children: "Esc Close" })] }), _jsx("button", { className: "clear-history-button", onClick: handleClearHistory, disabled: loading, children: loading ? 'Clearing...' : 'Clear History' })] }))] }) }));
};
