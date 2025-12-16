package com.product.util;

import com.product.exception.ValidationException;
import com.product.model.CreateProductInput;
import com.product.model.UpdateProductInput;

import java.util.HashMap;
import java.util.Map;

/**
 * Utility class for validating product input data.
 * Provides static methods for validating required fields, business rules, and data formats.
 */
public class ValidationUtil {

    // Validation constants
    private static final int MAX_NAME_LENGTH = 255;
    private static final int MAX_DESCRIPTION_LENGTH = 2000;
    private static final int MAX_CATEGORY_LENGTH = 100;
    private static final double MIN_PRICE = 0.01;
    private static final double MAX_PRICE = 999999.99;
    private static final int MIN_STOCK_QUANTITY = 0;
    private static final int MAX_STOCK_QUANTITY = 1000000;

    /**
     * Private constructor to prevent instantiation of utility class.
     */
    private ValidationUtil() {
        throw new UnsupportedOperationException("Utility class cannot be instantiated");
    }

    /**
     * Validates CreateProductInput for product creation.
     * Checks all required fields and business rules.
     *
     * @param input The CreateProductInput to validate
     * @throws ValidationException if validation fails
     */
    public static void validateCreateProductInput(CreateProductInput input) {
        if (input == null) {
            throw new ValidationException("Product input cannot be null");
        }

        Map<String, String> fieldErrors = new HashMap<>();

        // Validate required fields
        validateName(input.getName(), fieldErrors);
        validatePrice(input.getPrice(), fieldErrors);
        validateStockQuantity(input.getStockQuantity(), fieldErrors);

        // Validate optional fields if present
        if (input.getDescription() != null) {
            validateDescription(input.getDescription(), fieldErrors);
        }
        if (input.getCategory() != null) {
            validateCategory(input.getCategory(), fieldErrors);
        }

        // Throw exception if any validation errors occurred
        if (!fieldErrors.isEmpty()) {
            throw new ValidationException("Product validation failed", fieldErrors);
        }
    }

    /**
     * Validates UpdateProductInput for product updates.
     * Checks that at least one field is being updated and validates business rules.
     *
     * @param input The UpdateProductInput to validate
     * @throws ValidationException if validation fails
     */
    public static void validateUpdateProductInput(UpdateProductInput input) {
        if (input == null) {
            throw new ValidationException("Product update input cannot be null");
        }

        // Validate ID is present
        if (input.getId() == null || input.getId().trim().isEmpty()) {
            throw new ValidationException("Product ID is required for update", "id", "ID cannot be null or empty");
        }

        Map<String, String> fieldErrors = new HashMap<>();

        // Check that at least one field is being updated
        boolean hasUpdate = input.getName() != null 
            || input.getDescription() != null 
            || input.getPrice() != null 
            || input.getCategory() != null 
            || input.getStockQuantity() != null;

        if (!hasUpdate) {
            throw new ValidationException("At least one field must be provided for update");
        }

        // Validate fields if present
        if (input.getName() != null) {
            validateName(input.getName(), fieldErrors);
        }
        if (input.getPrice() != null) {
            validatePrice(input.getPrice(), fieldErrors);
        }
        if (input.getStockQuantity() != null) {
            validateStockQuantity(input.getStockQuantity(), fieldErrors);
        }
        if (input.getDescription() != null) {
            validateDescription(input.getDescription(), fieldErrors);
        }
        if (input.getCategory() != null) {
            validateCategory(input.getCategory(), fieldErrors);
        }

        // Throw exception if any validation errors occurred
        if (!fieldErrors.isEmpty()) {
            throw new ValidationException("Product update validation failed", fieldErrors);
        }
    }

    /**
     * Validates product name.
     * Name is required and must meet length and format requirements.
     *
     * @param name The product name to validate
     * @param fieldErrors Map to collect field-specific errors
     */
    private static void validateName(String name, Map<String, String> fieldErrors) {
        if (name == null || name.trim().isEmpty()) {
            fieldErrors.put("name", "Name is required and cannot be empty");
            return;
        }

        String trimmedName = name.trim();
        if (trimmedName.length() > MAX_NAME_LENGTH) {
            fieldErrors.put("name", String.format("Name cannot exceed %d characters", MAX_NAME_LENGTH));
        }

        // Check for invalid characters (basic validation)
        if (!trimmedName.matches("^[a-zA-Z0-9\\s\\-_.,()&]+$")) {
            fieldErrors.put("name", "Name contains invalid characters. Only alphanumeric, spaces, and basic punctuation allowed");
        }
    }

    /**
     * Validates product price.
     * Price is required and must be greater than 0.
     *
     * @param price The product price to validate
     * @param fieldErrors Map to collect field-specific errors
     */
    private static void validatePrice(Double price, Map<String, String> fieldErrors) {
        if (price == null) {
            fieldErrors.put("price", "Price is required");
            return;
        }

        if (price < MIN_PRICE) {
            fieldErrors.put("price", String.format("Price must be at least %.2f", MIN_PRICE));
        }

        if (price > MAX_PRICE) {
            fieldErrors.put("price", String.format("Price cannot exceed %.2f", MAX_PRICE));
        }

        // Validate price has at most 2 decimal places
        if (!isPriceFormatValid(price)) {
            fieldErrors.put("price", "Price must have at most 2 decimal places");
        }
    }

