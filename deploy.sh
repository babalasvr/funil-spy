#!/bin/bash

# 🚀 Auto Deploy Script for Funil Spy
# Run this on your VPS to update from Git

echo "🔄 Starting deployment..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Navigate to project directory
cd /home/oappespiao2023/funil-spy

echo -e "${YELLOW}📥 Pulling latest changes from Git...${NC}"
git pull origin main

# Check if pull was successful
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Git pull successful${NC}"
else
    echo -e "${RED}❌ Git pull failed${NC}"
    exit 1
fi

# Navigate to analytics directory
cd analytics

echo -e "${YELLOW}📦 Installing/updating dependencies...${NC}"
npm install

# Check if npm install was successful
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Dependencies installed${NC}"
else
    echo -e "${RED}❌ NPM install failed${NC}"
    exit 1
fi

echo -e "${YELLOW}🔄 Restarting application with PM2...${NC}"

# Stop current process if running
pm2 stop remarketing-system 2>/dev/null || true

# Start/restart with PM2
pm2 start server.js --name "remarketing-system"
pm2 save

# Check if PM2 start was successful
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Application restarted successfully${NC}"
    echo -e "${GREEN}🚀 Deployment completed!${NC}"
    echo ""
    echo -e "${YELLOW}📊 Application URLs:${NC}"
    echo "   Dashboard: http://$(curl -s ifconfig.me):3001/admin"
    echo "   Remarketing: http://$(curl -s ifconfig.me):3001/remarketing"
    echo "   Demo: http://$(curl -s ifconfig.me):3001/demo"
    echo ""
    echo -e "${YELLOW}📝 Useful commands:${NC}"
    echo "   View logs: pm2 logs remarketing-system"
    echo "   Restart: pm2 restart remarketing-system"
    echo "   Status: pm2 status"
else
    echo -e "${RED}❌ Failed to start application${NC}"
    exit 1
fi