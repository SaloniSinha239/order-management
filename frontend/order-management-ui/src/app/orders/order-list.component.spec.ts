import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { OrderDto, OrderService, OrderStatus } from './order.service';
import { OrderListComponent } from './order-list.component';

describe('OrderListComponent', () => {
  let fixture: ComponentFixture<OrderListComponent>;
  let component: OrderListComponent;
  let orderService: jasmine.SpyObj<OrderService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    orderService = jasmine.createSpyObj('OrderService', ['getOrdersByCustomer']);
    router = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [OrderListComponent],
      providers: [
        { provide: OrderService, useValue: orderService },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: { get: () => null } } }
        },
        { provide: Router, useValue: router }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(OrderListComponent);
    component = fixture.componentInstance;
  });

  it('creates the component', () => {
    expect(component).toBeTruthy();
  });

  it('loads the current user orders on init', () => {
    const orders = [makeOrder(OrderStatus.Pending), makeOrder(OrderStatus.Delivered)];
    orderService.getOrdersByCustomer.and.returnValue(of(orders));

    fixture.detectChanges();

    expect(orderService.getOrdersByCustomer).toHaveBeenCalledWith(undefined);
    expect(component.orders()).toEqual(orders);
    expect(component.loading()).toBeFalse();
    expect(component.error()).toBe('');
  });

  it('shows an error when loading fails', () => {
    orderService.getOrdersByCustomer.and.returnValue(throwError(() => new Error('boom')));

    fixture.detectChanges();

    expect(component.orders()).toEqual([]);
    expect(component.loading()).toBeFalse();
    expect(component.error()).toContain('Could not load orders');
  });

  it('navigates to the order detail page', () => {
    const order = makeOrder(OrderStatus.Pending);

    component.openDetail(order.id);

    expect(router.navigate).toHaveBeenCalledWith(['/orders', order.id]);
  });

  function makeOrder(status: OrderStatus): OrderDto {
    return {
      id: crypto.randomUUID(),
      customerId: crypto.randomUUID(),
      orderDate: new Date().toISOString(),
      status,
      totalAmount: 42.5,
      items: []
    };
  }
});
