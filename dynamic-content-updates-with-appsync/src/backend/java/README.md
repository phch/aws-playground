# Product API Lambda - Java Implementation

This directory contains the Java Lambda function that handles CRUD operations for products through AWS AppSync GraphQL API.

## Prerequisites

- Java 17 or higher
- Maven 3.6 or higher
- AWS CDK (for deployment)

## Project Structure

```
src/backend/java/
├── pom.xml                          # Maven configuration
├── build.sh                         # Build script
├── README.md                        # This file
└── src/
    └── main/
        └── java/
            └── com/
                └── product/
                    ├── handler/     # Lambda entry point
                    ├── model/       # Domain models and DTOs
                    ├── service/     # Business logic
                    ├── repository/  # Data access layer
                    ├── exception/   # Custom exceptions
                    └── util/        # Utility classes
```

## Building the Lambda Function

### Option 1: Using the Build Script (Recommended)

```bash
./build.sh
```

This script will:
- Clean previous builds
- Compile the Java code
- Package dependencies into a single JAR
- Verify the JAR size is under 50MB
- Display build information

### Option 2: Using Maven Directly

```bash
mvn clean package
```

The shaded JAR will be created at: `target/product-api-1.0.0.jar`

## Deployment

### Fast Deployment (Local Development)

1. Build the JAR first:
   ```bash
   ./build.sh
   ```

2. Deploy with CDK (from project root):
   ```bash
   npm run cdk deploy
   ```

CDK will detect the pre-built JAR and use it directly, making deployment much faster.

### CI/CD Deployment

If no pre-built JAR exists, CDK will automatically build it using Docker bundling. This is slower but works in CI/CD environments without requiring Maven to be installed.

## JAR Size Verification

The build script automatically verifies that the JAR size is under 50MB (required for ZIP deployment with SnapStart).

Current JAR size: ~13MB (well under the limit)

## Lambda Configuration

- **Runtime**: Java 17
- **Handler**: `com.product.handler.ProductHandler::handleRequest`
- **Memory**: 1024 MB
- **Timeout**: 30 seconds
- **SnapStart**: Enabled (reduces cold start from ~10s to ~1s)
- **Deployment**: ZIP package (not containerized)

## Environment Variables

The Lambda function requires the following environment variables (automatically set by CDK):

- `TABLE_NAME`: DynamoDB table name for product storage
- `AWS_REGION`: AWS region (automatically available)

## Testing

Run unit tests:
```bash
mvn test
```

## Dependencies

Key dependencies included in the shaded JAR:

- AWS Lambda Java Core (1.2.3)
- AWS SDK for Java v2 - DynamoDB (2.20.0)
- Jackson for JSON serialization (2.15.2)
- JUnit 5 and Mockito (test only)

## Performance Optimization

- **SnapStart**: Enabled for sub-second cold starts
- **Connection Pooling**: DynamoDB client is reused across invocations
- **AWS SDK v2**: Better performance than v1
- **Minimal Dependencies**: Keeps package size small

## Troubleshooting

### Build Fails

Ensure you have Java 17 and Maven installed:
```bash
java -version
mvn -version
```

### JAR Too Large

If the JAR exceeds 50MB, review dependencies in `pom.xml` and remove unnecessary ones.

### Deployment Issues

If CDK deployment fails, try cleaning and rebuilding:
```bash
rm -rf target/
./build.sh
```

## Architecture

This Lambda function follows a layered architecture:

1. **Handler Layer**: Receives AppSync events and routes to service layer
2. **Service Layer**: Contains business logic and orchestration
3. **Repository Layer**: Abstracts data access to DynamoDB
4. **Model Layer**: Domain objects and DTOs
5. **Utility Layer**: Validation and helper functions

For more details, see the design document at `.kiro/specs/java-product-api/design.md`
