// Input validation utilities

export interface ValidationResult {
  isValid: boolean
  error?: string
}

// Email validation regex
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/

// Search query validation
export function validateSearchQuery(query: string): ValidationResult {
  // Trim whitespace
  const trimmed = query.trim()

  // Check if empty
  if (!trimmed) {
    return {
      isValid: false,
      error: 'Please enter a search query'
    }
  }

  // Check minimum length
  if (trimmed.length < 2) {
    return {
      isValid: false,
      error: 'Search query must be at least 2 characters'
    }
  }

  // Check maximum length
  if (trimmed.length > 100) {
    return {
      isValid: false,
      error: 'Search query must be less than 100 characters'
    }
  }

  // Check for valid characters (alphanumeric, spaces, email characters)
  const validCharsRegex = /^[a-zA-Z0-9\s@.\-_&',]+$/
  if (!validCharsRegex.test(trimmed)) {
    return {
      isValid: false,
      error: 'Search query contains invalid characters'
    }
  }

  // Check for potential injection attempts
  const dangerousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /<iframe/i,
    /\beval\b/i,
    /\bexec\b/i
  ]

  for (const pattern of dangerousPatterns) {
    if (pattern.test(trimmed)) {
      return {
        isValid: false,
        error: 'Invalid search query'
      }
    }
  }

  return { isValid: true }
}

// Sanitize search query
export function sanitizeSearchQuery(query: string): string {
  return query
    .trim()
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/\s+/g, ' ') // Normalize whitespace
    .substring(0, 100) // Enforce max length
}

// Detect query type with validation
export function detectAndValidateQueryType(query: string): {
  type: 'email' | 'name' | 'business' | 'unknown'
  isValid: boolean
  error?: string
} {
  const trimmed = query.trim()

  // Email detection and validation
  if (trimmed.includes('@')) {
    if (EMAIL_REGEX.test(trimmed)) {
      return { type: 'email', isValid: true }
    } else {
      return { 
        type: 'email', 
        isValid: false, 
        error: 'Please enter a valid email address' 
      }
    }
  }

  // Business name detection
  const businessIndicators = ['inc', 'llc', 'corp', 'ltd', 'co', 'company']
  const lowerQuery = trimmed.toLowerCase()
  if (businessIndicators.some(indicator => 
    lowerQuery.includes(` ${indicator}`) || 
    lowerQuery.endsWith(indicator)
  )) {
    return { type: 'business', isValid: true }
  }

  // Name detection (two or more words)
  if (trimmed.split(' ').length >= 2) {
    // Check if it looks like a person's name
    const nameRegex = /^[a-zA-Z\-']{2,}(\s[a-zA-Z\-']{2,})+$/
    if (nameRegex.test(trimmed)) {
      return { type: 'name', isValid: true }
    }
  }

  return { type: 'unknown', isValid: true }
}

// Validate customer ID
export function validateCustomerId(id: string): ValidationResult {
  // UUID format validation
  const uuidRegex = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i
  
  if (!uuidRegex.test(id)) {
    return {
      isValid: false,
      error: 'Invalid customer ID format'
    }
  }

  return { isValid: true }
}

// Validate authentication response
export function validateAuthResponse(response: any): ValidationResult {
  if (!response) {
    return {
      isValid: false,
      error: 'No response received'
    }
  }

  if (response.error) {
    return {
      isValid: false,
      error: response.error
    }
  }

  if (!response.success) {
    return {
      isValid: false,
      error: 'Authentication failed'
    }
  }

  return { isValid: true }
}