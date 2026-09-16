import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  role?: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
}

export interface RegisterResponse {
  userId: string;
}

const ACCESS_TOKEN_KEY = 'om.access_token';
const REFRESH_TOKEN_KEY = 'om.refresh_token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/auth`;

  login(request: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/login`, request);
  }

  register(request: RegisterRequest): Observable<RegisterResponse> {
    return this.http.post<RegisterResponse>(`${this.baseUrl}/register`, request);
  }

  refresh(): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/refresh`, {
      refreshToken: this.getRefreshToken()
    });
  }

  saveTokens(response: AuthResponse): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, response.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, response.refreshToken);
  }

  logout(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }

  getToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    return !!token && !this.isTokenExpired(token);
  }

  hasRole(role: string): boolean {
    const token = this.getToken();
    if (!token) {
      return false;
    }

    const payload = this.decodePayload(token);
    const roleClaim = payload['role'];
    const roles = Array.isArray(roleClaim) ? roleClaim : roleClaim ? [roleClaim] : [];
    return roles.includes(role);
  }

  private isTokenExpired(token: string): boolean {
    const payload = this.decodePayload(token);
    const expiry = payload['exp'];
    return typeof expiry !== 'number' || expiry * 1000 <= Date.now();
  }

  private decodePayload(token: string): Record<string, unknown> {
    try {
      return JSON.parse(atob(token.split('.')[1]));
    } catch {
      return {};
    }
  }
}
