using AutoMapper;
using Moq;
using NUnit.Framework;
using OrderManagement.Application.Products;
using OrderManagement.Domain.Entities;
using OrderManagement.Domain.Interfaces;

namespace OrderManagement.Tests;

[TestFixture]
public class ProductServiceTests
{
    private static readonly Guid CategoryId = Guid.NewGuid();
    private static readonly Guid ProductId = Guid.NewGuid();

    private Mock<IProductRepository> _productRepository = null!;
    private Mock<ICategoryRepository> _categoryRepository = null!;
    private Mock<IUnitOfWork> _unitOfWork = null!;
    private Mock<IMapper> _mapper = null!;
    private ProductService _sut = null!;

    [SetUp]
    public void SetUp()
    {
        _productRepository = new Mock<IProductRepository>();
        _categoryRepository = new Mock<ICategoryRepository>();
        _unitOfWork = new Mock<IUnitOfWork>();
        _mapper = new Mock<IMapper>();

        _mapper
            .Setup(m => m.Map<Product>(It.IsAny<object>()))
            .Returns((object source) =>
            {
                var dto = (CreateProductDto)source;
                return new Product
                {
                    Name = dto.Name,
                    SKU = dto.SKU,
                    Price = dto.Price,
                    StockQuantity = dto.StockQuantity,
                    CategoryId = dto.CategoryId
                };
            });

        _mapper
            .Setup(m => m.Map<ProductDto>(It.IsAny<object>()))
            .Returns((object source) =>
            {
                var product = (Product)source;
                return new ProductDto
                {
                    Id = product.Id,
                    Name = product.Name,
                    SKU = product.SKU,
                    Price = product.Price,
                    StockQuantity = product.StockQuantity,
                    CategoryId = product.CategoryId
                };
            });

        _mapper
            .Setup(m => m.Map<IReadOnlyList<ProductDto>>(It.IsAny<object>()))
            .Returns((object source) => ((IEnumerable<Product>)source)
                .Select(p => new ProductDto
                {
                    Id = p.Id,
                    Name = p.Name,
                    SKU = p.SKU,
                    Price = p.Price,
                    StockQuantity = p.StockQuantity,
                    CategoryId = p.CategoryId
                })
                .ToList());

        _mapper
            .Setup(m => m.Map(It.IsAny<UpdateProductDto>(), It.IsAny<Product>()))
            .Returns((UpdateProductDto source, Product destination) =>
            {
                destination.Name = source.Name;
                destination.SKU = source.SKU;
                destination.Price = source.Price;
                destination.StockQuantity = source.StockQuantity;
                destination.CategoryId = source.CategoryId;
                return destination;
            });

        _sut = new ProductService(_productRepository.Object, _categoryRepository.Object, _unitOfWork.Object, _mapper.Object);
    }

