#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { CognitoStack } from '../lib/cognito-stack';
import { S3Stack } from '../lib/s3-stack';
import { ApiStack } from '../lib/api-stack';

const app = new cdk.App();

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
};

const environment = app.node.tryGetContext('environment') || 'dev';

// Cognito Stack
const cognitoStack = new CognitoStack(app, `S3Storage-Cognito-${environment}`, {
  env,
  environment,
});

// S3 Stack
const s3Stack = new S3Stack(app, `S3Storage-S3-${environment}`, {
  env,
  environment,
});

// API Stack
const apiStack = new ApiStack(app, `S3Storage-API-${environment}`, {
  env,
  environment,
  userPool: cognitoStack.userPool,
  bucket: s3Stack.bucket,
});

app.synth();
