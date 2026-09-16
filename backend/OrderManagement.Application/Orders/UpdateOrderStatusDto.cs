using OrderManagement.Domain.Entities;

namespace OrderManagement.Application.Orders;

public class UpdateOrderStatusDto
{
    public OrderStatus Status { get; set; }
}
