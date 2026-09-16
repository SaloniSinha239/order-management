import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { ProductService } from './product.service';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div class="container mt-4" style="max-width: 640px;">
      <h1 class="h4 mb-3">{{ isEdit() ? 'Edit product' : 'New product' }}</h1>

      @if (loading()) {
        <div class="d-flex justify-content-center my-5">
          <div class="spinner-border" role="status">
            <span class="visually-hidden">Loading…</span>
          </div>
        </div>
      } @else {
        @if (error()) {
          <div class="alert alert-danger">{{ error() }}</div>
        }

        <form [formGroup]="form" (ngSubmit)="submit()">
          <div class="card shadow-sm mb-3">
            <div class="card-body">
              <div class="mb-3">
                <label class="form-label" for="name">Name</label>
                <input id="name" class="form-control" formControlName="name" />
                @if (form.controls.name.touched && form.controls.name.invalid) {
                  <div class="text-danger small">Name is required.</div>
                }
              </div>

              <div class="mb-3">
                <label class="form-label" for="sku">SKU</label>
                <input id="sku" class="form-control" formControlName="sku" />
                @if (form.controls.sku.touched && form.controls.sku.invalid) {
                  <div class="text-danger small">SKU is required.</div>
                }
              </div>

              <div class="row">
                <div class="col-md-6 mb-3">
                  <label class="form-label" for="price">Price</label>
                  <input id="price" class="form-control" type="number" step="0.01" min="0" formControlName="price" />
                  @if (form.controls.price.touched && form.controls.price.invalid) {
                    <div class="text-danger small">Price must be 0 or greater.</div>
                  }
                </div>
                <div class="col-md-6 mb-3">
                  <label class="form-label" for="stockQuantity">Stock quantity</label>
                  <input id="stockQuantity" class="form-control" type="number" min="0" formControlName="stockQuantity" />
                  @if (form.controls.stockQuantity.touched && form.controls.stockQuantity.invalid) {
                    <div class="text-danger small">Stock must be 0 or greater.</div>
                  }
                </div>
              </div>

              <div class="mb-0">
                <label class="form-label" for="categoryId">Category ID</label>
                <input id="categoryId" class="form-control" formControlName="categoryId" placeholder="Category GUID" />
                @if (form.controls.categoryId.touched && form.controls.categoryId.invalid) {
                  <div class="text-danger small">A category ID is required.</div>
                }
              </div>
            </div>
          </div>

          <div class="d-flex gap-2 mb-4">
            <button class="btn btn-primary" type="submit" [disabled]="form.invalid || saving()">
              @if (saving()) {
                <span class="spinner-border spinner-border-sm me-1" aria-hidden="true"></span>
              }
              {{ isEdit() ? 'Save changes' : 'Create product' }}
            </button>
            <button class="btn btn-outline-secondary" type="button" (click)="back()">Back</button>
          </div>
        </form>
      }
    </div>
  `
})
export class ProductFormComponent implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly productService = inject(ProductService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly isEdit = signal(false);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal('');

  private productId: string | null = null;

  protected readonly form = this.formBuilder.nonNullable.group({
    name: ['', Validators.required],
    sku: ['', Validators.required],
    price: [0, [Validators.required, Validators.min(0)]],
    stockQuantity: [0, [Validators.required, Validators.min(0)]],
    categoryId: ['', Validators.required]
  });

  ngOnInit(): void {
    this.productId = this.route.snapshot.paramMap.get('id');
    this.isEdit.set(!!this.productId);

    if (this.productId) {
      this.load(this.productId);
    }
  }

  submit(): void {
    this.error.set('');

    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }

    const request = this.form.getRawValue();
    this.saving.set(true);

    const call$ = this.isEdit() && this.productId
      ? this.productService.updateProduct(this.productId, request)
      : this.productService.createProduct(request);

    call$.subscribe({
      next: saved => {
        void this.router.navigate(['/products', saved.id]);
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        this.error.set(
          err.status === 0
            ? 'API unreachable.'
            : 'Could not save the product. Check that the category ID exists.'
        );
      }
    });
  }

  back(): void {
    void this.router.navigate(['/products']);
  }

  private load(productId: string): void {
    this.loading.set(true);
    this.productService.getProductById(productId).subscribe({
      next: product => {
        this.form.patchValue({
          name: product.name,
          sku: product.sku,
          price: product.price,
          stockQuantity: product.stockQuantity,
          categoryId: product.categoryId
        });
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Product not found.');
        this.loading.set(false);
      }
    });
  }
}
