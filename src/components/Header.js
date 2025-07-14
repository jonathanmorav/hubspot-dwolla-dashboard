import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import logo from '../assets/logo.png';
import './Header.css';
export const Header = ({ title, showDebugToggle = false, onDebugToggle, showDebug = false }) => {
    return (_jsxs("div", { className: "header-container", children: [_jsxs("div", { className: "header-brand", children: [_jsx("img", { src: logo, alt: "Company Logo", className: "header-logo" }), _jsx("h1", { className: "header-title", children: title })] }), showDebugToggle && (_jsx("button", { onClick: onDebugToggle, className: "debug-toggle", title: "Toggle Debug Panel", "aria-label": "Toggle Debug Panel", "aria-pressed": showDebug, children: "\uD83D\uDC1B" }))] }));
};
