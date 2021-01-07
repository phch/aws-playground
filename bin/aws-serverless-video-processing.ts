#!/usr/bin/env node
import { App } from '@aws-cdk/core';
import { AwsServerlessVideoProcessingPipelineStack } from '../lib/aws-serverless-video-processing-pipeline-stack';
import { AwsServerlessVideoProcessingStage } from '../lib/aws-serverless-video-processing-stage';

const app = new App();

new AwsServerlessVideoProcessingPipelineStack(app, 'AwsServerlessVideoProcessingPipelineStack');

new AwsServerlessVideoProcessingStage(app, 'Dev', {
    env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
});

app.synth();