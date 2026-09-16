using AutoMapper;
using OrderManagement.Domain.Entities;
using OrderManagement.Domain.Interfaces;

namespace OrderManagement.Application.Orders;

public class OrderService : IOrderService
{
    private readonly IOrderRepository _orderRepository;
    private readonly IProductRepository _productRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IMapper _mapper;

    public OrderService(
        IOrderRepository orderRepository,
        IProductRepository productRepository,
        IUnitOfWork unitOfWork,
        IMapper mapper)
    {
        _orderRepository = orderRepository;
        _productRepository = productRepository;
        _unitOfWork = unitOfWork;
        _mapper = mapper;
    }

    public async Task<OrderDto> CreateOrderAsync(CreateOrderDto dto, CancellationToken cancellationToken = default)
    {
        var productIds = dto.Items.Select(i => i.ProductId).Distinct().ToList();
        var products = new Dictionary<Guid, Product>();

        foreach (var productId in productIds)
        {
            var product = await _productRepository.GetByIdAsync(productId, cancellationToken)
                ?? throw new InvalidOperationException($"Product '{productId}' was not found.");
            products[productId] = product;
        }

        var order = new Order
        {
            Id = Guid.NewGuid(),
            CustomerId = dto.CustomerId,
            OrderDate = DateTime.UtcNow,
            Status = OrderStatus.Pending
        };

        foreach (var item in dto.Items)
        {
            var product = products[item.ProductId];

            if (product.StockQuantity < item.Quantity)
            {
                throw new InvalidOperationException(
                    $"Insufficient stock for product '{product.Name}': requested {item.Quantity}, available {product.StockQuantity}.");
            }

            product.StockQuantity -= item.Quantity;

            order.Items.Add(new OrderItem
            {
                Id = Guid.NewGuid(),
                OrderId = order.Id,
                ProductId = product.Id,
                Quantity = item.Quantity,
                UnitPrice = product.Price
            });
        }

        order.TotalAmount = order.Items.Sum(i => i.Quantity * i.UnitPrice);

        await _orderRepository.AddAsync(order, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return _mapper.Map<OrderDto>(order);
    }

    public async Task<OrderDto?> GetOrderByIdAsync(Guid orderId, CancellationToken cancellationToken = default)
    {
        var order = await _orderRepository.GetWithItemsAsync(orderId, cancellationToken);
        return order is null ? null : _mapper.Map<OrderDto>(order);
    }

    public async Task<IReadOnlyList<OrderDto>> GetOrdersByCustomerAsync(Guid customerId, CancellationToken cancellationToken = default)
    {
        var orders = await _orderRepository.GetByCustomerWithItemsAsync(customerId, cancellationToken);
        return _mapper.Map<IReadOnlyList<OrderDto>>(orders);
    }

    public async Task<OrderDto?> UpdateStatusAsync(Guid orderId, UpdateOrderStatusDto dto, CancellationToken cancellationToken = default)
    {
        var order = await _orderRepository.GetWithItemsAsync(orderId, cancellationToken);

        if (order is null)
        {
            return null;
        }

        order.Status = dto.Status;
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return _mapper.Map<OrderDto>(order);
    }

    public async Task<OrderDto?> CancelOrderAsync(Guid orderId, CancellationToken cancellationToken = default)
    {
        var order = await _orderRepository.GetWithItemsAsync(orderId, cancellationToken);

        if (order is null)
        {
            return null;
        }

        order.Status = OrderStatus.Cancelled;
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return _mapper.Map<OrderDto>(order);
    }
}
