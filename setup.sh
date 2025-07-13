#!/bin/bash

echo "🚀 Setting up Unified Customer Dashboard Chrome Extension"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

echo "✅ Node.js $(node --version) detected"

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo ""
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "⚠️  Please update .env with your API credentials"
fi

# Build the extension
echo ""
echo "🔨 Building extension..."
npm run build

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Update .env with your HubSpot and Dwolla API credentials"
echo "2. Open Chrome and navigate to chrome://extensions"
echo "3. Enable 'Developer mode'"
echo "4. Click 'Load unpacked' and select the 'dist' folder"
echo "5. Copy the extension ID and update your OAuth redirect URLs"
echo ""
echo "For development: npm run dev"
echo "For building: npm run build"
echo ""
echo "Happy coding! 🎉"