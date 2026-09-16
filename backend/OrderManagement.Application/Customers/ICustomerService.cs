namespace OrderManagement.Application.Customers;

public interface ICustomerService
{
    Task<IReadOnlyList<CustomerDto>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<CustomerDto?> GetByIdAsync(Guid customerId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<CustomerDto>> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<CustomerDto> CreateAsync(CreateCustomerDto dto, CancellationToken cancellationToken = default);
    Task<CustomerDto?> UpdateAsync(Guid customerId, UpdateCustomerDto dto, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(Guid customerId, CancellationToken cancellationToken = default);
}
