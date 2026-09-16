import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export enum OrderStatus {
  Pending = 0,
  Processing = 1,
  Shipped = 2,
  Delivered = 3,
  Cancelled = 4
}

export interface OrderItemDto {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: number;
}

export interface OrderDto {
  id: string;
  customerId: string;
  orderDate: string;
  status: OrderStatus;
  totalAmount: number;
  items: OrderItemDto[];
}

export interface CreateOrderItemRequest {
  productId: string;
  quantity: number;
}

export interface CreateOrderRequest {
  customerId: string;
  items: CreateOrderItemRequest[];
}

@Injectable({ providedIn: 'root' })
export class OrderService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/orders`;

  getOrdersByCustomer(customerId?: string): Observable<OrderDto[]> {
    const params = customerId ? new HttpParams().set('customerId', customerId) : undefined;
    return this.http.get<OrderDto[]>(this.baseUrl, { params });
  }

  getOrderById(orderId: string): Observable<OrderDto> {
    return this.http.get<OrderDto>(`${this.baseUrl}/${orderId}`);
  }

  createOrder(request: CreateOrderRequest): Observable<OrderDto> {
    return this.http.post<OrderDto>(this.baseUrl, request);
  }

  updateStatus(orderId: string, status: OrderStatus): Observable<OrderDto> {
    return this.http.put<OrderDto>(`${this.baseUrl}/${orderId}/status`, { status });
  }

  cancelOrder(orderId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${orderId}`);
  }
}
