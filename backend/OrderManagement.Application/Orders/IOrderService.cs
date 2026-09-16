namespace OrderManagement.Application.Orders;

public interface IOrderService
{
    Task<OrderDto> CreateOrderAsync(CreateOrderDto dto, CancellationToken cancellationToken = default);
    Task<OrderDto?> GetOrderByIdAsync(Guid orderId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<OrderDto>> GetOrdersByCustomerAsync(Guid customerId, CancellationToken cancellationToken = default);
    Task<OrderDto?> UpdateStatusAsync(Guid orderId, UpdateOrderStatusDto dto, CancellationToken cancellationToken = default);
    Task<OrderDto?> CancelOrderAsync(Guid orderId, CancellationToken cancellationToken = default);
}
