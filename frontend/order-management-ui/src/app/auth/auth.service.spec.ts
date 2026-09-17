import { HttpErrorResponse } from '@angular/common/http';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../environments/environment';
import { AuthResponse, AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  const baseUrl = `${environment.apiUrl}/auth`;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule]
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('login() posts credentials; saving the response stores tokens and reports authenticated', () => {
    const accessToken = makeAccessToken(10);
    const response: AuthResponse = { accessToken, refreshToken: 'refresh-token-1' };

    let result: AuthResponse | undefined;
    service.login({ email: 'alice@example.com', password: 'Secret123' }).subscribe(res => {
      result = res;
      service.saveTokens(res);
    });

    const request = httpMock.expectOne(`${baseUrl}/login`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ email: 'alice@example.com', password: 'Secret123' });
    request.flush(response);

    expect(result).toEqual(response);
    expect(service.getToken()).toBe(accessToken);
    expect(service.getRefreshToken()).toBe('refresh-token-1');
    expect(service.isAuthenticated()).toBeTrue();
  });

  it('login() propagates the 401 error and stores no tokens on failure', () => {
    let receivedError: HttpErrorResponse | undefined;

    service.login({ email: 'alice@example.com', password: 'wrong' }).subscribe({
      next: () => fail('login should not succeed'),
      error: err => (receivedError = err)
    });

    const request = httpMock.expectOne(`${baseUrl}/login`);
    request.flush({ error: 'Invalid credentials.' }, { status: 401, statusText: 'Unauthorized' });

    expect(receivedError).toBeDefined();
    expect(receivedError?.status).toBe(401);
    expect(service.getToken()).toBeNull();
    expect(service.getRefreshToken()).toBeNull();
    expect(service.isAuthenticated()).toBeFalse();
  });

  it('logout() removes stored tokens', () => {
    service.saveTokens({ accessToken: makeAccessToken(10), refreshToken: 'refresh-token-1' });
    expect(service.getToken()).not.toBeNull();

    service.logout();

    expect(service.getToken()).toBeNull();
    expect(service.getRefreshToken()).toBeNull();
    expect(service.isAuthenticated()).toBeFalse();
  });

  function makeAccessToken(validMinutes: number): string {
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = btoa(
      JSON.stringify({
        sub: '11111111-1111-1111-1111-111111111111',
        email: 'alice@example.com',
        role: 'Customer',
        exp: Math.floor(Date.now() / 1000) + validMinutes * 60
      })
    );
    return `${header}.${payload}.signature`;
  }
});
