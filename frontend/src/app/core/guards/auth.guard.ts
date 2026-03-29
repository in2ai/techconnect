import { inject } from '@angular/core';
import { CanActivateChildFn, CanActivateFn, Router, UrlTree } from '@angular/router';
import { catchError, map, of } from 'rxjs';

import { AuthService } from '@core/services/auth.service';

function requireAuthenticatedUser(targetUrl: string) {
  const auth = inject(AuthService);
  const router = inject(Router);

  return auth.restoreSession().pipe(
    map((user): true | UrlTree => {
      if (user) {
        return true;
      }

      auth.rememberRedirectUrl(targetUrl);
      return router.createUrlTree(['/login']);
    }),
    catchError(() => {
      auth.rememberRedirectUrl(targetUrl);
      return of(router.createUrlTree(['/login']));
    }),
  );
}

export const authGuard: CanActivateFn = (_route, state) => requireAuthenticatedUser(state.url);

export const authChildGuard: CanActivateChildFn = (_route, state) =>
  requireAuthenticatedUser(state.url);

export const anonymousOnlyGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return auth.restoreSession().pipe(
    map((user) => (user ? router.createUrlTree(['/dashboard']) : true)),
    catchError(() => of(true)),
  );
};