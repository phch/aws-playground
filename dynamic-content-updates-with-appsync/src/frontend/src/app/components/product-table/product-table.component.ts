import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime } from 'rxjs/operators';
import { Product, ProductMutationEvent, DeleteProductResponse } from '../../models/product.model';
import { ProductsService } from '../../services/products.service';
import { ProductDialogComponent } from '../product-dialog/product-dialog.component';
import { ErrorHandlerService } from '../../core/services/error-handler.service';
import { ConnectionStatus } from '../../core/models/connection.model';

@Component({
  selector: 'app-product-table',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatTooltipModule
  ],
  templateUrl: './product-table.component.html',
  styleUrls: ['./product-table.component.css']
})
export class ProductTableComponent implements OnInit, OnDestroy {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  
  dataSource = new MatTableDataSource<Product>([]);
  displayedColumns = ['id', 'name', 'description', 'price', 'category', 'stockQuantity', 'updatedAt', 'actions'];
  
  isLoading = false;
  connectionStatus: ConnectionStatus = {
    isConnected: false,
    subscriptionsActive: { create: false, update: false, delete: false },
    reconnectAttempts: 0
  };
  highlightedRows = new Set<string>();
  highlightTypes = new Map<string, 'create' | 'update'>();
  deletingRows = new Set<string>();
  
  private destroy$ = new Subject<void>();
  private mutationDebouncer$ = new Subject<ProductMutationEvent>();
  
  constructor(
    private productsService: ProductsService,
    private dialog: MatDialog,
    private errorHandler: ErrorHandlerService
  ) {}
  
  ngOnInit(): void {
    this.loadProducts();
    this.setupSubscriptions();
    this.setupMutationDebouncer();
    this.setupConnectionStatusTracking();
  }
  
  private loadProducts(): void {
    this.isLoading = true;
    
    this.productsService.listProducts().subscribe({
      next: (products) => {
        this.dataSource.data = products;
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;
        this.isLoading = false;
      },
      error: (error) => {
        this.isLoading = false;
        this.errorHandler.showError(error);
      }
    });
  }

  private setupConnectionStatusTracking(): void {
    this.productsService.connectionStatus$
      .pipe(takeUntil(this.destroy$))
      .subscribe(status => {
        this.connectionStatus = status;
      });
  }
  
  private setupSubscriptions(): void {
    this.productsService.subscribeToMutations()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (event) => {
          this.mutationDebouncer$.next(event);
        },
        error: (error) => {
          this.errorHandler.logError('subscriptions', error);
          this.errorHandler.showError('Real-time updates disconnected');
        }
      });
  }
  
  private setupMutationDebouncer(): void {
    this.mutationDebouncer$
      .pipe(
        debounceTime(300),
        takeUntil(this.destroy$)
      )
      .subscribe((event) => {
        switch (event.type) {
          case 'create':
            if (event.product) {
              this.handleCreateEvent(event.product);
            }
            break;
          case 'update':
            if (event.product) {
              this.handleUpdateEvent(event.product);
            }
            break;
          case 'delete':
            if (event.deleteResponse) {
              this.handleDeleteEvent(event.deleteResponse);
            }
            break;
        }
      });
  }
  
  private handleCreateEvent(product: Product): void {
    const currentData = this.dataSource.data;
    this.dataSource.data = [...currentData, product];
    this.highlightRow(product.id, 'create');
    this.errorHandler.showInfo(`New product added: ${product.name}`);
  }
  
  private handleUpdateEvent(product: Product): void {
    const currentData = this.dataSource.data;
    const index = currentData.findIndex(p => p.id === product.id);
    
    if (index !== -1) {
      currentData[index] = product;
      this.dataSource.data = [...currentData];
      this.highlightRow(product.id, 'update');
      this.errorHandler.showInfo(`Product updated: ${product.name}`);
    }
  }
  
  private handleDeleteEvent(deleteResponse: DeleteProductResponse): void {
    // Add fade-out animation before removing
    this.deletingRows.add(deleteResponse.id);
    
    // Wait for animation to complete before removing from data
    setTimeout(() => {
      const currentData = this.dataSource.data;
      const filteredData = currentData.filter(p => p.id !== deleteResponse.id);
      
      this.dataSource.data = filteredData;
      this.deletingRows.delete(deleteResponse.id);
      
      // Adjust paginator to previous page if current page becomes empty
      if (this.paginator && filteredData.length > 0) {
        const currentPageIndex = this.paginator.pageIndex;
        const pageSize = this.paginator.pageSize;
        const maxPageIndex = Math.ceil(filteredData.length / pageSize) - 1;
        
        if (currentPageIndex > maxPageIndex) {
          this.paginator.previousPage();
        }
      }
    }, 500);
    
    this.errorHandler.showInfo(`Product deleted`);
  }
  
  private highlightRow(productId: string, type: 'create' | 'update'): void {
    this.highlightedRows.add(productId);
    this.highlightTypes.set(productId, type);
    
    setTimeout(() => {
      this.highlightedRows.delete(productId);
      this.highlightTypes.delete(productId);
    }, 2000);
  }
  
  getRowClass(product: Product): string {
    const classes: string[] = [];
    
    if (this.deletingRows.has(product.id)) {
      classes.push('deleting-row');
    }
    
    if (this.highlightedRows.has(product.id)) {
      const type = this.highlightTypes.get(product.id);
      if (type === 'create') {
        classes.push('highlight-create');
      } else if (type === 'update') {
        classes.push('highlight-update');
      }
    }
    
    return classes.join(' ');
  }
  
  getConnectionStatusTooltip(): string {
    if (this.connectionStatus.isConnected) {
      const activeCount = Object.values(this.connectionStatus.subscriptionsActive)
        .filter(Boolean).length;
      return `Real-time updates active (${activeCount}/3 subscriptions connected)`;
    }
    
    if (this.connectionStatus.reconnectAttempts > 0) {
      return `Reconnecting... (attempt ${this.connectionStatus.reconnectAttempts}/5)`;
    }
    
    return 'Real-time updates disconnected';
  }

  get isConnected(): boolean {
    return this.connectionStatus.isConnected;
  }
  
  openAddDialog(): void {
    const dialogRef = this.dialog.open(ProductDialogComponent, {
      width: '500px',
      data: { mode: 'create' }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.productsService.createProduct(result).subscribe({
          next: () => {
            this.errorHandler.showSuccess('Product created successfully');
          },
          error: (error) => {
            this.errorHandler.showError(error);
          }
        });
      }
    });
  }

  openEditDialog(product: Product): void {
    const dialogRef = this.dialog.open(ProductDialogComponent, {
      width: '500px',
      data: { mode: 'edit', product }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.productsService.updateProduct(result).subscribe({
          next: () => {
            this.errorHandler.showSuccess('Product updated successfully');
          },
          error: (error) => {
            this.errorHandler.showError(error);
          }
        });
      }
    });
  }

  deleteProduct(product: Product): void {
    if (confirm(`Are you sure you want to delete "${product.name}"?`)) {
      this.productsService.deleteProduct(product.id).subscribe({
        next: () => {
          this.errorHandler.showSuccess('Product deleted successfully');
        },
        error: (error) => {
          this.errorHandler.showError(error);
        }
      });
    }
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.productsService.unsubscribeAll();
  }
}
