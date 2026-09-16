import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from './auth.service';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="container" style="max-width: 420px; margin-top: 4rem;">
      <div class="card shadow-sm">
        <div class="card-body">
          <h1 class="h4 card-title mb-3">Sign in</h1>

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
                autocomplete="current-password" />
              @if (password.invalid && (password.touched || submitted())) {
                <div class="text-danger small">Password is required.</div>
              }
            </div>

            <button
              class="btn btn-primary w-100"
              type="submit"
              [disabled]="form.invalid || loading()">
              @if (loading()) {
                <span class="spinner-border spinner-border-sm me-1" aria-hidden="true"></span>
              }
              Sign in
            </button>
          </form>

          <p class="mt-3 mb-0 text-center small">
            No account? <a routerLink="/register">Create one</a>
          </p>
        </div>
      </div>
    </div>
  `
})
export class LoginComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly loading = signal(false);
  protected readonly submitted = signal(false);
  protected error = '';

  protected readonly form = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required]
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
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/';

    this.authService.login(this.form.getRawValue()).subscribe({
      next: response => {
        this.authService.saveTokens(response);
        void this.router.navigateByUrl(returnUrl);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.error =
          err.status === 401
            ? 'Invalid email or password.'
            : 'Sign in failed. Please try again.';
      }
    });
  }
}
