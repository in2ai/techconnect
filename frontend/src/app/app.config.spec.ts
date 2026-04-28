import { HttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { appConfig } from './app.config';
import { routes } from './app.routes';

describe('appConfig', () => {
  it('exposes the provider set expected by the root bootstrap', () => {
    expect(Array.isArray(appConfig.providers)).toBe(true);
    expect(appConfig.providers.length).toBeGreaterThan(0);
  });

  it('can bootstrap a TestBed with the same providers and resolve HttpClient and Router', () => {
    TestBed.configureTestingModule({ providers: appConfig.providers });
    expect(TestBed.inject(HttpClient)).toBeTruthy();
    expect(TestBed.inject(Router)).toBeTruthy();
  });
});

describe('routes', () => {
  it('defines a login route guarded by anonymousOnlyGuard', () => {
    const login = routes.find((r) => r.path === 'login');
    expect(login).toBeTruthy();
    expect(login?.canActivate?.length).toBe(1);
    expect(typeof login?.loadComponent).toBe('function');
  });

  it('defines a wildcard route that redirects to the shell root', () => {
    const wildcard = routes.find((r) => r.path === '**');
    expect(wildcard?.redirectTo).toBe('');
  });

  it('exposes a child route per feature under the shell', () => {
    const shell = routes.find((r) => r.path === '');
    const children = shell?.children ?? [];
    const paths = children.map((c) => c.path);
    expect(paths).toEqual(
      expect.arrayContaining([
        'dashboard',
        'patients',
        'patients/:nhc',
        'tumors',
        'tumors/:biobank_code',
        'biomodels',
        'biomodels/:id',
        'passages',
        'passages/:id',
        'samples',
        'samples/:id',
      ]),
    );
  });

  it('resolves every feature page via its lazy loadComponent', async () => {
    const shell = routes.find((r) => r.path === '');
    const children = (shell?.children ?? []).filter((c) => c.loadComponent);
    for (const child of children) {
      const loaded = await child.loadComponent!();
      expect(loaded).toBeTruthy();
    }

    const login = routes.find((r) => r.path === 'login');
    expect(await login!.loadComponent!()).toBeTruthy();
  });
});
