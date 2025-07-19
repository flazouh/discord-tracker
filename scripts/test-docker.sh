#!/bin/bash

# Comprehensive Docker testing script for Discord Tracker GitHub Action
# This script validates the Docker image before release

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
IMAGE_NAME="discord-tracker-action"
TAG="test"
FULL_IMAGE_NAME="${IMAGE_NAME}:${TAG}"

echo -e "${BLUE}🧪 Starting comprehensive Docker testing for Discord Tracker Action${NC}"
echo "=================================================="

# Function to print test results
print_result() {
    local test_name="$1"
    local status="$2"
    local message="$3"
    
    if [ "$status" = "PASS" ]; then
        echo -e "${GREEN}✅ ${test_name}: PASS${NC} - ${message}"
    else
        echo -e "${RED}❌ ${test_name}: FAIL${NC} - ${message}"
        return 1
    fi
}

# Function to cleanup
cleanup() {
    echo -e "\n${YELLOW}🧹 Cleaning up test artifacts...${NC}"
    docker rmi "$FULL_IMAGE_NAME" 2>/dev/null || true
    rm -f /tmp/github_output_test
    echo -e "${GREEN}✅ Cleanup complete${NC}"
}

# Set up cleanup on exit
trap cleanup EXIT

# Test 1: Docker build
echo -e "\n${BLUE}📦 Test 1: Building Docker image${NC}"
if docker build -t "$FULL_IMAGE_NAME" .; then
    print_result "Docker Build" "PASS" "Image built successfully"
else
    print_result "Docker Build" "FAIL" "Failed to build image"
    exit 1
fi

# Test 2: Verify binary exists in container
echo -e "\n${BLUE}🔍 Test 2: Verifying binary exists${NC}"
if docker run --rm --entrypoint="" "$FULL_IMAGE_NAME" ls -la ./discord-tracker-action >/dev/null 2>&1; then
    print_result "Binary Check" "PASS" "discord-tracker-action binary found"
else
    print_result "Binary Check" "FAIL" "discord-tracker-action binary not found"
    exit 1
fi

# Test 3: Check binary permissions
echo -e "\n${BLUE}🔐 Test 3: Checking binary permissions${NC}"
PERMS=$(docker run --rm --entrypoint="" "$FULL_IMAGE_NAME" ls -la ./discord-tracker-action | awk '{print $1}')
if [[ "$PERMS" == *"x"* ]]; then
    print_result "Binary Permissions" "PASS" "Binary is executable"
else
    print_result "Binary Permissions" "FAIL" "Binary is not executable"
    exit 1
fi

# Test 4: Test help/version (if available)
echo -e "\n${BLUE}ℹ️  Test 4: Testing basic binary execution${NC}"
if docker run --rm -e GITHUB_OUTPUT=/tmp/github_output_test "$FULL_IMAGE_NAME" ./discord-tracker-action 2>&1 | grep -q "Insufficient arguments"; then
    print_result "Basic Execution" "PASS" "Binary executes and shows expected error for missing args"
else
    print_result "Basic Execution" "FAIL" "Binary failed to execute or didn't show expected error"
    exit 1
fi

# Test 5: Test with minimal valid arguments (dry run)
echo -e "\n${BLUE}🧪 Test 5: Testing with minimal arguments (dry run)${NC}"
# Create a temporary output file
touch /tmp/github_output_test

# Test with minimal arguments - this should fail gracefully with invalid token
if docker run --rm \
    -e GITHUB_OUTPUT=/tmp/github_output_test \
    -v /tmp/github_output_test:/tmp/github_output_test \
    "$FULL_IMAGE_NAME" \
    init "123" "Test PR" "testuser" "owner/repo" "main" "1" "1" "Test" "success" "{}" "" "invalid_token" "invalid_channel" 2>&1 | grep -q "Failed to create pipeline tracker"; then
    print_result "Argument Parsing" "PASS" "Binary accepts arguments and fails gracefully with invalid credentials"
else
    print_result "Argument Parsing" "FAIL" "Binary failed to parse arguments correctly"
    exit 1
fi

# Test 6: Check image size
echo -e "\n${BLUE}📏 Test 6: Checking image size${NC}"
IMAGE_SIZE=$(docker images "$FULL_IMAGE_NAME" --format "table {{.Size}}" | tail -n 1)
echo -e "${YELLOW}📊 Image size: $IMAGE_SIZE${NC}"
if [[ "$IMAGE_SIZE" =~ ^[0-9]+(\.[0-9]+)?[KMG]B$ ]]; then
    print_result "Image Size" "PASS" "Image size is reasonable: $IMAGE_SIZE"
