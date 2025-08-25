#!/bin/bash

echo "🚀 Starting Funil Spy Services..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "📦 Installing PM2..."
    npm install -g pm2
fi

# Navigate to project directory
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

echo "📍 Project directory: $PROJECT_DIR"

# Start Analytics Service
echo "🔄 Starting Analytics Service..."
cd analytics
if [ -f "package.json" ]; then
    npm install
    pm2 start server.js --name "analytics-service"
else
    echo "⚠️ Analytics package.json not found, skipping analytics service"
fi

# Start Payment API
echo "🔄 Starting Payment API..."
cd ../api
if [ -f "package.json" ]; then
    npm install
    pm2 start payment.js --name "payment-api"
else
    echo "⚠️ Payment API package.json not found, skipping payment service"
fi

# Return to project root
cd "$PROJECT_DIR"

# Show PM2 status
echo "📊 Service Status:"
pm2 list

# Save PM2 configuration
pm2 save

echo ""
echo "✅ Services started successfully!"
echo ""
echo "🌐 Services available at:"
echo "   - Main site: http://localhost (port 80)"
echo "   - Analytics: http://localhost:3001/admin"
echo "   - Payment API: http://localhost:3002/health"
echo ""
echo "🔧 Useful commands:"
echo "   - Check logs: pm2 logs"
echo "   - Restart all: pm2 restart all"
echo "   - Stop all: pm2 stop all"
echo "   - Delete all: pm2 delete all"
echo ""
echo "⚠️  Remember to:"
echo "   1. Configure your .env files with real API keys"
echo "   2. Update Nginx configuration for your domain"
echo "   3. Set up SSL certificates with certbot"