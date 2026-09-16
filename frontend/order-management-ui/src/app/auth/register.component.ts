import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from './auth.service';

const ROLES = ['Customer', 'Manager', 'Admin'];

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="container" style="max-width: 420px; margin-top: 4rem;">
      <div class="card shadow-sm">
        <div class="card-body">
          <h1 class="h4 card-title mb-3">Create account</h1>

          @if (error) {
            <div class="alert alert-danger">{{ error }}</div>
          }

          <form [formGroup]="form" (ngSubmit)="submit()">
            <div class="mb-3">
              <label class="form-label" for="email">Email</label>
              <input
                id="email"
                class="form-control"
                type="email"
                formControlName="email"
                autocomplete="email" />
              @if (email.invalid && (email.touched || submitted())) {
                <div class="text-danger small">A valid email is required.</div>
              }
            </div>

            <div class="mb-3">
              <label class="form-label" for="password">Password</label>
              <input
                id="password"
                class="form-control"
                type="password"
                formControlName="password"
                autocomplete="new-password" />
              @if (password.invalid && (password.touched || submitted())) {
                <div class="text-danger small">
                  Password must be at least 8 characters and contain an uppercase letter and a digit.
                </div>
              }
            </div>

            <div class="mb-3">
              <label class="form-label" for="role">Role</label>
              <select id="role" class="form-select" formControlName="role">
                @for (role of roles; track role) {
                  <option [value]="role">{{ role }}</option>
                }
              </select>
            </div>

            <button
              class="btn btn-primary w-100"
              type="submit"
              [disabled]="form.invalid || loading()">
              @if (loading()) {
                <span class="spinner-border spinner-border-sm me-1" aria-hidden="true"></span>
              }
              Create account
            </button>
          </form>

          <p class="mt-3 mb-0 text-center small">
            Already registered? <a routerLink="/login">Sign in</a>
          </p>
        </div>
      </div>
    </div>
  `
})
export class RegisterComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly roles = ROLES;
  protected readonly loading = signal(false);
  protected readonly submitted = signal(false);
  protected error = '';

  protected readonly form = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8), Validators.pattern(/^(?=.*[A-Z])(?=.*\d).+$/)]],
    role: this.formBuilder.nonNullable.control('Customer')
  });

  protected get email() {
    return this.form.controls.email;
  }

  protected get password() {
    return this.form.controls.password;
  }

  protected submit(): void {
    this.submitted.set(true);
    this.error = '';

    if (this.form.invalid || this.loading()) {
      return;
    }

    this.loading.set(true);

    this.authService.register(this.form.getRawValue()).subscribe({
      next: () => {
        void this.router.navigate(['/login'], {
          queryParams: { registered: 'true' }
        });
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        if (err.status === 400) {
          const errors = (err.error as { errors?: string[] })?.errors;
          this.error = errors?.length ? errors.join(' ') : 'Registration failed. Check the entered values.';
        } else {
          this.error = 'Registration failed. Please try again.';
        }
      }
    });
  }
}
