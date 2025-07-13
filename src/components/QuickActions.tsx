import React, { useState, useCallback, useMemo } from 'react'
import { CorrelatedCustomerData } from '../utils/dataCorrelation'
import { quickActionsService, ActionTemplate } from '../utils/quickActionsService'
import { logger } from '../utils/logger'
import './QuickActions.css'

interface QuickActionsProps {
  data: CorrelatedCustomerData
  onActionComplete?: (action: string, success: boolean) => void
}

export const QuickActions: React.FC<QuickActionsProps> = ({
  data,
  onActionComplete
}) => {
  const [loading, setLoading] = useState<Set<string>>(new Set())
  const [actionResults, setActionResults] = useState<Map<string, { success: boolean; message?: string }>>(new Map())

  // Get applicable actions for current data
  const availableActions = useMemo(() => {
    return quickActionsService.getApplicableActions(data)
  }, [data])

  // Execute action with loading state and result tracking
  const executeAction = useCallback(async (template: ActionTemplate) => {
    setLoading(prev => new Set([...prev, template.id]))
    
    try {
      const result = await quickActionsService.executeAction(template.id, data)
      
      // Update action results
      setActionResults(prev => new Map([...prev, [template.id, {
        success: result.success,
        message: result.message
      }]]))
      
      // Clear result after 2 seconds if successful
      if (result.success) {
        setTimeout(() => {
          setActionResults(prev => {
            const newMap = new Map(prev)
            newMap.delete(template.id)
            return newMap
          })
        }, 2000)
      }
      
      onActionComplete?.(template.id, result.success)
      
    } catch (error) {
      logger.error('Action execution failed', error as Error, { actionId: template.id })
      setActionResults(prev => new Map([...prev, [template.id, {
        success: false,
        message: 'Action failed'
      }]]))
      onActionComplete?.(template.id, false)
    } finally {
      setLoading(prev => {
        const newSet = new Set(prev)
        newSet.delete(template.id)
        return newSet
      })
    }
  }, [data, onActionComplete])

  // Get button display properties
  const getButtonProps = useCallback((template: ActionTemplate) => {
    const isLoading = loading.has(template.id)
    const result = actionResults.get(template.id)
    
    let icon = template.icon
    let label = template.name
    let variant = template.variant
    
    if (isLoading) {
      icon = '⏳'
      label = 'Working...'
    } else if (result?.success) {
      icon = '✓'
      label = result.message || 'Done!'
      variant = 'success'
    } else if (result && !result.success) {
      icon = '✗'
      label = result.message || 'Failed'
      variant = 'danger'
    }
    
    return { icon, label, variant, isLoading, disabled: isLoading }
  }, [loading, actionResults])

  // Group actions by category
  const actionsByCategory = useMemo(() => {
    const groups: Record<string, ActionTemplate[]> = {}
    
    availableActions.forEach(action => {
      if (!groups[action.category]) {
        groups[action.category] = []
      }
      groups[action.category].push(action)
    })
    
    return groups
  }, [availableActions])

  // Category labels and icons
  const categoryInfo = {
    copy: { label: 'Copy', icon: '📋' },
    link: { label: 'Links', icon: '🔗' },
    support: { label: 'Support', icon: '❓' },
    verification: { label: 'Issues', icon: '⚠️' },
    transfer: { label: 'Transfers', icon: '💸' }
  }

  if (availableActions.length === 0) {
    return null
  }

  return (
    <div className="quick-actions">
      <div className="quick-actions-header">
        <h4>⚡ Quick Actions</h4>
        <span className="actions-count">{availableActions.length}</span>
      </div>
      
      {Object.entries(actionsByCategory).map(([category, actions]) => {
        const categoryData = categoryInfo[category as keyof typeof categoryInfo]
        
        return (
          <div key={category} className="action-category">
            {Object.keys(actionsByCategory).length > 1 && (
              <div className="category-header">
                <span className="category-icon">{categoryData?.icon}</span>
                <span className="category-label">{categoryData?.label}</span>
                <span className="category-count">({actions.length})</span>
              </div>
            )}
            
            <div className="actions-grid">
              {actions.map(template => {
                const buttonProps = getButtonProps(template)
                
                return (
                  <button
                    key={template.id}
                    className={`action-button ${buttonProps.variant} ${buttonProps.isLoading ? 'loading' : ''}`}
                    onClick={() => executeAction(template)}
                    disabled={buttonProps.disabled}
                    title={template.description}
                    aria-label={template.description}
                  >
                    <span className="action-icon">
                      {buttonProps.icon}
                    </span>
                    <span className="action-label">{buttonProps.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
      
      {/* Show warning if there are critical status actions */}
      {availableActions.some(a => a.variant === 'danger' || a.variant === 'warning') && (
        <div className="actions-warning">
          <span className="warning-icon">💡</span>
          <span className="warning-text">
            Some actions require attention due to customer status or data issues.
          </span>
        </div>
      )}
    </div>
  )
}