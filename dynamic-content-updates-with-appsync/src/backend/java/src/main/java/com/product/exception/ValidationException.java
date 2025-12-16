package com.product.exception;

import java.util.HashMap;
import java.util.Map;

/**
 * Exception thrown when input validation fails.
 * This exception maps to HTTP 400 Bad Request errors.
 */
public class ValidationException extends RuntimeException {
    private final String errorCode;
    private final Map<String, String> fieldErrors;

    /**
     * Constructs a new ValidationException with a general message.
     *
     * @param message The validation error message
     */
    public ValidationException(String message) {
        super(message);
        this.errorCode = "VALIDATION_ERROR";
        this.fieldErrors = new HashMap<>();
    }

    /**
     * Constructs a new ValidationException with a message and error code.
     *
     * @param message The validation error message
     * @param errorCode Custom error code
     */
    public ValidationException(String message, String errorCode) {
        super(message);
        this.errorCode = errorCode;
        this.fieldErrors = new HashMap<>();
    }

    /**
     * Constructs a new ValidationException with field-specific errors.
     *
     * @param message The validation error message
     * @param fieldName The name of the field that failed validation
     * @param fieldError The specific error for the field
     */
    public ValidationException(String message, String fieldName, String fieldError) {
        super(message);
        this.errorCode = "VALIDATION_ERROR";
        this.fieldErrors = new HashMap<>();
        this.fieldErrors.put(fieldName, fieldError);
    }

    /**
     * Constructs a new ValidationException with multiple field errors.
     *
     * @param message The validation error message
     * @param fieldErrors Map of field names to error messages
     */
    public ValidationException(String message, Map<String, String> fieldErrors) {
        super(message);
        this.errorCode = "VALIDATION_ERROR";
        this.fieldErrors = new HashMap<>(fieldErrors);
    }

    /**
     * Constructs a new ValidationException with message, error code, and field errors.
     *
     * @param message The validation error message
     * @param errorCode Custom error code
     * @param fieldErrors Map of field names to error messages
     */
    public ValidationException(String message, String errorCode, Map<String, String> fieldErrors) {
        super(message);
        this.errorCode = errorCode;
        this.fieldErrors = new HashMap<>(fieldErrors);
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
     * Gets the field-specific validation errors.
     *
     * @return Map of field names to error messages
     */
    public Map<String, String> getFieldErrors() {
        return new HashMap<>(fieldErrors);
    }

    /**
     * Checks if there are any field-specific errors.
     *
     * @return true if field errors exist, false otherwise
     */
    public boolean hasFieldErrors() {
        return !fieldErrors.isEmpty();
    }

    /**
     * Adds a field error to this exception.
     *
     * @param fieldName The name of the field
     * @param fieldError The error message for the field
     */
    public void addFieldError(String fieldName, String fieldError) {
        this.fieldErrors.put(fieldName, fieldError);
    }
}
