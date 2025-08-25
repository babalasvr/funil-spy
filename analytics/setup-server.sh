#!/bin/bash

# 🚀 Server Setup Script for Google Cloud
# Handles SQLite3 compilation issues automatically

echo "🔧 Setting up Funil Spy Analytics Server..."

# Navigate to analytics directory
cd /home/oappespiao2023/funil-spy/analytics

# Check if we're on the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Are you in the right directory?"
    exit 1
fi

echo "📦 Installing system dependencies..."
sudo apt-get update
sudo apt-get install -y build-essential python3 make g++ nodejs npm

echo "🧹 Cleaning previous installation..."
rm -rf node_modules package-lock.json

echo "📥 Installing Node.js dependencies..."
npm install

echo "🔍 Testing SQLite3..."
if node -e "require('sqlite3')" 2>/dev/null; then
    echo "✅ SQLite3 working correctly"
    USE_SQLITE=true
else
    echo "⚠️  SQLite3 failed, using simple file database"
    USE_SQLITE=false
fi

echo "🌐 Creating environment file..."
cat > .env << EOL
# Server Configuration
NODE_ENV=production
PORT=3001
USE_SIMPLE_DB=${USE_SQLITE}

# Email Configuration (configure these)
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=noreply@yourspydomain.com

# Demo Configuration
FACEBOOK_PIXEL_ID=demo_pixel_id
GOOGLE_CONVERSION_ID=AW-demo-conversion
GOOGLE_CONVERSION_LABEL=demo-label
EOL

echo "🚀 Starting server..."
if [ "$USE_SQLITE" = "false" ]; then
    echo "Using Simple File Database mode"
    node server-simple.js
else
    echo "Using SQLite Database mode"
    node server.js
fi