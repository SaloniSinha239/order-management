namespace OrderManagement.Application.Products;

public interface IProductService
{
    Task<PagedResult<ProductDto>> GetAllAsync(int page, int pageSize, Guid? categoryId = null, CancellationToken cancellationToken = default);
    Task<ProductDto?> GetByIdAsync(Guid productId, CancellationToken cancellationToken = default);
    Task<ProductDto> CreateAsync(CreateProductDto dto, CancellationToken cancellationToken = default);
    Task<ProductDto?> UpdateAsync(Guid productId, UpdateProductDto dto, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(Guid productId, CancellationToken cancellationToken = default);
    Task<ProductDto?> AdjustStockAsync(Guid productId, int quantity, CancellationToken cancellationToken = default);
}
