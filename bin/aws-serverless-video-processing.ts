#!/usr/bin/env node
import { App } from '@aws-cdk/core';
import { AwsServerlessVideoProcessingPipelineStack } from '../lib/aws-serverless-video-processing-pipeline-stack';

const app = new App();

new AwsServerlessVideoProcessingPipelineStack(app, 'AwsServerlessVideoProcessingPipelineStack');

app.synth();