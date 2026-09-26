import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AdminAuthStore } from './admin-auth.store';
export const adminGuard: CanActivateFn = (_route, state) =>
  inject(AdminAuthStore).authenticated() ||
  inject(Router).createUrlTree(['/admin/login'], { queryParams: { returnUrl: state.url } });
