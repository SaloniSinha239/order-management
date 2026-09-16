using AutoMapper;
using OrderManagement.Domain.Entities;

namespace OrderManagement.Application.Orders;

public class OrderMappingProfile : Profile
{
    public OrderMappingProfile()
    {
        CreateMap<Order, OrderDto>();
        CreateMap<OrderItem, OrderItemDto>();
        CreateMap<OrderDto, Order>();
        CreateMap<OrderItemDto, OrderItem>();
    }
}
