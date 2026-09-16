using OrderManagement.Domain.Entities;

namespace OrderManagement.Domain.Interfaces;

public interface IOrderRepository : IRepository<Order>
{
    Task<Order?> GetWithItemsAsync(Guid id, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Order>> GetByCustomerWithItemsAsync(Guid customerId, CancellationToken cancellationToken = default);
}
