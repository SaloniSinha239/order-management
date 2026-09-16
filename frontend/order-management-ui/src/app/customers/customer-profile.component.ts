import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CustomerDto, CustomerService } from './customer.service';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div class="container mt-4" style="max-width: 640px;">
      <h1 class="h4 mb-3">My profile</h1>

      @if (error()) {
        <div class="alert alert-danger">{{ error() }}</div>
      }

      @if (success()) {
        <div class="alert alert-success">Profile saved.</div>
      }

      @if (loading()) {
        <div class="d-flex justify-content-center my-5">
          <div class="spinner-border" role="status">
            <span class="visually-hidden">Loading…</span>
          </div>
        </div>
      } @else if (!hasProfile()) {
        <div class="alert alert-info">
          No customer profile is linked to your account yet. An administrator can create one for you.
        </div>
      } @else {
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
                <label class="form-label" for="email">Email</label>
                <input id="email" class="form-control" type="email" formControlName="email" />
                @if (form.controls.email.touched && form.controls.email.invalid) {
                  <div class="text-danger small">A valid email is required.</div>
                }
              </div>

              <div class="mb-3">
                <label class="form-label" for="phone">Phone</label>
                <input id="phone" class="form-control" formControlName="phone" />
              </div>

              <div class="mb-0">
                <label class="form-label" for="address">Address</label>
                <input id="address" class="form-control" formControlName="address" />
              </div>
            </div>
          </div>

          <div class="d-flex gap-2 mb-4">
            <button class="btn btn-primary" type="submit" [disabled]="form.invalid || saving()">
              @if (saving()) {
                <span class="spinner-border spinner-border-sm me-1" aria-hidden="true"></span>
              }
              Save changes
            </button>
          </div>
        </form>
      }
    </div>
  `
})
export class CustomerProfileComponent implements OnInit {
  private readonly customerService = inject(CustomerService);
  private readonly formBuilder = inject(FormBuilder);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly success = signal(false);
  readonly hasProfile = signal(false);

  private customerId: string | null = null;
  private userId: string | null = null;

  protected readonly form = this.formBuilder.nonNullable.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
    address: ['']
  });

  ngOnInit(): void {
    this.load();
  }

  submit(): void {
    this.error.set('');
    this.success.set(false);

    if (this.form.invalid || this.saving() || !this.customerId) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    this.saving.set(true);
    this.customerService
      .updateCustomer(this.customerId, {
        name: raw.name,
        email: raw.email,
        phone: raw.phone,
        address: raw.address,
        userId: this.userId ?? ''
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.success.set(true);
        },
        error: () => {
          this.saving.set(false);
          this.error.set('Could not save the profile.');
        }
      });
  }

  private load(): void {
    this.loading.set(true);
    this.error.set('');
    this.customerService.getMyProfile().subscribe({
      next: profile => {
        this.applyProfile(profile);
        this.loading.set(false);
      },
      error: () => {
        this.hasProfile.set(false);
        this.loading.set(false);
      }
    });
  }

  private applyProfile(profile: CustomerDto): void {
    this.customerId = profile.id;
    this.userId = profile.userId;
    this.form.patchValue({
      name: profile.name,
      email: profile.email,
      phone: profile.phone,
      address: profile.address
    });
    this.hasProfile.set(true);
  }
}
