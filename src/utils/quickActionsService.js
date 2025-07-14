import { logger } from './logger';
export class QuickActionsService {
    constructor() {
        Object.defineProperty(this, "templates", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        this.initializeDefaultTemplates();
    }
    /**
     * Get applicable actions for given customer data
     */
    getApplicableActions(data) {
        return this.templates.filter(template => template.conditions(data));
    }
    /**
     * Execute a specific action
     */
    async executeAction(actionId, data) {
        const template = this.templates.find(t => t.id === actionId);
        if (!template) {
            return {
                success: false,
                error: `Action template not found: ${actionId}`
            };
        }
        try {
            logger.info('Executing quick action', { actionId, category: template.category });
            const result = await template.execute(data);
            if (result.success) {
                logger.info('Quick action completed', { actionId, category: template.category });
            }
            else {
                logger.warn('Quick action failed', { actionId, error: result.error });
            }
            return result;
        }
        catch (error) {
            logger.error('Quick action error', error, { actionId });
            return {
                success: false,
                error: error.message
            };
        }
    }
    /**
     * Register a new action template
     */
    registerAction(template) {
        const existingIndex = this.templates.findIndex(t => t.id === template.id);
        if (existingIndex >= 0) {
            this.templates[existingIndex] = template;
        }
        else {
            this.templates.push(template);
        }
    }
    /**
     * Initialize default action templates
     */
    initializeDefaultTemplates() {
        // Copy Customer Email
        this.registerAction({
            id: 'copy-customer-email',
            name: 'Copy Email',
            description: 'Copy customer email to clipboard',
            icon: '📧',
            category: 'copy',
            variant: 'secondary',
            conditions: (data) => !!data.dwolla.customer?.email,
            execute: async (data) => {
                const email = data.dwolla.customer.email;
                await navigator.clipboard.writeText(email);
                return {
                    success: true,
                    message: 'Email copied to clipboard',
                    data: { email }
                };
            }
        });
        // Copy Customer Summary
        this.registerAction({
            id: 'copy-customer-summary',
            name: 'Copy Summary',
            description: 'Copy formatted customer summary',
            icon: '📋',
            category: 'copy',
            variant: 'primary',
            conditions: (data) => !!(data.dwolla.customer || data.hubspot.company),
            execute: async (data) => {
                const summary = this.generateCustomerSummary(data);
                await navigator.clipboard.writeText(summary);
                return {
                    success: true,
                    message: 'Customer summary copied to clipboard',
                    data: { summary }
                };
            }
        });
        // Copy Dwolla ID
        this.registerAction({
            id: 'copy-dwolla-id',
            name: 'Copy Dwolla ID',
            description: 'Copy Dwolla customer ID',
            icon: '🆔',
            category: 'copy',
            variant: 'secondary',
            conditions: (data) => !!data.dwolla.customer?.id,
            execute: async (data) => {
                const id = data.dwolla.customer.id;
                await navigator.clipboard.writeText(id);
                return {
                    success: true,
                    message: 'Dwolla ID copied to clipboard',
                    data: { id }
                };
            }
        });
        // Copy HubSpot ID
        this.registerAction({
            id: 'copy-hubspot-id',
            name: 'Copy HubSpot ID',
            description: 'Copy HubSpot company ID',
            icon: '🏢',
            category: 'copy',
            variant: 'secondary',
            conditions: (data) => !!data.hubspot.company?.id,
            execute: async (data) => {
                const id = data.hubspot.company.id;
                await navigator.clipboard.writeText(id);
                return {
                    success: true,
                    message: 'HubSpot ID copied to clipboard',
                    data: { id }
                };
            }
        });
        // Open in HubSpot
        this.registerAction({
            id: 'open-hubspot',
            name: 'Open in HubSpot',
            description: 'Open company in HubSpot dashboard',
            icon: '🔗',
            category: 'link',
            variant: 'secondary',
            conditions: (data) => !!data.hubspot.company?.id,
            execute: async (data) => {
                const companyId = data.hubspot.company.id;
                const portalId = 'YOUR_PORTAL_ID'; // This should be configurable
                const url = `https://app.hubspot.com/contacts/${portalId}/company/${companyId}`;
                await chrome.tabs.create({ url });
                return {
                    success: true,
                    message: 'Opened company in HubSpot',
                    data: { url }
                };
            }
        });
        // Open in Dwolla
        this.registerAction({
            id: 'open-dwolla',
            name: 'Open in Dwolla',
            description: 'Open customer in Dwolla dashboard',
            icon: '🔗',
            category: 'link',
            variant: 'secondary',
            conditions: (data) => !!data.dwolla.customer?.id,
            execute: async (data) => {
                const customerId = data.dwolla.customer.id;
                const env = import.meta.env?.VITE_DWOLLA_ENVIRONMENT || 'sandbox';
                const baseUrl = env === 'production' ? 'https://dashboard.dwolla.com' : 'https://dashboard-sandbox.dwolla.com';
                const url = `${baseUrl}/customers/${customerId}`;
                await chrome.tabs.create({ url });
                return {
                    success: true,
                    message: 'Opened customer in Dwolla',
                    data: { url }
                };
            }
        });
        // Verification Help for Unverified Customers
        this.registerAction({
            id: 'verification-help',
            name: 'Verification Help',
            description: 'Open Dwolla verification documentation',
            icon: '❓',
            category: 'support',
            variant: 'warning',
            conditions: (data) => data.dwolla.customer?.status === 'unverified',
            execute: async (data) => {
                const url = 'https://developers.dwolla.com/concepts/customer-verification';
                await chrome.tabs.create({ url });
                return {
                    success: true,
                    message: 'Opened verification documentation',
                    data: { url }
                };
            }
        });
        // Suspension Help for Suspended Customers
        this.registerAction({
            id: 'suspension-help',
            name: 'Suspension Help',
            description: 'Open Dwolla suspension documentation',
            icon: '⚠️',
            category: 'support',
            variant: 'danger',
            conditions: (data) => data.dwolla.customer?.status === 'suspended',
            execute: async (data) => {
                const url = 'https://developers.dwolla.com/concepts/customer-verification#handling-suspended-customers';
                await chrome.tabs.create({ url });
                return {
                    success: true,
                    message: 'Opened suspension documentation',
                    data: { url }
                };
            }
        });
        // Copy Transfer History
        this.registerAction({
            id: 'copy-transfers',
            name: 'Copy Transfers',
            description: 'Copy recent transfer history',
            icon: '💸',
            category: 'transfer',
            variant: 'secondary',
            conditions: (data) => data.dwolla.transfers.length > 0,
            execute: async (data) => {
                const transfers = data.dwolla.transfers;
                const summary = transfers.map(t => `${t.status.toUpperCase()}: $${t.amount.value} (${new Date(t.created).toLocaleDateString()})`).join('\n');
                const fullSummary = `Recent Transfers (${transfers.length}):\n${summary}`;
                await navigator.clipboard.writeText(fullSummary);
                return {
                    success: true,
                    message: `Copied ${transfers.length} transfers`,
                    data: { summary: fullSummary, count: transfers.length }
                };
            }
        });
        // Copy Data Issues
        this.registerAction({
            id: 'copy-issues',
            name: 'Copy Issues',
            description: 'Copy data inconsistency details',
            icon: '⚠️',
            category: 'verification',
            variant: 'warning',
            conditions: (data) => data.correlation.inconsistencies.length > 0,
            execute: async (data) => {
                const issues = data.correlation.inconsistencies;
                const summary = issues.map(issue => `${issue.severity.toUpperCase()}: ${issue.message}`).join('\n');
                const fullSummary = `Data Issues (${issues.length}):\n${summary}`;
                await navigator.clipboard.writeText(fullSummary);
                return {
                    success: true,
                    message: `Copied ${issues.length} data issues`,
                    data: { summary: fullSummary, count: issues.length }
                };
            }
        });
        // Suggest Account Link
        this.registerAction({
            id: 'suggest-link',
            name: 'Copy Link Instructions',
            description: 'Copy account linking instructions',
            icon: '🔗',
            category: 'link',
            variant: 'primary',
            conditions: (data) => !data.correlation.isLinked && !!(data.hubspot.company && data.dwolla.customer),
            execute: async (data) => {
                const hubspotName = data.hubspot.company.properties.name;
                const dwollaName = data.dwolla.customer.businessName ||
                    `${data.dwolla.customer.firstName} ${data.dwolla.customer.lastName}`;
                const instructions = [
                    'Account Linking Instructions:',
                    '',
                    `HubSpot Company: ${hubspotName}`,
                    `HubSpot ID: ${data.hubspot.company.id}`,
                    '',
                    `Dwolla Customer: ${dwollaName}`,
                    `Dwolla ID: ${data.dwolla.customer.id}`,
                    '',
                    'To link these accounts:',
                    `1. Open the HubSpot company record`,
                    `2. Add custom field "dwolla_id" with value: ${data.dwolla.customer.id}`,
                    `3. Save the record`,
                    '',
                    'This will enable automatic data correlation in future searches.'
                ].join('\n');
                await navigator.clipboard.writeText(instructions);
                return {
                    success: true,
                    message: 'Linking instructions copied',
                    data: { instructions }
                };
            }
        });
    }
    /**
     * Generate a comprehensive customer summary
     */
    generateCustomerSummary(data) {
        const { hubspot, dwolla, correlation } = data;
        const lines = [];
        // Header
        const customerName = dwolla.customer?.businessName ||
            `${dwolla.customer?.firstName || ''} ${dwolla.customer?.lastName || ''}`.trim() ||
            hubspot.company?.properties.name ||
            'Unknown Customer';
        lines.push(`Customer: ${customerName}`);
        lines.push('='.repeat(50));
        lines.push('');
        // Correlation Status
        if (correlation.isLinked) {
            lines.push(`✅ Linked Accounts (${correlation.confidence}% confidence via ${correlation.linkType})`);
        }
        else {
            lines.push('❌ Unlinked Accounts');
        }
        lines.push('');
        // HubSpot Data
        if (hubspot.company) {
            lines.push('HubSpot Company:');
            lines.push(`  Name: ${hubspot.company.properties.name}`);
            lines.push(`  ID: ${hubspot.company.id}`);
            if (hubspot.company.properties.dwolla_id) {
                lines.push(`  Dwolla ID: ${hubspot.company.properties.dwolla_id}`);
            }
            if (hubspot.company.properties.onboarding_status) {
                lines.push(`  Status: ${hubspot.company.properties.onboarding_status}`);
            }
            lines.push('');
        }
        // HubSpot Contacts
        if (hubspot.contacts.length > 0) {
            lines.push(`HubSpot Contacts (${hubspot.contacts.length}):`);
            hubspot.contacts.forEach(contact => {
                const name = `${contact.properties.firstname || ''} ${contact.properties.lastname || ''}`.trim();
                lines.push(`  ${name} - ${contact.properties.email}`);
            });
            lines.push('');
        }
        // Dwolla Data
        if (dwolla.customer) {
            lines.push('Dwolla Customer:');
            const name = dwolla.customer.businessName || `${dwolla.customer.firstName} ${dwolla.customer.lastName}`;
            lines.push(`  Name: ${name}`);
            lines.push(`  Email: ${dwolla.customer.email}`);
            lines.push(`  ID: ${dwolla.customer.id}`);
            lines.push(`  Type: ${dwolla.customer.type}`);
            lines.push(`  Status: ${dwolla.customer.status}`);
            lines.push('');
        }
        // Transfer Summary
        if (dwolla.transfers.length > 0) {
            lines.push(`Recent Transfers (${dwolla.transfers.length}):`);
            dwolla.transfers.slice(0, 5).forEach(transfer => {
                lines.push(`  ${transfer.status.toUpperCase()}: $${transfer.amount.value} (${new Date(transfer.created).toLocaleDateString()})`);
            });
            if (dwolla.transfers.length > 5) {
                lines.push(`  ... and ${dwolla.transfers.length - 5} more`);
            }
            lines.push('');
        }
        // Data Issues
        if (correlation.inconsistencies.length > 0) {
            lines.push(`Data Issues (${correlation.inconsistencies.length}):`);
            correlation.inconsistencies.forEach(issue => {
                lines.push(`  ${issue.severity.toUpperCase()}: ${issue.message}`);
            });
            lines.push('');
        }
        // Footer
        lines.push(`Generated: ${new Date().toLocaleString()}`);
        return lines.join('\n');
    }
}
// Export singleton instance
export const quickActionsService = new QuickActionsService();
