#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { EnableDynamicContentUpdatesWithAppsyncStack } from '../lib/dynamic-content-updates-with-appsync-stack';
import { FrontendStack } from '../lib/constructs/frontend-stack';
import { BackendStack } from '../lib/constructs/backend-stack';

const app = new cdk.App();

// Deploy frontend infrastructure stack first (S3 + CloudFront)
// This creates the empty bucket and distribution
const stack = new EnableDynamicContentUpdatesWithAppsyncStack(app, 'DynamicUpdatesWithAppsyncStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});
