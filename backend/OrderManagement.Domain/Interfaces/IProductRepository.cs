using OrderManagement.Domain.Entities;

namespace OrderManagement.Domain.Interfaces;

public interface IProductRepository : IRepository<Product>
{
    Task<(IReadOnlyList<Product> Items, int TotalCount)> GetPagedAsync(int page, int pageSize, Guid? categoryId = null, CancellationToken cancellationToken = default);
}
