#!/bin/bash

# Define colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}Starting EduSense Stack...${NC}\n"

# Ensure common paths are available
export PATH="/usr/local/bin:/opt/homebrew/bin:$HOME/.nvm/versions/node/$(node -v 2>/dev/null)/bin:$PATH"

# 1. Start Node/React Monolith
echo -e "${YELLOW}-> Starting Node/Vite stack...${NC}"
/usr/local/bin/npm run dev &
NODE_PID=$!

# Handle script termination gracefully
cleanup() {
    echo -e "\n${YELLOW}Shutting down all services...${NC}"
    kill $NODE_PID
    exit 0
}

trap cleanup SIGINT SIGTERM

echo -e "\n${GREEN}All services are running! Press Ctrl+C to stop.${NC}"
echo -e "Frontend/Backend:  http://localhost:5001\n"

# Keep script running while tailing logs from all services multiplexed
wait
