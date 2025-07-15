# Dwolla Backend Proxy Architecture Plan

## Overview
This document outlines the security analysis and implementation plan for using the backend as a proxy for Dwolla API calls with Client Credentials authentication, while maintaining the current OAuth flow for HubSpot.

## Current Architecture Analysis

### 1. Authentication Flow
- Currently uses OAuth 2.0 Authorization Code flow for both HubSpot and Dwolla
- Tokens stored in Chrome's local storage with expiration tracking
- Backend service handles token exchange and refresh
- Extension authenticates to backend using API key + Extension ID

### 2. API Client Implementation
- Enhanced API clients with retry logic, rate limiting, and caching
- Direct API calls from extension to HubSpot/Dwolla using stored tokens
- Rate limiting: 50 requests/hour per provider, 100 total/hour
- Session management with 30-minute timeout

### 3. Security Measures in Place
- CORS restrictions (Chrome extensions only)
- API key validation
- Extension ID whitelisting capability
- No data persistence (PRD requirement)
- Session timeout and activity tracking
- Comprehensive logging with privacy features

## Security Implications of Proxy Architecture

### Advantages
1. **Simplified Authentication**: No OAuth flow in extension for Dwolla
2. **Centralized Security**: All Dwolla API credentials on backend only
3. **Enhanced Control**: Request validation, filtering, and monitoring
4. **Reduced Attack Surface**: No Dwolla tokens stored in browser

### Risks & Mitigations
1. **Backend Becomes Critical Point**
   - Mitigation: Rate limiting, DDoS protection, monitoring
2. **User Context Without OAuth**
   - Mitigation: Session-based user identification system
3. **Potential for Abuse**
   - Mitigation: Request validation, user quotas, audit logging

## Implementation Plan

### Phase 1: Backend Proxy Service
1. Create new proxy endpoints:
   - `/api/proxy/dwolla/customers/search`
   - `/api/proxy/dwolla/customers/:id`
   - `/api/proxy/dwolla/transfers/:id`
   
2. Implement Client Credentials flow:
   - Add Dwolla Client Credentials token management
   - Cache tokens with appropriate TTL
   - Automatic token refresh

3. User context management:
   - Generate secure session tokens for extension users
   - Map extension sessions to user identities
   - Track usage per user/session

### Phase 2: Security Enhancements
1. Request validation:
   - Whitelist allowed Dwolla endpoints
   - Validate all request parameters
   - Sanitize responses (remove sensitive fields)

2. Authorization layer:
   - User-specific access controls
   - Feature flags for different user roles
   - Audit trail for all requests

3. Rate limiting per user:
   - Individual user quotas
   - Prevent single user from exhausting limits
   - Alert on suspicious patterns

### Phase 3: Extension Updates
1. Replace direct Dwolla API calls with proxy calls
2. Implement session token management
3. Update error handling for proxy-specific errors
4. Maintain existing HubSpot OAuth flow (already working)

### Phase 4: Monitoring & Compliance
1. Comprehensive logging:
   - Request/response logging (sanitized)
   - User activity tracking
   - Performance metrics

2. Security monitoring:
   - Anomaly detection
   - Failed request patterns
   - Rate limit violations

3. Compliance features:
   - Data retention policies
   - Privacy controls
   - Audit reports

## Technical Implementation Details

### Backend Changes
- New middleware for session validation
- Dwolla Client Credentials service
- Request proxying with validation
- User session management
- Enhanced logging and monitoring

### Extension Changes
- Update Dwolla API client to use proxy
- Session token management
- Modified authentication flow (Dwolla only)
- Updated error handling

### Security Considerations
- Use HTTPS exclusively
- Implement request signing
- Add request replay protection
- Monitor for abuse patterns
- Regular security audits

## Key Benefits
1. Works with existing Dwolla Client Credentials setup
2. Maintains security through backend validation
3. Simplifies extension authentication complexity
4. Provides better control and monitoring
5. Can implement user-specific access controls

## Potential Challenges
1. Increased backend complexity
2. Need for robust session management
3. Additional latency for Dwolla requests
4. Requires careful security implementation
5. More complex debugging when issues arise

## Next Steps
1. Review and approve this architecture
2. Set up development environment for testing
3. Implement Phase 1 (basic proxy functionality)
4. Security review before Phase 2
5. Gradual rollout with monitoring