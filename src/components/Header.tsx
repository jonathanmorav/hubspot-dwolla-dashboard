import React from 'react'
import logo from '../assets/logo.png'
import './Header.css'

interface HeaderProps {
  title: string
  showDebugToggle?: boolean
  onDebugToggle?: () => void
  showDebug?: boolean
}

export const Header: React.FC<HeaderProps> = ({ 
  title, 
  showDebugToggle = false, 
  onDebugToggle,
  showDebug = false
}) => {
  return (
    <div className="header-container">
      <div className="header-brand">
        <img src={logo} alt="Company Logo" className="header-logo" />
        <h1 className="header-title">{title}</h1>
      </div>
      {showDebugToggle && (
        <button
          onClick={onDebugToggle}
          className="debug-toggle"
          title="Toggle Debug Panel"
          aria-label="Toggle Debug Panel"
          aria-pressed={showDebug}
        >
          🐛
        </button>
      )}
    </div>
  )
}