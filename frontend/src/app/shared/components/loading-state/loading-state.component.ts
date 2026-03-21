import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-loading-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatProgressSpinnerModule, MatButtonModule, MatIconModule],
  template: `
    @switch (status()) {
      @case ('loading') {
        <div class="state-container" role="status" aria-live="polite">
          <mat-spinner diameter="40" aria-label="Loading content"></mat-spinner>
          <p class="state-text" i18n>Loading…</p>
        </div>
      }
      @case ('error') {
        <div class="state-container">
          <div class="error-icon-wrap">
            <mat-icon class="error-icon">error_outline</mat-icon>
          </div>
          <p class="state-title" i18n>Something went wrong</p>
          <p class="state-text">
            {{ errorMessage() || 'We could not load the data. Please try again.' }}
          </p>
          <button mat-stroked-button (click)="retry.emit()" class="retry-btn">
            <mat-icon>refresh</mat-icon>
            Retry
          </button>
        </div>
      }
      @case ('empty') {
        <div class="state-container">
          <div class="empty-icon-wrap">
            <mat-icon class="empty-icon" aria-hidden="true">{{ emptyIcon() }}</mat-icon>
          </div>
          <p class="state-title">{{ emptyTitle() || 'No data found' }}</p>
          <p class="state-text">{{ emptyMessage() || 'There are no items to display yet.' }}</p>
        </div>
      }
    }
  `,
  styles: `
    .state-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 3.5rem 1.5rem;
      gap: 0.75rem;
      text-align: center;
      animation: stateEnter 0.4s ease;
    }

    .state-text {
      color: var(--mat-sys-on-surface-variant);
      font: var(--mat-sys-body-medium);
      margin: 0;
      max-width: 360px;
      line-height: 1.5;
    }

    .state-title {
      font: var(--mat-sys-title-medium);
      color: var(--mat-sys-on-surface);
      margin: 0;
      font-weight: 600;
    }

    .error-icon-wrap {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: color-mix(in srgb, var(--mat-sys-error) 10%, transparent);
    }

    .error-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
      color: var(--mat-sys-error);
    }

    .empty-icon-wrap {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 72px;
      height: 72px;
      border-radius: 50%;
      background: var(--mat-sys-surface-container);
    }

    .empty-icon {
      font-size: 36px;
      width: 36px;
      height: 36px;
      color: var(--mat-sys-outline);
    }

    .retry-btn {
      margin-top: 0.5rem;
    }

    @keyframes stateEnter {
      from {
        opacity: 0;
        transform: scale(0.96);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }
  `,
})
export class LoadingStateComponent {
  status = input.required<'loading' | 'error' | 'empty'>();
  errorMessage = input<string>();
  emptyTitle = input<string>();
  emptyMessage = input<string>();
  emptyIcon = input('inbox');

  retry = output<void>();
}
