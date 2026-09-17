import { Routes } from '@angular/router';
import { authGuard } from './auth/auth.guard';
import { LoginComponent } from './auth/login.component';
import { RegisterComponent } from './auth/register.component';
import { CreateOrderComponent } from './orders/create-order.component';
import { OrderDetailComponent } from './orders/order-detail.component';
import { OrderListComponent } from './orders/order-list.component';
import { customerRoutes } from './customers/customers.routes';
import { productRoutes } from './products/products.routes';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'orders' },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'orders', component: OrderListComponent, canActivate: [authGuard] },
  { path: 'orders/new', component: CreateOrderComponent, canActivate: [authGuard] },
  { path: 'orders/:id', component: OrderDetailComponent, canActivate: [authGuard] },
  ...productRoutes,
  ...customerRoutes,
  { path: '**', redirectTo: 'orders' }
];
