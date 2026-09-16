using OrderManagement.Domain.Entities;
using OrderManagement.Domain.Interfaces;
using OrderManagement.Infrastructure.Persistence;

namespace OrderManagement.Infrastructure.Repositories;

public class CustomerRepository : Repository<Customer>, ICustomerRepository
{
    public CustomerRepository(AppDbContext context)
        : base(context)
    {
    }
}
