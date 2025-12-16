import { Injectable } from '@angular/core';
import { generateClient } from 'aws-amplify/api';
import { Observable, Subject, from, BehaviorSubject, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { 
  Product, 
  CreateProductInput, 
  UpdateProductInput, 
  DeleteProductResponse, 
  ProductMutationEvent 
} from '../models/product.model';
import {
  listProductsQuery,
  getProductQuery,
  createProductMutation,
  updateProductMutation,
  deleteProductMutation,
  onCreateProductSubscription,
  onUpdateProductSubscription,
  onDeleteProductSubscription
} from '../graphql/operations';
import { ConnectionStatus, SubscriptionType } from '../core/models/connection.model';
import { ErrorHandlerService } from '../core/services/error-handler.service';

@Injectable({
  providedIn: 'root'
})
export class ProductsService {
  private mutationEvents$ = new Subject<ProductMutationEvent>();
  private subscriptions: any[] = [];
  private client: any;
  private retryAttempts = new Map<string, number>();
  private readonly MAX_RETRY_ATTEMPTS = 5;
  private readonly BACKOFF_DELAYS = [1000, 2000, 4000, 8000, 16000]; // 1s, 2s, 4s, 8s, 16s

  // Connection status tracking
  private connectionStatusSubject = new BehaviorSubject<ConnectionStatus>({
    isConnected: false,
    subscriptionsActive: {
      create: false,
      update: false,
      delete: false
    },
    reconnectAttempts: 0
  });
  public connectionStatus$ = this.connectionStatusSubject.asObservable();

  constructor(private errorHandler: ErrorHandlerService) {
    this.configureAmplify();
  }

  /**
   * Configure AWS Amplify GraphQL client
   * Amplify is already configured globally in app.config.ts
   */
  private configureAmplify(): void {
    // Generate the GraphQL client for making API calls
    this.client = generateClient();
  }

  /**
   * Fetch all products from the AppSync API
   * @returns Observable of Product array
   */
  listProducts(): Observable<Product[]> {
    return from(
      this.client.graphql({
        query: listProductsQuery
      })
    ).pipe(
      map((response: any) => response.data.listProducts as Product[]),
      catchError(error => {
        const appError = this.errorHandler.handleGraphQLError(error);
        this.errorHandler.logError('listProducts', error);
        return throwError(() => appError);
      })
    );
  }

  /**
   * Fetch a single product by ID
   * @param id - The product ID
   * @returns Observable of Product
   */
  getProduct(id: string): Observable<Product> {
    return from(
      this.client.graphql({
        query: getProductQuery,
        variables: { id }
      })
    ).pipe(
      map((response: any) => response.data.getProduct as Product),
      catchError(error => {
        const appError = this.errorHandler.handleGraphQLError(error);
        this.errorHandler.logError('getProduct', error);
        return throwError(() => appError);
      })
    );
  }

  /**
   * Create a new product
   * @param input - CreateProductInput with product details
   * @returns Observable of the created Product
   */
  createProduct(input: CreateProductInput): Observable<Product> {
    return from(
      this.client.graphql({
        query: createProductMutation,
        variables: { input }
      })
    ).pipe(
      map((response: any) => response.data.createProduct as Product),
      catchError(error => {
        const appError = this.errorHandler.handleGraphQLError(error);
        this.errorHandler.logError('createProduct', error);
        return throwError(() => appError);
      })
    );
  }

  /**
   * Update an existing product
   * @param input - UpdateProductInput with product ID and fields to update
   * @returns Observable of the updated Product
   */
  updateProduct(input: UpdateProductInput): Observable<Product> {
    return from(
      this.client.graphql({
        query: updateProductMutation,
        variables: { input }
      })
    ).pipe(
      map((response: any) => response.data.updateProduct as Product),
      catchError(error => {
        const appError = this.errorHandler.handleGraphQLError(error);
        this.errorHandler.logError('updateProduct', error);
        return throwError(() => appError);
      })
    );
  }

  /**
   * Delete a product by ID
   * @param id - The product ID to delete
   * @returns Observable of DeleteProductResponse
   */
  deleteProduct(id: string): Observable<DeleteProductResponse> {
    return from(
      this.client.graphql({
        query: deleteProductMutation,
        variables: { id }
      })
    ).pipe(
      map((response: any) => response.data.deleteProduct as DeleteProductResponse),
      catchError(error => {
        const appError = this.errorHandler.handleGraphQLError(error);
        this.errorHandler.logError('deleteProduct', error);
        return throwError(() => appError);
      })
    );
  }

  /**
   * Reconnect to a subscription with exponential backoff
   * Implements retry logic with delays: 1s, 2s, 4s, 8s, 16s
   * Maximum of 5 retry attempts before giving up
   * @param subscriptionType - Type of subscription ('create', 'update', or 'delete')
   */
  private reconnectWithBackoff(subscriptionType: 'create' | 'update' | 'delete'): void {
    const attempts = this.retryAttempts.get(subscriptionType) || 0;

    if (attempts >= this.MAX_RETRY_ATTEMPTS) {
      console.error(`Max retry attempts (${this.MAX_RETRY_ATTEMPTS}) reached for ${subscriptionType} subscription`);
      return;
    }

    const delay = this.BACKOFF_DELAYS[attempts];
    console.log(`Reconnecting ${subscriptionType} subscription in ${delay}ms (attempt ${attempts + 1}/${this.MAX_RETRY_ATTEMPTS})`);

    setTimeout(() => {
      this.retryAttempts.set(subscriptionType, attempts + 1);
      
      // Call the appropriate setup method based on subscription type
      switch (subscriptionType) {
        case 'create':
          this.setupCreateSubscription();
          break;
        case 'update':
          this.setupUpdateSubscription();
          break;
        case 'delete':
          this.setupDeleteSubscription();
          break;
      }
    }, delay);
  }

  /**
   * Set up subscription for product creation events
   * Listens to onCreateProduct subscription and emits ProductMutationEvent
   * when new products are created
   */
  private setupCreateSubscription(): void {
    const subscription = this.client.graphql({
      query: onCreateProductSubscription
    }).subscribe({
      next: (response: any) => {
        // Reset retry count on successful connection
        this.retryAttempts.set('create', 0);
        this.updateSubscriptionStatus('create', true);
        
        if (response?.data?.onCreateProduct) {
          this.mutationEvents$.next({
            type: 'create',
            product: response.data.onCreateProduct,
            timestamp: new Date()
          });
        }
      },
      error: (error: any) => {
        console.error('Create subscription error:', error);
        this.errorHandler.logError('createSubscription', error);
        this.updateSubscriptionStatus('create', false);
        
        // Attempt to reconnect with exponential backoff
        this.reconnectWithBackoff('create');
      }
    });

    // Mark as connected immediately after subscription is established
    this.updateSubscriptionStatus('create', true);
    this.subscriptions.push(subscription);
  }

  /**
   * Set up subscription for product update events
   * Listens to onUpdateProduct subscription and emits ProductMutationEvent
   * when products are updated
   */
  private setupUpdateSubscription(): void {
    const subscription = this.client.graphql({
      query: onUpdateProductSubscription
    }).subscribe({
      next: (response: any) => {
        // Reset retry count on successful connection
        this.retryAttempts.set('update', 0);
        this.updateSubscriptionStatus('update', true);
        
        if (response?.data?.onUpdateProduct) {
          this.mutationEvents$.next({
            type: 'update',
            product: response.data.onUpdateProduct,
            timestamp: new Date()
          });
        }
      },
      error: (error: any) => {
        console.error('Update subscription error:', error);
        this.errorHandler.logError('updateSubscription', error);
        this.updateSubscriptionStatus('update', false);
        
        // Attempt to reconnect with exponential backoff
        this.reconnectWithBackoff('update');
      }
    });

    // Mark as connected immediately after subscription is established
    this.updateSubscriptionStatus('update', true);
    this.subscriptions.push(subscription);
  }

  /**
   * Set up subscription for product deletion events
   * Listens to onDeleteProduct subscription and emits ProductMutationEvent
   * when products are deleted
   */
  private setupDeleteSubscription(): void {
    const subscription = this.client.graphql({
      query: onDeleteProductSubscription
    }).subscribe({
      next: (response: any) => {
        // Reset retry count on successful connection
        this.retryAttempts.set('delete', 0);
        this.updateSubscriptionStatus('delete', true);
        
        if (response?.data?.onDeleteProduct) {
          this.mutationEvents$.next({
            type: 'delete',
            deleteResponse: response.data.onDeleteProduct,
            timestamp: new Date()
          });
        }
      },
      error: (error: any) => {
        console.error('Delete subscription error:', error);
        this.errorHandler.logError('deleteSubscription', error);
        this.updateSubscriptionStatus('delete', false);
        
        // Attempt to reconnect with exponential backoff
        this.reconnectWithBackoff('delete');
      }
    });

    // Mark as connected immediately after subscription is established
    this.updateSubscriptionStatus('delete', true);
    this.subscriptions.push(subscription);
  }

  /**
   * Subscribe to all product mutation events (create, update, delete)
   * Sets up all three subscription types and returns an Observable that emits
   * ProductMutationEvent objects when mutations occur
   * @returns Observable of ProductMutationEvent
   */
  subscribeToMutations(): Observable<ProductMutationEvent> {
    // Set up all three subscription types
    this.setupCreateSubscription();
    this.setupUpdateSubscription();
    this.setupDeleteSubscription();

    // Return the observable that components can subscribe to
    return this.mutationEvents$.asObservable();
  }

  /**
   * Unsubscribe from all active subscriptions and clean up resources
   * Should be called when the component is destroyed to prevent memory leaks
   */
  unsubscribeAll(): void {
    // Unsubscribe from all active subscriptions
    this.subscriptions.forEach(subscription => {
      if (subscription && typeof subscription.unsubscribe === 'function') {
        subscription.unsubscribe();
      }
    });

    // Clear the subscriptions array
    this.subscriptions = [];

    // Reset retry attempts
    this.retryAttempts.clear();

    // Reset connection status
    this.connectionStatusSubject.next({
      isConnected: false,
      subscriptionsActive: {
        create: false,
        update: false,
        delete: false
      },
      reconnectAttempts: 0
    });

    console.log('All subscriptions cleaned up');
  }

  /**
   * Update subscription status for a specific subscription type
   */
  private updateSubscriptionStatus(type: SubscriptionType, isActive: boolean): void {
    const currentStatus = this.connectionStatusSubject.value;
    const updatedStatus: ConnectionStatus = {
      ...currentStatus,
      subscriptionsActive: {
        ...currentStatus.subscriptionsActive,
        [type]: isActive
      },
      isConnected: isActive || 
        currentStatus.subscriptionsActive.create || 
        currentStatus.subscriptionsActive.update || 
        currentStatus.subscriptionsActive.delete,
      reconnectAttempts: this.retryAttempts.get(type) || 0
    };
    
    this.connectionStatusSubject.next(updatedStatus);
  }

  /**
   * Get current connection status snapshot
   */
  getConnectionStatus(): ConnectionStatus {
    return this.connectionStatusSubject.value;
  }
}
