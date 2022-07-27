package main

import (
	"os"

	"github.com/aws/aws-cdk-go/awscdk"
	"github.com/aws/aws-cdk-go/awscdk/awsapigatewayv2"
	"github.com/aws/aws-cdk-go/awscdk/awsapigatewayv2authorizers"
	"github.com/aws/aws-cdk-go/awscdk/awsapigatewayv2integrations"
	"github.com/aws/aws-cdk-go/awscdk/awscognito"
	"github.com/aws/aws-cdk-go/awscdk/awsdynamodb"
	"github.com/aws/aws-cdk-go/awscdk/awslambda"
	"github.com/aws/aws-cdk-go/awscdk/awss3assets"
	"github.com/aws/constructs-go/constructs/v3"
	"github.com/aws/jsii-runtime-go"
)

type AuthenticatedApisStackProps struct {
	awscdk.StackProps
}

func NewAuthenticatedApisStack(scope constructs.Construct, id string, props *AuthenticatedApisStackProps) awscdk.Stack {
	var sprops awscdk.StackProps
	if props != nil {
		sprops = props.StackProps
	}
	stack := awscdk.NewStack(scope, &id, &sprops)

	// The code that defines your stack goes here
	productsTable := awsdynamodb.NewTable(stack, jsii.String("ProductsTable"), &awsdynamodb.TableProps{
		PartitionKey:  &awsdynamodb.Attribute{Name: jsii.String("id"), Type: awsdynamodb.AttributeType_STRING},
		BillingMode:   awsdynamodb.BillingMode_PAY_PER_REQUEST,
		RemovalPolicy: awscdk.RemovalPolicy_DESTROY,
	})

	productsApiFunction := awslambda.NewFunction(stack, jsii.String("ProductsBackend"), &awslambda.FunctionProps{
		Runtime: awslambda.Runtime_NODEJS_14_X(),
		Code:    awslambda.AssetCode_FromAsset(jsii.String("lambda/api/products/function.zip"), &awss3assets.AssetOptions{}),
		Handler: jsii.String("products.handler"),
		Environment: &map[string]*string{
			"PRODUCTS_TABLE": productsTable.TableName(),
		},
	})
	productsTable.GrantReadWriteData(productsApiFunction)

	httpApi := awsapigatewayv2.NewHttpApi(stack, jsii.String("ProductsApi"), &awsapigatewayv2.HttpApiProps{
		CreateDefaultStage: jsii.Bool(true),
	})
	lambdaProxyIntegration := awsapigatewayv2integrations.NewHttpLambdaIntegration(
		jsii.String("HttpLambdaIntegration"),
		productsApiFunction,
		&awsapigatewayv2integrations.HttpLambdaIntegrationProps{
			PayloadFormatVersion: awsapigatewayv2.PayloadFormatVersion_VERSION_2_0(),
		},
	)

	pool := awscognito.NewUserPool(stack, jsii.String("Pool"), &awscognito.UserPoolProps{
		SelfSignUpEnabled: jsii.Bool(true),
		SignInAliases: &awscognito.SignInAliases{
			Username: jsii.Bool(true),
			Email:    jsii.Bool(true),
		},
		AutoVerify: &awscognito.AutoVerifiedAttrs{
			Email: jsii.Bool(true),
		},
		StandardAttributes: &awscognito.StandardAttributes{
			Email: &awscognito.StandardAttribute{
				Required: jsii.Bool(true),
			},
		},
	})
	domain := pool.AddDomain(jsii.String("Domain"), &awscognito.UserPoolDomainOptions{
		CognitoDomain: &awscognito.CognitoDomainOptions{
			DomainPrefix: jsii.String("authenticated-apis-app"),
		},
	})
	productReadOnlyScope := awscognito.NewResourceServerScope(&awscognito.ResourceServerScopeProps{
		ScopeName:        jsii.String("products:read"),
		ScopeDescription: jsii.String("Retrieve product information"),
	})
	productFullAccessScope := awscognito.NewResourceServerScope(&awscognito.ResourceServerScopeProps{
		ScopeName:        jsii.String("products:*"),
		ScopeDescription: jsii.String("Create, retrieve, modify, delete production information"),
	})
	resourceServer := pool.AddResourceServer(jsii.String("BackendApi"), &awscognito.UserPoolResourceServerOptions{
		Identifier: jsii.String("com.example.api.backend"),
		Scopes:     &[]awscognito.ResourceServerScope{productReadOnlyScope, productFullAccessScope},
	})
	readOnlyClient := pool.AddClient(jsii.String("ProductsReadOnlyApiClient"), &awscognito.UserPoolClientOptions{
		OAuth: &awscognito.OAuthSettings{
			CallbackUrls: jsii.Strings(*domain.BaseUrl(&awscognito.BaseUrlOptions{})),
			Flows: &awscognito.OAuthFlows{
				// https://aws.amazon.com/premiumsupport/knowledge-center/cognito-custom-scopes-api-gateway/
				ImplicitCodeGrant: jsii.Bool(true),
			},
			Scopes: &[]awscognito.OAuthScope{
				awscognito.OAuthScope_ResourceServer(resourceServer, productReadOnlyScope),
				awscognito.OAuthScope_OPENID(),
			},
		},
	})
	fullAccessClient := pool.AddClient(jsii.String("ProductsFullAccessApiClient"), &awscognito.UserPoolClientOptions{
		OAuth: &awscognito.OAuthSettings{
			CallbackUrls: jsii.Strings(*domain.BaseUrl(&awscognito.BaseUrlOptions{})),
			Flows: &awscognito.OAuthFlows{
				// https://aws.amazon.com/premiumsupport/knowledge-center/cognito-custom-scopes-api-gateway/
				ImplicitCodeGrant: jsii.Bool(true),
			},
			Scopes: &[]awscognito.OAuthScope{
				awscognito.OAuthScope_ResourceServer(resourceServer, productFullAccessScope),
				awscognito.OAuthScope_OPENID(),
			},
		},
	})
	authorizer := awsapigatewayv2authorizers.NewHttpUserPoolAuthorizer(
		jsii.String("PoolAuthorizer"),
		pool,
		&awsapigatewayv2authorizers.HttpUserPoolAuthorizerProps{
			UserPoolClients: &[]awscognito.IUserPoolClient{readOnlyClient, fullAccessClient},
		},
	)
	httpApi.AddRoutes(&awsapigatewayv2.AddRoutesOptions{
		Path:        jsii.String("/products"),
		Methods:     &[]awsapigatewayv2.HttpMethod{"POST"},
		Integration: lambdaProxyIntegration,
		Authorizer:  authorizer,
		AuthorizationScopes: jsii.Strings(
			*resourceServer.UserPoolResourceServerId() + "/products:*",
		),
	})
	httpApi.AddRoutes(&awsapigatewayv2.AddRoutesOptions{
		Path:        jsii.String("/products/{productId}"),
		Methods:     &[]awsapigatewayv2.HttpMethod{"PUT", "DELETE"},
		Integration: lambdaProxyIntegration,
		Authorizer:  authorizer,
		AuthorizationScopes: jsii.Strings(
			*resourceServer.UserPoolResourceServerId() + "/products:*",
		),
	})
	httpApi.AddRoutes(&awsapigatewayv2.AddRoutesOptions{
		Path:        jsii.String("/products/{productId}"),
		Methods:     &[]awsapigatewayv2.HttpMethod{"GET"},
		Integration: lambdaProxyIntegration,
		Authorizer:  authorizer,
		AuthorizationScopes: jsii.Strings(
			*resourceServer.UserPoolResourceServerId()+"/products:*",
			*resourceServer.UserPoolResourceServerId()+"/products:read",
		),
	})

	// Outputs
	awscdk.NewCfnOutput(stack, jsii.String("ProductsApiUrl"), &awscdk.CfnOutputProps{
		Value: httpApi.Url(),
	})
	awscdk.NewCfnOutput(stack, jsii.String("ProductsReadOnlyCognitoSignInUrl"), &awscdk.CfnOutputProps{
		Value: domain.SignInUrl(readOnlyClient, &awscognito.SignInUrlOptions{
			RedirectUri: domain.BaseUrl(&awscognito.BaseUrlOptions{}),
		}),
	})
	awscdk.NewCfnOutput(stack, jsii.String("ProductsFullAccessCognitoSignInUrl"), &awscdk.CfnOutputProps{
		Value: domain.SignInUrl(fullAccessClient, &awscognito.SignInUrlOptions{
			RedirectUri: domain.BaseUrl(&awscognito.BaseUrlOptions{}),
		}),
	})

	return stack
}

func main() {
	app := awscdk.NewApp(nil)

	NewAuthenticatedApisStack(app, "AuthenticatedApisStack", &AuthenticatedApisStackProps{
		awscdk.StackProps{
			Env: env(),
		},
	})

	app.Synth(nil)
}

// env determines the AWS environment (account+region) in which our stack is to
// be deployed. For more information see: https://docs.aws.amazon.com/cdk/latest/guide/environments.html
func env() *awscdk.Environment {
	return &awscdk.Environment{
		Account: jsii.String(os.Getenv("CDK_DEFAULT_ACCOUNT")),
		Region:  jsii.String(os.Getenv("CDK_DEFAULT_REGION")),
	}
}
