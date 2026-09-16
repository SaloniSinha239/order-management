import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const roleGuard = (...allowedRoles: string[]): CanActivateFn => () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    auth.logout();
    return router.createUrlTree(['/login']);
  }

  const hasAllowedRole = allowedRoles.some(role => auth.hasRole(role));
  return hasAllowedRole ? true : router.createUrlTree(['/']);
};
