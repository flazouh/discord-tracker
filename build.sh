#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Building Discord Tracker...${NC}"

# Check if Rust is installed
if ! command -v cargo &> /dev/null; then
    echo -e "${RED}Error: Rust is not installed. Please install Rust first.${NC}"
    echo "Visit https://rustup.rs/ for installation instructions."
    exit 1
fi

# Build for release
echo -e "${YELLOW}Building release binary...${NC}"
cargo build --release

# Check if build was successful
if [ $? -eq 0 ]; then
    echo -e "${GREEN}Build successful!${NC}"
    echo -e "${YELLOW}Binary location: target/release/discord-tracker${NC}"
    
    # Show binary size
    BINARY_SIZE=$(du -h target/release/discord-tracker | cut -f1)
    echo -e "${GREEN}Binary size: ${BINARY_SIZE}${NC}"
    
    # Make binary executable
    chmod +x target/release/discord-tracker
    
    echo -e "${GREEN}Discord Tracker is ready to use!${NC}"
else
    echo -e "${RED}Build failed!${NC}"
    exit 1
fi 