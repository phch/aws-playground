import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

export interface ApiStackProps extends cdk.StackProps {
  environment: string;
  userPool: cognito.UserPool;
  bucket: s3.Bucket;
}

export class ApiStack extends cdk.Stack {
  public readonly api: apigateway.RestApi;

  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    // Create IAM Role for API to access S3 and STS
    const apiRole = new iam.Role(this, 'ApiRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
    });

    // Grant S3 permissions
    props.bucket.grantReadWrite(apiRole);

    // Grant STS permissions for generating temporary credentials
    apiRole.addToPolicy(new iam.PolicyStatement({
      actions: [
        'sts:GetFederationToken',
        'sts:AssumeRole',
      ],
      resources: ['*'],
    }));

    // Grant IAM permissions for managing user access keys
    apiRole.addToPolicy(new iam.PolicyStatement({
      actions: [
        'iam:CreateAccessKey',
        'iam:DeleteAccessKey',
        'iam:ListAccessKeys',
        'iam:UpdateAccessKey',
        'iam:CreateUser',
        'iam:GetUser',
        'iam:PutUserPolicy',
      ],
      resources: [
        `arn:aws:iam::${this.account}:user/s3-user-*`,
      ],
    }));

    // Create API Gateway with Cognito Authorizer
    this.api = new apigateway.RestApi(this, 'Api', {
      restApiName: `s3-storage-api-${props.environment}`,
      description: 'API for S3 Storage Browser',
      deployOptions: {
        stageName: props.environment,
        throttlingRateLimit: 100,
        throttlingBurstLimit: 200,
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: props.environment !== 'prod',
        metricsEnabled: true,
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS, // Restrict in production
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: [
          'Content-Type',
          'X-Amz-Date',
          'Authorization',
          'X-Api-Key',
          'X-Amz-Security-Token',
        ],
      },
    });

    // Create Cognito Authorizer
    const authorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'CognitoAuthorizer', {
      cognitoUserPools: [props.userPool],
      identitySource: 'method.request.header.Authorization',
    });

    // Note: In production, you would create Lambda functions for each endpoint
    // and integrate them with API Gateway. This is a placeholder structure.

    // Example: Auth endpoints
    const authResource = this.api.root.addResource('api').addResource('auth');
    
    // Login endpoint (no auth required)
    authResource.addResource('login').addMethod('POST');
    
    // Register endpoint (no auth required)
    authResource.addResource('register').addMethod('POST');

    // Protected endpoints (require auth)
    const s3Resource = this.api.root.getResource('api')!.addResource('s3');
    s3Resource.addMethod('GET', undefined, {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // Outputs
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: this.api.url,
      description: 'API Gateway URL',
      exportName: `${props.environment}-ApiUrl`,
    });

    new cdk.CfnOutput(this, 'ApiId', {
      value: this.api.restApiId,
      description: 'API Gateway ID',
      exportName: `${props.environment}-ApiId`,
    });
  }
}
