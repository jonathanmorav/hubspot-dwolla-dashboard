import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { QuickActions } from './QuickActions';
import './CorrelatedDataView.css';
export const CorrelatedDataView = ({ data, onSelectCustomer, loading = false }) => {
    const { hubspot, dwolla, correlation } = data;
    // Determine the display name
    const displayName = hubspot.company?.properties.name ||
        dwolla.customer?.businessName ||
        (dwolla.customer ? `${dwolla.customer.firstName} ${dwolla.customer.lastName}` : '') ||
        (hubspot.contacts[0] ? `${hubspot.contacts[0].properties.firstname} ${hubspot.contacts[0].properties.lastname}` : '');
    const getLinkIcon = () => {
        switch (correlation.linkType) {
            case 'dwolla_id':
                return '🔗';
            case 'email':
                return '📧';
            case 'name_match':
                return '👥';
            default:
                return '';
        }
    };
    const getConfidenceBadge = () => {
        if (!correlation.isLinked)
            return null;
        const { confidence } = correlation;
        let className = 'confidence-badge';
        if (confidence === 100)
            className += ' perfect';
        else if (confidence >= 85)
            className += ' high';
        else if (confidence >= 70)
            className += ' medium';
        else
            className += ' low';
        return (_jsxs("span", { className: className, children: [confidence, "% match ", getLinkIcon()] }));
    };
    return (_jsxs("div", { className: `correlated-data-view ${correlation.isLinked ? 'linked' : 'unlinked'}`, children: [_jsxs("div", { className: "correlation-header", children: [_jsx("h3", { className: "customer-name", children: displayName || 'Unknown Customer' }), getConfidenceBadge()] }), _jsxs("div", { className: "data-panels", children: [_jsxs("div", { className: `data-panel hubspot-panel ${hubspot.company || hubspot.contacts.length > 0 ? 'has-data' : 'no-data'}`, children: [_jsx("h4", { children: "HubSpot" }), hubspot.company && (_jsxs("div", { className: "company-data", children: [_jsxs("div", { className: "data-field", children: [_jsx("span", { className: "label", children: "Company:" }), _jsx("span", { className: "value", children: hubspot.company.properties.name })] }), hubspot.company.properties.dwolla_id && (_jsxs("div", { className: "data-field", children: [_jsx("span", { className: "label", children: "Dwolla ID:" }), _jsx("span", { className: "value linked-id", children: hubspot.company.properties.dwolla_id })] })), hubspot.company.properties.onboarding_status && (_jsxs("div", { className: "data-field", children: [_jsx("span", { className: "label", children: "Status:" }), _jsx("span", { className: `value status-${hubspot.company.properties.onboarding_status}`, children: hubspot.company.properties.onboarding_status })] }))] })), hubspot.contacts.length > 0 && (_jsxs("div", { className: "contacts-data", children: [_jsxs("h5", { children: ["Contacts (", hubspot.contacts.length, ")"] }), hubspot.contacts.map(contact => (_jsxs("div", { className: "contact-item", children: [_jsxs("div", { className: "contact-name", children: [contact.properties.firstname, " ", contact.properties.lastname] }), _jsx("div", { className: "contact-email", children: contact.properties.email })] }, contact.id)))] })), !hubspot.company && hubspot.contacts.length === 0 && (_jsx("div", { className: "no-data-message", children: "No HubSpot data found" }))] }), _jsx("div", { className: "connection-indicator", children: correlation.isLinked ? (_jsx("div", { className: "connection-line linked", children: _jsx("span", { className: "link-icon", children: getLinkIcon() }) })) : (_jsx("div", { className: "connection-line unlinked", children: _jsx("span", { className: "link-icon", children: "\u274C" }) })) }), _jsxs("div", { className: `data-panel dwolla-panel ${dwolla.customer ? 'has-data' : 'no-data'}`, children: [_jsx("h4", { children: "Dwolla" }), dwolla.customer && (_jsxs("div", { className: "customer-data clickable", onClick: () => onSelectCustomer?.(dwolla.customer.id), onKeyDown: (e) => e.key === 'Enter' && onSelectCustomer?.(dwolla.customer.id), tabIndex: 0, role: "button", "aria-label": `Select ${dwolla.customer.businessName || `${dwolla.customer.firstName} ${dwolla.customer.lastName}`}`, children: [_jsxs("div", { className: "data-field", children: [_jsx("span", { className: "label", children: "Name:" }), _jsx("span", { className: "value", children: dwolla.customer.businessName || `${dwolla.customer.firstName} ${dwolla.customer.lastName}` })] }), _jsxs("div", { className: "data-field", children: [_jsx("span", { className: "label", children: "Email:" }), _jsx("span", { className: "value", children: dwolla.customer.email })] }), _jsxs("div", { className: "data-field", children: [_jsx("span", { className: "label", children: "Type:" }), _jsx("span", { className: "value", children: dwolla.customer.type })] }), _jsxs("div", { className: "data-field", children: [_jsx("span", { className: "label", children: "Status:" }), _jsx("span", { className: `value status-${dwolla.customer.status}`, children: dwolla.customer.status })] }), dwolla.transfers.length > 0 && (_jsxs("div", { className: "transfer-summary", children: [dwolla.transfers.length, " recent transfer", dwolla.transfers.length !== 1 ? 's' : ''] }))] })), !dwolla.customer && (_jsx("div", { className: "no-data-message", children: "No Dwolla data found" }))] })] }), correlation.inconsistencies.length > 0 && (_jsxs("div", { className: "inconsistencies-panel", children: [_jsx("h5", { children: "\u26A0\uFE0F Data Inconsistencies" }), correlation.inconsistencies.map((inconsistency, index) => (_jsxs("div", { className: `inconsistency-item ${inconsistency.severity}`, children: [_jsx("span", { className: "inconsistency-icon", children: inconsistency.severity === 'error' ? '❌' : '⚠️' }), _jsx("span", { className: "inconsistency-message", children: inconsistency.message })] }, index)))] })), !correlation.isLinked && hubspot.company && dwolla.customer && (_jsxs("div", { className: "suggestion-panel", children: [_jsx("span", { className: "suggestion-icon", children: "\uD83D\uDCA1" }), _jsx("span", { className: "suggestion-text", children: "These accounts might be related. Consider linking them by adding Dwolla ID to HubSpot." })] })), _jsx(QuickActions, { data: data, onActionComplete: (action, success) => {
                    if (success) {
                        console.log(`Action ${action} completed successfully`);
                    }
                } })] }));
};
