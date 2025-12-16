package com.product.model;

import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * Input model for creating a new product.
 * Contains required fields for product creation.
 */
public class CreateProductInput {
    
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
    public CreateProductInput() {
    }
    
    // Constructor with all fields
    public CreateProductInput(String name, String description, Double price, 
                              String category, Integer stockQuantity) {
        this.name = name;
        this.description = description;
        this.price = price;
        this.category = category;
        this.stockQuantity = stockQuantity;
    }
    
    // Getters and Setters
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
     * Converts this input to a Product entity.
     * @return A new Product instance with fields from this input
     */
    public Product toProduct() {
        Product product = new Product();
        product.setName(this.name);
        product.setDescription(this.description);
        product.setPrice(this.price);
        product.setCategory(this.category);
        product.setStockQuantity(this.stockQuantity);
        return product;
    }
    
    @Override
    public String toString() {
        return "CreateProductInput{" +
                "name='" + name + '\'' +
                ", description='" + description + '\'' +
                ", price=" + price +
                ", category='" + category + '\'' +
                ", stockQuantity=" + stockQuantity +
                '}';
    }
}
