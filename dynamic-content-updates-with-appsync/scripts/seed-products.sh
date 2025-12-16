#!/bin/bash

# Seed Products Script
# Generates and loads 100 deterministic products into DynamoDB table
# This script is idempotent - running it multiple times will produce the same results

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Product Seeding Script ===${NC}"

# Get stack name from CDK output or use default
STACK_NAME="DynamicUpdatesWithAppsyncStack"

echo "Fetching stack outputs..."
STACK_OUTPUTS=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --query 'Stacks[0].Outputs' --output json 2>/dev/null)

TABLE_NAME=$(echo "$STACK_OUTPUTS" | jq -r '.[] | select(.OutputKey=="ProductTable") | .OutputValue')

if [ -z "$TABLE_NAME" ]; then
    echo -e "${RED}Error: Could not find DynamoDB table${NC}"
    exit 1
fi

echo -e "${GREEN}Found DynamoDB table: $TABLE_NAME${NC}"

# Setup Python virtual environment with boto3
echo -e "${YELLOW}Setting up Python environment...${NC}"
VENV_DIR=".venv-seed"

# Create virtual environment if it doesn't exist
if [ ! -d "$VENV_DIR" ]; then
    echo "Creating virtual environment..."
    python -m venv "$VENV_DIR"
fi

# Activate virtual environment
source "$VENV_DIR/bin/activate"

# Install boto3 if not already installed
if ! python -c "import boto3" 2>/dev/null; then
    echo "Installing boto3..."
    pip install -q boto3
fi

echo -e "${GREEN}Python environment ready${NC}"

# Clear existing data
echo -e "${YELLOW}Clearing existing data from table...${NC}"
python - <<PYTHON_CLEAR
import boto3
import sys

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('$TABLE_NAME')

try:
    # Scan and delete all items
    scan_kwargs = {
        'ProjectionExpression': 'id'
    }
    
    deleted_count = 0
    
    while True:
        response = table.scan(**scan_kwargs)
        items = response.get('Items', [])
        
        if not items:
            break
        
        # Delete items in batches
        with table.batch_writer() as batch:
            for item in items:
                batch.delete_item(Key={'id': item['id']})
                deleted_count += 1
        
        # Check if there are more items to scan
        if 'LastEvaluatedKey' not in response:
            break
        
        scan_kwargs['ExclusiveStartKey'] = response['LastEvaluatedKey']
    
    print(f"Deleted {deleted_count} existing items")
    
except Exception as e:
    print(f"Error clearing table: {e}", file=sys.stderr)
    sys.exit(1)
PYTHON_CLEAR

if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to clear table${NC}"
    exit 1
fi

echo -e "${GREEN}Table cleared successfully${NC}"

# Generate and load 100 deterministic products
echo -e "${YELLOW}Generating and loading 100 deterministic products...${NC}"

python - <<PYTHON_SEED
import boto3
import datetime 
from decimal import Decimal

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('$TABLE_NAME')

# Categories for products
CATEGORIES = [
    "Electronics", "Clothing", "Books", "Home & Garden", "Sports",
    "Toys", "Food & Beverage", "Health & Beauty", "Automotive", "Office Supplies"
]

# Product name templates
PRODUCT_TEMPLATES = [
    "Premium", "Deluxe", "Professional", "Standard", "Basic",
    "Ultra", "Super", "Mega", "Advanced", "Classic",
    "Modern", "Vintage", "Eco-Friendly", "Smart", "Wireless",
    "Portable", "Compact", "Heavy-Duty", "Lightweight", "Ergonomic"
]

PRODUCT_TYPES = [
    "Widget", "Gadget", "Tool", "Device", "Kit",
    "Set", "Bundle", "Pack", "System", "Solution"
]

def generate_product(index):
    """Generate a deterministic product based on index"""
    # Use index to deterministically select attributes
    name_idx = index % len(PRODUCT_TEMPLATES)
    type_idx = index % len(PRODUCT_TYPES)
    category_idx = index % len(CATEGORIES)
    
    name = f"{PRODUCT_TEMPLATES[name_idx]} {PRODUCT_TYPES[type_idx]} {index}"
    category = CATEGORIES[category_idx]
    
    # Generate deterministic price (between \$10 and \$999)
    price = Decimal(str(round(10 + ((index * 7.89) % 989), 2)))
    
    # Generate deterministic stock (between 0 and 500)
    stock = (index * 13) % 501
    
    # Generate deterministic ID (padded to ensure consistent sorting)
    product_id = f"P-{index:010d}"
    
    # Generate description
    description = f"High-quality {name} perfect for everyday use. Item #{index}."
    
    # Current timestamp in ISO format (matching Java's Instant.now().toString())
    # Use replace to remove microseconds timezone info and add Z
    timestamp = datetime.datetime.now(datetime.UTC).replace(tzinfo=None).isoformat() + "Z"
    
    return {
        'id': product_id,
        'name': name,
        'description': description,
        'price': price,
        'category': category,
        'stockQuantity': stock,
        'createdAt': timestamp,
        'updatedAt': timestamp
    }

# Generate all 100 products
products = [generate_product(i) for i in range(1, 101)]

# Write in batches of 25 (DynamoDB limit)
batch_size = 25
total_written = 0

for i in range(0, len(products), batch_size):
    batch = products[i:i + batch_size]
    
    with table.batch_writer() as writer:
        for product in batch:
            writer.put_item(Item=product)
            total_written += 1
    
    print(f"Written {total_written}/{len(products)} products...")

print(f"\nSuccessfully loaded {total_written} products into table: $TABLE_NAME")
PYTHON_SEED

if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to seed products${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}=== Seeding Complete ===${NC}"
echo ""
echo "You can verify the data with:"
echo "  aws dynamodb scan --table-name $TABLE_NAME --select COUNT"

# Deactivate virtual environment
deactivate
