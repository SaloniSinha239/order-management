using OrderManagement.Domain.Entities;
using OrderManagement.Domain.Interfaces;
using OrderManagement.Infrastructure.Persistence;

namespace OrderManagement.Infrastructure.Repositories;

public class OrderRepository : Repository<Order>, IOrderRepository
{
    public OrderRepository(AppDbContext context)
        : base(context)
    {
    }
}
