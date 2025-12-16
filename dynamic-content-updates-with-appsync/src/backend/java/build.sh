#!/bin/bash

# Build script for Java Lambda function
# This script packages the Lambda function with all dependencies

set -e

echo "Building Java Lambda function..."
echo "================================"

# Navigate to the Java project directory
cd "$(dirname "$0")"

# Clean and package with Maven
echo "Running Maven clean package..."
mvn clean package

# Check if build was successful
if [ $? -eq 0 ]; then
    echo ""
    echo "Build successful!"
    echo "================================"
    echo "JAR location: target/product-api-1.0.0.jar"
    
    # Display JAR size
    JAR_SIZE=$(ls -lh target/product-api-1.0.0.jar | awk '{print $5}')
    echo "JAR size: $JAR_SIZE"
    
    # Verify size is under 50MB
    JAR_SIZE_BYTES=$(stat -f%z target/product-api-1.0.0.jar 2>/dev/null || stat -c%s target/product-api-1.0.0.jar 2>/dev/null)
    MAX_SIZE=$((50 * 1024 * 1024))  # 50MB in bytes
    
    if [ $JAR_SIZE_BYTES -lt $MAX_SIZE ]; then
        echo "✓ JAR size is under 50MB limit for ZIP deployment"
    else
        echo "⚠ WARNING: JAR size exceeds 50MB limit!"
        exit 1
    fi
    
    echo ""
    echo "To deploy with CDK, run: npm run cdk deploy"
else
    echo "Build failed!"
    exit 1
fi
