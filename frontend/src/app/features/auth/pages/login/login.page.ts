import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { finalize } from 'rxjs';

import { AuthService } from '@core/services/auth.service';
import { NotificationService } from '@core/services/notification.service';

@Component({
  selector: 'app-login-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <section class="login-shell">
      <div class="login-glow login-glow-left"></div>
      <div class="login-glow login-glow-right"></div>

      <mat-card class="login-card">
        <div class="brand-lockup">
          <div class="brand-icon-wrap">
            <mat-icon class="brand-icon">biotech</mat-icon>
          </div>
          <div>
            <p class="eyebrow" i18n="@@loginEyebrow">TechConnect access</p>
            <h1 i18n="@@loginTitle">Sign in</h1>
            <p class="subtitle" i18n="@@loginSubtitle">
              Continue to the biomedical registry and research workspace.
            </p>
          </div>
        </div>

        <form [formGroup]="form" (ngSubmit)="submit()" class="login-form">
          <mat-form-field appearance="outline">
            <mat-label i18n="@@loginEmail">Email address</mat-label>
            <input
              matInput
              type="email"
              formControlName="email"
              autocomplete="username"
              spellcheck="false"
            />
            @if (form.controls.email.invalid && form.controls.email.touched) {
              <mat-error i18n="@@loginEmailError">Enter a valid email address.</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label i18n="@@loginPassword">Password</mat-label>
            <input
              matInput
              [type]="hidePassword() ? 'password' : 'text'"
              formControlName="password"
              autocomplete="current-password"
            />
            <button
              mat-icon-button
              matSuffix
              type="button"
              [attr.aria-label]="hidePassword() ? showPasswordLbl : hidePasswordLbl"
              (click)="hidePassword.set(!hidePassword())"
            >
              <mat-icon>{{ hidePassword() ? 'visibility' : 'visibility_off' }}</mat-icon>
            </button>
            @if (form.controls.password.invalid && form.controls.password.touched) {
              <mat-error i18n="@@loginPasswordError">Enter your password.</mat-error>
            }
          </mat-form-field>

          <button
            mat-flat-button
            color="primary"
            type="submit"
            class="submit-btn"
            [disabled]="isSubmitting()"
          >
            @if (isSubmitting()) {
              <mat-progress-spinner
                mode="indeterminate"
                diameter="18"
                aria-hidden="true"
              ></mat-progress-spinner>
            }
            <span i18n="@@loginAction">Sign in</span>
          </button>
        </form>

        <p class="helper-copy" i18n="@@loginHelperCopy">
          Use the administrator account configured for this environment.
        </p>
      </mat-card>
    </section>
  `,
  styles: `
    .login-shell {
      min-height: 100dvh;
      display: grid;
      place-items: center;
      position: relative;
      overflow: hidden;
      padding: 1.5rem;
      background:
        radial-gradient(
          circle at top left,
          color-mix(in srgb, var(--mat-sys-primary) 20%, transparent),
          transparent 38%
        ),
        radial-gradient(
          circle at bottom right,
          color-mix(in srgb, var(--mat-sys-tertiary) 24%, transparent),
          transparent 42%
        ),
        linear-gradient(160deg, var(--mat-sys-surface-container-lowest), var(--mat-sys-surface));
    }

    .login-glow {
      position: absolute;
      width: 22rem;
      height: 22rem;
      border-radius: 999px;
      filter: blur(24px);
      opacity: 0.4;
      pointer-events: none;
    }

    .login-glow-left {
      inset: 10% auto auto 2%;
      background: color-mix(in srgb, var(--mat-sys-primary) 40%, transparent);
    }

    .login-glow-right {
      inset: auto 4% 8% auto;
      background: color-mix(in srgb, var(--mat-sys-secondary) 40%, transparent);
    }

    .login-card {
      width: min(100%, 30rem);
      padding: 2rem;
      border-radius: 24px;
      border: 1px solid color-mix(in srgb, var(--mat-sys-outline-variant) 80%, transparent);
      background: color-mix(in srgb, var(--mat-sys-surface) 88%, white);
      backdrop-filter: blur(14px);
      box-shadow: 0 24px 80px rgb(22 28 45 / 0.16);
      position: relative;
      z-index: 1;
    }

    .brand-lockup {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 1rem;
      align-items: start;
      margin-bottom: 1.5rem;
    }

    .brand-icon-wrap {
      display: grid;
      place-items: center;
      width: 3rem;
      height: 3rem;
      border-radius: 16px;
      background: linear-gradient(135deg, var(--mat-sys-primary), var(--mat-sys-tertiary));
    }

    .brand-icon {
      color: var(--mat-sys-on-primary);
    }

    .eyebrow {
      margin: 0 0 0.35rem;
      text-transform: uppercase;
      letter-spacing: 0.16em;
      font: var(--mat-sys-label-small);
      color: var(--mat-sys-primary);
    }

    h1 {
      margin: 0;
      font: var(--mat-sys-headline-medium);
    }

    .subtitle {
      margin: 0.5rem 0 0;
      color: var(--mat-sys-on-surface-variant);
      font: var(--mat-sys-body-medium);
    }

    .login-form {
      display: grid;
      gap: 0.75rem;
    }

    mat-form-field {
      width: 100%;
    }

    .submit-btn {
      min-height: 3rem;
      border-radius: 14px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.625rem;
      margin-top: 0.5rem;
    }

    .helper-copy {
      margin: 1rem 0 0;
      color: var(--mat-sys-on-surface-variant);
      font: var(--mat-sys-body-small);
    }

    @media (max-width: 640px) {
      .login-card {
        padding: 1.5rem;
      }

      .brand-lockup {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class LoginPage {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly notification = inject(NotificationService);

  readonly isSubmitting = signal(false);
  readonly hidePassword = signal(true);

  readonly showPasswordLbl = $localize`:@@showPasswordLbl:Show password`;
  readonly hidePasswordLbl = $localize`:@@hidePasswordLbl:Hide password`;

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.auth
      .login(this.form.getRawValue())
      .pipe(
        finalize(() => {
          this.isSubmitting.set(false);
        }),
      )
      .subscribe({
        next: () => {
          this.notification.success($localize`:@@loginSuccessToast:Signed in successfully.`);
          void this.router.navigateByUrl(this.auth.consumeRedirectUrl());
        },
        error: () => {
          this.notification.error($localize`:@@loginErrorToast:Invalid email or password.`);
        },
      });
  }
}
