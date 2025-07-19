#!/bin/bash

# Enhanced GitHub Action Release Script
# This script automates the v1/main branch workflow

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Enhanced Discord Tracker Action Release Script${NC}"
echo "=================================================="

# Parse command line arguments
VERSION="v1"
AUTO_MERGE=true
SKIP_TESTS=false

while [[ $# -gt 0 ]]; do
  case $1 in
    -v|--version)
      VERSION="$2"
      shift 2
      ;;
    --no-merge)
      AUTO_MERGE=false
      shift
      ;;
    --skip-tests)
      SKIP_TESTS=true
      shift
      ;;
    -h|--help)
      echo "Usage: $0 [OPTIONS]"
      echo "Options:"
      echo "  -v, --version VERSION    Version to release (default: v1)"
      echo "  --no-merge              Don't automatically merge to version branch"
      echo "  --skip-tests            Skip running tests before release"
      echo "  -h, --help              Show this help message"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# Validate version format
if [[ ! $VERSION =~ ^v[0-9]+$ ]]; then
    echo -e "${RED}❌ Error: Invalid version format. Must be v1, v2, v3, etc.${NC}"
    exit 1
fi

echo -e "${BLUE}📦 Target version: $VERSION${NC}"

# Check if we're on main branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo -e "${RED}❌ Error: You must be on the main branch to release${NC}"
    echo "Current branch: $CURRENT_BRANCH"
    echo "Please run: git checkout main"
    exit 1
fi

# Check if working directory is clean
if [ -n "$(git status --porcelain)" ]; then
    echo -e "${RED}❌ Error: Working directory is not clean${NC}"
    echo "Please commit or stash your changes first"
    git status --short
    exit 1
fi

# Pull latest changes
echo -e "${BLUE}📥 Pulling latest changes...${NC}"
git pull origin main

# Run tests (unless skipped)
if [ "$SKIP_TESTS" = false ]; then
    echo -e "${BLUE}🧪 Running tests...${NC}"
    cargo test
    cargo build --release
    echo -e "${GREEN}✅ Tests passed${NC}"
else
    echo -e "${YELLOW}⚠️  Skipping tests${NC}"
fi

# Get current version from Cargo.toml
CARGO_VERSION=$(grep '^version = ' Cargo.toml | cut -d'"' -f2)
echo -e "${BLUE}📦 Cargo.toml version: $CARGO_VERSION${NC}"

# Ask for confirmation
echo ""
echo -e "${YELLOW}This will:${NC}"
echo "1. Merge main into $VERSION"
echo "2. Push $VERSION to trigger Docker build"
echo "3. Publish version $CARGO_VERSION"
echo ""
read -p "Continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}❌ Release cancelled${NC}"
    exit 1
fi

# Check if version branch exists
if git ls-remote --heads origin $VERSION | grep -q $VERSION; then
    echo -e "${BLUE}🔄 Version branch $VERSION exists, updating...${NC}"
    git checkout $VERSION
    git merge main --no-edit
else
    echo -e "${BLUE}🆕 Creating new version branch $VERSION...${NC}"
    git checkout -b $VERSION
fi

# Push version branch
echo -e "${BLUE}📤 Pushing $VERSION to trigger Docker build...${NC}"
git push origin $VERSION

# Switch back to main
echo -e "${BLUE}🔄 Switching back to main...${NC}"
git checkout main

echo ""
echo -e "${GREEN}✅ Release process completed!${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "1. Monitor the GitHub Actions tab for build status"
echo "2. Check that integration tests pass"
echo "3. Verify the Docker image is published"
echo ""
echo -e "${BLUE}The action will be available at:${NC}"
echo "ghcr.io/flazouh/discord-tracker:$VERSION"
echo ""
echo -e "${GREEN}🎉 Your Discord Tracker Action is now live!${NC}" 