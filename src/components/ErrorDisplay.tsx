import React from 'react'
import './ErrorDisplay.css'

interface ErrorDisplayProps {
  error: string
  type?: 'error' | 'warning' | 'info'
  onRetry?: () => void
  onDismiss?: () => void
  retryLabel?: string
  showRetry?: boolean
  className?: string
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  type = 'error',
  onRetry,
  onDismiss,
  retryLabel = 'Try Again',
  showRetry = true,
  className = ''
}) => {
  const getIcon = () => {
    switch (type) {
      case 'error': return '❌'
      case 'warning': return '⚠️'
      case 'info': return 'ℹ️'
      default: return '❌'
    }
  }

  const getErrorMessage = (error: string): string => {
    // Convert technical errors to user-friendly messages
    if (error.includes('Not authenticated')) {
      return 'Please connect to both HubSpot and Dwolla to search for customers.'
    }
    if (error.includes('Rate limit')) {
      return 'Too many requests. Please wait a moment and try again.'
    }
    if (error.includes('Network')) {
      return 'Connection problem. Please check your internet and try again.'
    }
    if (error.includes('timeout') || error.includes('Timeout')) {
      return 'The request took too long. Please try again.'
    }
    if (error.includes('404') || error.includes('not found')) {
      return 'No matching records found. Try a different search term.'
    }
    if (error.includes('500') || error.includes('Internal Server Error')) {
      return 'Server error. Please try again in a few moments.'
    }
    if (error.includes('client ID not configured')) {
      return 'Extension not properly configured. Please contact your administrator.'
    }
    
    // Return original error if no friendly version exists
    return error
  }

  const friendlyMessage = getErrorMessage(error)
  const showOriginalError = friendlyMessage !== error

  return (
    <div className={`error-display ${type} ${className}`} role="alert">
      <div className="error-content">
        <div className="error-header">
          <span className="error-icon">{getIcon()}</span>
          <span className="error-message">{friendlyMessage}</span>
        </div>
        
        {showOriginalError && (
          <details className="error-details">
            <summary>Technical details</summary>
            <p className="error-technical">{error}</p>
          </details>
        )}
        
        <div className="error-actions">
          {onRetry && showRetry && (
            <button
              className="error-retry-button"
              onClick={onRetry}
              type="button"
            >
              🔄 {retryLabel}
            </button>
          )}
          
          {onDismiss && (
            <button
              className="error-dismiss-button"
              onClick={onDismiss}
              type="button"
              aria-label="Dismiss error"
            >
              ✕
            </button>
          )}
        </div>
      </div>
    </div>
  )
}