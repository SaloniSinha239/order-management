import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface CustomerDto {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  userId: string;
}

export interface PagedCustomers {
  items: CustomerDto[];
  page: number;
  pageSize: number;
  totalCount: number;
}

export interface CreateCustomerRequest {
  name: string;
  email: string;
  phone: string;
  address: string;
  userId: string;
}

export interface UpdateCustomerRequest {
  name: string;
  email: string;
  phone: string;
  address: string;
  userId: string;
}

@Injectable({ providedIn: 'root' })
export class CustomerService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/customers`;

  getCustomers(page = 1, pageSize = 10): Observable<PagedCustomers> {
    const params = new HttpParams().set('page', page).set('pageSize', pageSize);
    return this.http.get<PagedCustomers>(this.baseUrl, { params });
  }

  getCustomerById(customerId: string): Observable<CustomerDto> {
    return this.http.get<CustomerDto>(`${this.baseUrl}/${customerId}`);
  }

  getMyProfile(): Observable<CustomerDto> {
    return this.http.get<CustomerDto>(`${this.baseUrl}/me`);
  }

  createCustomer(request: CreateCustomerRequest): Observable<CustomerDto> {
    return this.http.post<CustomerDto>(this.baseUrl, request);
  }

  updateCustomer(customerId: string, request: UpdateCustomerRequest): Observable<CustomerDto> {
    return this.http.put<CustomerDto>(`${this.baseUrl}/${customerId}`, request);
  }

  deleteCustomer(customerId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${customerId}`);
  }
}
