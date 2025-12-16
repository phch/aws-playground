package com.product.model;

import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * Input model for updating an existing product.
 * All fields except id are optional for partial updates.
 */
public class UpdateProductInput {
    
    @JsonProperty("id")
    private String id;
    
    @JsonProperty("name")
    private String name;
    
    @JsonProperty("description")
    private String description;
    
    @JsonProperty("price")
    private Double price;
    
    @JsonProperty("category")
    private String category;
    
    @JsonProperty("stockQuantity")
    private Integer stockQuantity;
    
    // Default constructor for Jackson
    public UpdateProductInput() {
    }
    
    // Constructor with all fields
    public UpdateProductInput(String id, String name, String description, 
                              Double price, String category, Integer stockQuantity) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.price = price;
        this.category = category;
        this.stockQuantity = stockQuantity;
    }
    
    // Getters and Setters
    public String getId() {
        return id;
    }
    
    public void setId(String id) {
        this.id = id;
    }
    
    public String getName() {
        return name;
    }
    
    public void setName(String name) {
        this.name = name;
    }
    
    public String getDescription() {
        return description;
    }
    
    public void setDescription(String description) {
        this.description = description;
    }
    
    public Double getPrice() {
        return price;
    }
    
    public void setPrice(Double price) {
        this.price = price;
    }
    
    public String getCategory() {
        return category;
    }
    
    public void setCategory(String category) {
        this.category = category;
    }
    
    public Integer getStockQuantity() {
        return stockQuantity;
    }
    
    public void setStockQuantity(Integer stockQuantity) {
        this.stockQuantity = stockQuantity;
    }
    
    /**
     * Applies the non-null fields from this input to an existing product.
     * @param product The product to update
     */
    public void applyTo(Product product) {
        if (this.name != null) {
            product.setName(this.name);
        }
        if (this.description != null) {
            product.setDescription(this.description);
        }
        if (this.price != null) {
            product.setPrice(this.price);
        }
        if (this.category != null) {
            product.setCategory(this.category);
        }
        if (this.stockQuantity != null) {
            product.setStockQuantity(this.stockQuantity);
        }
    }
    
    @Override
    public String toString() {
        return "UpdateProductInput{" +
                "id='" + id + '\'' +
                ", name='" + name + '\'' +
                ", description='" + description + '\'' +
                ", price=" + price +
                ", category='" + category + '\'' +
                ", stockQuantity=" + stockQuantity +
                '}';
    }
}
