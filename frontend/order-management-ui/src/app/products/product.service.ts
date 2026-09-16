import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ProductDto {
  id: string;
  name: string;
  sku: string;
  price: number;
  stockQuantity: number;
  categoryId: string;
}

export interface PagedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface CreateProductRequest {
  name: string;
  sku: string;
  price: number;
  stockQuantity: number;
  categoryId: string;
}

export interface UpdateProductRequest {
  name: string;
  sku: string;
  price: number;
  stockQuantity: number;
  categoryId: string;
}

@Injectable({ providedIn: 'root' })
export class ProductService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/products`;

  getProducts(page = 1, pageSize = 10, categoryId?: string, search?: string): Observable<PagedResult<ProductDto>> {
    let params = new HttpParams().set('page', page).set('pageSize', pageSize);

    if (categoryId) {
      params = params.set('categoryId', categoryId);
    }

    if (search) {
      params = params.set('search', search);
    }

    return this.http.get<PagedResult<ProductDto>>(this.baseUrl, { params });
  }

  getProductById(productId: string): Observable<ProductDto> {
    return this.http.get<ProductDto>(`${this.baseUrl}/${productId}`);
  }

  createProduct(request: CreateProductRequest): Observable<ProductDto> {
    return this.http.post<ProductDto>(this.baseUrl, request);
  }

  updateProduct(productId: string, request: UpdateProductRequest): Observable<ProductDto> {
    return this.http.put<ProductDto>(`${this.baseUrl}/${productId}`, request);
  }

  deleteProduct(productId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${productId}`);
  }

  adjustStock(productId: string, quantity: number): Observable<ProductDto> {
    return this.http.patch<ProductDto>(`${this.baseUrl}/${productId}/stock`, { quantity });
  }
}
