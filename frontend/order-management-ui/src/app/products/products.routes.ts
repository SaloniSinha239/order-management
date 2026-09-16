import { Routes } from '@angular/router';
import { roleGuard } from '../auth/role.guard';
import { ProductListComponent } from './product-list.component';
import { ProductDetailComponent } from './product-detail.component';
import { ProductFormComponent } from './product-form.component';

export const productRoutes: Routes = [
  {
    path: 'products',
    children: [
      { path: '', component: ProductListComponent },
      { path: 'new', component: ProductFormComponent, canActivate: [roleGuard('Admin', 'Manager')] },
      { path: ':id', component: ProductDetailComponent },
      { path: ':id/edit', component: ProductFormComponent, canActivate: [roleGuard('Admin', 'Manager')] }
    ]
  }
];
