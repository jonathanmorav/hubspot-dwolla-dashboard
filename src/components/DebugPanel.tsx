// Debug panel for development - view logs and performance metrics

import { useState, useEffect } from 'react'
import { LogEntry, LogLevel } from '../utils/logger'
import './DebugPanel.css'

interface DebugPanelProps {
  show: boolean
  onClose: () => void
}

export function DebugPanel({ show, onClose }: DebugPanelProps) {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [filter, setFilter] = useState<LogLevel | 'all'>('all')
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [rateLimit, setRateLimit] = useState<any>(null)
  const [performance, setPerformance] = useState<any[]>([])

  useEffect(() => {
    if (show) {
      loadLogs()
      loadRateLimit()
      loadPerformance()
    }

    if (show && autoRefresh) {
      const interval = setInterval(() => {
        loadLogs()
        loadRateLimit()
      }, 2000)
      return () => clearInterval(interval)
    }
  }, [show, autoRefresh, filter])

  const loadLogs = async () => {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'GET_LOGS',
        filter: filter === 'all' ? undefined : { level: filter }
      })
      if (response.logs) {
        setLogs(response.logs)
      }
    } catch (error) {
      console.error('Failed to load logs:', error)
    }
  }

  const loadRateLimit = async () => {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'GET_RATE_LIMIT_STATUS'
      })
      if (response.status) {
        setRateLimit(response.status)
      }
    } catch (error) {
      console.error('Failed to load rate limit:', error)
    }
  }

  const loadPerformance = async () => {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'GET_PERFORMANCE_METRICS'
      })
      if (response.metrics) {
        setPerformance(response.metrics)
      }
    } catch (error) {
      console.error('Failed to load performance:', error)
    }
  }

  const clearLogs = async () => {
    try {
      await chrome.runtime.sendMessage({ type: 'CLEAR_LOGS' })
      setLogs([])
    } catch (error) {
      console.error('Failed to clear logs:', error)
    }
  }

  const exportLogs = async () => {
    const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `logs-${new Date().toISOString()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!show) return null

  return (
    <div className="debug-panel">
      <div className="debug-header">
        <h2>Debug Panel</h2>
        <button onClick={onClose} className="close-button">×</button>
      </div>

      <div className="debug-controls">
        <select 
          value={filter} 
          onChange={(e) => setFilter(e.target.value as LogLevel | 'all')}
          className="filter-select"
        >
          <option value="all">All Levels</option>
          <option value={LogLevel.DEBUG}>Debug</option>
          <option value={LogLevel.INFO}>Info</option>
          <option value={LogLevel.WARN}>Warn</option>
          <option value={LogLevel.ERROR}>Error</option>
        </select>

        <label className="auto-refresh">
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.checked)}
          />
          Auto-refresh
        </label>

        <button onClick={loadLogs} className="refresh-button">Refresh</button>
        <button onClick={clearLogs} className="clear-button">Clear</button>
        <button onClick={exportLogs} className="export-button">Export</button>
      </div>

      <div className="debug-content">
        <div className="debug-section">
          <h3>Rate Limits</h3>
          {rateLimit && (
            <div className="rate-limit-grid">
              {Object.entries(rateLimit).map(([provider, status]: [string, any]) => (
                <div key={provider} className="rate-limit-item">
                  <h4>{provider}</h4>
                  <div className="rate-limit-bar">
                    <div 
                      className="rate-limit-fill"
                      style={{ 
                        width: `${status.percentUsed}%`,
                        backgroundColor: status.percentUsed > 80 ? '#ff4444' : '#44ff44'
                      }}
                    />
                  </div>
                  <p>{status.used}/{status.limit} ({status.remaining} remaining)</p>
                  <p className="reset-time">
                    Resets: {new Date(status.resetTime).toLocaleTimeString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="debug-section">
          <h3>Performance Metrics</h3>
          <div className="performance-list">
            {performance.slice(0, 10).map((metric, index) => (
              <div key={index} className="performance-item">
                <span className="operation">{metric.operation}</span>
                <span className={`duration ${metric.duration > 3000 ? 'slow' : ''}`}>
                  {metric.duration}ms
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="debug-section">
          <h3>Logs ({logs.length})</h3>
          <div className="log-list">
            {logs.map((log, index) => (
              <div key={index} className={`log-entry level-${LogLevel[log.level].toLowerCase()}`}>
                <div className="log-header">
                  <span className="log-level">{LogLevel[log.level]}</span>
                  <span className="log-time">
                    {new Date(log.context.timestamp).toLocaleTimeString()}
                  </span>
                  {log.context.requestId && (
                    <span className="log-request-id">{log.context.requestId}</span>
                  )}
                </div>
                <div className="log-message">{log.message}</div>
                {log.context.duration && (
                  <div className="log-duration">Duration: {log.context.duration}ms</div>
                )}
                {log.error && (
                  <div className="log-error">
                    <strong>Error:</strong> {log.error.message}
                    {log.error.stack && (
                      <pre className="error-stack">{log.error.stack}</pre>
                    )}
                  </div>
                )}
                <details className="log-context">
                  <summary>Context</summary>
                  <pre>{JSON.stringify(log.context, null, 2)}</pre>
                </details>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}