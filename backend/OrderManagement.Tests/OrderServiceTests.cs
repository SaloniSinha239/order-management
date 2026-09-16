using AutoMapper;
using Moq;
using NUnit.Framework;
using OrderManagement.Application.Orders;
using OrderManagement.Domain.Entities;
using OrderManagement.Domain.Interfaces;

namespace OrderManagement.Tests;

[TestFixture]
public class OrderServiceTests
{
    private static readonly Guid CustomerId = Guid.NewGuid();
    private static readonly Guid ProductId = Guid.NewGuid();

    private Mock<IOrderRepository> _orderRepository = null!;
    private Mock<IProductRepository> _productRepository = null!;
    private Mock<IUnitOfWork> _unitOfWork = null!;
    private Mock<IMapper> _mapper = null!;
    private OrderService _sut = null!;

    [SetUp]
    public void SetUp()
    {
        _orderRepository = new Mock<IOrderRepository>();
        _productRepository = new Mock<IProductRepository>();
        _unitOfWork = new Mock<IUnitOfWork>();
        _mapper = new Mock<IMapper>();

        _mapper
            .Setup(m => m.Map<OrderDto>(It.IsAny<object>()))
            .Returns((object source) =>
            {
                var order = (Order)source;
                return new OrderDto
                {
                    Id = order.Id,
                    CustomerId = order.CustomerId,
                    OrderDate = order.OrderDate,
                    Status = order.Status,
                    TotalAmount = order.TotalAmount,
                    Items = order.Items.Select(i => new OrderItemDto
                    {
                        Id = i.Id,
                        ProductId = i.ProductId,
                        Quantity = i.Quantity,
                        UnitPrice = i.UnitPrice
                    }).ToList()
                };
            });

        _sut = new OrderService(_orderRepository.Object, _productRepository.Object, _unitOfWork.Object, _mapper.Object);
    }

    [Test]
    public async Task CreateOrderAsync_WithSufficientStock_CreatesOrderAndDeductsStock()
    {
        var product = CreateProduct(stock: 10, price: 5m);
        _productRepository
            .Setup(r => r.GetByIdAsync(ProductId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(product);

        Order? addedOrder = null;
        _orderRepository
            .Setup(r => r.AddAsync(It.IsAny<Order>(), It.IsAny<CancellationToken>()))
            .Callback((Order order, CancellationToken _) => addedOrder = order)
            .Returns(Task.CompletedTask);

        var dto = new CreateOrderDto
        {
            CustomerId = CustomerId,
            Items = [new CreateOrderItemDto { ProductId = ProductId, Quantity = 3 }]
        };

        var result = await _sut.CreateOrderAsync(dto);

        Assert.Multiple(() =>
        {
            Assert.That(addedOrder, Is.Not.Null);
            Assert.That(addedOrder!.CustomerId, Is.EqualTo(CustomerId));
            Assert.That(addedOrder.Status, Is.EqualTo(OrderStatus.Pending));
            Assert.That(addedOrder.TotalAmount, Is.EqualTo(15m));
            Assert.That(addedOrder.Items, Has.Count.EqualTo(1));
            Assert.That(addedOrder.Items.Single().ProductId, Is.EqualTo(ProductId));
            Assert.That(addedOrder.Items.Single().Quantity, Is.EqualTo(3));
            Assert.That(addedOrder.Items.Single().UnitPrice, Is.EqualTo(5m));
            Assert.That(product.StockQuantity, Is.EqualTo(7));
            Assert.That(result.TotalAmount, Is.EqualTo(15m));
        });
        _unitOfWork.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Test]
    public void CreateOrderAsync_WithInsufficientStock_ThrowsAndDoesNotSave()
    {
        var product = CreateProduct(stock: 2, price: 5m);
        _productRepository
            .Setup(r => r.GetByIdAsync(ProductId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(product);

        var dto = new CreateOrderDto
        {
            CustomerId = CustomerId,
            Items = [new CreateOrderItemDto { ProductId = ProductId, Quantity = 5 }]
        };

        Assert.ThrowsAsync<InvalidOperationException>(() => _sut.CreateOrderAsync(dto));

        Assert.Multiple(() =>
        {
            Assert.That(product.StockQuantity, Is.EqualTo(2));
        });
        _orderRepository.Verify(r => r.AddAsync(It.IsAny<Order>(), It.IsAny<CancellationToken>()), Times.Never);
        _unitOfWork.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Never);
    }

    [Test]
    public async Task GetOrderByIdAsync_WhenOrderExists_ReturnsDtoWithItems()
    {
        var order = new Order
        {
            Id = Guid.NewGuid(),
            CustomerId = CustomerId,
            OrderDate = DateTime.UtcNow,
            Status = OrderStatus.Pending,
            TotalAmount = 15m,
            Items =
            [
                new OrderItem { Id = Guid.NewGuid(), OrderId = Guid.NewGuid(), ProductId = ProductId, Quantity = 3, UnitPrice = 5m }
            ]
        };
        _orderRepository
            .Setup(r => r.GetWithItemsAsync(order.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(order);

        var result = await _sut.GetOrderByIdAsync(order.Id);

        Assert.Multiple(() =>
        {
            Assert.That(result, Is.Not.Null);
            Assert.That(result!.Id, Is.EqualTo(order.Id));
            Assert.That(result.TotalAmount, Is.EqualTo(15m));
            Assert.That(result.Items, Has.Count.EqualTo(1));
            Assert.That(result.Items.Single().ProductId, Is.EqualTo(ProductId));
        });
    }

    [Test]
    public async Task CancelOrderAsync_WhenCancellable_SetsStatusCancelledAndSaves()
    {
        var order = new Order
        {
            Id = Guid.NewGuid(),
            CustomerId = CustomerId,
            OrderDate = DateTime.UtcNow,
            Status = OrderStatus.Pending,
            TotalAmount = 15m
        };
        _orderRepository
            .Setup(r => r.GetWithItemsAsync(order.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(order);

        var result = await _sut.CancelOrderAsync(order.Id);

        Assert.Multiple(() =>
        {
            Assert.That(order.Status, Is.EqualTo(OrderStatus.Cancelled));
            Assert.That(result, Is.Not.Null);
            Assert.That(result!.Status, Is.EqualTo(OrderStatus.Cancelled));
        });
        _unitOfWork.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Test]
    public void UpdateStatusAsync_WithInvalidTransition_ThrowsAndDoesNotSave()
    {
        var order = new Order
        {
            Id = Guid.NewGuid(),
            CustomerId = CustomerId,
            OrderDate = DateTime.UtcNow,
            Status = OrderStatus.Pending,
            TotalAmount = 15m
        };
        _orderRepository
            .Setup(r => r.GetWithItemsAsync(order.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(order);

        Assert.ThrowsAsync<InvalidOperationException>(
            () => _sut.UpdateStatusAsync(order.Id, new UpdateOrderStatusDto { Status = OrderStatus.Delivered }));

        Assert.That(order.Status, Is.EqualTo(OrderStatus.Pending));
        _unitOfWork.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Never);
    }

    private static Product CreateProduct(int stock, decimal price)
    {
        return new Product
        {
            Id = ProductId,
            Name = "Test Product",
            SKU = "SKU-0001",
            Price = price,
            StockQuantity = stock,
            CategoryId = Guid.NewGuid()
        };
    }
}
