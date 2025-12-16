import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

export interface AppError {
  message: string;
  code?: string;
  details?: any;
}

@Injectable({
  providedIn: 'root'
})
export class ErrorHandlerService {
  constructor(private snackBar: MatSnackBar) {}

  /**
   * Handle GraphQL errors
   */
  handleGraphQLError(error: any): AppError {
    console.error('GraphQL Error:', error);
    
    // Check for specific error types
    if (error.errors && error.errors.length > 0) {
      const firstError = error.errors[0];
      
      // Handle authentication errors
      if (firstError.errorType === 'Unauthorized' || 
          firstError.message?.includes('Unauthorized')) {
        return {
          message: 'You are not authorized to perform this action',
          code: 'UNAUTHORIZED',
          details: firstError
        };
      }
      
      // Handle validation errors
      if (firstError.errorType === 'ValidationException') {
        return {
          message: firstError.message || 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: firstError
        };
      }
      
      // Handle not found errors
      if (firstError.errorType === 'NotFoundException') {
        return {
          message: firstError.message || 'Resource not found',
          code: 'NOT_FOUND',
          details: firstError
        };
      }
      
      return {
        message: firstError.message || 'An error occurred',
        code: firstError.errorType,
        details: firstError
      };
    }
    
    // Handle network errors
    if (error.message?.includes('Network Error') || 
        error.message?.includes('Failed to fetch')) {
      return {
        message: 'Network error. Please check your connection.',
        code: 'NETWORK_ERROR',
        details: error
      };
    }
    
    // Generic error
    return {
      message: error.message || 'An unexpected error occurred',
      code: 'UNKNOWN_ERROR',
      details: error
    };
  }

  /**
   * Show error notification to user
   */
  showError(error: AppError | string, duration: number = 5000): void {
    const message = typeof error === 'string' ? error : error.message;
    
    this.snackBar.open(message, 'Close', {
      duration,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: ['error-snackbar']
    });
  }

  /**
   * Show success notification to user
   */
  showSuccess(message: string, duration: number = 3000): void {
    this.snackBar.open(message, 'Close', {
      duration,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: ['success-snackbar']
    });
  }

  /**
   * Show info notification to user
   */
  showInfo(message: string, duration: number = 3000): void {
    this.snackBar.open(message, 'Close', {
      duration,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: ['info-snackbar']
    });
  }

  /**
   * Log error for debugging
   */
  logError(context: string, error: any): void {
    console.error(`[${context}]`, error);
  }
}
