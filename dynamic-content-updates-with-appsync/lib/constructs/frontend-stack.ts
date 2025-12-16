import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

export class FrontendStack extends cdk.NestedStack {
  public readonly bucketName: string;
  public readonly distributionDomainName: string;
  public readonly distributionId: string;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // S3 bucket for hosting static website
    const websiteBucket = new cdk.aws_s3.Bucket(this, 'WebsiteBucket', {
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: 'index.html', // SPA routing
      blockPublicAccess: cdk.aws_s3.BlockPublicAccess.BLOCK_ALL,
      accessControl: cdk.aws_s3.BucketAccessControl.PRIVATE,
      enforceSSL: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // CloudFront distribution (using modern Distribution construct)
    const distribution = new cdk.aws_cloudfront.Distribution(
      this,
      'Distribution',
      {
        defaultBehavior: {
          origin: cdk.aws_cloudfront_origins.S3BucketOrigin.withOriginAccessControl(websiteBucket),
          viewerProtocolPolicy: cdk.aws_cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cdk.aws_cloudfront.CachePolicy.CACHING_OPTIMIZED,
        },
        defaultRootObject: 'index.html',
        errorResponses: [
          {
            httpStatus: 404,
            responseHttpStatus: 200,
            responsePagePath: '/index.html',
            ttl: cdk.Duration.minutes(5),
          },
          {
            httpStatus: 403,
            responseHttpStatus: 200,
            responsePagePath: '/index.html',
            ttl: cdk.Duration.minutes(5),
          },
        ],
        priceClass: cdk.aws_cloudfront.PriceClass.PRICE_CLASS_100,
      }
    );
    
    // Apply removal policy to CloudFront distribution
    (distribution.node.defaultChild as cdk.aws_cloudfront.CfnDistribution).applyRemovalPolicy(cdk.RemovalPolicy.DESTROY);

    this.bucketName = websiteBucket.bucketName;
    this.distributionDomainName = distribution.distributionDomainName;
    this.distributionId = distribution.distributionId;
  }
}