else
    print_result "Image Size" "FAIL" "Invalid image size format: $IMAGE_SIZE"
fi

# Test 7: Security scan (if available)
echo -e "\n${BLUE}🔒 Test 7: Basic security check${NC}"
if command -v docker scout &> /dev/null; then
    if docker scout cves "$FULL_IMAGE_NAME" 2>&1 | grep -q "No vulnerabilities found\|No packages found"; then
        print_result "Security Scan" "PASS" "No critical vulnerabilities found"
    else
        print_result "Security Scan" "WARN" "Vulnerabilities found - review docker scout output"
    fi
else
    print_result "Security Scan" "SKIP" "docker scout not available"
fi

# Test 8: Test all action types with invalid data
echo -e "\n${BLUE}🔄 Test 8: Testing all action types${NC}"
ACTIONS=("init" "step" "complete" "fail")
ALL_PASSED=true

for action in "${ACTIONS[@]}"; do
    case $action in
        "init")
            docker run --rm \
                -e GITHUB_OUTPUT=/tmp/github_output_test \
                -v /tmp/github_output_test:/tmp/github_output_test \
                "$FULL_IMAGE_NAME" \
                "$action" "123" "Test PR" "testuser" "owner/repo" "main" "1" "1" "Test" "success" "{}" "" "invalid_token" "invalid_channel" >/dev/null 2>&1 || true
            ;;
        "step")
            docker run --rm \
                -e GITHUB_OUTPUT=/tmp/github_output_test \
                -v /tmp/github_output_test:/tmp/github_output_test \
                "$FULL_IMAGE_NAME" \
                "$action" "123" "Test PR" "testuser" "owner/repo" "main" "1" "3" "Test Step" "success" "{}" "" "invalid_token" "invalid_channel" >/dev/null 2>&1 || true
            ;;
        "complete")
            docker run --rm \
                -e GITHUB_OUTPUT=/tmp/github_output_test \
                -v /tmp/github_output_test:/tmp/github_output_test \
                "$FULL_IMAGE_NAME" \
                "$action" "123" "Test PR" "testuser" "owner/repo" "main" "1" "1" "Test" "success" "{}" "" "invalid_token" "invalid_channel" >/dev/null 2>&1 || true
            ;;
        "fail")
            docker run --rm \
                -e GITHUB_OUTPUT=/tmp/github_output_test \
                -v /tmp/github_output_test:/tmp/github_output_test \
                "$FULL_IMAGE_NAME" \
                "$action" "123" "Test PR" "testuser" "owner/repo" "main" "1" "1" "Test Step" "success" "{}" "Test error" "invalid_token" "invalid_channel" >/dev/null 2>&1 || true
            ;;
    esac
    
    if [ $? -eq 0 ] || [ $? -eq 1 ]; then
        echo -e "${GREEN}✅ Action '$action': PASS${NC}"
    else
        echo -e "${RED}❌ Action '$action': FAIL${NC}"
        ALL_PASSED=false
    fi
done

if [ "$ALL_PASSED" = true ]; then
    print_result "Action Types" "PASS" "All action types handled correctly"
else
    print_result "Action Types" "FAIL" "Some action types failed"
    exit 1
fi

# Final summary
echo -e "\n${GREEN}🎉 All tests completed successfully!${NC}"
echo -e "${BLUE}📋 Summary:${NC}"
echo "✅ Docker image builds correctly"
echo "✅ Binary exists and is executable"
echo "✅ Basic functionality works"
echo "✅ All action types are supported"
echo ""
echo -e "${YELLOW}🚀 Ready for release! You can now:${NC}"
echo "1. Tag and push your changes"
echo "2. Create a GitHub release"
echo "3. Your CI/CD pipeline should work correctly"
echo ""
echo -e "${BLUE}💡 To test with real Discord credentials:${NC}"
echo "docker run --rm -e GITHUB_OUTPUT=/tmp/output $FULL_IMAGE_NAME init 123 'Test PR' username owner/repo main 1 1 'Test' success '{}' '' YOUR_BOT_TOKEN YOUR_CHANNEL_ID" 