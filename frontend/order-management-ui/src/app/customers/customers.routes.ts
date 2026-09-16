import { Routes } from '@angular/router';
import { authGuard } from '../auth/auth.guard';
import { roleGuard } from '../auth/role.guard';
import { CustomerListComponent } from './customer-list.component';
import { CustomerProfileComponent } from './customer-profile.component';

export const customerRoutes: Routes = [
  {
    path: 'customers',
    children: [
      { path: '', component: CustomerListComponent, canActivate: [roleGuard('Admin', 'Manager')] },
      { path: 'me', component: CustomerProfileComponent, canActivate: [authGuard] }
    ]
  }
];