    [Test]
    public async Task CreateProductAsync_WithValidCategory_CreatesProductAndSaves()
    {
        // Arrange
        _categoryRepository
            .Setup(r => r.GetByIdAsync(CategoryId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Category { Id = CategoryId, Name = "Test Category" });

        Product? added = null;
        _productRepository
            .Setup(r => r.AddAsync(It.IsAny<Product>(), It.IsAny<CancellationToken>()))
            .Callback((Product product, CancellationToken _) => added = product)
            .Returns(Task.CompletedTask);

        var dto = new CreateProductDto
        {
            Name = "Keyboard",
            SKU = "KB-001",
            Price = 49.99m,
            StockQuantity = 25,
            CategoryId = CategoryId
        };

        // Act
        var result = await _sut.CreateAsync(dto);

        // Assert
        Assert.Multiple(() =>
        {
            Assert.That(added, Is.Not.Null);
            Assert.That(added!.Id, Is.Not.EqualTo(Guid.Empty));
            Assert.That(added.Name, Is.EqualTo("Keyboard"));
            Assert.That(added.SKU, Is.EqualTo("KB-001"));
            Assert.That(added.Price, Is.EqualTo(49.99m));
            Assert.That(added.StockQuantity, Is.EqualTo(25));
            Assert.That(added.CategoryId, Is.EqualTo(CategoryId));
            Assert.That(result.Id, Is.EqualTo(added.Id));
            Assert.That(result.Name, Is.EqualTo("Keyboard"));
        });
        _productRepository.Verify(r => r.AddAsync(It.IsAny<Product>(), It.IsAny<CancellationToken>()), Times.Once);
        _unitOfWork.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Test]
    public async Task GetAllAsync_WithCategoryFilter_PassesFilterToRepositoryAndReturnsPagedResult()
    {
        // Arrange
        var categoryId = Guid.NewGuid();
        var products = new List<Product> { CreateProduct("Mouse"), CreateProduct("Monitor") };
        _productRepository
            .Setup(r => r.GetPagedAsync(2, 5, categoryId, It.IsAny<string?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((products, 7));

        // Act
        var result = await _sut.GetAllAsync(2, 5, categoryId);

        // Assert
        Assert.Multiple(() =>
        {
            Assert.That(result.Items, Has.Count.EqualTo(2));
            Assert.That(result.Items.Select(i => i.Name), Is.EquivalentTo(new[] { "Mouse", "Monitor" }));
            Assert.That(result.TotalCount, Is.EqualTo(7));
            Assert.That(result.Page, Is.EqualTo(2));
            Assert.That(result.PageSize, Is.EqualTo(5));
            Assert.That(result.TotalPages, Is.EqualTo(2));
        });
        _productRepository.Verify(
            r => r.GetPagedAsync(2, 5, categoryId, It.IsAny<string?>(), It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Test]
    public async Task GetByIdAsync_WhenProductExists_ReturnsMappedDto()
    {
        // Arrange
        var product = CreateProduct("Keyboard");
        product.Id = ProductId;
        product.Price = 49.99m;
        product.StockQuantity = 25;
        _productRepository
            .Setup(r => r.GetByIdAsync(ProductId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(product);

        // Act
        var result = await _sut.GetByIdAsync(ProductId);

        // Assert
        Assert.Multiple(() =>
        {
            Assert.That(result, Is.Not.Null);
            Assert.That(result!.Id, Is.EqualTo(ProductId));
            Assert.That(result.Name, Is.EqualTo("Keyboard"));
            Assert.That(result.Price, Is.EqualTo(49.99m));
            Assert.That(result.StockQuantity, Is.EqualTo(25));
            Assert.That(result.CategoryId, Is.EqualTo(CategoryId));
        });
    }

    [Test]
    public async Task GetByIdAsync_WhenProductNotFound_ReturnsNull()
    {
        // Arrange
        _productRepository
            .Setup(r => r.GetByIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Product?)null);

        // Act
        var result = await _sut.GetByIdAsync(ProductId);

        // Assert
        Assert.That(result, Is.Null);
    }

    [Test]
    public async Task UpdateProductAsync_WhenProductExists_UpdatesFieldsAndSaves()
    {
        // Arrange
        var product = CreateProduct("Old Name");
        product.Id = ProductId;
        _productRepository
            .Setup(r => r.GetByIdAsync(ProductId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(product);

        var dto = new UpdateProductDto
        {
            Name = "New Name",
            SKU = "KB-002",
            Price = 59.99m,
            StockQuantity = 30,
            CategoryId = CategoryId
        };

        // Act
        var result = await _sut.UpdateAsync(ProductId, dto);

        // Assert
        Assert.Multiple(() =>
        {
            Assert.That(result, Is.Not.Null);
            Assert.That(product.Name, Is.EqualTo("New Name"));
            Assert.That(product.SKU, Is.EqualTo("KB-002"));
            Assert.That(product.Price, Is.EqualTo(59.99m));
            Assert.That(product.StockQuantity, Is.EqualTo(30));
            Assert.That(product.CategoryId, Is.EqualTo(CategoryId));
            Assert.That(result!.Name, Is.EqualTo("New Name"));
        });
        _unitOfWork.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Test]
    public async Task DeleteAsync_WhenProductExists_RemovesProductAndSaves()
    {
        // Arrange
        var product = CreateProduct("Keyboard");
        product.Id = ProductId;
        _productRepository
            .Setup(r => r.GetByIdAsync(ProductId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(product);

        // Act
        var result = await _sut.DeleteAsync(ProductId);

        // Assert
        Assert.That(result, Is.True);
        _productRepository.Verify(r => r.Remove(product), Times.Once);
        _unitOfWork.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Test]
    public async Task AdjustStockAsync_WithPositiveDelta_IncreasesStockAndSaves()
    {
        // Arrange
        var product = CreateProduct("Keyboard");
        product.Id = ProductId;
        product.StockQuantity = 10;
        _productRepository
            .Setup(r => r.GetByIdAsync(ProductId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(product);

        // Act
        var result = await _sut.AdjustStockAsync(ProductId, 5);

        // Assert
        Assert.Multiple(() =>
        {
            Assert.That(result, Is.Not.Null);
            Assert.That(product.StockQuantity, Is.EqualTo(15));
            Assert.That(result!.StockQuantity, Is.EqualTo(15));
        });
        _unitOfWork.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Test]
    public void AdjustStockAsync_WithNegativeResult_ThrowsAndDoesNotSave()
    {
        // Arrange
        var product = CreateProduct("Keyboard");
        product.Id = ProductId;
        product.StockQuantity = 5;
        _productRepository
            .Setup(r => r.GetByIdAsync(ProductId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(product);

        // Act & Assert
        Assert.ThrowsAsync<InvalidOperationException>(async () => await _sut.AdjustStockAsync(ProductId, -20));
        Assert.That(product.StockQuantity, Is.EqualTo(5));
        _unitOfWork.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Never);
    }

    private static Product CreateProduct(string name)
    {
        return new Product
        {
            Id = Guid.NewGuid(),
            Name = name,
            SKU = $"SKU-{name}",
            Price = 5m,
            StockQuantity = 10,
            CategoryId = CategoryId
        };
    }
}
