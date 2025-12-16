import api from '../utils/axios';
import { AuthTokens, LoginCredentials, RegisterCredentials, User } from '../types';

export const authService = {
  login: async (credentials: LoginCredentials): Promise<{ tokens: AuthTokens; user: User }> => {
    const response = await api.post('/api/auth/login', credentials);
    return response.data;
  },

  register: async (credentials: RegisterCredentials): Promise<{ message: string }> => {
    const response = await api.post('/api/auth/register', credentials);
    return response.data;
  },

  confirmRegistration: async (username: string, code: string): Promise<{ message: string }> => {
    const response = await api.post('/api/auth/confirm', { username, code });
    return response.data;
  },

  resendConfirmationCode: async (username: string): Promise<{ message: string }> => {
    const response = await api.post('/api/auth/resend-code', { username });
    return response.data;
  },

  logout: async (): Promise<void> => {
    await api.post('/api/auth/logout');
  },

  refreshToken: async (refreshToken: string): Promise<{ accessToken: string; idToken: string }> => {
    const response = await api.post('/api/auth/refresh', { refreshToken });
    return response.data;
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await api.get('/api/auth/me');
    return response.data;
  },

  forgotPassword: async (username: string): Promise<{ message: string }> => {
    const response = await api.post('/api/auth/forgot-password', { username });
    return response.data;
  },

  resetPassword: async (
    username: string,
    code: string,
    newPassword: string
  ): Promise<{ message: string }> => {
    const response = await api.post('/api/auth/reset-password', {
      username,
      code,
      newPassword,
    });
    return response.data;
  },

  changePassword: async (oldPassword: string, newPassword: string): Promise<{ message: string }> => {
    const response = await api.post('/api/auth/change-password', {
      oldPassword,
      newPassword,
    });
    return response.data;
  },
};
