#!/bin/bash
# AWS CDK deployment script

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENT="dev"
ACTION="diff"

# Usage function
usage() {
    echo "Usage: $0 -e <environment> -a <action> [options]"
    echo ""
    echo "Options:"
    echo "  -e, --environment    Environment (dev, staging, prod)"
    echo "  -a, --action        Action (diff, deploy, destroy)"
    echo "  -h, --help          Show this help"
    echo ""
    echo "Examples:"
    echo "  $0 -e dev -a diff"
    echo "  $0 -e staging -a deploy"
    echo "  $0 -e prod -a destroy"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -a|--action)
            ACTION="$2"
            shift 2
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            echo "Unknown option $1"
            usage
            exit 1
            ;;
    esac
done

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(dev|staging|prod)$ ]]; then
    echo -e "${RED}❌ Invalid environment. Must be dev, staging, or prod${NC}"
    exit 1
fi

# Validate action
if [[ ! "$ACTION" =~ ^(diff|deploy|destroy|synth)$ ]]; then
    echo -e "${RED}❌ Invalid action. Must be diff, deploy, destroy, or synth${NC}"
    exit 1
fi

echo -e "${BLUE}🚀 CDK deployment for environment: ${ENVIRONMENT}${NC}"
echo -e "${BLUE}📋 Action: ${ACTION}${NC}"

# Navigate to CDK directory
cd "$(dirname "$0")/../../infrastructure/cdk"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed. Please install it and try again.${NC}"
    exit 1
fi

# Check if CDK is installed
if ! command -v cdk &> /dev/null; then
    echo -e "${YELLOW}⚠️  AWS CDK is not installed. Installing...${NC}"
    npm install -g aws-cdk
fi

# Check if AWS CLI is configured
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}❌ AWS CLI is not configured. Please run 'aws configure' and try again.${NC}"
    exit 1
fi

# Install dependencies
if [ ! -d "node_modules" ]; then
    echo -e "${GREEN}📦 Installing dependencies...${NC}"
    npm install
fi

# Bootstrap CDK (only needed once per account/region)
echo -e "${GREEN}🔄 Checking CDK bootstrap status...${NC}"
if ! aws cloudformation describe-stacks --stack-name CDKToolkit &> /dev/null; then
    echo -e "${YELLOW}⚠️  CDK not bootstrapped. Bootstrapping...${NC}"
    cdk bootstrap
fi

# Run CDK command
case $ACTION in
    diff)
        echo -e "${GREEN}📋 Running CDK diff...${NC}"
        cdk diff --context environment=$ENVIRONMENT --all
        ;;
    synth)
        echo -e "${GREEN}🔨 Synthesizing CloudFormation templates...${NC}"
        cdk synth --context environment=$ENVIRONMENT
        ;;
    deploy)
        echo -e "${GREEN}🏗️  Deploying stacks...${NC}"
        cdk deploy --context environment=$ENVIRONMENT --all --require-approval never
        
        echo -e "${GREEN}📊 Stack outputs:${NC}"
        aws cloudformation describe-stacks \
            --stack-name "S3Storage-Cognito-${ENVIRONMENT}" \
            --query 'Stacks[0].Outputs' \
            --output table
        ;;
    destroy)
        echo -e "${YELLOW}⚠️  This will DESTROY all CDK stacks for ${ENVIRONMENT}!${NC}"
        read -p "Are you sure? Type 'yes' to continue: " confirmation
        if [ "$confirmation" != "yes" ]; then
            echo "Cancelled."
            exit 0
        fi
        
        echo -e "${RED}💥 Destroying stacks...${NC}"
        cdk destroy --context environment=$ENVIRONMENT --all --force
        ;;
esac

echo -e "${GREEN}✅ CDK operation completed!${NC}"
