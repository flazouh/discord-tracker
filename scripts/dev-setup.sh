#!/bin/bash

# Development setup script for Discord Tracker GitHub Action

set -e

echo "🚀 Setting up Discord Tracker GitHub Action for development..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is required but not installed. Please install Docker first."
    exit 1
fi

# Build the Docker image locally for testing
echo "📦 Building Docker image..."
docker build -t discord-tracker-action:local .

echo "✅ Development setup complete!"
echo ""
echo "To test the action locally, you can run:"
echo "docker run --rm -e GITHUB_OUTPUT=/tmp/output discord-tracker-action:local <action> <args...>"
echo ""
echo "Example:"
echo "docker run --rm -e GITHUB_OUTPUT=/tmp/output discord-tracker-action:local init 123 'Test PR' username owner/repo main 1 1 'Test' success '{}' 'error' YOUR_BOT_TOKEN YOUR_CHANNEL_ID" 