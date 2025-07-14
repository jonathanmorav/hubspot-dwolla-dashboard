import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import './ErrorDisplay.css';
export const ErrorDisplay = ({ error, type = 'error', onRetry, onDismiss, retryLabel = 'Try Again', showRetry = true, className = '' }) => {
    const getIcon = () => {
        switch (type) {
            case 'error': return '❌';
            case 'warning': return '⚠️';
            case 'info': return 'ℹ️';
            default: return '❌';
        }
    };
    const getErrorMessage = (error) => {
        // Convert technical errors to user-friendly messages
        if (error.includes('Not authenticated')) {
            return 'Please connect to both HubSpot and Dwolla to search for customers.';
        }
        if (error.includes('Rate limit')) {
            return 'Too many requests. Please wait a moment and try again.';
        }
        if (error.includes('Network')) {
            return 'Connection problem. Please check your internet and try again.';
        }
        if (error.includes('timeout') || error.includes('Timeout')) {
            return 'The request took too long. Please try again.';
        }
        if (error.includes('404') || error.includes('not found')) {
            return 'No matching records found. Try a different search term.';
        }
        if (error.includes('500') || error.includes('Internal Server Error')) {
            return 'Server error. Please try again in a few moments.';
        }
        if (error.includes('client ID not configured')) {
            return 'Extension not properly configured. Please contact your administrator.';
        }
        // Return original error if no friendly version exists
        return error;
    };
    const friendlyMessage = getErrorMessage(error);
    const showOriginalError = friendlyMessage !== error;
    return (_jsx("div", { className: `error-display ${type} ${className}`, role: "alert", children: _jsxs("div", { className: "error-content", children: [_jsxs("div", { className: "error-header", children: [_jsx("span", { className: "error-icon", children: getIcon() }), _jsx("span", { className: "error-message", children: friendlyMessage })] }), showOriginalError && (_jsxs("details", { className: "error-details", children: [_jsx("summary", { children: "Technical details" }), _jsx("p", { className: "error-technical", children: error })] })), _jsxs("div", { className: "error-actions", children: [onRetry && showRetry && (_jsxs("button", { className: "error-retry-button", onClick: onRetry, type: "button", children: ["\uD83D\uDD04 ", retryLabel] })), onDismiss && (_jsx("button", { className: "error-dismiss-button", onClick: onDismiss, type: "button", "aria-label": "Dismiss error", children: "\u2715" }))] })] }) }));
};
