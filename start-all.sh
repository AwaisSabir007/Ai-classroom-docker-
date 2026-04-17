#!/bin/bash

# Define colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}Starting EduSense Polyglot Stack...${NC}\n"

# 1. Start Node/React Monolith
echo -e "${YELLOW}-> Starting Node/Vite stack...${NC}"
npm run dev &
NODE_PID=$!

# 2. Start Python Microservice
echo -e "${BLUE}-> Starting Python Transcribe Engine (Port 8001)...${NC}"
cd microservices/audio_processing/python-service
source .venv/bin/activate
uvicorn main:app --port 8001 &
PYTHON_PID=$!
cd ../../../

# 3. Start Rust Microservice
echo -e "${GREEN}-> Starting Rust WebSocket Ingress (Port 8000)...${NC}"
cd microservices/audio_processing/rust-server
cargo run &
RUST_PID=$!
cd ../../../

# Handle script termination gracefully
cleanup() {
    echo -e "\n${YELLOW}Shutting down all services...${NC}"
    kill $NODE_PID $PYTHON_PID $RUST_PID
    exit 0
}

trap cleanup SIGINT SIGTERM

echo -e "\n${GREEN}All services are running! Press Ctrl+C to stop.${NC}"
echo -e "Frontend:  http://localhost:5001"
echo -e "Rust WS:   ws://localhost:8000/stream"
echo -e "Python:    http://localhost:8001/transcribe\n"

# Keep script running while tailing logs from all services multiplexed
wait
