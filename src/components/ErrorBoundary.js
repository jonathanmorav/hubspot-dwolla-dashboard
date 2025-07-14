import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Component } from 'react';
import { logger } from '../utils/logger';
import './ErrorBoundary.css';
export class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        Object.defineProperty(this, "handleReset", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: () => {
                this.setState({
                    hasError: false,
                    error: null,
                    errorInfo: null
                });
                // Clear any stored error state
                chrome.storage.session.remove('lastError');
            }
        });
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null
        };
    }
    static getDerivedStateFromError(error) {
        return {
            hasError: true,
            error,
            errorInfo: null
        };
    }
    componentDidCatch(error, errorInfo) {
        // Log error to our logging system
        logger.error('React Error Boundary caught error', error, {
            component: 'ErrorBoundary',
            errorInfo: JSON.stringify(errorInfo),
            stack: error.stack
        });
        this.setState({
            errorInfo
        });
    }
    render() {
        if (this.state.hasError) {
            return (_jsx("div", { className: "error-boundary", children: _jsxs("div", { className: "error-container", children: [_jsx("h1", { children: "Something went wrong" }), _jsx("p", { children: "The application encountered an unexpected error." }), this.state.error && (_jsxs("details", { className: "error-details", children: [_jsx("summary", { children: "Error Details" }), _jsx("pre", { children: this.state.error.message }), import.meta.env?.DEV && this.state.error.stack && (_jsx("pre", { className: "error-stack", children: this.state.error.stack }))] })), _jsxs("div", { className: "error-actions", children: [_jsx("button", { onClick: this.handleReset, className: "reset-button", children: "Try Again" }), _jsx("button", { onClick: () => chrome.runtime.reload(), className: "reload-button", children: "Reload Extension" })] }), _jsx("p", { className: "error-help", children: "If this problem persists, please contact support." })] }) }));
        }
        return this.props.children;
    }
}
