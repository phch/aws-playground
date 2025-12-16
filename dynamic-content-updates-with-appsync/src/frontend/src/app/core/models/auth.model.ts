export interface AuthState {
  isAuthenticated: boolean;
  username?: string;
  isLoading: boolean;
  error?: string;
}

export interface AuthUser {
  username: string;
  userId: string;
  email?: string;
}
