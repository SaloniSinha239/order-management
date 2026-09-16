import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';

const AUTH_ENDPOINTS = ['/auth/login', '/auth/register', '/auth/refresh'];

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const isAuthEndpoint = AUTH_ENDPOINTS.some(endpoint => req.url.includes(endpoint));
  const token = auth.getToken();
  const request =
    token && !isAuthEndpoint
      ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : req;

  return next(request).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && !isAuthEndpoint) {
        auth.logout();
        router.navigate(['/login']);
      }
      return throwError(() => error);
    })
  );
};
