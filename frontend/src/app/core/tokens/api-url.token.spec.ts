import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { API_URL } from './api-url.token';

describe('API_URL token', () => {
  it('falls back to environment.apiUrl when no explicit provider is registered', () => {
    TestBed.configureTestingModule({ providers: [] });
    expect(TestBed.inject(API_URL)).toBe(environment.apiUrl);
  });
});
