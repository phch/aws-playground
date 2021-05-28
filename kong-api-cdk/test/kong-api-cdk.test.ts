import { expect as expectCDK, countResources, haveResource, SynthUtils } from '@aws-cdk/assert';
import * as cdk from '@aws-cdk/core';
import * as KongApiCdk from '../lib/kong-api-cdk-stack';

test('Matches snapshot', () => {
  const app = new cdk.App();
  // WHEN
  const stack = new KongApiCdk.KongApiCdkStack(app, 'TestStack');
  // THEN
  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});
