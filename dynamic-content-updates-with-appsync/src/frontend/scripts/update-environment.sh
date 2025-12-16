#!/bin/bash

# Script to update environment files with CDK stack outputs
# Usage: ./update-environment.sh <stack-name>

set -e

if [ -z "$1" ]; then
  echo "Usage: ./update-environment.sh <stack-name>"
  echo "Example: ./update-environment.sh EnableDynamicContentUpdatesWithAppsyncStack"
  exit 1
fi

STACK_NAME=$1
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_DIR="$SCRIPT_DIR/../src/environments"

echo "Fetching CDK stack outputs for: $STACK_NAME"

# Get stack outputs
OUTPUTS=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --query "Stacks[0].Outputs" --output json)

if [ -z "$OUTPUTS" ] || [ "$OUTPUTS" == "null" ]; then
  echo "Error: Could not fetch stack outputs. Make sure the stack is deployed and you have AWS credentials configured."
  exit 1
fi

# Extract values
APPSYNC_URL=$(echo "$OUTPUTS" | jq -r '.[] | select(.OutputKey=="AppSyncAPIURL" or .OutputKey=="GraphQLEndpoint") | .OutputValue' | head -n 1)
COGNITO_USER_POOL_ID=$(echo "$OUTPUTS" | jq -r '.[] | select(.OutputKey=="CognitoUserPoolID") | .OutputValue')
COGNITO_CLIENT_ID=$(echo "$OUTPUTS" | jq -r '.[] | select(.OutputKey=="CognitoClientID") | .OutputValue')
COGNITO_DOMAIN=$(echo "$OUTPUTS" | jq -r '.[] | select(.OutputKey=="CognitoDomain") | .OutputValue')
AWS_REGION=$(echo "$APPSYNC_URL" | sed -n 's/.*appsync-api\.\([^.]*\)\.amazonaws\.com.*/\1/p')

if [ -z "$AWS_REGION" ]; then
  AWS_REGION="us-east-1"
fi

# Construct full Cognito domain URL
COGNITO_DOMAIN_URL="${COGNITO_DOMAIN}.auth.${AWS_REGION}.amazoncognito.com"

echo "Found configuration:"
echo "  AppSync URL: $APPSYNC_URL"
echo "  AWS Region: $AWS_REGION"
echo "  Cognito User Pool ID: $COGNITO_USER_POOL_ID"
echo "  Cognito Client ID: $COGNITO_CLIENT_ID"
echo "  Cognito Domain: $COGNITO_DOMAIN_URL"

# Update environment.ts
cat > "$ENV_DIR/environment.ts" << EOF
// This file can be replaced during build by using the \`fileReplacements\` array.
// \`ng build\` replaces \`environment.ts\` with \`environment.prod.ts\`.
// The list of file replacements can be found in \`angular.json\`.

export const environment = {
  production: false,
  
  // AppSync GraphQL API Configuration
  appSyncEndpoint: '$APPSYNC_URL',
  
  // AWS Region where resources are deployed
  awsRegion: '$AWS_REGION',
  
  // Cognito User Pool Configuration
  cognitoUserPoolId: '$COGNITO_USER_POOL_ID',
  cognitoClientId: '$COGNITO_CLIENT_ID',
  cognitoDomain: '$COGNITO_DOMAIN_URL',
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as \`zone.run\`, \`zoneDelegate.invokeTask\`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
EOF

# Update environment.prod.ts
cat > "$ENV_DIR/environment.prod.ts" << EOF
export const environment = {
  production: true,
  
  // AppSync GraphQL API Configuration
  appSyncEndpoint: '$APPSYNC_URL',
  
  // AWS Region where resources are deployed
  awsRegion: '$AWS_REGION',
  
  // Cognito User Pool Configuration
  cognitoUserPoolId: '$COGNITO_USER_POOL_ID',
  cognitoClientId: '$COGNITO_CLIENT_ID',
  cognitoDomain: '$COGNITO_DOMAIN_URL',
};
EOF

echo ""
echo "✅ Environment files updated successfully!"
echo "   - $ENV_DIR/environment.ts"
echo "   - $ENV_DIR/environment.prod.ts"
