package com.product.repository;

import com.product.exception.ProductNotFoundException;
import com.product.model.Product;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.*;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

/**
 * DynamoDB implementation of ProductRepository.
 * Handles all DynamoDB operations for Product entities.
 */
public class DynamoDBProductRepository implements ProductRepository {
    
    private final DynamoDbClient dynamoDbClient;
    private final String tableName;
    
    public DynamoDBProductRepository(DynamoDbClient dynamoDbClient, String tableName) {
        this.dynamoDbClient = dynamoDbClient;
        this.tableName = tableName;
    }
    
    @Override
    public Product save(Product product) {
        try {
            // Generate UUID for new product
            String id = UUID.randomUUID().toString();
            String timestamp = Instant.now().toString();
            
            product.setId(id);
            product.setCreatedAt(timestamp);
            product.setUpdatedAt(timestamp);
            
            // Build item map
            Map<String, AttributeValue> item = new HashMap<>();
            item.put("id", AttributeValue.builder().s(id).build());
            item.put("name", AttributeValue.builder().s(product.getName()).build());
            item.put("price", AttributeValue.builder().n(String.valueOf(product.getPrice())).build());
            item.put("stockQuantity", AttributeValue.builder().n(String.valueOf(product.getStockQuantity())).build());
            item.put("createdAt", AttributeValue.builder().s(timestamp).build());
            item.put("updatedAt", AttributeValue.builder().s(timestamp).build());
            
            if (product.getDescription() != null) {
                item.put("description", AttributeValue.builder().s(product.getDescription()).build());
            }
            if (product.getCategory() != null) {
                item.put("category", AttributeValue.builder().s(product.getCategory()).build());
            }
            
            PutItemRequest request = PutItemRequest.builder()
                    .tableName(tableName)
                    .item(item)
                    .build();
            
            dynamoDbClient.putItem(request);
            
            return product;
        } catch (DynamoDbException e) {
            throw new RuntimeException("Failed to save product: " + e.getMessage(), e);
        }
    }
    
    @Override
    public Optional<Product> findById(String id) {
        try {
            Map<String, AttributeValue> key = new HashMap<>();
            key.put("id", AttributeValue.builder().s(id).build());
            
            GetItemRequest request = GetItemRequest.builder()
                    .tableName(tableName)
                    .key(key)
                    .build();
            
            GetItemResponse response = dynamoDbClient.getItem(request);
            
            if (!response.hasItem() || response.item().isEmpty()) {
                return Optional.empty();
            }
            
            return Optional.of(mapToProduct(response.item()));
        } catch (DynamoDbException e) {
            throw new RuntimeException("Failed to find product: " + e.getMessage(), e);
        }
    }
    
    @Override
    public List<Product> findAll() {
        try {
            ScanRequest request = ScanRequest.builder()
                    .tableName(tableName)
                    .build();
            
            ScanResponse response = dynamoDbClient.scan(request);
            
            List<Product> products = response.items().stream()
                    .map(this::mapToProduct)
                    .collect(Collectors.toList());
            
            // Sort by createdAt timestamp
            products.sort(Comparator.comparing(Product::getCreatedAt));
            
            return products;
        } catch (DynamoDbException e) {
            throw new RuntimeException("Failed to list products: " + e.getMessage(), e);
        }
    }
    
    @Override
    public Product update(Product product) {
        try {
            // Check if product exists
            Optional<Product> existing = findById(product.getId());
            if (existing.isEmpty()) {
                throw new ProductNotFoundException("Product not found with id: " + product.getId());
            }
            
            String timestamp = Instant.now().toString();
            product.setUpdatedAt(timestamp);
            
            // Build update expression - update all fields since product object has all values
            // Use expression attribute names for reserved keywords like "name"
            Map<String, String> expressionAttributeNames = new HashMap<>();
            Map<String, AttributeValue> expressionAttributeValues = new HashMap<>();
            List<String> updateExpressions = new ArrayList<>();
            
            // Always update these required fields
            // "name" is a reserved keyword in DynamoDB, so use expression attribute name
            updateExpressions.add("#name = :name");
            expressionAttributeNames.put("#name", "name");
            expressionAttributeValues.put(":name", AttributeValue.builder().s(product.getName()).build());
            
            updateExpressions.add("price = :price");
            expressionAttributeValues.put(":price", AttributeValue.builder().n(String.valueOf(product.getPrice())).build());
            
            updateExpressions.add("stockQuantity = :stockQuantity");
            expressionAttributeValues.put(":stockQuantity", AttributeValue.builder().n(String.valueOf(product.getStockQuantity())).build());
            
            updateExpressions.add("updatedAt = :updatedAt");
            expressionAttributeValues.put(":updatedAt", AttributeValue.builder().s(timestamp).build());
            
            // Optional fields
            if (product.getDescription() != null) {
                updateExpressions.add("description = :description");
                expressionAttributeValues.put(":description", AttributeValue.builder().s(product.getDescription()).build());
            }
            if (product.getCategory() != null) {
                updateExpressions.add("category = :category");
                expressionAttributeValues.put(":category", AttributeValue.builder().s(product.getCategory()).build());
            }
            
            String updateExpression = "SET " + String.join(", ", updateExpressions);
            
            Map<String, AttributeValue> key = new HashMap<>();
            key.put("id", AttributeValue.builder().s(product.getId()).build());
            
            UpdateItemRequest request = UpdateItemRequest.builder()
                    .tableName(tableName)
                    .key(key)
                    .updateExpression(updateExpression)
                    .expressionAttributeNames(expressionAttributeNames)
                    .expressionAttributeValues(expressionAttributeValues)
                    .returnValues(ReturnValue.ALL_NEW)
                    .build();
            
            UpdateItemResponse response = dynamoDbClient.updateItem(request);
            
            return mapToProduct(response.attributes());
        } catch (ProductNotFoundException e) {
            throw e;
        } catch (DynamoDbException e) {
            throw new RuntimeException("Failed to update product: " + e.getMessage(), e);
        }
    }
    
    @Override
    public boolean deleteById(String id) {
        try {
            Map<String, AttributeValue> key = new HashMap<>();
            key.put("id", AttributeValue.builder().s(id).build());
            
            DeleteItemRequest request = DeleteItemRequest.builder()
                    .tableName(tableName)
                    .key(key)
                    .returnValues(ReturnValue.ALL_OLD)
                    .build();
            
            DeleteItemResponse response = dynamoDbClient.deleteItem(request);
            
            // Return true if item was deleted (had attributes), false if not found
            return response.hasAttributes() && !response.attributes().isEmpty();
        } catch (DynamoDbException e) {
            throw new RuntimeException("Failed to delete product: " + e.getMessage(), e);
        }
    }
    
    /**
     * Maps DynamoDB item to Product object.
     */
    private Product mapToProduct(Map<String, AttributeValue> item) {
        Product product = new Product();
        
        product.setId(item.get("id").s());
        product.setName(item.get("name").s());
        product.setPrice(Double.parseDouble(item.get("price").n()));
        product.setStockQuantity(Integer.parseInt(item.get("stockQuantity").n()));
        product.setCreatedAt(item.get("createdAt").s());
        product.setUpdatedAt(item.get("updatedAt").s());
        
        if (item.containsKey("description") && item.get("description") != null) {
            product.setDescription(item.get("description").s());
        }
        if (item.containsKey("category") && item.get("category") != null) {
            product.setCategory(item.get("category").s());
        }
        
        return product;
    }

    // private void saveToDAXCache();
    // private Optional<Product> getFromDAXCache();
}
