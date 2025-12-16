import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../core/services/auth.service';
import { AuthState } from '../../core/models/auth.model';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './auth.component.html',
  styleUrls: ['./auth.component.css']
})
export class AuthComponent implements OnInit {
  authState: AuthState = { isAuthenticated: false, isLoading: false };

  constructor(private authService: AuthService) {}

  async ngOnInit(): Promise<void> {
    // Subscribe to auth state changes
    this.authService.authState$.subscribe(state => {
      this.authState = state;
    });
    
    // Check if user is already authenticated
    await this.authService.checkAuth();
  }

  async signInWithHostedUI(): Promise<void> {
    try {
      await this.authService.signIn();
    } catch (error) {
      console.error('Sign in error:', error);
    }
  }

  get isLoading(): boolean {
    return this.authState.isLoading;
  }

  get errorMessage(): string | undefined {
    return this.authState.error;
  }
}
