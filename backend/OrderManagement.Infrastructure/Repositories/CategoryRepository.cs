using OrderManagement.Domain.Entities;
using OrderManagement.Domain.Interfaces;
using OrderManagement.Infrastructure.Persistence;

namespace OrderManagement.Infrastructure.Repositories;

public class CategoryRepository : Repository<Category>, ICategoryRepository
{
    public CategoryRepository(AppDbContext context)
        : base(context)
    {
    }
}
