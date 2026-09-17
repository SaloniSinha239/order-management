import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { ProductDto, ProductService } from './product.service';

@Component({
  standalone: true,
  imports: [CurrencyPipe],
  template: `
    <div class="container mt-4" style="max-width: 720px;">
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h1 class="h4 mb-0">Product</h1>
        <div class="d-flex gap-2">
          @if (canManage()) {
            <button class="btn btn-outline-secondary" type="button" (click)="edit()">Edit</button>
          }
          <button class="btn btn-outline-secondary" type="button" (click)="back()">Back</button>
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
        @if (product(); as current) {
        <div class="card shadow-sm mb-3">
          <div class="card-body">
            <div class="row g-3">
              <div class="col-md-6">
                <div class="text-muted small">Name</div>
                <div class="fs-5">{{ current.name }}</div>
              </div>
              <div class="col-md-6">
                <div class="text-muted small">SKU</div>
                <div><code>{{ current.sku }}</code></div>
              </div>
              <div class="col-md-4">
                <div class="text-muted small">Price</div>
                <div class="fs-5">{{ current.price | currency }}</div>
              </div>
              <div class="col-md-4">
                <div class="text-muted small">Stock</div>
                <div class="fs-5">{{ current.stockQuantity }}</div>
              </div>
              <div class="col-md-4">
                <div class="text-muted small">Category</div>
                <div><code>{{ current.categoryId }}</code></div>
              </div>
            </div>
          </div>
        </div>

        @if (canManage()) {
          <div class="card shadow-sm">
            <div class="card-body d-flex gap-2 align-items-end flex-wrap">
              <div>
                <label class="form-label small mb-1" for="delta">Stock adjustment</label>
                <input
                  id="delta"
                  class="form-control"
                  type="number"
                  [value]="stockDelta()"
                  (input)="onDeltaInput($event)"
                  placeholder="e.g. 10 or -3" />
              </div>
              <button class="btn btn-primary" type="button" [disabled]="adjusting()" (click)="adjustStock()">
                @if (adjusting()) {
                  <span class="spinner-border spinner-border-sm me-1" aria-hidden="true"></span>
                }
                Apply
              </button>
            </div>
          </div>
        }
        }
      }
    </div>
  `
})
export class ProductDetailComponent implements OnInit {
  private readonly productService = inject(ProductService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly canManage = computed(() => this.authService.hasRole('Admin') || this.authService.hasRole('Manager'));

  readonly product = signal<ProductDto | null>(null);
  readonly loading = signal(true);
  readonly adjusting = signal(false);
  readonly error = signal('');
  readonly stockDelta = signal(0);

  ngOnInit(): void {
    const productId = this.route.snapshot.paramMap.get('id');
    if (productId) {
      this.load(productId);
    }
  }

  onDeltaInput(event: Event): void {
    this.stockDelta.set(Number((event.target as HTMLInputElement).value) || 0);
  }

  adjustStock(): void {
    const current = this.product();
    const delta = this.stockDelta();

    if (!current || delta === 0 || this.adjusting()) {
      return;
    }

    this.adjusting.set(true);
    this.productService.adjustStock(current.id, delta).subscribe({
      next: updated => {
        this.product.set(updated);
        this.stockDelta.set(0);
        this.adjusting.set(false);
        this.error.set('');
      },
      error: () => {
        this.adjusting.set(false);
        this.error.set('Adjustment rejected. Stock cannot go below zero.');
      }
    });
  }

  edit(): void {
    const current = this.product();
    if (current) {
      void this.router.navigate(['/products', current.id, 'edit']);
    }
  }

  back(): void {
    void this.router.navigate(['/products']);
  }

  private load(productId: string): void {
    this.loading.set(true);
    this.error.set('');
    this.productService.getProductById(productId).subscribe({
      next: product => {
        this.product.set(product);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Product not found.');
        this.loading.set(false);
      }
    });
  }
}
