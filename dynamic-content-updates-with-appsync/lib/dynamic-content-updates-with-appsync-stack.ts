import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { BackendStack } from './constructs/backend-stack';
import { FrontendStack } from './constructs/frontend-stack';

export class EnableDynamicContentUpdatesWithAppsyncStack extends cdk.Stack {
  public readonly cognitoUserPoolId: string;
  public readonly cognitoClientId: string;
  public readonly cognitoDomain: string;
  public readonly appSyncEndpoint: string;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create stacks as a nested construct
    const frontend = new FrontendStack(this, 'DynamicContentFrontend', props);
    const backend = new BackendStack(this, 'DynamicContentBackend', props);

    // Expose backend properties
    this.cognitoUserPoolId = backend.cognitoUserPoolId;
    this.cognitoClientId = backend.cognitoClientId;
    this.cognitoDomain = backend.cognitoDomain;
    this.appSyncEndpoint = backend.appSyncEndpoint;

    // Create outputs at the parent stack level
    new cdk.CfnOutput(this, 'CognitoUserPoolID', {
      exportName: 'CognitoUserPoolID',
      value: backend.cognitoUserPoolId,
      description: 'Cognito User Pool ID',
    });

    new cdk.CfnOutput(this, 'CognitoClientID', {
      value: backend.cognitoClientId,
      description: 'Cognito Client ID',
    });

    new cdk.CfnOutput(this, 'CognitoDomain', {
      exportName: 'CognitoDomain',
      value: backend.cognitoDomain,
      description: 'Cognito Hosted UI Domain',
    });

    new cdk.CfnOutput(this, 'ProductTable', {
      exportName: 'ProductTable',
      value: backend.productTable.tableName,
      description: 'Product Table Name',
    });

    new cdk.CfnOutput(this, 'AppSyncAPIURL', {
      exportName: 'AppSyncAPIURL',
      value: backend.appSyncEndpoint,
      description: 'AppSync GraphQL API URL',
    });

    new cdk.CfnOutput(this, 'GraphQLEndpoint', {
      exportName: 'GraphQLEndpoint',
      value: backend.appSyncEndpoint,
      description: 'GraphQL Endpoint URL',
    });

    new cdk.CfnOutput(this, 'WebsiteBucketName', {
      exportName: `WebsiteBucketName`,
      value: frontend.bucketName,
      description: 'S3 bucket name for website hosting',
    });

    new cdk.CfnOutput(this, 'WebsiteURL', {
      exportName: `WebsiteURL`,
      value: `https://${frontend.distributionDomainName}`,
      description: 'CloudFront distribution URL',
    });
    new cdk.CfnOutput(this, 'DistributionID', {
      exportName: `DistributionID`,
      value: frontend.distributionId,
      description: 'CloudFront distribution ID',
    });
  }
}
