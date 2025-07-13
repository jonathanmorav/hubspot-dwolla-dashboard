# Development Guide

## Current Implementation Status

### ✅ Completed
- Chrome extension structure with Vite + React + TypeScript
- Basic UI components (search form, split panels)
- Authentication flow setup (UI ready)
- Error handling and loading states
- Session management framework

### 🚧 In Progress
- OAuth authentication implementation
- API integration (HubSpot and Dwolla)

### 📋 TODO
- Connect actual API endpoints
- Implement token refresh logic
- Add performance monitoring
- Create automated tests

## OAuth Implementation Guide

### Chrome Identity API Setup

The extension uses Chrome's Identity API for OAuth flows. Here's how to implement:

1. **Get Extension ID**:
   - Load unpacked extension in Chrome
   - Copy the extension ID from chrome://extensions
   - Your redirect URL will be: `https://<EXTENSION_ID>.chromiumapp.org/`

2. **Update API Credentials**:
   ```javascript
   // src/background/service-worker.ts
   const HUBSPOT_CLIENT_ID = process.env.VITE_HUBSPOT_CLIENT_ID
   const DWOLLA_CLIENT_ID = process.env.VITE_DWOLLA_CLIENT_ID
   ```

3. **Token Exchange**:
   - Currently using placeholder tokens
   - Need to implement server-side token exchange
   - Or use implicit flow if acceptable

### API Integration Steps

1. **Update API Clients**:
   ```typescript
   // src/utils/api.ts
   // Replace placeholder implementations with actual API calls
   ```

2. **Test with Sandbox**:
   - Use Dwolla sandbox environment first
   - Test with HubSpot test portal

3. **Error Handling**:
   - Handle rate limits
   - Implement retry logic
   - Show user-friendly error messages

## Local Development

### Quick Start
```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# In another terminal, build and watch
npm run build -- --watch
```

### Chrome Extension Development

1. **Hot Reload**:
   - Changes to popup will auto-reload
   - Background script changes require extension reload
   - Press Cmd+R in extension popup to refresh

2. **Debugging**:
   - Popup: Right-click extension icon > Inspect Popup
   - Background: chrome://extensions > Service Worker link
   - Use Chrome DevTools for debugging

3. **Testing OAuth**:
   - Use console to test chrome.identity.launchWebAuthFlow
   - Check redirect URLs match exactly
   - Monitor network tab for API calls

### Type Safety

- All API responses should have TypeScript interfaces
- Use strict mode for better type checking
- Run `npm run typecheck` before committing

## Performance Optimization

### Current Optimizations
- Lazy loading of components
- Minimal bundle size with Vite
- Efficient React rendering

### Future Optimizations
- Implement request caching
- Add request debouncing
- Use React.memo for heavy components
- Implement virtual scrolling for long lists

## Security Considerations

### Token Storage
```typescript
// Use chrome.storage.local with encryption
await chrome.storage.local.set({
  hubspot_token: encrypt(token)
})
```

### Session Management
- Tokens cleared on extension unload
- 30-minute timeout implemented
- No sensitive data in memory after use

## Testing Strategy

### Unit Tests (TODO)
- Test API clients
- Test data transformations
- Test component logic

### Integration Tests (TODO)
- Test OAuth flows
- Test API error scenarios
- Test session timeout

### Manual Testing Checklist
- [ ] OAuth flow for both services
- [ ] Search by email
- [ ] Search by name
- [ ] View transfer history
- [ ] Session timeout
- [ ] Error states
- [ ] Loading states

## Deployment

### Build for Production
```bash
npm run build
```

### Chrome Web Store Submission
1. Create screenshots (1280x800)
2. Prepare promotional images
3. Write detailed description
4. Set up privacy policy
5. Submit for review

## Common Issues

### CORS Errors
- APIs should be called from background script
- Use message passing to communicate with popup

### Token Expiration
- Implement refresh token flow
- Handle 401 errors gracefully
- Re-authenticate when needed

### Performance Issues
- Profile with Chrome DevTools
- Check for memory leaks
- Optimize API calls

## Resources

- [Chrome Extension Docs](https://developer.chrome.com/docs/extensions/v3/)
- [HubSpot API Docs](https://developers.hubspot.com/docs/api/overview)
- [Dwolla API Docs](https://developers.dwolla.com/api-reference)
- [Vite Chrome Extension Guide](https://crxjs.dev/vite-plugin/)