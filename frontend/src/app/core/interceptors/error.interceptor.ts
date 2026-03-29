import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { NotificationService } from '../services/notification.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const notification = inject(NotificationService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let message = 'An unexpected error occurred';

      if (error.status === 0) {
        message = 'Unable to connect to the server. Please check your connection.';
      } else if (error.status === 401) {
        return throwError(() => error);
      } else if (error.status === 404) {
        message = 'The requested resource was not found.';
      } else if (error.status === 422) {
        message = 'Validation error. Please check your input.';
      } else if (error.status >= 500) {
        message = 'A server error occurred. Please try again later.';
      } else if (error.error?.detail) {
        message = typeof error.error.detail === 'string'
          ? error.error.detail
          : 'Request failed. Please try again.';
      }

      notification.error(message);
      return throwError(() => error);
    }),
  );
};
