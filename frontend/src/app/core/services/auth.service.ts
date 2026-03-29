import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, finalize, map, Observable, of, shareReplay, tap, throwError } from 'rxjs';

import { AuthUser, LoginCredentials } from '@core/models/auth.models';
import { API_URL } from '@core/tokens/api-url.token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly apiUrl = inject(API_URL);

  readonly currentUser = signal<AuthUser | null>(null);
  readonly initialized = signal(false);
  readonly isAuthenticated = computed(() => this.currentUser() !== null);

  private readonly pendingRedirectUrl = signal<string | null>(null);
  private restoreRequest$: Observable<AuthUser | null> | null = null;

  login(credentials: LoginCredentials): Observable<AuthUser> {
    return this.http.post<AuthUser>(`${this.apiUrl}/auth/login`, credentials).pipe(
      tap((user) => {
        this.currentUser.set(user);
        this.initialized.set(true);
      }),
    );
  }

  logout(): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/auth/logout`, {}).pipe(
      finalize(() => {
        this.currentUser.set(null);
        this.initialized.set(true);
      }),
    );
  }

  restoreSession(): Observable<AuthUser | null> {
    if (this.initialized()) {
      return of(this.currentUser());
    }

    if (this.restoreRequest$) {
      return this.restoreRequest$;
    }

    this.restoreRequest$ = this.http.get<AuthUser>(`${this.apiUrl}/auth/me`).pipe(
      tap((user) => {
        this.currentUser.set(user);
        this.initialized.set(true);
      }),
      map((user) => user),
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401) {
          this.currentUser.set(null);
          this.initialized.set(true);
          return of(null);
        }

        return throwError(() => error);
      }),
      finalize(() => {
        this.restoreRequest$ = null;
      }),
      shareReplay(1),
    );

    return this.restoreRequest$;
  }

  rememberRedirectUrl(url: string): void {
    if (!url || url.startsWith('/login')) {
      return;
    }

    this.pendingRedirectUrl.set(url);
  }

  consumeRedirectUrl(): string {
    const redirectUrl = this.pendingRedirectUrl() ?? '/dashboard';
    this.pendingRedirectUrl.set(null);
    return redirectUrl;
  }

  handleUnauthorized(): void {
    const currentUrl = this.router.url;
    this.currentUser.set(null);
    this.initialized.set(true);

    if (!currentUrl.startsWith('/login')) {
      this.rememberRedirectUrl(currentUrl);
      void this.router.navigate(['/login']);
    }
  }
}