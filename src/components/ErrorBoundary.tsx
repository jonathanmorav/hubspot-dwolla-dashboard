import { Component, ReactNode } from 'react'
import { logger } from '../utils/logger'
import './ErrorBoundary.css'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: any
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    }
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null
    }
  }

  componentDidCatch(error: Error, errorInfo: any) {
    // Log error to our logging system
    logger.error('React Error Boundary caught error', error, {
      component: 'ErrorBoundary',
      errorInfo: JSON.stringify(errorInfo),
      stack: error.stack
    })

    this.setState({
      errorInfo
    })
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    })

    // Clear any stored error state
    chrome.storage.session.remove('lastError')
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <div className="error-container">
            <h1>Something went wrong</h1>
            <p>The application encountered an unexpected error.</p>
            
            {this.state.error && (
              <details className="error-details">
                <summary>Error Details</summary>
                <pre>{this.state.error.message}</pre>
                {import.meta.env?.DEV && this.state.error.stack && (
                  <pre className="error-stack">{this.state.error.stack}</pre>
                )}
              </details>
            )}

            <div className="error-actions">
              <button onClick={this.handleReset} className="reset-button">
                Try Again
              </button>
              <button 
                onClick={() => chrome.runtime.reload()} 
                className="reload-button"
              >
                Reload Extension
              </button>
            </div>

            <p className="error-help">
              If this problem persists, please contact support.
            </p>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}