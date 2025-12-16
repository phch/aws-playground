#!/bin/bash
# Local development deployment script

set -e

echo "🚀 Starting local deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Please start Docker and try again.${NC}"
    exit 1
fi

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ docker-compose is not installed. Please install it and try again.${NC}"
    exit 1
fi

# Navigate to project root
cd "$(dirname "$0")/../.."

# Check for .env files
if [ ! -f "backend/.env" ]; then
    echo -e "${YELLOW}⚠️  Backend .env file not found. Copying from example...${NC}"
    cp backend/.env.example backend/.env
    echo -e "${YELLOW}⚠️  Please edit backend/.env with your AWS credentials${NC}"
fi

if [ ! -f "frontend/.env" ]; then
    echo -e "${YELLOW}⚠️  Frontend .env file not found. Copying from example...${NC}"
    cp frontend/.env.example frontend/.env
    echo -e "${YELLOW}⚠️  Please edit frontend/.env with your configuration${NC}"
fi

# Build and start services
echo -e "${GREEN}📦 Building Docker images...${NC}"
docker-compose build

echo -e "${GREEN}🏃 Starting services...${NC}"
docker-compose up -d

# Wait for services to be healthy
echo -e "${GREEN}⏳ Waiting for services to be ready...${NC}"
sleep 10

# Check if services are running
if docker-compose ps | grep -q "Up"; then
    echo -e "${GREEN}✅ Services are running!${NC}"
    echo ""
    echo "📍 Backend API: http://localhost:8000"
    echo "📍 Frontend: http://localhost:3000"
    echo "📍 API Docs: http://localhost:8000/api/docs"
    echo ""
    echo "To view logs: docker-compose logs -f"
    echo "To stop services: docker-compose down"
else
    echo -e "${RED}❌ Failed to start services. Check logs with: docker-compose logs${NC}"
    exit 1
fi
