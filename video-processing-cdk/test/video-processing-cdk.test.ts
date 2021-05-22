import { expect as expectCDK, countResources, haveResource, SynthUtils } from '@aws-cdk/assert';
import * as cdk from '@aws-cdk/core';
import * as VideoProcessingCdk from '../lib/video-processing-cdk-stack';

test('Contains required resources', () => {
    const app = new cdk.App();
    // WHEN
    const stack = new VideoProcessingCdk.VideoProcessingCdkStack(app, 'TestStack');
    // THEN
    expectCDK(stack).to(haveResource('AWS::Lambda::LayerVersion'));
    expectCDK(stack).to(haveResource('AWS::Lambda::Function'));
    expectCDK(stack).to(countResources('AWS::S3::Bucket', 2));
});

test('Matches snapshot', () => {
  const app = new cdk.App();
  // WHEN
  const stack = new VideoProcessingCdk.VideoProcessingCdkStack(app, 'TestStack');
  // THEN
  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});
