import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as path from 'path';

export interface BackendStackProps extends cdk.StackProps {
  cloudFrontUrl?: string;
}

export class BackendStack extends cdk.NestedStack {
  public readonly cognitoUserPoolId: string;
  public readonly cognitoClientId: string;
  public readonly cognitoDomain: string;
  public readonly appSyncEndpoint: string;
  public readonly userPool: cdk.aws_cognito.UserPool;
  public readonly userPoolClient: cdk.aws_cognito.UserPoolClient;
  public readonly productTable: cdk.aws_dynamodb.Table;

  constructor(scope: Construct, id: string, props?: BackendStackProps) {
    super(scope, id, props);

    // Cognito User Pool for authentication with hosted UI
    const cognito = new cdk.aws_cognito.UserPool(this, "UserPool", {
      selfSignUpEnabled: true,
      signInCaseSensitive: false,
      signInAliases: {
        username: true,
        email: true,
      },
      autoVerify: {
        email: true,
      },
      standardAttributes: {
        email: {
          required: true,
          mutable: true,
        },
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true,
      },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Cognito User Pool Domain for hosted UI
    const cognitoDomain = cognito.addDomain('CognitoDomain', {
      cognitoDomain: {
        domainPrefix: `products-app-${this.account}`,
      },
      managedLoginVersion: cdk.aws_cognito.ManagedLoginVersion.NEWER_MANAGED_LOGIN,
    });
    
    // Cognito User Pool Client with OAuth configuration
    const callbackUrls = [
      'http://localhost:4200',
      'http://localhost:4200/',
      'http://localhost:4200/login',
    ];
    
    const logoutUrls = [
      'http://localhost:4200',
      'http://localhost:4200/',
      'http://localhost:4200/login',
    ];

    // Add CloudFront URL if provided (will be available after frontend stack is created)
    if (props?.cloudFrontUrl) {
      callbackUrls.push(
        props.cloudFrontUrl, 
        `${props.cloudFrontUrl}/`,
        `${props.cloudFrontUrl}/login`
      );
      logoutUrls.push(
        props.cloudFrontUrl, 
        `${props.cloudFrontUrl}/`,
        `${props.cloudFrontUrl}/login`
      );
    }

    const cognitoClient = cognito.addClient("Client", {
      oAuth: {
        flows: {
          authorizationCodeGrant: true,
        },
        scopes: [
          cdk.aws_cognito.OAuthScope.EMAIL,
          cdk.aws_cognito.OAuthScope.OPENID,
          cdk.aws_cognito.OAuthScope.PROFILE,
        ],
        callbackUrls,
        logoutUrls,
      },
      authFlows: {
        userPassword: true,
        userSrp: true,
      },
      generateSecret: false,
    });
    new cdk.aws_cognito.CfnManagedLoginBranding(this, 'ManagedLoginBranding', {
      userPoolId: cognito.userPoolId,
      clientId: cognitoClient.userPoolClientId,
      useCognitoProvidedValues: true,
    });

    // DynamoDB table for product storage
    this.productTable = new cdk.aws_dynamodb.Table(this, "Table", {
      partitionKey: {
          name: 'id',
          type: cdk.aws_dynamodb.AttributeType.STRING
      },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // CloudWatch Log Group for Lambda with retention policy
    const lambdaLogGroup = new cdk.aws_logs.LogGroup(this, 'ProductLambdaLogGroup', {
      logGroupName: '/aws/lambda/ProductHandler',
      retention: cdk.aws_logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Java Lambda function for product operations
    // Supports two deployment modes:
    // 1. Pre-built JAR (faster for local development): Use target/product-api-1.0.0.jar if it exists
    // 2. CDK bundling (for CI/CD): Builds JAR using Maven in Docker container
    const javaProjectPath = path.join(__dirname, '../../src/backend/java');
    const preBuiltJarPath = path.join(javaProjectPath, 'target/product-api-1.0.0.jar');
    
    let lambdaCode: cdk.aws_lambda.Code;
    const fs = require('fs');
    
    if (fs.existsSync(preBuiltJarPath)) {
      // Use pre-built JAR for faster deployment (run ./build.sh first)
      console.log('Using pre-built JAR from target/product-api-1.0.0.jar');
      lambdaCode = cdk.aws_lambda.Code.fromAsset(preBuiltJarPath);
    } else {
      // Use CDK bundling to build JAR (slower but works in CI/CD)
      console.log('Pre-built JAR not found, using CDK bundling (this will take longer)');
      lambdaCode = cdk.aws_lambda.Code.fromAsset(javaProjectPath, {
        bundling: {
          image: cdk.aws_lambda.Runtime.JAVA_17.bundlingImage,
          command: [
            '/bin/sh',
            '-c',
            'mvn clean package && cp target/product-api-1.0.0.jar /asset-output/function.jar'
          ],
          user: 'root',
        },
      });
    }
    
    const productLambda = new cdk.aws_lambda.Function(this, 'ProductHandler', {
      runtime: cdk.aws_lambda.Runtime.JAVA_17,
      handler: 'com.product.handler.ProductHandler::handleRequest',
      code: lambdaCode,
      memorySize: 1024,
      timeout: cdk.Duration.seconds(30),
      environment: {
        TABLE_NAME: this.productTable.tableName,
      },
      logGroup: lambdaLogGroup,
      snapStart: cdk.aws_lambda.SnapStartConf.ON_PUBLISHED_VERSIONS,
    });

    // Grant Lambda read/write permissions to DynamoDB table
    this.productTable.grantReadWriteData(productLambda);

    // AppSync GraphQL API with Cognito authorization
    // Subscriptions are enabled by default and use the same authorization as mutations
    // The @aws_subscribe directive in schema.graphql automatically creates subscription resolvers
    const api = new cdk.aws_appsync.GraphqlApi(this, "API", {
      name: "ProductAPI",
      definition: cdk.aws_appsync.Definition.fromFile('./src/backend/schema.graphql'),
      authorizationConfig: {
        defaultAuthorization: {
          authorizationType: cdk.aws_appsync.AuthorizationType.USER_POOL,
          userPoolConfig: {
            userPool: cognito,
          },
        },
      },
      logConfig: {
        fieldLogLevel: cdk.aws_appsync.FieldLogLevel.ERROR,
      },
      xrayEnabled: true, // Enable X-Ray tracing for debugging subscription connections
    });
    
    // Apply removal policy to AppSync API
    (api.node.defaultChild as cdk.aws_appsync.CfnGraphQLApi).applyRemovalPolicy(cdk.RemovalPolicy.DESTROY);

    // Lambda data source in AppSync
    const lambdaDataSource = api.addLambdaDataSource('ProductLambdaDataSource', productLambda);

    // Create AppSync resolvers for all GraphQL operations
    // Note: Subscription resolvers (onCreateProduct, onUpdateProduct, onDeleteProduct) 
    // are automatically created by AppSync using the @aws_subscribe directive in the schema.
    // They inherit the same Cognito authorization as their corresponding mutations.
    
    // Query: getProduct
    lambdaDataSource.createResolver('GetProductResolver', {
      typeName: 'Query',
      fieldName: 'getProduct',
    });

    // Query: listProducts
    lambdaDataSource.createResolver('ListProductsResolver', {
      typeName: 'Query',
      fieldName: 'listProducts',
    });

    // Mutation: createProduct
    lambdaDataSource.createResolver('CreateProductResolver', {
      typeName: 'Mutation',
      fieldName: 'createProduct',
    });

    // Mutation: updateProduct
    lambdaDataSource.createResolver('UpdateProductResolver', {
      typeName: 'Mutation',
      fieldName: 'updateProduct',
    });

    // Mutation: deleteProduct
    lambdaDataSource.createResolver('DeleteProductResolver', {
      typeName: 'Mutation',
      fieldName: 'deleteProduct',
    });

    // Set public properties for cross-stack references
    this.userPool = cognito;
    this.userPoolClient = cognitoClient;
    this.cognitoUserPoolId = cognito.userPoolId;
    this.cognitoClientId = cognitoClient.userPoolClientId;
    this.cognitoDomain = `${cognitoDomain.domainName}.auth.${this.region}.amazoncognito.com`;
    this.appSyncEndpoint = api.graphqlUrl;
  }
}
