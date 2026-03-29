import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';

import { AuthService } from '@core/services/auth.service';

function shouldIgnoreUnauthorized(url: string): boolean {
  return url.includes('/auth/login') || url.includes('/auth/logout') || url.includes('/auth/me');
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && !shouldIgnoreUnauthorized(req.url)) {
        auth.handleUnauthorized();
      }

      return throwError(() => error);
    }),
  );
};