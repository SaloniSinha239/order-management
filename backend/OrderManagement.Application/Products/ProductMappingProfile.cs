using AutoMapper;
using OrderManagement.Domain.Entities;

namespace OrderManagement.Application.Products;

public class ProductMappingProfile : Profile
{
    public ProductMappingProfile()
    {
        CreateMap<Product, ProductDto>();
        CreateMap<ProductDto, Product>();
        CreateMap<CreateProductDto, Product>();
        CreateMap<UpdateProductDto, Product>();
    }
}
