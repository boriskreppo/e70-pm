#!/bin/bash

# Dashboard Setup Script
# Pokreni iz dashboard-app/ foldera: bash setup.sh

set -e

echo "🚀 Dashboard Setup"
echo "=================="
echo ""

# Provjera Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js nije instaliran. Instaliraj sa:"
    echo "   brew install node"
    exit 1
fi

NODE_VERSION=$(node -v)
NODE_MAJOR=$(echo $NODE_VERSION | sed 's/v//' | cut -d. -f1)
NODE_MINOR=$(echo $NODE_VERSION | sed 's/v//' | cut -d. -f2)

if [ "$NODE_MAJOR" -lt 22 ] || ([ "$NODE_MAJOR" -eq 22 ] && [ "$NODE_MINOR" -lt 5 ]); then
    echo "❌ Treba Node.js 22.5 ili noviji (imaš $NODE_VERSION)"
    echo "   Update sa: brew upgrade node"
    exit 1
fi

echo "✓ Node.js verzija: $NODE_VERSION"
echo ""

# Backend
echo "📦 Instaliram backend dependencies..."
cd backend
npm install
cd ..
echo ""

# Frontend
echo "📦 Instaliram frontend dependencies..."
cd frontend
npm install
echo ""

echo "🔨 Buildam frontend..."
npm run build
cd ..
echo ""

echo "✅ Setup gotov!"
echo ""
echo "Pokreni server sa:"
echo "  cd backend && npm start"
echo ""
echo "Ili za development (sa hot-reload):"
echo "  Terminal 1: cd backend && npm run dev"
echo "  Terminal 2: cd frontend && npm run dev"
