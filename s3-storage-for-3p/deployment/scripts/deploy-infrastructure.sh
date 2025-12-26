#!/bin/bash
# Infrastructure deployment script using Terraform

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENT="dev"
ACTION="plan"
AUTO_APPROVE=false

# Usage function
usage() {
    echo "Usage: $0 -e <environment> -a <action> [options]"
    echo ""
    echo "Options:"
    echo "  -e, --environment    Environment (dev, staging, prod)"
    echo "  -a, --action        Action (plan, apply, destroy)"
    echo "  -y, --yes           Auto-approve (for apply/destroy)"
    echo "  -h, --help          Show this help"
    echo ""
    echo "Examples:"
    echo "  $0 -e dev -a plan"
    echo "  $0 -e staging -a apply -y"
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
        -y|--yes)
            AUTO_APPROVE=true
            shift
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
if [[ ! "$ACTION" =~ ^(plan|apply|destroy)$ ]]; then
    echo -e "${RED}❌ Invalid action. Must be plan, apply, or destroy${NC}"
    exit 1
fi

echo -e "${BLUE}🚀 Deploying infrastructure for environment: ${ENVIRONMENT}${NC}"
echo -e "${BLUE}📋 Action: ${ACTION}${NC}"

# Navigate to terraform directory
cd "$(dirname "$0")/../../infrastructure/terraform"

# Check if Terraform is installed
if ! command -v terraform &> /dev/null; then
    echo -e "${RED}❌ Terraform is not installed. Please install it and try again.${NC}"
    exit 1
fi

# Check if AWS CLI is configured
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}❌ AWS CLI is not configured. Please run 'aws configure' and try again.${NC}"
    exit 1
fi

# Check for terraform.tfvars
if [ ! -f "terraform.tfvars" ]; then
    echo -e "${YELLOW}⚠️  terraform.tfvars not found. Copying from example...${NC}"
    cp terraform.tfvars.example terraform.tfvars
    echo -e "${YELLOW}⚠️  Please edit terraform.tfvars with your configuration${NC}"
    exit 1
fi

# Initialize Terraform
echo -e "${GREEN}📦 Initializing Terraform...${NC}"
terraform init

# Select workspace
echo -e "${GREEN}🔄 Selecting workspace: ${ENVIRONMENT}${NC}"
terraform workspace select $ENVIRONMENT 2>/dev/null || terraform workspace new $ENVIRONMENT

# Run Terraform command
case $ACTION in
    plan)
        echo -e "${GREEN}📋 Running Terraform plan...${NC}"
        terraform plan -var="environment=$ENVIRONMENT"
        ;;
    apply)
        echo -e "${GREEN}🏗️  Applying Terraform changes...${NC}"
        if [ "$AUTO_APPROVE" = true ]; then
            terraform apply -var="environment=$ENVIRONMENT" -auto-approve
        else
            terraform apply -var="environment=$ENVIRONMENT"
        fi
        
        # Display outputs
        echo -e "${GREEN}📊 Infrastructure outputs:${NC}"
        terraform output
        ;;
    destroy)
        echo -e "${YELLOW}⚠️  This will DESTROY all infrastructure for ${ENVIRONMENT}!${NC}"
        if [ "$AUTO_APPROVE" = false ]; then
            read -p "Are you sure? Type 'yes' to continue: " confirmation
            if [ "$confirmation" != "yes" ]; then
                echo "Cancelled."
                exit 0
            fi
        fi
        
        echo -e "${RED}💥 Destroying infrastructure...${NC}"
        if [ "$AUTO_APPROVE" = true ]; then
            terraform destroy -var="environment=$ENVIRONMENT" -auto-approve
        else
            terraform destroy -var="environment=$ENVIRONMENT"
        fi
        ;;
esac

echo -e "${GREEN}✅ Infrastructure deployment completed!${NC}"