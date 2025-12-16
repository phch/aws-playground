import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';
import { signOut, getCurrentUser, fetchAuthSession, signInWithRedirect } from 'aws-amplify/auth';
import { Hub } from 'aws-amplify/utils';
import { AuthState, AuthUser } from '../models/auth.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private authStateSubject = new BehaviorSubject<AuthState>({
    isAuthenticated: false,
    isLoading: true
  });

  public authState$: Observable<AuthState> = this.authStateSubject.asObservable();

  constructor(private router: Router) {
    this.setupAuthListener();
  }

  /**
   * Set up Hub listener for auth events
   * Handles OAuth callbacks and auth state changes
   */
  private setupAuthListener(): void {
    Hub.listen('auth', (data) => {
      const { payload } = data;
      console.log('Auth event:', payload.event);
      
      switch (payload.event) {
        case 'signedIn':
        case 'signInWithRedirect':
          this.checkAuth();
          break;
        case 'signedOut':
          this.updateAuthState({ isAuthenticated: false, isLoading: false });
          break;
        case 'signInWithRedirect_failure':
          console.error('Sign in failed:', payload.data);
          this.updateAuthState({ 
            isAuthenticated: false, 
            isLoading: false,
            error: 'Authentication failed. Please try again.'
          });
          break;
        case 'tokenRefresh':
          console.log('Token refreshed successfully');
          break;
        case 'tokenRefresh_failure':
          console.error('Token refresh failed:', payload.data);
          this.handleSessionExpired();
          break;
      }
    });
  }

  /**
   * Check current authentication status
   * Updates auth state and redirects if necessary
   */
  async checkAuth(): Promise<void> {
    try {
      this.updateAuthState({ isLoading: true });
      
      const user = await getCurrentUser();
      const session = await fetchAuthSession();
      
      if (session.tokens) {
        this.updateAuthState({
          isAuthenticated: true,
          username: user.username,
          isLoading: false
        });
        
        // Redirect to products if on login page
        if (this.router.url === '/login' || this.router.url === '/') {
          this.router.navigate(['/products']);
        }
      } else {
        throw new Error('No valid session');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      this.updateAuthState({ 
        isAuthenticated: false, 
        isLoading: false 
      });
      
      // Redirect to login if not already there
      if (this.router.url !== '/login') {
        this.router.navigate(['/login']);
      }
    }
  }

  /**
   * Get current authenticated user details
   */
  async getCurrentUser(): Promise<AuthUser | null> {
    try {
      const user = await getCurrentUser();
      return {
        username: user.username,
        userId: user.userId,
      };
    } catch {
      return null;
    }
  }

  /**
   * Sign in using Cognito Hosted UI
   */
  async signIn(): Promise<void> {
    try {
      this.updateAuthState({ isLoading: true });
      await signInWithRedirect();
    } catch (error) {
      console.error('Sign in error:', error);
      this.updateAuthState({ 
        isAuthenticated: false, 
        isLoading: false,
        error: 'Failed to initiate sign in'
      });
      throw error;
    }
  }

  /**
   * Sign out user globally (all devices)
   */
  async logout(): Promise<void> {
    try {
      await signOut({ global: true });
      this.updateAuthState({ 
        isAuthenticated: false, 
        isLoading: false 
      });
      this.router.navigate(['/login']);
    } catch (error) {
      console.error('Logout error:', error);
      // Force local logout even if global logout fails
      this.updateAuthState({ 
        isAuthenticated: false, 
        isLoading: false 
      });
      this.router.navigate(['/login']);
    }
  }

  /**
   * Handle expired session
   * Clears auth state and redirects to login
   */
  private handleSessionExpired(): void {
    this.updateAuthState({ 
      isAuthenticated: false, 
      isLoading: false,
      error: 'Your session has expired. Please sign in again.'
    });
    this.router.navigate(['/login']);
  }

  /**
   * Update auth state and notify subscribers
   */
  private updateAuthState(state: Partial<AuthState>): void {
    const currentState = this.authStateSubject.value;
    this.authStateSubject.next({ ...currentState, ...state });
  }

  /**
   * Get current auth state snapshot
   */
  getAuthStateSnapshot(): AuthState {
    return this.authStateSubject.value;
  }

  /**
   * Check if user is authenticated (synchronous)
   */
  isAuthenticated(): boolean {
    return this.authStateSubject.value.isAuthenticated;
  }
}
