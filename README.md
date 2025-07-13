# Unified Customer Dashboard Chrome Extension

A Chrome extension that provides support teams with a unified view of customer data from HubSpot and Dwolla.

## Features

- 🔍 Search customers by email, name, or business name
- 🔐 Secure OAuth authentication with HubSpot and Dwolla
- 📊 Split-panel view showing data from both platforms
- ⚡ Real-time data fetching with 3-second target performance
- 🔒 Zero data persistence for security compliance
- ⏱️ Automatic session timeout after 30 minutes

## Project Structure

```
├── src/
│   ├── popup/          # Chrome extension popup UI
│   ├── background/     # Service worker for API calls
│   ├── components/     # React components
│   ├── api/           # API client implementations
│   ├── types/         # TypeScript type definitions
│   └── utils/         # Utility functions
├── public/
│   └── icons/         # Extension icons
├── manifest.config.ts  # Chrome extension manifest
└── vite.config.ts     # Vite configuration
```

## Setup Instructions

### Prerequisites

- Node.js 18+ and npm
- Chrome browser
- HubSpot developer account
- Dwolla developer account

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd "Hubspot : Dwolla Dashboard"
```

2. Install dependencies:
```bash
npm install
```

3. Create environment configuration:
```bash
cp .env.example .env
```

4. Configure API credentials in `.env`:
- Add your HubSpot client ID and secret
- Add your Dwolla client ID and secret
- Set Dwolla environment (sandbox/production)

### API Setup

#### HubSpot Configuration

1. Create a HubSpot app at https://developers.hubspot.com/
2. Add OAuth redirect URL: `https://<extension-id>.chromiumapp.org/`
3. Request scopes: `crm.objects.contacts.read`, `crm.objects.companies.read`

#### Dwolla Configuration

1. Create a Dwolla application at https://dashboard.dwolla.com/
2. Add OAuth redirect URL: `https://<extension-id>.chromiumapp.org/`
3. Request scopes: `Customers:read`, `Transfers:read`

### Development

1. Start the development server:
```bash
npm run dev
```

2. Build the extension:
```bash
npm run build
```

3. Load the extension in Chrome:
   - Open Chrome and navigate to `chrome://extensions`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist` folder

### Testing

Run type checking:
```bash
npm run typecheck
```

Run linting:
```bash
npm run lint
```

## Usage

1. Click the extension icon in Chrome toolbar
2. Authenticate with HubSpot and Dwolla
3. Search for customers by:
   - Email address
   - Contact/customer name
   - Business name
4. View consolidated data in split panels

## Security

- No data is stored locally
- Sessions automatically expire after 30 minutes
- All API communications are encrypted
- OAuth tokens stored in encrypted Chrome storage

## Performance Targets

- Search results: < 3 seconds
- UI transitions: Smooth 60fps
- Bundle size: Minimal for fast loading

## Known Limitations

- Chrome extension manifest V3 limitations
- API rate limits from HubSpot/Dwolla
- Maximum 50 transfers displayed per customer

## Troubleshooting

### Extension not loading
- Check that all dependencies are installed
- Verify manifest.json is valid
- Check Chrome console for errors

### Authentication issues
- Verify API credentials are correct
- Check redirect URLs match extension ID
- Ensure proper scopes are requested

### Search not working
- Confirm both services are authenticated
- Check network tab for API errors
- Verify search query format

## Contributing

1. Create feature branch
2. Make changes
3. Test thoroughly
4. Submit pull request

## License

[Your License Here]