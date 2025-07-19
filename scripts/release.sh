#!/bin/bash

# GitHub Action Release Script
# This script helps maintain the v1/main branch workflow

set -e

echo "🚀 Discord Tracker Action Release Script"
echo "========================================"

# Check if we're on main branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo "❌ Error: You must be on the main branch to release"
    echo "Current branch: $CURRENT_BRANCH"
    echo "Please run: git checkout main"
    exit 1
fi

# Check if working directory is clean
if [ -n "$(git status --porcelain)" ]; then
    echo "❌ Error: Working directory is not clean"
    echo "Please commit or stash your changes first"
    git status --short
    exit 1
fi

# Pull latest changes
echo "📥 Pulling latest changes..."
git pull origin main

# Run tests
echo "🧪 Running tests..."
cargo test
cargo build --release

# Get current version
VERSION=$(grep '^version = ' Cargo.toml | cut -d'"' -f2)
echo "📦 Current version: $VERSION"

# Ask for confirmation
echo ""
echo "This will:"
echo "1. Merge main into v1"
echo "2. Push v1 to trigger Docker build"
echo "3. Publish version $VERSION"
echo ""
read -p "Continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Release cancelled"
    exit 1
fi

# Switch to v1 branch
echo "🔄 Switching to v1 branch..."
git checkout v1

# Merge main into v1
echo "🔀 Merging main into v1..."
git merge main --no-edit

# Push v1 to trigger build
echo "📤 Pushing v1 to trigger Docker build..."
git push origin v1

# Switch back to main
echo "🔄 Switching back to main..."
git checkout main

echo ""
echo "✅ Release process completed!"
echo ""
echo "Next steps:"
echo "1. Monitor the GitHub Actions tab for build status"
echo "2. Check that integration tests pass"
echo "3. Verify the Docker image is published"
echo ""
echo "The action will be available at:"
echo "ghcr.io/flazouh/discord-tracker:v1" 