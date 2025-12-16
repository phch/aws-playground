import { Routes } from '@angular/router';
import { ProductTableComponent } from './components/product-table/product-table.component';
import { AuthComponent } from './components/auth/auth.component';

export const routes: Routes = [
  { path: '', redirectTo: '/products', pathMatch: 'full' },
  { path: 'login', component: AuthComponent },
  { path: 'products', component: ProductTableComponent },
  { path: '**', redirectTo: '/products' }
];
