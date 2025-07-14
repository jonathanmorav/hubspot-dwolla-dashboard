import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import './EmptyState.css';
export function EmptyState({ title, description, icon = '🔍' }) {
    return (_jsxs("div", { className: "empty-state", children: [_jsx("div", { className: "empty-state-icon", "aria-hidden": "true", children: icon }), _jsx("h3", { className: "empty-state-title", children: title }), description && _jsx("p", { className: "empty-state-description", children: description })] }));
}
