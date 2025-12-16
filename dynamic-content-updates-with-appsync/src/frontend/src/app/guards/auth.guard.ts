import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../core/services/auth.service';

/**
 * Auth guard to protect routes requiring authentication
 * Checks if user is authenticated and redirects to login if not
 */
export const authGuard = async () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  
  // Check authentication status
  await authService.checkAuth();
  
  const authState = authService.getAuthStateSnapshot();
  
  if (authState.isAuthenticated) {
    return true;
  }
  
  // Redirect to login if not authenticated
  router.navigate(['/login']);
  return false;
};
