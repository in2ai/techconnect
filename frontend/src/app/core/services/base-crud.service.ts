import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_URL } from '../tokens/api-url.token';

@Injectable()
export abstract class BaseCrudService<T> {
  protected http = inject(HttpClient);
  protected apiUrl = inject(API_URL);

  protected abstract endpoint: string;

  protected get baseUrl(): string {
    return `${this.apiUrl}/${this.endpoint}`;
  }

  list(offset = 0, limit?: number): Observable<T[]> {
    let params = new HttpParams().set('offset', offset.toString());
    if (limit !== undefined) {
      params = params.set('limit', limit.toString());
    }
    return this.http.get<T[]>(this.baseUrl, { params });
  }

  get(id: string): Observable<T> {
    if (!id) {
      throw new Error('ID is required');
    }
    return this.http.get<T>(`${this.baseUrl}/${id}`);
  }

  create(body: Partial<T>): Observable<T> {
    return this.http.post<T>(this.baseUrl, body);
  }

  update(id: string, body: Partial<T>): Observable<T> {
    return this.http.patch<T>(`${this.baseUrl}/${id}`, body);
  }

  delete(id: string): Observable<{ ok: boolean }> {
    return this.http.delete<{ ok: boolean }>(`${this.baseUrl}/${id}`);
  }
}
