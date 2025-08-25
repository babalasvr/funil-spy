#!/bin/bash

echo "🧪 Testing Payment API..."

# Check if payment API is running
echo "1. Checking Payment API health..."
curl -s http://localhost:3002/health | jq . || echo "❌ Payment API not responding or jq not installed"

echo ""
echo "2. Testing payment creation..."

# Test payment creation with sample data
curl -s -X POST http://localhost:3002/create-payment \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 27.90,
    "description": "Teste - Acesso Premium WhatsApp Spy",
    "customer": {
      "name": "João Teste",
      "document": "12345678901",
      "email": "teste@email.com"
    },
    "external_id": "test_' $(date +%s) '_123",
    "callback_url": "https://whatspy.pro/webhook",
    "utm": {
      "utm_source": "test",
      "utm_medium": "api"
    }
  }' | jq . || echo "❌ Payment creation failed or jq not installed"

echo ""
echo "3. Checking services status..."
pm2 list

echo ""
echo "4. Checking nginx status..."
sudo systemctl status nginx --no-pager -l

echo ""
echo "✅ Test completed!"
echo ""
echo "💡 If you see errors:"
echo "  - Make sure services are running: pm2 status"
echo "  - Check logs: pm2 logs payment-api"
echo "  - Verify .env configuration in analytics/.env"