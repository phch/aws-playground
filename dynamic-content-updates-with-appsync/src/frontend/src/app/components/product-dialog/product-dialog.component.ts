import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { Product } from '../../models/product.model';

export interface ProductDialogData {
  product?: Product;
  mode: 'create' | 'edit';
}

@Component({
  selector: 'app-product-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule
  ],
  templateUrl: './product-dialog.component.html',
  styleUrls: ['./product-dialog.component.css']
})
export class ProductDialogComponent {
  productForm: FormGroup;
  mode: 'create' | 'edit';

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<ProductDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ProductDialogData
  ) {
    this.mode = data.mode;
    this.productForm = this.fb.group({
      name: [data.product?.name || '', [Validators.required, Validators.minLength(1)]],
      description: [data.product?.description || ''],
      price: [data.product?.price || 0, [Validators.required, Validators.min(0)]],
      category: [data.product?.category || ''],
      stockQuantity: [data.product?.stockQuantity || 0, [Validators.required, Validators.min(0)]]
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    if (this.productForm.valid) {
      const formValue = this.productForm.value;
      const result = this.mode === 'edit' && this.data.product
        ? { id: this.data.product.id, ...formValue }
        : formValue;
      
      this.dialogRef.close(result);
    }
  }

  getTitle(): string {
    return this.mode === 'create' ? 'Add New Product' : 'Edit Product';
  }
}
