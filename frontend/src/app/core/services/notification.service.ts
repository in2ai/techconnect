import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly snackBar = inject(MatSnackBar);

  success(message: string): void {
    this.snackBar.open(message, $localize`:@@closeAction:Close`, {
      duration: 4000,
      panelClass: 'snackbar-success',
      horizontalPosition: 'end',
      verticalPosition: 'bottom',
    });
  }

  error(message: string): void {
    this.snackBar.open(message, $localize`:@@closeAction:Close`, {
      duration: 6000,
      panelClass: 'snackbar-error',
      horizontalPosition: 'end',
      verticalPosition: 'bottom',
    });
  }

  requestError(error: unknown, fallbackMessage: string): void {
    if (error instanceof HttpErrorResponse) {
      return;
    }

    this.error(fallbackMessage);
  }

  info(message: string): void {
    this.snackBar.open(message, $localize`:@@closeAction:Close`, {
      duration: 4000,
      horizontalPosition: 'end',
      verticalPosition: 'bottom',
    });
  }
}
