using OrderManagement.Domain.Entities;
using OrderManagement.Domain.Interfaces;
using OrderManagement.Infrastructure.Persistence;

namespace OrderManagement.Infrastructure.Repositories;

public class ProductRepository : Repository<Product>, IProductRepository
{
    public ProductRepository(AppDbContext context)
        : base(context)
    {
    }
}
