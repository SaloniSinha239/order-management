using AutoMapper;
using OrderManagement.Domain.Entities;
using OrderManagement.Domain.Interfaces;

namespace OrderManagement.Application.Products;

public class ProductService : IProductService
{
    private readonly IProductRepository _productRepository;
    private readonly ICategoryRepository _categoryRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IMapper _mapper;

    public ProductService(
        IProductRepository productRepository,
        ICategoryRepository categoryRepository,
        IUnitOfWork unitOfWork,
        IMapper mapper)
    {
        _productRepository = productRepository;
        _categoryRepository = categoryRepository;
        _unitOfWork = unitOfWork;
        _mapper = mapper;
    }

    public async Task<PagedResult<ProductDto>> GetAllAsync(int page, int pageSize, Guid? categoryId = null, string? search = null, CancellationToken cancellationToken = default)
    {
        if (page < 1)
        {
            throw new ArgumentOutOfRangeException(nameof(page), "Page must be 1 or greater.");
        }

        if (pageSize is < 1 or > 100)
        {
            throw new ArgumentOutOfRangeException(nameof(pageSize), "Page size must be between 1 and 100.");
        }

        var (items, totalCount) = await _productRepository.GetPagedAsync(page, pageSize, categoryId, search, cancellationToken);
        return new PagedResult<ProductDto>(_mapper.Map<IReadOnlyList<ProductDto>>(items), page, pageSize, totalCount);
    }

    public async Task<ProductDto?> GetByIdAsync(Guid productId, CancellationToken cancellationToken = default)
    {
        var product = await _productRepository.GetByIdAsync(productId, cancellationToken);
        return product is null ? null : _mapper.Map<ProductDto>(product);
    }

    public async Task<ProductDto> CreateAsync(CreateProductDto dto, CancellationToken cancellationToken = default)
    {
        _ = await _categoryRepository.GetByIdAsync(dto.CategoryId, cancellationToken)
            ?? throw new InvalidOperationException($"Category '{dto.CategoryId}' was not found.");

        var product = _mapper.Map<Product>(dto);
        product.Id = Guid.NewGuid();

        await _productRepository.AddAsync(product, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return _mapper.Map<ProductDto>(product);
    }

    public async Task<ProductDto?> UpdateAsync(Guid productId, UpdateProductDto dto, CancellationToken cancellationToken = default)
    {
        var product = await _productRepository.GetByIdAsync(productId, cancellationToken);

        if (product is null)
        {
            return null;
        }

        if (dto.CategoryId != product.CategoryId)
        {
            _ = await _categoryRepository.GetByIdAsync(dto.CategoryId, cancellationToken)
                ?? throw new InvalidOperationException($"Category '{dto.CategoryId}' was not found.");
        }

        _mapper.Map(dto, product);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return _mapper.Map<ProductDto>(product);
    }

    public async Task<bool> DeleteAsync(Guid productId, CancellationToken cancellationToken = default)
    {
        var product = await _productRepository.GetByIdAsync(productId, cancellationToken);

        if (product is null)
        {
            return false;
        }

        _productRepository.Remove(product);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return true;
    }

    public async Task<ProductDto?> AdjustStockAsync(Guid productId, int quantity, CancellationToken cancellationToken = default)
    {
        var product = await _productRepository.GetByIdAsync(productId, cancellationToken);

        if (product is null)
        {
            return null;
        }

        var newStock = product.StockQuantity + quantity;

        if (newStock < 0)
        {
            throw new InvalidOperationException(
                $"Insufficient stock for product '{product.Name}': current {product.StockQuantity}, adjustment {quantity}.");
        }

        product.StockQuantity = newStock;
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return _mapper.Map<ProductDto>(product);
    }
}
