#!/bin/bash

# S3 Storage Browser - Quick Setup Script
# This script sets up the development environment

set -e

echo "=========================================="
echo "S3 Storage Browser - Quick Setup"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running on supported OS
if [[ "$OSTYPE" == "linux-gnu"* ]] || [[ "$OSTYPE" == "darwin"* ]]; then
    echo -e "${GREEN}✓${NC} Operating system supported"
else
    echo -e "${RED}✗${NC} Unsupported operating system: $OSTYPE"
    exit 1
fi

# Check prerequisites
echo ""
echo "Checking prerequisites..."

# Check Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -ge 18 ]; then
        echo -e "${GREEN}✓${NC} Node.js $(node -v) installed"
    else
        echo -e "${RED}✗${NC} Node.js version must be 18 or higher"
        exit 1
    fi
else
    echo -e "${RED}✗${NC} Node.js not found. Please install Node.js 18+"
    exit 1
fi

# Check Python
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version | cut -d' ' -f2 | cut -d'.' -f1-2)
    if [ "$(printf '%s\n' "3.11" "$PYTHON_VERSION" | sort -V | head -n1)" = "3.11" ]; then
        echo -e "${GREEN}✓${NC} Python $(python3 --version) installed"
    else
        echo -e "${YELLOW}⚠${NC} Python version should be 3.11+, found $PYTHON_VERSION"
    fi
else
    echo -e "${RED}✗${NC} Python3 not found. Please install Python 3.11+"
    exit 1
fi

# Check AWS CLI
if command -v aws &> /dev/null; then
    echo -e "${GREEN}✓${NC} AWS CLI $(aws --version | cut -d' ' -f1 | cut -d'/' -f2) installed"
else
    echo -e "${YELLOW}⚠${NC} AWS CLI not found. You'll need it for AWS operations"
fi

# Check Docker (optional)
if command -v docker &> /dev/null; then
    echo -e "${GREEN}✓${NC} Docker $(docker --version | cut -d' ' -f3 | tr -d ',') installed"
else
    echo -e "${YELLOW}⚠${NC} Docker not found (optional)"
fi

echo ""
echo "=========================================="
echo "Setting up Frontend"
echo "=========================================="

cd frontend

# Copy environment file
if [ ! -f .env ]; then
    echo "Creating frontend .env file..."
    cp .env.example .env
    echo -e "${YELLOW}⚠${NC} Please update frontend/.env with your AWS configuration"
fi

# Install dependencies
echo "Installing frontend dependencies..."
npm install

echo -e "${GREEN}✓${NC} Frontend setup complete"

cd ..

echo ""
echo "=========================================="
echo "Setting up Backend"
echo "=========================================="

cd backend

# Create virtual environment
if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "Installing backend dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

# Copy environment file
if [ ! -f .env ]; then
    echo "Creating backend .env file..."
    cp .env.example .env
    echo -e "${YELLOW}⚠${NC} Please update backend/.env with your AWS configuration"
fi

echo -e "${GREEN}✓${NC} Backend setup complete"

cd ..

echo ""
echo "=========================================="
echo "Setup Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo ""
echo "1. Configure AWS resources:"
echo "   - Create Cognito User Pool"
echo "   - Create S3 Bucket"
echo "   - Update .env files with resource IDs"
echo ""
echo "2. Start the development servers:"
echo ""
echo "   Backend:"
echo "   $ cd backend"
echo "   $ source venv/bin/activate"
echo "   $ python main.py"
echo ""
echo "   Frontend (in a new terminal):"
echo "   $ cd frontend"
echo "   $ npm run dev"
echo ""
echo "3. Open http://localhost:3000 in your browser"
echo ""
echo "For detailed deployment instructions, see DEPLOYMENT.md"
echo "For full documentation, see README.md"
echo ""
