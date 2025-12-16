package com.product.exception;

/**
 * Exception thrown when a product is not found in the data store.
 * This exception maps to HTTP 404 Not Found errors.
 */
public class ProductNotFoundException extends RuntimeException {
    private final String errorCode;
    private final String productId;

    /**
     * Constructs a new ProductNotFoundException with a product ID.
     *
     * @param productId The ID of the product that was not found
     */
    public ProductNotFoundException(String productId) {
        super(String.format("Product with id '%s' not found", productId));
        this.errorCode = "NOT_FOUND";
        this.productId = productId;
    }

    /**
     * Constructs a new ProductNotFoundException with a custom message.
     *
     * @param productId The ID of the product that was not found
     * @param message Custom error message
     */
    public ProductNotFoundException(String productId, String message) {
        super(message);
        this.errorCode = "NOT_FOUND";
        this.productId = productId;
    }

    /**
     * Constructs a new ProductNotFoundException with a custom message and error code.
     *
     * @param productId The ID of the product that was not found
     * @param message Custom error message
     * @param errorCode Custom error code
     */
    public ProductNotFoundException(String productId, String message, String errorCode) {
        super(message);
        this.errorCode = errorCode;
        this.productId = productId;
    }

    /**
     * Gets the error code associated with this exception.
     *
     * @return The error code
     */
    public String getErrorCode() {
        return errorCode;
    }

    /**
     * Gets the product ID that was not found.
     *
     * @return The product ID
     */
    public String getProductId() {
        return productId;
    }
}
