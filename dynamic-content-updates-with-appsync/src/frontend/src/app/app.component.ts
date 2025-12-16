import { Component, OnInit } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from './core/services/auth.service';
import { AuthState } from './core/models/auth.model';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule, 
    RouterOutlet, 
    RouterLink, 
    RouterLinkActive, 
    MatButtonModule, 
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  title = 'Products Dashboard';
  authState: AuthState = { isAuthenticated: false, isLoading: true };

  constructor(private authService: AuthService) {}

  async ngOnInit(): Promise<void> {
    // Subscribe to auth state changes
    this.authService.authState$.subscribe(state => {
      this.authState = state;
    });
    
    // Initial auth check
    await this.authService.checkAuth();
  }

  async logout(): Promise<void> {
    await this.authService.logout();
  }

  get isAuthenticated(): boolean {
    return this.authState.isAuthenticated;
  }

  get isLoading(): boolean {
    return this.authState.isLoading;
  }

  get username(): string {
    return this.authState.username || '';
  }
}
