package com.product.model;

import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * Response model for product deletion operations.
 * Contains the deleted product ID and a confirmation message.
 */
public class DeleteProductResponse {
    
    @JsonProperty("id")
    private String id;
    
    @JsonProperty("message")
    private String message;
    
    // Default constructor for Jackson
    public DeleteProductResponse() {
    }
    
    // Constructor with all fields
    public DeleteProductResponse(String id, String message) {
        this.id = id;
        this.message = message;
    }
    
    // Getters and Setters
    public String getId() {
        return id;
    }
    
    public void setId(String id) {
        this.id = id;
    }
    
    public String getMessage() {
        return message;
    }
    
    public void setMessage(String message) {
        this.message = message;
    }
    
    @Override
    public String toString() {
        return "DeleteProductResponse{" +
                "id='" + id + '\'' +
                ", message='" + message + '\'' +
                '}';
    }
}
