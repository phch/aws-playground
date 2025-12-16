export interface ConnectionStatus {
  isConnected: boolean;
  subscriptionsActive: {
    create: boolean;
    update: boolean;
    delete: boolean;
  };
  lastError?: string;
  reconnectAttempts: number;
}

export type SubscriptionType = 'create' | 'update' | 'delete';
