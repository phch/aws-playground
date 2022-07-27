# Overview

This project is a sample to learn how to implement an HTTP API using Amazon API Gateway. OAuth 2.0 is used to restrict access to the APIs.

**NOTICE**: Go support is still in Developer Preview. This implies that APIs may
change while we address early feedback from the community. We would love to hear
about your experience through GitHub issues.

## Steps to Run

1. Run `cdk deploy` to deploy the application to your AWS account.
2. Visit the exported URLs for ProductsFullAccessCognitoSignInUrl to create a user. You will need to register and verify your user via email.
3. Sign in with the user, can you'll be redirected to a new website. Copy the web address and copy the query parameters value for the access token.
4. Open Postman and import the collection defined in the resources/ folder of this repository.
5. On the Postman collection variables, specify ACCESS_TOKEN (value from Step 2) and API_URL (CloudFormation output from Step 1).
6. Execute the API for creating a product first. You can set the PRODUCT_URL from the response header. Try the other API functions and notice how they will execute successfully.
7. Now, visit the exported URL for ProductsReadOnlyCognitoSignInUrl. Sign in, then copy the web address and copy the query parameters value for the access token. Try GetProduct and notice how it executes successfully. Try other API functions and notice the 403 Forbidden response due to insufficient scope.

## Helpful resources

 * Signing up users in Cognito: https://docs.aws.amazon.com/cognito/latest/developerguide/signing-up-users-in-your-app.html
 * Handling custom scopes in API Gateway: https://aws.amazon.com/premiumsupport/knowledge-center/cognito-custom-scopes-api-gateway/

## Useful commands

 * `cdk deploy`      deploy this stack to your default AWS account/region
 * `cdk diff`        compare deployed stack with current state
 * `cdk synth`       emits the synthesized CloudFormation template
 * `go test`         run unit tests
