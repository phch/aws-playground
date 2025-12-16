package com.product.handler;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestHandler;
import com.amazonaws.services.lambda.runtime.LambdaLogger;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.product.exception.ProductNotFoundException;
import com.product.exception.ValidationException;
import com.product.model.CreateProductInput;
import com.product.model.DeleteProductResponse;
import com.product.model.Product;
import com.product.model.UpdateProductInput;
import com.product.repository.DynamoDBProductRepository;
import com.product.repository.ProductRepository;
import com.product.service.ProductService;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Lambda handler for Product API operations.
 * Processes AppSync GraphQL requests and routes them to appropriate service methods.
 */
public class ProductHandler implements RequestHandler<Map<String, Object>, Object> {
    
    private final ProductService productService;
    private final ObjectMapper objectMapper;
    
    /**
     * Constructor for dependency injection (used in tests)
     */
    public ProductHandler(ProductService productService) {
        this.productService = productService;
        this.objectMapper = new ObjectMapper();
    }
    
    /**
     * Default constructor for Lambda runtime
     */
    public ProductHandler() {
        String tableName = System.getenv("TABLE_NAME");
        if (tableName == null || tableName.isEmpty()) {
            throw new IllegalStateException("TABLE_NAME environment variable is required");
        }
        
        DynamoDbClient dynamoDbClient = DynamoDbClient.builder().build();
        ProductRepository repository = new DynamoDBProductRepository(dynamoDbClient, tableName);
        this.productService = new ProductService(repository);
        this.objectMapper = new ObjectMapper();
    }

    @Override
    public Object handleRequest(Map<String, Object> event, Context context) {
        LambdaLogger logger = context.getLogger();
        
        try {
            // Log incoming event for debugging
            logger.log("Received event: " + objectMapper.writeValueAsString(event));
            
            // Extract field name from AppSync event
            Map<String, Object> info = (Map<String, Object>) event.get("info");
            if (info == null) {
                throw new IllegalArgumentException("Missing 'info' field in event");
            }
            
            String fieldName = (String) info.get("fieldName");
            if (fieldName == null) {
                throw new IllegalArgumentException("Missing 'fieldName' in event info");
            }
            
            // Extract arguments
            Map<String, Object> arguments = (Map<String, Object>) event.get("arguments");
            
            // Extract identity for audit logging
            Map<String, Object> identity = (Map<String, Object>) event.get("identity");
            if (identity != null) {
                String username = (String) identity.get("username");
                String sub = (String) identity.get("sub");
                logger.log("Request from user: " + username + " (sub: " + sub + ")");
            }
            
            // Route to appropriate handler method
            logger.log("Routing to handler: " + fieldName);
            Object result = routeRequest(fieldName, arguments, logger);
            
            // Log the result for debugging
            logger.log("Handler result: " + objectMapper.writeValueAsString(result));
            
            return result;
            
        } catch (ProductNotFoundException e) {
            logger.log("Product not found: " + e.getMessage());
            throw new RuntimeException("NOT_FOUND: " + e.getMessage());
        } catch (ValidationException e) {
            logger.log("Validation error: " + e.getMessage());
            throw new RuntimeException("VALIDATION_ERROR: " + e.getMessage());
        } catch (Exception e) {
            logger.log("Unexpected error: " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("SERVICE_ERROR: " + e.getMessage(), e);
        }
    }
    
    /**
     * Routes the request to the appropriate service method based on field name
     */
    private Object routeRequest(String fieldName, Map<String, Object> arguments, LambdaLogger logger) {
        switch (fieldName) {
            case "createProduct":
                return handleCreateProduct(arguments, logger);
            case "getProduct":
                return handleGetProduct(arguments, logger);
            case "listProducts":
                return handleListProducts(logger);
            case "updateProduct":
                return handleUpdateProduct(arguments, logger);
            case "deleteProduct":
                return handleDeleteProduct(arguments, logger);
            default:
                throw new IllegalArgumentException("Unknown field name: " + fieldName);
        }
    }

    /**
     * Handles createProduct mutation
     */
    private Product handleCreateProduct(Map<String, Object> arguments, LambdaLogger logger) {
        logger.log("Handling createProduct");
        
        Map<String, Object> inputMap = (Map<String, Object>) arguments.get("input");
        if (inputMap == null) {
            throw new ValidationException("Missing 'input' argument");
        }
        
        CreateProductInput input = objectMapper.convertValue(inputMap, CreateProductInput.class);
        return productService.createProduct(input);
    }
    
    /**
     * Handles getProduct query
     */
    private Product handleGetProduct(Map<String, Object> arguments, LambdaLogger logger) {
        logger.log("Handling getProduct");
        
        String id = (String) arguments.get("id");
        if (id == null || id.isEmpty()) {
            throw new ValidationException("Missing 'id' argument");
        }
        
        return productService.getProduct(id);
    }
    
    /**
     * Handles listProducts query
     */
    private List<Product> handleListProducts(LambdaLogger logger) {
        logger.log("Handling listProducts");
        return productService.listProducts();
    }
    
    /**
     * Handles updateProduct mutation
     */
    private Product handleUpdateProduct(Map<String, Object> arguments, LambdaLogger logger) {
        logger.log("Handling updateProduct");
        
        Map<String, Object> inputMap = (Map<String, Object>) arguments.get("input");
        if (inputMap == null) {
            throw new ValidationException("Missing 'input' argument");
        }
        
        logger.log("Input map: " + inputMap.toString());
        
        UpdateProductInput input = objectMapper.convertValue(inputMap, UpdateProductInput.class);
        logger.log("Converted input: " + input.toString());
        
        Product result = productService.updateProduct(input);
        logger.log("Update result - ID: " + result.getId() + ", Name: " + result.getName());
        
        return result;
    }
    
    /**
     * Handles deleteProduct mutation
     */
    private DeleteProductResponse handleDeleteProduct(Map<String, Object> arguments, LambdaLogger logger) {
        logger.log("Handling deleteProduct");
        
        String id = (String) arguments.get("id");
        if (id == null || id.isEmpty()) {
            throw new ValidationException("Missing 'id' argument");
        }
        
        return productService.deleteProduct(id);
    }
    

}
