# Claude Code Context

This file contains important context for Claude Code when working on this project.

## Project Overview
- Chrome Extension for unified HubSpot + Dwolla customer dashboard
- Built with Vite + React + TypeScript
- Target users: 5-7 support team members
- Performance target: 3-second search results

## Key Requirements
1. **Security**: Zero data persistence, session timeout
2. **Search**: Email (primary), name, business name
3. **Display**: Split-panel view with collapsible sections
4. **Auth**: OAuth 2.0 via Chrome Identity API

## Project Structure
```
src/
├── popup/        # Main UI (React)
├── background/   # Service worker
├── api/         # API clients
├── components/  # React components
├── types/       # TypeScript types
└── utils/       # Utilities
```

## Current Status
- ✅ Chrome extension fully implemented
- ✅ UI components and layout complete
- ✅ Authentication flow ready
- ✅ Session management with timeout
- ✅ Comprehensive logging system
- ✅ Production-ready API clients
- ✅ Rate limiting (100/hour per PRD)
- ✅ Performance monitoring
- ✅ Debug panel for development
- ✅ Extension built to dist/ folder
- 🚧 Waiting for Extension ID from Chrome
- 📋 Need OAuth credentials and backend deployment

## Last Session (July 13, 2025)
- Implemented comprehensive logging system with privacy features
- Created enhanced API clients with retry logic and rate limiting
- Replaced all placeholder functions with real implementations
- Added debug panel for development
- Performance monitoring in place (3-second target)
- Extension successfully rebuilt and is feature-complete

## Previous Session (July 11, 2025)
- Built and packaged extension successfully
- Created secure backend service for OAuth
- Fixed TypeScript compilation errors
- Waiting for user to load extension and provide Extension ID

## Important Commands
```bash
npm run dev        # Start development
npm run build      # Build extension
npm run typecheck  # Check types
npm run lint       # Run linter
```

## API Endpoints
- HubSpot: https://api.hubapi.com
- Dwolla: https://api.dwolla.com (production)
- Dwolla: https://api-sandbox.dwolla.com (sandbox)

## Key New Files (July 13)
- `src/utils/logger.ts` - Comprehensive logging system
- `src/utils/rateLimiter.ts` - Rate limiting service
- `src/utils/apiEnhanced.ts` - Production API clients
- `src/components/DebugPanel.tsx` - Debug interface
- `backend/server.js` - OAuth token exchange service

## Next Steps
1. Load extension and get Extension ID
2. Deploy backend service (Railway/Vercel/Heroku)
3. Create HubSpot & Dwolla developer apps
4. Configure OAuth with Extension ID
5. Update .env files with credentials
6. Test complete OAuth flow

## Known Issues
- Icons are placeholder PNGs (need proper design)

## Resolved Issues
- ✅ OAuth token exchange - backend service implemented
- ✅ API rate limiting - comprehensive rate limiter in place
- ✅ Performance monitoring - logging system tracks all operations

## Performance Considerations
- Parallel API calls for faster results
- Request debouncing on search input
- Minimal bundle size with Vite
- Chrome storage.session for automatic cleanup