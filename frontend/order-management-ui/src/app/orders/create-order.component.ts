import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../auth/auth.service';
import { CreateOrderRequest, OrderService } from './order.service';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div class="container mt-4" style="max-width: 720px;">
      <h1 class="h4 mb-3">New order</h1>

      @if (error()) {
        <div class="alert alert-danger">{{ error() }}</div>
      }

      <form [formGroup]="form" (ngSubmit)="submit()">
        <div class="card shadow-sm mb-3">
          <div class="card-body">
            <div class="mb-0">
              <label class="form-label" for="customerId">Customer ID</label>
              <input
                id="customerId"
                class="form-control"
                formControlName="customerId"
                placeholder="Customer GUID" />
              @if (form.controls.customerId.touched && form.controls.customerId.invalid) {
                <div class="text-danger small">A customer ID is required.</div>
              }
            </div>
          </div>
        </div>

        <div class="card shadow-sm mb-3" formArrayName="items">
          <div class="card-header d-flex justify-content-between align-items-center">
            <span>Items</span>
            <button class="btn btn-sm btn-outline-primary" type="button" (click)="addItem()">
              + Add item
            </button>
          </div>
          <div class="card-body">
            @for (item of items.controls; track $index; let i = $index) {
              <div class="row g-2 align-items-start mb-2" [formGroupName]="i">
                <div class="col">
                  <input
                    class="form-control"
                    formControlName="productId"
                    placeholder="Product GUID" />
                  @if (item.controls.productId.touched && item.controls.productId.invalid) {
                    <div class="text-danger small">A product ID is required.</div>
                  }
                </div>
                <div class="col-auto">
                  <input
                    class="form-control"
                    type="number"
                    min="1"
                    style="width: 120px;"
                    formControlName="quantity" />
                  @if (item.controls.quantity.touched && item.controls.quantity.invalid) {
                    <div class="text-danger small">Min. 1.</div>
                  }
                </div>
                <div class="col-auto">
                  <button
                    class="btn btn-outline-danger"
                    type="button"
                    [disabled]="items.controls.length === 1"
                    (click)="removeItem($index)">
                    Remove
                  </button>
                </div>
              </div>
            }
          </div>
        </div>

        <div class="d-flex gap-2 mb-4">
          <button class="btn btn-primary" type="submit" [disabled]="form.invalid || loading()">
            @if (loading()) {
              <span class="spinner-border spinner-border-sm me-1" aria-hidden="true"></span>
            }
            Create order
          </button>
          <button class="btn btn-outline-secondary" type="button" (click)="back()">Back</button>
        </div>
      </form>
    </div>
  `
})
export class CreateOrderComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly orderService = inject(OrderService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly error = signal('');

  protected readonly form = this.formBuilder.nonNullable.group({
    customerId: [this.currentUserId ?? '', Validators.required],
    items: this.formBuilder.nonNullable.array([
      this.formBuilder.nonNullable.group({
        productId: ['', Validators.required],
        quantity: [1, [Validators.required, Validators.min(1)]]
      })
    ])
  });

  private get currentUserId(): string | null {
    const token = this.authService.getToken();
    if (!token) {
      return null;
    }

    try {
      const payload = JSON.parse(atob(token.split('.')[1])) as Record<string, unknown>;
      return typeof payload['sub'] === 'string' ? payload['sub'] : null;
    } catch {
      return null;
    }
  }

  protected get items() {
    return this.form.controls.items;
  }

  addItem(): void {
    this.items.push(
      this.formBuilder.nonNullable.group({
        productId: ['', Validators.required],
        quantity: [1, [Validators.required, Validators.min(1)]]
      })
    );
  }

  removeItem(index: number): void {
    if (this.items.length > 1) {
      this.items.removeAt(index);
    }
  }

  submit(): void {
    this.error.set('');

    if (this.form.invalid || this.loading()) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const request: CreateOrderRequest = {
      customerId: raw.customerId,
      items: raw.items.map(item => ({
        productId: item.productId,
        quantity: Number(item.quantity)
      }))
    };

    this.loading.set(true);
    this.orderService.createOrder(request).subscribe({
      next: created => {
        void this.router.navigate(['/orders', created.id]);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.error.set(
          err.status === 0
            ? 'API unreachable.'
            : 'Could not create the order. Check product IDs, quantities and available stock.'
        );
      }
    });
  }

  back(): void {
    void this.router.navigate(['/orders']);
  }
}
