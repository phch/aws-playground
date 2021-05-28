#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { KongApiCdkStack } from '../lib/kong-api-cdk-stack';

const app = new cdk.App();
new KongApiCdkStack(app, 'KongApiCdkStack', {});
