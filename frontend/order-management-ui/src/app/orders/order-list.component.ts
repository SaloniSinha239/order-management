import { Component, OnInit, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { OrderDto, OrderService, OrderStatus } from './order.service';

@Component({
  standalone: true,
  imports: [CurrencyPipe, DatePipe],
  template: `
    <div class="container mt-4">
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h1 class="h4 mb-0">Orders</h1>
        <button class="btn btn-primary" type="button" (click)="createOrder()">
          New order
        </button>
      </div>

      @if (error()) {
        <div class="alert alert-danger">{{ error() }}</div>
      }

      @if (loading()) {
        <div class="d-flex justify-content-center my-5">
          <div class="spinner-border" role="status">
            <span class="visually-hidden">Loading…</span>
          </div>
        </div>
      } @else if (orders().length === 0 && !error()) {
        <div class="alert alert-info">No orders found.</div>
      } @else {
        <div class="table-responsive">
          <table class="table table-hover align-middle">
            <thead class="table-light">
              <tr>
                <th scope="col">Order date</th>
                <th scope="col">Order #</th>
                <th scope="col">Customer</th>
                <th scope="col">Status</th>
                <th scope="col" class="text-end">Total</th>
                <th scope="col"></th>
              </tr>
            </thead>
            <tbody>
              @for (order of orders(); track order.id) {
                <tr>
                  <td>{{ order.orderDate | date: 'medium' }}</td>
                  <td><code>{{ order.id.slice(0, 8) }}…</code></td>
                  <td><code>{{ order.customerId.slice(0, 8) }}…</code></td>
                  <td><span [class]="'badge ' + badgeClass(order.status)">{{ statusLabel(order.status) }}</span></td>
                  <td class="text-end">{{ order.totalAmount | currency }}</td>
                  <td class="text-end">
                    <button class="btn btn-sm btn-outline-primary" type="button" (click)="openDetail(order.id)">
                      View
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  `
})
export class OrderListComponent implements OnInit {
  private readonly orderService = inject(OrderService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly orders = signal<OrderDto[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');

  ngOnInit(): void {
    const customerId = this.route.snapshot.queryParamMap.get('customerId') ?? undefined;
    this.orderService.getOrdersByCustomer(customerId).subscribe({
      next: orders => {
        this.orders.set(orders);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Could not load orders. Admin/Manager users must provide a customerId query parameter.');
        this.loading.set(false);
      }
    });
  }

  badgeClass(status: OrderStatus): string {
    switch (status) {
      case OrderStatus.Pending: return 'bg-secondary';
      case OrderStatus.Processing: return 'bg-info';
      case OrderStatus.Shipped: return 'bg-primary';
      case OrderStatus.Delivered: return 'bg-success';
      case OrderStatus.Cancelled: return 'bg-danger';
      default: return 'bg-secondary';
    }
  }

  statusLabel(status: OrderStatus): string {
    return OrderStatus[status];
  }

  openDetail(orderId: string): void {
    void this.router.navigate(['/orders', orderId]);
  }

  createOrder(): void {
    void this.router.navigate(['/orders/new']);
  }
}
