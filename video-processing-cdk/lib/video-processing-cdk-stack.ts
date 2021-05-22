import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';
import * as s3 from '@aws-cdk/aws-s3';
import * as s3n from '@aws-cdk/aws-s3-notifications';

export class VideoProcessingCdkStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const inputBucket = new s3.Bucket(this, 'InputVideoBucket');
    const outputBucket = new s3.Bucket(this, 'OutputVideoBucket');

    const layer = new lambda.LayerVersion(this, 'FfmpegLayer', {
      description: 'Lambda layer for ffmpeg',
      code: lambda.Code.fromAsset('lambda/layer/ffmpeg-4.4.zip'),
      compatibleRuntimes: [lambda.Runtime.PYTHON_3_8],
      license: 'GPLv3',
    });

    const fn = new lambda.Function(this, 'VideoProcessingFn', {
      code: lambda.Code.fromAsset('lambda'),
      handler: 'index.handler',
      runtime: lambda.Runtime.PYTHON_3_8,
      layers: [layer],
      environment: {
        'S3_DESTINATION_BUCKET': outputBucket.bucketName
      }
    });
    inputBucket.addEventNotification(s3.EventType.OBJECT_CREATED_PUT, new s3n.LambdaDestination(fn));
    inputBucket.grantRead(fn);
    outputBucket.grantWrite(fn);
  }
}
