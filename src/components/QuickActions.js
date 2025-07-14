import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useCallback, useMemo } from 'react';
import { quickActionsService } from '../utils/quickActionsService';
import { logger } from '../utils/logger';
import './QuickActions.css';
export const QuickActions = ({ data, onActionComplete }) => {
    const [loading, setLoading] = useState(new Set());
    const [actionResults, setActionResults] = useState(new Map());
    // Get applicable actions for current data
    const availableActions = useMemo(() => {
        return quickActionsService.getApplicableActions(data);
    }, [data]);
    // Execute action with loading state and result tracking
    const executeAction = useCallback(async (template) => {
        setLoading(prev => new Set([...prev, template.id]));
        try {
            const result = await quickActionsService.executeAction(template.id, data);
            // Update action results
            setActionResults(prev => new Map([...prev, [template.id, {
                        success: result.success,
                        message: result.message
                    }]]));
            // Clear result after 2 seconds if successful
            if (result.success) {
                setTimeout(() => {
                    setActionResults(prev => {
                        const newMap = new Map(prev);
                        newMap.delete(template.id);
                        return newMap;
                    });
                }, 2000);
            }
            onActionComplete?.(template.id, result.success);
        }
        catch (error) {
            logger.error('Action execution failed', error, { actionId: template.id });
            setActionResults(prev => new Map([...prev, [template.id, {
                        success: false,
                        message: 'Action failed'
                    }]]));
            onActionComplete?.(template.id, false);
        }
        finally {
            setLoading(prev => {
                const newSet = new Set(prev);
                newSet.delete(template.id);
                return newSet;
            });
        }
    }, [data, onActionComplete]);
    // Get button display properties
    const getButtonProps = useCallback((template) => {
        const isLoading = loading.has(template.id);
        const result = actionResults.get(template.id);
        let icon = template.icon;
        let label = template.name;
        let variant = template.variant;
        if (isLoading) {
            icon = '⏳';
            label = 'Working...';
        }
        else if (result?.success) {
            icon = '✓';
            label = result.message || 'Done!';
            variant = 'success';
        }
        else if (result && !result.success) {
            icon = '✗';
            label = result.message || 'Failed';
            variant = 'danger';
        }
        return { icon, label, variant, isLoading, disabled: isLoading };
    }, [loading, actionResults]);
    // Group actions by category
    const actionsByCategory = useMemo(() => {
        const groups = {};
        availableActions.forEach(action => {
            if (!groups[action.category]) {
                groups[action.category] = [];
            }
            groups[action.category].push(action);
        });
        return groups;
    }, [availableActions]);
    // Category labels and icons
    const categoryInfo = {
        copy: { label: 'Copy', icon: '📋' },
        link: { label: 'Links', icon: '🔗' },
        support: { label: 'Support', icon: '❓' },
        verification: { label: 'Issues', icon: '⚠️' },
        transfer: { label: 'Transfers', icon: '💸' }
    };
    if (availableActions.length === 0) {
        return null;
    }
    return (_jsxs("div", { className: "quick-actions", children: [_jsxs("div", { className: "quick-actions-header", children: [_jsx("h4", { children: "\u26A1 Quick Actions" }), _jsx("span", { className: "actions-count", children: availableActions.length })] }), Object.entries(actionsByCategory).map(([category, actions]) => {
                const categoryData = categoryInfo[category];
                return (_jsxs("div", { className: "action-category", children: [Object.keys(actionsByCategory).length > 1 && (_jsxs("div", { className: "category-header", children: [_jsx("span", { className: "category-icon", children: categoryData?.icon }), _jsx("span", { className: "category-label", children: categoryData?.label }), _jsxs("span", { className: "category-count", children: ["(", actions.length, ")"] })] })), _jsx("div", { className: "actions-grid", children: actions.map(template => {
                                const buttonProps = getButtonProps(template);
                                return (_jsxs("button", { className: `action-button ${buttonProps.variant} ${buttonProps.isLoading ? 'loading' : ''}`, onClick: () => executeAction(template), disabled: buttonProps.disabled, title: template.description, "aria-label": template.description, children: [_jsx("span", { className: "action-icon", children: buttonProps.icon }), _jsx("span", { className: "action-label", children: buttonProps.label })] }, template.id));
                            }) })] }, category));
            }), availableActions.some(a => a.variant === 'danger' || a.variant === 'warning') && (_jsxs("div", { className: "actions-warning", children: [_jsx("span", { className: "warning-icon", children: "\uD83D\uDCA1" }), _jsx("span", { className: "warning-text", children: "Some actions require attention due to customer status or data issues." })] }))] }));
};
