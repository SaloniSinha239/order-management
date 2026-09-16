import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { CustomerDto, CustomerService } from './customer.service';

@Component({
  standalone: true,
  template: `
    <div class="container mt-4">
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h1 class="h4 mb-0">Customers</h1>
        <button class="btn btn-outline-primary" type="button" (click)="openMyProfile()">
          My profile
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
      } @else if (data(); as page) {
        <div class="table-responsive">
          <table class="table table-hover align-middle">
            <thead class="table-light">
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Email</th>
                <th scope="col">Phone</th>
                <th scope="col">Address</th>
                <th scope="col">User</th>
                @if (isAdmin()) {
                  <th scope="col" class="text-end">Actions</th>
                }
              </tr>
            </thead>
            <tbody>
              @for (customer of page.items; track customer.id) {
                <tr>
                  <td>{{ customer.name }}</td>
                  <td>{{ customer.email }}</td>
                  <td>{{ customer.phone }}</td>
                  <td>{{ customer.address }}</td>
                  <td><code>{{ customer.userId.slice(0, 8) }}…</code></td>
                  @if (isAdmin()) {
                    <td class="text-end">
                      <button
                        class="btn btn-sm btn-outline-danger"
                        type="button"
                        [disabled]="deleting()"
                        (click)="remove(customer)">
                        Delete
                      </button>
                    </td>
                  }
                </tr>
              }
            </tbody>
          </table>
        </div>

        <div class="d-flex justify-content-between align-items-center">
          <span class="text-muted small">
            {{ page.totalCount }} customer(s) — page {{ page.page }} of {{ totalPages(page) }}
          </span>
          <div class="btn-group">
            <button
              class="btn btn-sm btn-outline-secondary"
              type="button"
              [disabled]="page.page <= 1 || loading()"
              (click)="goToPage(page.page - 1)">
              ‹ Prev
            </button>
            <button
              class="btn btn-sm btn-outline-secondary"
              type="button"
              [disabled]="page.page >= totalPages(page) || loading()"
              (click)="goToPage(page.page + 1)">
              Next ›
            </button>
          </div>
        </div>
      }
    </div>
  `
})
export class CustomerListComponent implements OnInit {
  private readonly customerService = inject(CustomerService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly isAdmin = computed(() => this.authService.hasRole('Admin'));
  readonly pageSizes = [5, 10, 20, 50];

  readonly data = signal<Paged | null>(null);
  readonly loading = signal(true);
  readonly deleting = signal(false);
  readonly error = signal('');
  readonly page = signal(1);
  readonly pageSize = signal(10);

  ngOnInit(): void {
    this.load();
  }

  totalPages(page: Paged): number {
    return Math.max(1, Math.ceil(page.totalCount / page.pageSize));
  }

  goToPage(target: number): void {
    this.page.set(target);
    this.load();
  }

  openMyProfile(): void {
    void this.router.navigate(['/customers', 'me']);
  }

  remove(customer: CustomerDto): void {
    if (!confirm(`Delete customer "${customer.name}"?`)) {
      return;
    }

    this.deleting.set(true);
    this.customerService.deleteCustomer(customer.id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.load();
      },
      error: () => {
        this.deleting.set(false);
        this.error.set('Could not delete the customer.');
      }
    });
  }

  private load(): void {
    this.loading.set(true);
    this.error.set('');
    this.customerService.getCustomers(this.page(), this.pageSize()).subscribe({
      next: result => {
        this.data.set(result);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Could not load customers.');
        this.loading.set(false);
      }
    });
  }
}

interface Paged {
  items: unknown[];
  page: number;
  pageSize: number;
  totalCount: number;
}
