package main

import (
	"os"

	"github.com/aws/aws-cdk-go/awscdk"
	"github.com/aws/aws-cdk-go/awscdk/awsapigatewayv2"
	"github.com/aws/aws-cdk-go/awscdk/awsapigatewayv2integrations"
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
	lambdaProxyIntegration := awsapigatewayv2integrations.NewLambdaProxyIntegration(&awsapigatewayv2integrations.LambdaProxyIntegrationProps{
		Handler:              productsApiFunction,
		PayloadFormatVersion: awsapigatewayv2.PayloadFormatVersion_VERSION_2_0(),
	})
	httpApi.AddRoutes(&awsapigatewayv2.AddRoutesOptions{
		Path:        jsii.String("/products"),
		Methods:     &[]awsapigatewayv2.HttpMethod{"POST"},
		Integration: lambdaProxyIntegration,
	})
	httpApi.AddRoutes(&awsapigatewayv2.AddRoutesOptions{
		Path:        jsii.String("/products/{productId}"),
		Methods:     &[]awsapigatewayv2.HttpMethod{"PUT", "GET", "DELETE"},
		Integration: lambdaProxyIntegration,
	})

	// Outputs
	awscdk.NewCfnOutput(stack, jsii.String("ProductsApiUrl"), &awscdk.CfnOutputProps{
		Value: httpApi.Url(),
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
