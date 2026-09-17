import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { OrderDto, OrderService, OrderStatus } from './order.service';

@Component({
  standalone: true,
  imports: [CurrencyPipe, DatePipe],
  template: `
    <div class="container mt-4" style="max-width: 860px;">
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h1 class="h4 mb-0">Order</h1>
        <button class="btn btn-outline-secondary" type="button" (click)="back()">Back</button>
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
      } @else {
        @if (order(); as current) {
        <div class="card shadow-sm mb-3">
          <div class="card-body">
            <div class="row g-3">
              <div class="col-md-4">
                <div class="text-muted small">Order #</div>
                <code class="text-wrap">{{ current.id }}</code>
              </div>
              <div class="col-md-4">
                <div class="text-muted small">Order date</div>
                <div>{{ current.orderDate | date: 'medium' }}</div>
              </div>
              <div class="col-md-4">
                <div class="text-muted small">Status</div>
                <div><span [class]="'badge ' + badgeClass(current.status)">{{ statusLabel(current.status) }}</span></div>
              </div>
              <div class="col-md-4">
                <div class="text-muted small">Customer</div>
                <code class="text-wrap">{{ current.customerId }}</code>
              </div>
              <div class="col-md-4">
                <div class="text-muted small">Total</div>
                <div class="fs-5">{{ current.totalAmount | currency }}</div>
              </div>
            </div>
          </div>
        </div>

        <div class="card shadow-sm mb-3">
          <div class="card-header">Items</div>
          <div class="table-responsive">
            <table class="table table-sm mb-0 align-middle">
              <thead class="table-light">
                <tr>
                  <th scope="col">Product</th>
                  <th scope="col" class="text-end">Qty</th>
                  <th scope="col" class="text-end">Unit price</th>
                  <th scope="col" class="text-end">Line total</th>
                </tr>
              </thead>
              <tbody>
                @for (item of current.items; track item.id) {
                  <tr>
                    <td><code>{{ item.productId }}</code></td>
                    <td class="text-end">{{ item.quantity }}</td>
                    <td class="text-end">{{ item.unitPrice | currency }}</td>
                    <td class="text-end">{{ item.quantity * item.unitPrice | currency }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>

        @if (canManage()) {
          <div class="card shadow-sm">
            <div class="card-body d-flex gap-2 align-items-end flex-wrap">
              <div>
                <label class="form-label small mb-1" for="status">Update status</label>
                <select id="status" class="form-select" [value]="selectedStatus()" (change)="onStatusChange($event)">
                  @for (status of statuses; track status) {
                    <option [value]="status" [selected]="status === selectedStatus()">{{ statusLabel(status) }}</option>
                  }
                </select>
              </div>
              <button class="btn btn-primary" type="button" [disabled]="saving()" (click)="applyStatus()">
                @if (saving()) {
                  <span class="spinner-border spinner-border-sm me-1" aria-hidden="true"></span>
                }
                Apply
              </button>
              <button class="btn btn-outline-danger" type="button" [disabled]="saving()" (click)="cancel()">
                Cancel order
              </button>
            </div>
          </div>
        }
        }
      }
    </div>
  `
})
export class OrderDetailComponent implements OnInit {
  private readonly orderService = inject(OrderService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);

  readonly canManage = computed(() => this.authService.hasRole('Admin') || this.authService.hasRole('Manager'));
  readonly statuses: OrderStatus[] = [
    OrderStatus.Pending,
    OrderStatus.Processing,
    OrderStatus.Shipped,
    OrderStatus.Delivered,
    OrderStatus.Cancelled
  ];

  readonly order = signal<OrderDto | null>(null);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly selectedStatus = signal<OrderStatus>(OrderStatus.Pending);

  ngOnInit(): void {
    const orderId = this.route.snapshot.paramMap.get('id');
    if (orderId) {
      this.load(orderId);
    }
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

  onStatusChange(event: Event): void {
    this.selectedStatus.set(Number((event.target as HTMLSelectElement).value) as OrderStatus);
  }

  applyStatus(): void {
    const current = this.order();
    if (!current || this.saving()) {
      return;
    }

    this.saving.set(true);
    this.orderService.updateStatus(current.id, this.selectedStatus()).subscribe({
      next: updated => {
        this.order.set(updated);
        this.selectedStatus.set(updated.status);
        this.saving.set(false);
        this.error.set('');
      },
      error: () => {
        this.saving.set(false);
        this.error.set('Could not update status. The transition may not be allowed.');
      }
    });
  }

  cancel(): void {
    const current = this.order();
    if (!current || this.saving()) {
      return;
    }

    this.saving.set(true);
    this.orderService.cancelOrder(current.id).subscribe({
      next: () => this.load(current.id),
      error: () => {
        this.saving.set(false);
        this.error.set('Could not cancel the order.');
      }
    });
  }

  back(): void {
    void this.router.navigate(['/orders']);
  }

  private load(orderId: string): void {
    this.loading.set(true);
    this.error.set('');
    this.orderService.getOrderById(orderId).subscribe({
      next: order => {
        this.order.set(order);
        this.selectedStatus.set(order.status);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Order not found or not accessible.');
        this.loading.set(false);
      }
    });
  }
}
