#!/bin/bash

# Frontend deployment script
# This script:
# 1. Fetches stack outputs from CloudFormation
# 2. Generates environment.ts with real values
# 3. Builds the Angular application
# 4. Deploys to S3
# 5. Invalidates CloudFront cache

set -e

ROOT_STACK_NAME="DynamicUpdatesWithAppsyncStack"

echo "=========================================="
echo "Frontend Deployment"
echo "=========================================="
echo ""

# Step 1: Fetch Stack Outputs
echo "Step 1: Fetching stack outputs..."

OUTPUTS=$(aws cloudformation describe-stacks \
  --stack-name "$ROOT_STACK_NAME" \
  --query "Stacks[0].Outputs" \
  --output json 2>/dev/null)

if [ -z "$OUTPUTS" ] || [ "$OUTPUTS" == "null" ]; then
  echo "❌ Could not fetch stack outputs"
  echo "Make sure the stack is deployed: cdk deploy $ROOT_STACK_NAME"
  exit 1
fi

# Extract values
APPSYNC_URL=$(echo "$OUTPUTS" | jq -r '.[] | select(.OutputKey=="AppSyncAPIURL") | .OutputValue')
COGNITO_USER_POOL_ID=$(echo "$OUTPUTS" | jq -r '.[] | select(.OutputKey=="CognitoUserPoolID") | .OutputValue')
COGNITO_CLIENT_ID=$(echo "$OUTPUTS" | jq -r '.[] | select(.OutputKey=="CognitoClientID") | .OutputValue')
COGNITO_DOMAIN=$(echo "$OUTPUTS" | jq -r '.[] | select(.OutputKey=="CognitoDomain") | .OutputValue')
BUCKET_NAME=$(echo "$OUTPUTS" | jq -r '.[] | select(.OutputKey=="WebsiteBucketName") | .OutputValue')
DISTRIBUTION_ID=$(echo "$OUTPUTS" | jq -r '.[] | select(.OutputKey=="DistributionID") | .OutputValue')
WEBSITE_URL=$(echo "$OUTPUTS" | jq -r '.[] | select(.OutputKey=="WebsiteURL") | .OutputValue')

# Validate required values
if [ -z "$APPSYNC_URL" ] || [ -z "$BUCKET_NAME" ]; then
  echo "❌ Missing required stack outputs"
  exit 1
fi

echo "✅ Configuration retrieved:"
echo "  AppSync URL: $APPSYNC_URL"
echo "  AWS Region: $AWS_REGION"
echo "  Cognito User Pool ID: $COGNITO_USER_POOL_ID"
echo "  Cognito Client ID: $COGNITO_CLIENT_ID"
echo "  Cognito Domain: $COGNITO_DOMAIN"
echo "  S3 Bucket: $BUCKET_NAME"
echo "  CloudFront Distribution: $DISTRIBUTION_ID"
echo "  Website URL: $WEBSITE_URL"
echo ""

# Step 2: Generate Environment File
echo "Step 2: Generating environment configuration..."

cat > src/frontend/src/environments/environment.ts << EOF
export const environment = {
  production: true,
  appSyncEndpoint: '$APPSYNC_URL',
  awsRegion: '$AWS_REGION',
  cognitoUserPoolId: '$COGNITO_USER_POOL_ID',
  cognitoClientId: '$COGNITO_CLIENT_ID',
  cognitoDomain: '$COGNITO_DOMAIN',
  
  // OAuth redirect URLs for Cognito Hosted UI
  redirectSignIn: ['$WEBSITE_URL', '$WEBSITE_URL/login', 'http://localhost:4200', 'http://localhost:4200/login'],
  redirectSignOut: ['$WEBSITE_URL', '$WEBSITE_URL/login', 'http://localhost:4200', 'http://localhost:4200/login'],
};
EOF

echo "✅ Environment file generated at src/frontend/src/environments/environment.ts"
echo ""

# Step 3: Build Frontend
echo "Step 3: Building Angular application..."
cd src/frontend

if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

npm run build

if [ $? -ne 0 ]; then
  echo "❌ Frontend build failed"
  exit 1
fi

echo "✅ Frontend built successfully"
echo ""

# Step 4: Deploy to S3
echo "Step 4: Deploying to S3..."
aws s3 sync dist/frontend/browser s3://$BUCKET_NAME --delete

if [ $? -ne 0 ]; then
  echo "❌ S3 deployment failed"
  exit 1
fi

echo "✅ Files uploaded to S3"
echo ""

# Step 5: Update Cognito Redirect URLs with CloudFront URL
echo "Step 5: Updating Cognito redirect URLs..."

# Get current Cognito client configuration
CURRENT_CONFIG=$(aws cognito-idp describe-user-pool-client \
  --user-pool-id "$COGNITO_USER_POOL_ID" \
  --client-id "$COGNITO_CLIENT_ID" \
  --query 'UserPoolClient' \
  --output json)

# Extract current callback and logout URLs
CURRENT_CALLBACKS=$(echo "$CURRENT_CONFIG" | jq -r '.CallbackURLs | join(",")')
CURRENT_LOGOUTS=$(echo "$CURRENT_CONFIG" | jq -r '.LogoutURLs | join(",")')

# Build updated URL lists (include localhost + CloudFront URL with base and /login paths)
CALLBACK_URLS="http://localhost:4200,http://localhost:4200/,http://localhost:4200/login,$WEBSITE_URL,$WEBSITE_URL/,$WEBSITE_URL/login"
LOGOUT_URLS="http://localhost:4200,http://localhost:4200/,http://localhost:4200/login,$WEBSITE_URL,$WEBSITE_URL/,$WEBSITE_URL/login"

# Update Cognito User Pool Client with CloudFront URLs
aws cognito-idp update-user-pool-client \
  --user-pool-id "$COGNITO_USER_POOL_ID" \
  --client-id "$COGNITO_CLIENT_ID" \
  --callback-urls $(echo $CALLBACK_URLS | tr ',' ' ') \
  --logout-urls $(echo $LOGOUT_URLS | tr ',' ' ') \
  --allowed-o-auth-flows "code" \
  --allowed-o-auth-scopes "email" "openid" "profile" \
  --allowed-o-auth-flows-user-pool-client \
  --supported-identity-providers "COGNITO" > /dev/null

if [ $? -ne 0 ]; then
  echo "⚠️  Failed to update Cognito redirect URLs (non-critical)"
else
  echo "✅ Cognito redirect URLs updated with CloudFront URL"
  echo "  Sign-in redirects: $CALLBACK_URLS"
  echo "  Sign-out redirects: $LOGOUT_URLS"
fi
echo ""

# Step 6: Invalidate CloudFront Cache
echo "Step 6: Invalidating CloudFront cache..."
INVALIDATION_ID=$(aws cloudfront create-invalidation \
  --distribution-id $DISTRIBUTION_ID \
  --paths "/*" \
  --query 'Invalidation.Id' \
  --output text)

if [ $? -ne 0 ]; then
  echo "⚠️  CloudFront invalidation failed (non-critical)"
else
  echo "✅ CloudFront cache invalidated (ID: $INVALIDATION_ID)"
fi

cd ../..

echo ""
echo "=========================================="
echo "🎉 Frontend Deployment Complete!"
echo "=========================================="
echo ""
echo "Your application is now live at:"
echo "  $WEBSITE_URL"
echo ""
echo "Note: CloudFront propagation may take 5-15 minutes."
echo ""
