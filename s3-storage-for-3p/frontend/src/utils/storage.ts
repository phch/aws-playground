import { AuthTokens, User } from '../types';

const TOKEN_STORAGE_KEY = {
  ACCESS_TOKEN: 'accessToken',
  ID_TOKEN: 'idToken',
  REFRESH_TOKEN: 'refreshToken',
  USER: 'user',
};

export const storageUtils = {
  saveTokens: (tokens: AuthTokens) => {
    localStorage.setItem(TOKEN_STORAGE_KEY.ACCESS_TOKEN, tokens.accessToken);
    localStorage.setItem(TOKEN_STORAGE_KEY.ID_TOKEN, tokens.idToken);
    localStorage.setItem(TOKEN_STORAGE_KEY.REFRESH_TOKEN, tokens.refreshToken);
  },

  getAccessToken: (): string | null => {
    return localStorage.getItem(TOKEN_STORAGE_KEY.ACCESS_TOKEN);
  },

  getIdToken: (): string | null => {
    return localStorage.getItem(TOKEN_STORAGE_KEY.ID_TOKEN);
  },

  getRefreshToken: (): string | null => {
    return localStorage.getItem(TOKEN_STORAGE_KEY.REFRESH_TOKEN);
  },

  saveUser: (user: User) => {
    localStorage.setItem(TOKEN_STORAGE_KEY.USER, JSON.stringify(user));
  },

  getUser: (): User | null => {
    const userStr = localStorage.getItem(TOKEN_STORAGE_KEY.USER);
    return userStr ? JSON.parse(userStr) : null;
  },

  clearAll: () => {
    localStorage.removeItem(TOKEN_STORAGE_KEY.ACCESS_TOKEN);
    localStorage.removeItem(TOKEN_STORAGE_KEY.ID_TOKEN);
    localStorage.removeItem(TOKEN_STORAGE_KEY.REFRESH_TOKEN);
    localStorage.removeItem(TOKEN_STORAGE_KEY.USER);
  },

  isAuthenticated: (): boolean => {
    return !!localStorage.getItem(TOKEN_STORAGE_KEY.ACCESS_TOKEN);
  },
};
