#!/bin/bash

# Quick test script for Discord Tracker Action
# Run this before pushing changes

set -e

echo "🚀 Quick Docker Test for Discord Tracker Action"
echo "=============================================="

# Build the image
echo "📦 Building Docker image..."
docker build -t discord-tracker-action:test .

# Test basic execution
echo "🧪 Testing basic execution..."
if docker run --rm -e GITHUB_OUTPUT=/tmp/test_output discord-tracker-action:test ./discord-tracker-action 2>&1 | grep -q "Insufficient arguments"; then
    echo "✅ Basic execution test PASSED"
else
    echo "❌ Basic execution test FAILED"
    exit 1
fi

# Test with minimal arguments
echo "🧪 Testing argument parsing..."
touch /tmp/test_output
if docker run --rm \
    -e GITHUB_OUTPUT=/tmp/test_output \
    -v /tmp/test_output:/tmp/test_output \
    discord-tracker-action:test \
    init "123" "Test" "user" "repo" "main" "1" "1" "Test" "success" "{}" "" "invalid" "invalid" 2>&1 | grep -q "Failed to create pipeline tracker"; then
    echo "✅ Argument parsing test PASSED"
else
    echo "❌ Argument parsing test FAILED"
    exit 1
fi

# Cleanup
rm -f /tmp/test_output
docker rmi discord-tracker-action:test

echo "🎉 All quick tests PASSED! Ready to push." 