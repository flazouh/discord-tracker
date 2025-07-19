#!/bin/bash

# GitHub CLI-based Release Automation
# Requires: gh CLI tool installed and authenticated

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 GitHub CLI Release Automation${NC}"
echo "=================================="

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo -e "${RED}❌ GitHub CLI (gh) is not installed${NC}"
    echo "Install from: https://cli.github.com/"
    exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
    echo -e "${RED}❌ Not authenticated with GitHub CLI${NC}"
    echo "Run: gh auth login"
    exit 1
fi

# Parse arguments
VERSION="v1"
CREATE_RELEASE=false
DRAFT=false

while [[ $# -gt 0 ]]; do
  case $1 in
    -v|--version)
      VERSION="$2"
      shift 2
      ;;
    --release)
      CREATE_RELEASE=true
      shift
      ;;
    --draft)
      DRAFT=true
      shift
      ;;
    -h|--help)
      echo "Usage: $0 [OPTIONS]"
      echo "Options:"
      echo "  -v, --version VERSION    Version to release (default: v1)"
      echo "  --release               Create a GitHub release"
      echo "  --draft                 Create as draft release"
      echo "  -h, --help              Show this help message"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

echo -e "${BLUE}📦 Target version: $VERSION${NC}"

# Get current version from Cargo.toml
CARGO_VERSION=$(grep '^version = ' Cargo.toml | cut -d'"' -f2)
echo -e "${BLUE}📦 Cargo.toml version: $CARGO_VERSION${NC}"

# Check if we're on main branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo -e "${RED}❌ Error: You must be on the main branch${NC}"
    exit 1
fi

# Check if working directory is clean
if [ -n "$(git status --porcelain)" ]; then
    echo -e "${RED}❌ Error: Working directory is not clean${NC}"
    exit 1
fi

# Pull latest changes
echo -e "${BLUE}📥 Pulling latest changes...${NC}"
git pull origin main

# Run tests
echo -e "${BLUE}🧪 Running tests...${NC}"
cargo test
cargo build --release
echo -e "${GREEN}✅ Tests passed${NC}"

# Create or update version branch
echo -e "${BLUE}🔄 Managing version branch...${NC}"
if git ls-remote --heads origin $VERSION | grep -q $VERSION; then
    echo "Updating existing branch: $VERSION"
    git checkout $VERSION
    git merge main --no-edit
else
    echo "Creating new branch: $VERSION"
    git checkout -b $VERSION
fi

# Push version branch
echo -e "${BLUE}📤 Pushing $VERSION...${NC}"
git push origin $VERSION

# Switch back to main
git checkout main

# Create GitHub release if requested
if [ "$CREATE_RELEASE" = true ]; then
    echo -e "${BLUE}🏷️  Creating GitHub release...${NC}"
    
    RELEASE_ARGS=""
    if [ "$DRAFT" = true ]; then
        RELEASE_ARGS="--draft"
    fi
    
    gh release create $VERSION \
        --title "Release $VERSION" \
        --notes "Automated release for Discord Tracker Action v$CARGO_VERSION" \
        --target $VERSION \
        $RELEASE_ARGS
    
    echo -e "${GREEN}✅ GitHub release created!${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Release automation completed!${NC}"
echo ""
echo -e "${BLUE}What happened:${NC}"
echo "✅ Version branch $VERSION created/updated"
echo "✅ Docker build triggered automatically"
echo "✅ Integration tests will run"
if [ "$CREATE_RELEASE" = true ]; then
    echo "✅ GitHub release created"
fi
echo ""
echo -e "${BLUE}Monitor progress:${NC}"
echo "https://github.com/flazouh/discord-tracker/actions"
echo ""
echo -e "${BLUE}Action will be available at:${NC}"
echo "ghcr.io/flazouh/discord-tracker:$VERSION" 