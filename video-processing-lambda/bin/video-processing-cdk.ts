#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { VideoProcessingCdkStack } from '../lib/video-processing-cdk-stack';

const app = new cdk.App();
new VideoProcessingCdkStack(app, 'VideoProcessingCdkStack', {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION }
});