    /**
     * Validates product stock quantity.
     * Stock quantity is required and must be >= 0.
     *
     * @param stockQuantity The stock quantity to validate
     * @param fieldErrors Map to collect field-specific errors
     */
    private static void validateStockQuantity(Integer stockQuantity, Map<String, String> fieldErrors) {
        if (stockQuantity == null) {
            fieldErrors.put("stockQuantity", "Stock quantity is required");
            return;
        }

        if (stockQuantity < MIN_STOCK_QUANTITY) {
            fieldErrors.put("stockQuantity", String.format("Stock quantity must be at least %d", MIN_STOCK_QUANTITY));
        }

        if (stockQuantity > MAX_STOCK_QUANTITY) {
            fieldErrors.put("stockQuantity", String.format("Stock quantity cannot exceed %d", MAX_STOCK_QUANTITY));
        }
    }

    /**
     * Validates product description.
     * Description is optional but must meet length requirements if provided.
     *
     * @param description The product description to validate
     * @param fieldErrors Map to collect field-specific errors
     */
    private static void validateDescription(String description, Map<String, String> fieldErrors) {
        if (description != null && description.length() > MAX_DESCRIPTION_LENGTH) {
            fieldErrors.put("description", String.format("Description cannot exceed %d characters", MAX_DESCRIPTION_LENGTH));
        }
    }

    /**
     * Validates product category.
     * Category is optional but must meet length and format requirements if provided.
     *
     * @param category The product category to validate
     * @param fieldErrors Map to collect field-specific errors
     */
    private static void validateCategory(String category, Map<String, String> fieldErrors) {
        if (category == null || category.trim().isEmpty()) {
            return; // Category is optional
        }

        String trimmedCategory = category.trim();
        if (trimmedCategory.length() > MAX_CATEGORY_LENGTH) {
            fieldErrors.put("category", String.format("Category cannot exceed %d characters", MAX_CATEGORY_LENGTH));
        }

        // Check for invalid characters
        if (!trimmedCategory.matches("^[a-zA-Z0-9\\s\\-_&]+$")) {
            fieldErrors.put("category", "Category contains invalid characters. Only alphanumeric, spaces, hyphens, underscores, and ampersands allowed");
        }
    }

    /**
     * Validates product ID format.
     * ID must be a non-empty string.
     *
     * @param id The product ID to validate
     * @throws ValidationException if ID is invalid
     */
    public static void validateProductId(String id) {
        if (id == null || id.trim().isEmpty()) {
            throw new ValidationException("Product ID is required", "id", "ID cannot be null or empty");
        }

        // Basic UUID format validation (optional but recommended)
        String trimmedId = id.trim();
        if (trimmedId.length() < 1 || trimmedId.length() > 100) {
            throw new ValidationException("Product ID has invalid length", "id", "ID must be between 1 and 100 characters");
        }
    }

    /**
     * Checks if price has valid format (at most 2 decimal places).
     *
     * @param price The price to check
     * @return true if format is valid, false otherwise
     */
    private static boolean isPriceFormatValid(Double price) {
        if (price == null) {
            return false;
        }
        // Check if price has at most 2 decimal places
        double scaled = price * 100;
        return Math.abs(scaled - Math.round(scaled)) < 0.0001;
    }

    /**
     * Validates a string is not null or empty.
     *
     * @param value The string to validate
     * @param fieldName The name of the field being validated
     * @throws ValidationException if string is null or empty
     */
    public static void validateRequiredString(String value, String fieldName) {
        if (value == null || value.trim().isEmpty()) {
            throw new ValidationException(
                String.format("%s is required", fieldName),
                fieldName,
                String.format("%s cannot be null or empty", fieldName)
            );
        }
    }

    /**
     * Validates a number is not null and within range.
     *
     * @param value The number to validate
     * @param fieldName The name of the field being validated
     * @param min Minimum allowed value (inclusive)
     * @param max Maximum allowed value (inclusive)
     * @throws ValidationException if number is invalid
     */
    public static void validateNumberRange(Number value, String fieldName, double min, double max) {
        if (value == null) {
            throw new ValidationException(
                String.format("%s is required", fieldName),
                fieldName,
                String.format("%s cannot be null", fieldName)
            );
        }

        double doubleValue = value.doubleValue();
        if (doubleValue < min || doubleValue > max) {
            throw new ValidationException(
                String.format("%s must be between %.2f and %.2f", fieldName, min, max),
                fieldName,
                String.format("Value %.2f is out of range [%.2f, %.2f]", doubleValue, min, max)
            );
        }
    }
}
