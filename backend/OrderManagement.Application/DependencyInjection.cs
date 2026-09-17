using Microsoft.Extensions.DependencyInjection;
using OrderManagement.Application.Categories;
using OrderManagement.Application.Customers;
using OrderManagement.Application.Orders;
using OrderManagement.Application.Products;

namespace OrderManagement.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddAutoMapper(config =>
        {
            config.AddProfile<OrderMappingProfile>();
            config.AddProfile<ProductMappingProfile>();
            config.AddProfile<CustomerMappingProfile>();
            config.AddProfile<CategoryMappingProfile>();
        });

        services.AddScoped<IOrderService, OrderService>();
        services.AddScoped<IProductService, ProductService>();
        services.AddScoped<ICustomerService, CustomerService>();
        services.AddScoped<ICategoryService, CategoryService>();

        return services;
    }
}
