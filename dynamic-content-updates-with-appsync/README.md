# Dynamic Content Updates with AppSync

A full-stack application demonstrating real-time content updates using AWS AppSync, DynamoDB, Cognito, and Angular.

## Architecture

- **Backend**: AWS AppSync GraphQL API with Java Lambda resolvers, DynamoDB for data storage
- **Frontend**: Angular application with real-time subscriptions
- **Auth**: Amazon Cognito with Hosted UI
- **Hosting**: S3 + CloudFront for static site delivery

## Prerequisites

- Node.js 18+ and npm
- Python 3.11+
- AWS CLI configured with credentials
- AWS CDK CLI: `npm install -g aws-cdk`
- jq (for deployment script): `brew install jq` (macOS)

## Deployment

### 1. Deploy Infrastructure
```bash
cdk deploy --all
```
⏱️ Takes ~5-10 minutes. Creates all AWS resources (AppSync, Cognito, DynamoDB, S3, CloudFront).

### 2. Deploy Frontend
```bash
./scripts/deploy-frontend.sh
```
⏱️ Takes ~1-2 minutes. Builds and uploads Angular app to S3.

### 3. Seed Sample Data (Optional)

Load 100 sample products into the DynamoDB table for testing:

```bash
./scripts/seed-products.sh
```

This script:
- Generates 100 deterministic products with consistent IDs, names, prices, and categories
- Is idempotent - running multiple times produces the same results
- Uses batch operations for efficient loading
- Automatically finds your DynamoDB table from the deployed stack

You can verify the data was loaded:
```bash
aws dynamodb scan --table-name <YOUR_TABLE_NAME> --select COUNT
```

## Local Development

### Backend

The backend is deployed via CDK. To make changes:

```bash
# If you modified Java code, build it first
npm run build:java

# Build CDK TypeScript code
npm run build

# Preview infrastructure changes
npx cdk diff

# Deploy changes
npx cdk deploy
```

**Important**: Always run `npm run build:java` before deploying if you've modified any Java Lambda code. This ensures the latest JAR file is packaged with your deployment.

### Frontend

For local development:

```bash
cd src/frontend
npm install
npm start
```

The app runs at `http://localhost:4200` with hot reload enabled.

## Useful CDK Commands

* `npm run build`   - Compile TypeScript to JavaScript
* `npm run watch`   - Watch for changes and compile
* `npm run test`    - Run Jest unit tests
* `npx cdk deploy`  - Deploy stack to AWS
* `npx cdk diff`    - Compare deployed stack with current state
* `npx cdk synth`   - Emit synthesized CloudFormation template
* `npx cdk destroy` - Remove all deployed resources

## Project Structure

```
├── lib/                    # CDK infrastructure code
│   ├── constructs/         # Reusable CDK constructs
│   │   ├── backend-stack.ts
│   │   └── frontend-stack.ts
├── src/
│   ├── backend/            # Java Lambda resolvers
│   └── frontend/           # Angular application
├── scripts/                # Deployment scripts
│   └── deploy-frontend.sh
└── bin/                    # CDK app entry point
```
