#!/bin/bash

# Deploy Script untuk POS & Inventory Management
# Author: Your Name
# Version: 1.0

echo "🚀 Starting deployment process..."

# Check if node is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm not installed. Please install npm first."
    exit 1
fi

echo "✅ Node.js version: $(node -v)"
echo "✅ npm version: $(npm -v)"

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

# Build production
echo ""
echo "🔨 Building production..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed"
    exit 1
fi

echo ""
echo "✅ Build successful!"
echo ""
echo "📁 Build output: ./dist/"
echo ""
echo "Next steps:"
echo "1. For Netlify: netlify deploy --prod --dir=dist"
echo "2. For Vercel: vercel --prod"
echo "3. For cPanel: Upload files from ./dist/ to public_html/"
echo ""
echo "🎉 Deployment ready!"
