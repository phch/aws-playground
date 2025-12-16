package com.product.repository;

import com.product.model.Product;
import java.util.List;
import java.util.Optional;

/**
 * Repository interface for Product data access operations.
 * Provides abstraction for data persistence layer.
 */
public interface ProductRepository {
    
    /**
     * Save a new product to the data store.
     * Generates a unique ID and sets timestamps.
     * 
     * @param product The product to save
     * @return The saved product with generated ID and timestamps
     */
    Product save(Product product);
    
    /**
     * Find a product by its ID.
     * 
     * @param id The product ID
     * @return Optional containing the product if found, empty otherwise
     */
    Optional<Product> findById(String id);
    
    /**
     * Find all products.
     * Results are sorted by creation timestamp.
     * 
     * @return List of all products
     */
    List<Product> findAll();
    
    /**
     * Update an existing product.
     * Updates the modification timestamp.
     * 
     * @param product The product with updated fields
     * @return The updated product
     */
    Product update(Product product);
    
    /**
     * Delete a product by ID.
     * 
     * @param id The product ID to delete
     * @return true if deleted, false if not found
     */
    boolean deleteById(String id);
}
