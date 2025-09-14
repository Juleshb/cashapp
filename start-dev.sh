#!/bin/bash

# Trinity Metro Bike Development Startup Script
echo "🚀 Starting Trinity Metro Bike Development Environment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check for required tools
echo -e "${BLUE}Checking prerequisites...${NC}"

if ! command_exists node; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js first.${NC}"
    exit 1
fi

if ! command_exists npm; then
    echo -e "${RED}❌ npm is not installed. Please install npm first.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Node.js and npm are installed${NC}"

# Install backend dependencies
echo -e "${BLUE}📦 Installing backend dependencies...${NC}"
cd backend
if [ ! -d "node_modules" ]; then
    npm install
fi

# Check if .env exists
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  .env file not found. Copying from .env.example...${NC}"
    cp .env.example .env
    echo -e "${YELLOW}📝 Please update the .env file with your actual configuration values${NC}"
fi

# Install frontend dependencies
echo -e "${BLUE}📦 Installing frontend dependencies...${NC}"
cd ../frontend
if [ ! -d "node_modules" ]; then
    npm install
fi

# Start both services
echo -e "${GREEN}🚀 Starting development servers...${NC}"
echo -e "${BLUE}Backend will run on: https://bambe.shop${NC}"
echo -e "${BLUE}Frontend will run on: https://www.tmb8080.online${NC}"

# Start backend in background
cd ../backend
npm run dev &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 3

# Start frontend
cd ../frontend
npm start &
FRONTEND_PID=$!

# Function to cleanup on exit
cleanup() {
    echo -e "\n${YELLOW}🛑 Shutting down development servers...${NC}"
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    exit 0
}

# Trap Ctrl+C
trap cleanup INT

echo -e "${GREEN}✅ Development environment started!${NC}"
echo -e "${BLUE}Press Ctrl+C to stop all servers${NC}"

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID
