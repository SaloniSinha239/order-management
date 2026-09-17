import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { PagedResult, ProductDto, ProductService } from './product.service';

@Component({
  standalone: true,
  imports: [CurrencyPipe],
  template: `
    <div class="container mt-4">
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h1 class="h4 mb-0">Products</h1>
        @if (canManage()) {
          <button class="btn btn-primary" type="button" (click)="create()">New product</button>
        }
      </div>

      <div class="card shadow-sm mb-3">
        <div class="card-body">
          <div class="row g-2 align-items-end">
            <div class="col-md-5">
              <label class="form-label small mb-1" for="search">Search (name or SKU)</label>
              <input
                id="search"
                class="form-control"
                [value]="search()"
                (input)="onSearchInput($event)"
                (keyup.enter)="applyFilters()"
                placeholder="e.g. keyboard" />
            </div>
            <div class="col-md-4">
              <label class="form-label small mb-1" for="categoryId">Category ID</label>
              <input
                id="categoryId"
                class="form-control"
                [value]="categoryId()"
                (input)="onCategoryInput($event)"
                (keyup.enter)="applyFilters()"
                placeholder="Category GUID (optional)" />
            </div>
            <div class="col-md-3">
              <label class="form-label small mb-1" for="pageSize">Page size</label>
              <select id="pageSize" class="form-select" [value]="pageSize()" (change)="onPageSizeChange($event)">
                @for (size of pageSizes; track size) {
                  <option [value]="size">{{ size }}</option>
                }
              </select>
            </div>
          </div>
          <div class="mt-2">
            <button class="btn btn-sm btn-outline-secondary" type="button" (click)="applyFilters()">Apply</button>
            <button class="btn btn-sm btn-link" type="button" (click)="clearFilters()">Clear</button>
          </div>
        </div>
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
        @if (data(); as paged) {
        <div class="table-responsive">
          <table class="table table-hover align-middle">
            <thead class="table-light">
              <tr>
                <th scope="col">Name</th>
                <th scope="col">SKU</th>
                <th scope="col" class="text-end">Price</th>
                <th scope="col" class="text-end">Stock</th>
                <th scope="col">Category</th>
                <th scope="col" class="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (product of paged.items; track product.id) {
                <tr>
                  <td>{{ product.name }}</td>
                  <td><code>{{ product.sku }}</code></td>
                  <td class="text-end">{{ product.price | currency }}</td>
                  <td class="text-end">{{ product.stockQuantity }}</td>
                  <td><code>{{ product.categoryId.slice(0, 8) }}…</code></td>
                  <td class="text-end">
                    <button class="btn btn-sm btn-outline-primary me-1" type="button" (click)="detail(product.id)">
                      View
                    </button>
                    @if (canManage()) {
                      <button class="btn btn-sm btn-outline-secondary me-1" type="button" (click)="edit(product.id)">
                        Edit
                      </button>
                      <button
                        class="btn btn-sm btn-outline-danger"
                        type="button"
                        [disabled]="deleting()"
                        (click)="remove(product)">
                        Delete
                      </button>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <div class="d-flex justify-content-between align-items-center">
          <span class="text-muted small">
            {{ paged.totalCount }} product(s) — page {{ paged.page }} of {{ paged.totalPages }}
          </span>
          <div class="btn-group">
            <button
              class="btn btn-sm btn-outline-secondary"
              type="button"
              [disabled]="paged.page <= 1 || loading()"
              (click)="goToPage(paged.page - 1)">
              ‹ Prev
            </button>
            <button
              class="btn btn-sm btn-outline-secondary"
              type="button"
              [disabled]="paged.page >= paged.totalPages || loading()"
              (click)="goToPage(paged.page + 1)">
              Next ›
            </button>
          </div>
        </div>
        }
      }
    </div>
  `
})
export class ProductListComponent implements OnInit {
  private readonly productService = inject(ProductService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly canManage = computed(() => this.authService.hasRole('Admin') || this.authService.hasRole('Manager'));
  readonly pageSizes = [5, 10, 20, 50];

  readonly data = signal<PagedResult<ProductDto> | null>(null);
  readonly loading = signal(true);
  readonly deleting = signal(false);
  readonly error = signal('');

  readonly search = signal('');
  readonly categoryId = signal('');
  readonly page = signal(1);
  readonly pageSize = signal(10);

  ngOnInit(): void {
    this.load();
  }

  onSearchInput(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value.trim());
  }

  onCategoryInput(event: Event): void {
    this.categoryId.set((event.target as HTMLInputElement).value.trim());
  }

  onPageSizeChange(event: Event): void {
    this.pageSize.set(Number((event.target as HTMLSelectElement).value) || 10);
    this.page.set(1);
    this.load();
  }

  applyFilters(): void {
    this.page.set(1);
    this.load();
  }

  clearFilters(): void {
    this.search.set('');
    this.categoryId.set('');
    this.page.set(1);
    this.load();
  }

  goToPage(target: number): void {
    this.page.set(target);
    this.load();
  }

  detail(productId: string): void {
    void this.router.navigate(['/products', productId]);
  }

  edit(productId: string): void {
    void this.router.navigate(['/products', productId, 'edit']);
  }

  create(): void {
    void this.router.navigate(['/products', 'new']);
  }

  remove(product: ProductDto): void {
    if (!confirm(`Delete product "${product.name}"?`)) {
      return;
    }

    this.deleting.set(true);
    this.productService.deleteProduct(product.id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.load();
      },
      error: () => {
        this.deleting.set(false);
        this.error.set('Could not delete the product.');
      }
    });
  }

  private load(): void {
    this.loading.set(true);
    this.error.set('');

    this.productService
      .getProducts(this.page(), this.pageSize(), this.categoryId() || undefined, this.search() || undefined)
      .subscribe({
        next: result => {
          this.data.set(result);
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Could not load products.');
          this.loading.set(false);
        }
      });
  }
}
