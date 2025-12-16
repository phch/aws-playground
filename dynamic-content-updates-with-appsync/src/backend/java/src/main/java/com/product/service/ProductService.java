package com.product.service;

import com.product.exception.ProductNotFoundException;
import com.product.exception.ValidationException;
import com.product.model.CreateProductInput;
import com.product.model.DeleteProductResponse;
import com.product.model.Product;
import com.product.model.UpdateProductInput;
import com.product.repository.ProductRepository;
import com.product.util.ValidationUtil;

import java.util.List;
import java.util.Optional;
import java.util.logging.Level;
import java.util.logging.Logger;

/**
 * Service layer for product operations.
 * Handles business logic, validation, and orchestrates repository calls.
 */
public class ProductService {
    
    private static final Logger LOGGER = Logger.getLogger(ProductService.class.getName());
    
    private final ProductRepository productRepository;
    
    /**
     * Constructs a ProductService with the specified repository.
     *
     * @param productRepository The repository for product data access
     */
    public ProductService(ProductRepository productRepository) {
        if (productRepository == null) {
            throw new IllegalArgumentException("ProductRepository cannot be null");
        }
        this.productRepository = productRepository;
    }
    
    /**
     * Creates a new product.
     * Validates input and saves the product to the repository.
     *
     * @param input The product creation input
     * @return The created product with generated ID and timestamps
     * @throws ValidationException if input validation fails
     */
    public Product createProduct(CreateProductInput input) {
        LOGGER.log(Level.INFO, "Creating product: {0}", input);
        
        try {
            // Validate input
            ValidationUtil.validateCreateProductInput(input);
            
            // Convert input to product entity
            Product product = input.toProduct();
            
            // Save product
            Product savedProduct = productRepository.save(product);
            
            LOGGER.log(Level.INFO, "Product created successfully with ID: {0}", savedProduct.getId());
            return savedProduct;
            
        } catch (ValidationException e) {
            LOGGER.log(Level.WARNING, "Product creation validation failed: {0}", e.getMessage());
            throw e;
        } catch (Exception e) {
            LOGGER.log(Level.SEVERE, "Error creating product", e);
            throw new RuntimeException("Failed to create product: " + e.getMessage(), e);
        }
    }
    
    /**
     * Retrieves a product by its ID.
     *
     * @param id The product ID
     * @return The product with the specified ID
     * @throws ValidationException if ID is invalid
     * @throws ProductNotFoundException if product is not found
     */
    public Product getProduct(String id) {
        LOGGER.log(Level.INFO, "Retrieving product with ID: {0}", id);
        
        try {
            // Validate ID
            ValidationUtil.validateProductId(id);
            
            // Find product
            Optional<Product> productOptional = productRepository.findById(id);
            
            if (productOptional.isEmpty()) {
                LOGGER.log(Level.WARNING, "Product not found with ID: {0}", id);
                throw new ProductNotFoundException(id);
            }
            
            Product product = productOptional.get();
            LOGGER.log(Level.INFO, "Product retrieved successfully: {0}", id);
            return product;
            
        } catch (ValidationException | ProductNotFoundException e) {
            throw e;
        } catch (Exception e) {
            LOGGER.log(Level.SEVERE, "Error retrieving product with ID: " + id, e);
            throw new RuntimeException("Failed to retrieve product: " + e.getMessage(), e);
        }
    }
    
    /**
     * Retrieves all products.
     *
     * @return List of all products, sorted by creation timestamp
     */
    public List<Product> listProducts() {
        LOGGER.log(Level.INFO, "Listing all products");
        
        try {
            List<Product> products = productRepository.findAll();
            LOGGER.log(Level.INFO, "Retrieved {0} products", products.size());
            return products;
            
        } catch (Exception e) {
            LOGGER.log(Level.SEVERE, "Error listing products", e);
            throw new RuntimeException("Failed to list products: " + e.getMessage(), e);
        }
    }
    
    /**
     * Updates an existing product.
     * Validates input and applies updates to the product.
     *
     * @param input The product update input
     * @return The updated product
     * @throws ValidationException if input validation fails
     * @throws ProductNotFoundException if product is not found
     */
    public Product updateProduct(UpdateProductInput input) {
        LOGGER.log(Level.INFO, "Updating product: {0}", input);
        
        try {
            // Validate input
            ValidationUtil.validateUpdateProductInput(input);
            
            // Check if product exists
            Optional<Product> existingProductOptional = productRepository.findById(input.getId());
            
            if (existingProductOptional.isEmpty()) {
                LOGGER.log(Level.WARNING, "Product not found for update with ID: {0}", input.getId());
                throw new ProductNotFoundException(input.getId());
            }
            
            // Apply updates to existing product
            Product existingProduct = existingProductOptional.get();
            input.applyTo(existingProduct);
            
            // Update product in repository
            Product updatedProduct = productRepository.update(existingProduct);
            
            LOGGER.log(Level.INFO, "Product updated successfully with ID: {0}", updatedProduct.getId());
            return updatedProduct;
            
        } catch (ValidationException | ProductNotFoundException e) {
            throw e;
        } catch (Exception e) {
            LOGGER.log(Level.SEVERE, "Error updating product", e);
            throw new RuntimeException("Failed to update product: " + e.getMessage(), e);
        }
    }
    
    /**
     * Deletes a product by its ID.
     *
     * @param id The product ID to delete
     * @return DeleteProductResponse with confirmation message
     * @throws ValidationException if ID is invalid
     * @throws ProductNotFoundException if product is not found
     */
    public DeleteProductResponse deleteProduct(String id) {
        LOGGER.log(Level.INFO, "Deleting product with ID: {0}", id);
        
        try {
            // Validate ID
            ValidationUtil.validateProductId(id);
            
            // Delete product
            boolean deleted = productRepository.deleteById(id);
            
            if (!deleted) {
                LOGGER.log(Level.WARNING, "Product not found for deletion with ID: {0}", id);
                throw new ProductNotFoundException(id);
            }
            
            LOGGER.log(Level.INFO, "Product deleted successfully with ID: {0}", id);
            return new DeleteProductResponse(id, "Product deleted successfully");
            
        } catch (ValidationException | ProductNotFoundException e) {
            throw e;
        } catch (Exception e) {
            LOGGER.log(Level.SEVERE, "Error deleting product with ID: " + id, e);
            throw new RuntimeException("Failed to delete product: " + e.getMessage(), e);
        }
    }
}
