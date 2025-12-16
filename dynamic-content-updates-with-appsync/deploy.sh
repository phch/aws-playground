#!/bin/bash

# DEPRECATED: This script is replaced by the new deployment process
# 
# New deployment process:
# 1. Deploy infrastructure: cdk deploy --all
# 2. Deploy frontend: ./scripts/deploy-frontend.sh
# 3. Setup local dev: ./scripts/sync-local-env.sh
#
# See DEPLOYMENT_GUIDE.md for details

echo "⚠️  This script is deprecated!"
echo ""
echo "Please use the new deployment process:"
echo ""
echo "1. Deploy all infrastructure:"
echo "   cdk deploy --all"
echo ""
echo "2. Deploy frontend application:"
echo "   ./scripts/deploy-frontend.sh"
echo ""
echo "3. Setup local development:"
echo "   ./scripts/sync-local-env.sh"
echo ""
echo "See DEPLOYMENT_GUIDE.md for complete instructions."
echo ""
exit 1
