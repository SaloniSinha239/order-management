using AutoMapper;
using Moq;
using NUnit.Framework;
using OrderManagement.Application.Customers;
using OrderManagement.Domain.Entities;
using OrderManagement.Domain.Interfaces;

namespace OrderManagement.Tests;

[TestFixture]
public class CustomerServiceTests
{
    private static readonly Guid CustomerId = Guid.NewGuid();
    private static readonly Guid UserAId = Guid.NewGuid();
    private static readonly Guid UserBId = Guid.NewGuid();

    private Mock<ICustomerRepository> _customerRepository = null!;
    private Mock<IUnitOfWork> _unitOfWork = null!;
    private Mock<IMapper> _mapper = null!;
    private CustomerService _sut = null!;

    [SetUp]
    public void SetUp()
    {
        _customerRepository = new Mock<ICustomerRepository>();
        _unitOfWork = new Mock<IUnitOfWork>();
        _mapper = new Mock<IMapper>();

        _mapper
            .Setup(m => m.Map<Customer>(It.IsAny<object>()))
            .Returns((object source) =>
            {
                var dto = (CreateCustomerDto)source;
                return new Customer
                {
                    Name = dto.Name,
                    Email = dto.Email,
                    Phone = dto.Phone,
                    Address = dto.Address,
                    UserId = dto.UserId
                };
            });

        _mapper
            .Setup(m => m.Map<CustomerDto>(It.IsAny<object>()))
            .Returns((object source) =>
            {
                var customer = (Customer)source;
                return new CustomerDto
                {
                    Id = customer.Id,
                    Name = customer.Name,
                    Email = customer.Email,
                    Phone = customer.Phone,
                    Address = customer.Address,
                    UserId = customer.UserId
                };
            });

        _mapper
            .Setup(m => m.Map<IReadOnlyList<CustomerDto>>(It.IsAny<object>()))
            .Returns((object source) => ((IEnumerable<Customer>)source)
                .Select(c => new CustomerDto
                {
                    Id = c.Id,
                    Name = c.Name,
                    Email = c.Email,
                    Phone = c.Phone,
                    Address = c.Address,
                    UserId = c.UserId
                })
                .ToList());

        _mapper
            .Setup(m => m.Map(It.IsAny<UpdateCustomerDto>(), It.IsAny<Customer>()))
            .Returns((UpdateCustomerDto source, Customer destination) =>
            {
                destination.Name = source.Name;
                destination.Email = source.Email;
                destination.Phone = source.Phone;
                destination.Address = source.Address;
                destination.UserId = source.UserId;
                return destination;
            });

        _sut = new CustomerService(_customerRepository.Object, _unitOfWork.Object, _mapper.Object);
    }

    [Test]
    public async Task CreateCustomerAsync_WithValidDto_CreatesCustomerAndSaves()
    {
        // Arrange
        Customer? added = null;
        _customerRepository
            .Setup(r => r.AddAsync(It.IsAny<Customer>(), It.IsAny<CancellationToken>()))
            .Callback((Customer customer, CancellationToken _) => added = customer)
            .Returns(Task.CompletedTask);

        var dto = new CreateCustomerDto
        {
            Name = "Alice",
            Email = "alice@example.com",
            Phone = "555-0100",
            Address = "1 Main St",
            UserId = UserAId
        };

        // Act
        var result = await _sut.CreateAsync(dto);

        // Assert
        Assert.Multiple(() =>
        {
            Assert.That(added, Is.Not.Null);
            Assert.That(added!.Id, Is.Not.EqualTo(Guid.Empty));
            Assert.That(added.Name, Is.EqualTo("Alice"));
            Assert.That(added.Email, Is.EqualTo("alice@example.com"));
            Assert.That(added.UserId, Is.EqualTo(UserAId));
            Assert.That(result.Id, Is.EqualTo(added.Id));
            Assert.That(result.Email, Is.EqualTo("alice@example.com"));
        });
        _customerRepository.Verify(r => r.AddAsync(It.IsAny<Customer>(), It.IsAny<CancellationToken>()), Times.Once);
        _unitOfWork.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Test]
    public async Task GetByIdAsync_WhenCustomerExists_ReturnsMappedDto()
    {
        // Arrange
        var customer = CreateCustomer("Alice", UserAId);
        customer.Id = CustomerId;
        _customerRepository
            .Setup(r => r.GetByIdAsync(CustomerId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(customer);

        // Act
        var result = await _sut.GetByIdAsync(CustomerId);

        // Assert
        Assert.Multiple(() =>
        {
            Assert.That(result, Is.Not.Null);
            Assert.That(result!.Id, Is.EqualTo(CustomerId));
            Assert.That(result.Name, Is.EqualTo("Alice"));
            Assert.That(result.Email, Is.EqualTo("alice@example.com"));
            Assert.That(result.UserId, Is.EqualTo(UserAId));
        });
    }

    [Test]
    public async Task GetByIdAsync_WhenCustomerNotFound_ReturnsNull()
    {
        // Arrange
        _customerRepository
            .Setup(r => r.GetByIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Customer?)null);

        // Act
        var result = await _sut.GetByIdAsync(CustomerId);

        // Assert
        Assert.That(result, Is.Null);
    }

    [Test]
    public async Task GetByUserIdAsync_ReturnsOnlyCustomersLinkedToUser()
    {
        // Arrange
        var customers = new List<Customer>
        {
            CreateCustomer("Alice", UserAId),
            CreateCustomer("Bob", UserBId),
            CreateCustomer("Carol", UserAId)
        };
        _customerRepository
            .Setup(r => r.GetAllAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(customers);

        // Act
        var result = await _sut.GetByUserIdAsync(UserAId);

        // Assert
        Assert.Multiple(() =>
        {
            Assert.That(result, Has.Count.EqualTo(2));
            Assert.That(result.Select(c => c.Name), Is.EquivalentTo(new[] { "Alice", "Carol" }));
            Assert.That(result.All(c => c.UserId == UserAId), Is.True);
        });
    }

    [Test]
    public async Task UpdateCustomerAsync_WhenCustomerExists_UpdatesFieldsAndSaves()
    {
        // Arrange
        var customer = CreateCustomer("Alice", UserAId);
        customer.Id = CustomerId;
        _customerRepository
            .Setup(r => r.GetByIdAsync(CustomerId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(customer);

        var dto = new UpdateCustomerDto
        {
            Name = "Alice Updated",
            Email = "alice.new@example.com",
            Phone = "555-0199",
            Address = "2 Oak Ave",
            UserId = UserAId
        };

        // Act
        var result = await _sut.UpdateAsync(CustomerId, dto);

        // Assert
        Assert.Multiple(() =>
        {
            Assert.That(result, Is.Not.Null);
            Assert.That(customer.Name, Is.EqualTo("Alice Updated"));
            Assert.That(customer.Email, Is.EqualTo("alice.new@example.com"));
            Assert.That(customer.Phone, Is.EqualTo("555-0199"));
            Assert.That(customer.Address, Is.EqualTo("2 Oak Ave"));
            Assert.That(result!.Name, Is.EqualTo("Alice Updated"));
        });
        _unitOfWork.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Test]
    public async Task DeleteAsync_WhenCustomerExists_RemovesCustomerAndSaves()
    {
        // Arrange
        var customer = CreateCustomer("Alice", UserAId);
        customer.Id = CustomerId;
        _customerRepository
            .Setup(r => r.GetByIdAsync(CustomerId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(customer);

        // Act
        var result = await _sut.DeleteAsync(CustomerId);

        // Assert
        Assert.That(result, Is.True);
        _customerRepository.Verify(r => r.Remove(customer), Times.Once);
        _unitOfWork.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Test]
    [Ignore("Duplicate email validation is not implemented in CustomerService yet. Enable once CreateAsync rejects emails already in use.")]
    public void CreateCustomerAsync_WithDuplicateEmail_Throws()
    {
        // Arrange
        var existing = CreateCustomer("Alice", UserAId);
        existing.Email = "alice@example.com";
        _customerRepository
            .Setup(r => r.GetAllAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync([existing]);

        var dto = new CreateCustomerDto
        {
            Name = "Alice Two",
            Email = "alice@example.com",
            Phone = "555-0101",
            Address = "3 Elm St",
            UserId = UserBId
        };

        // Act & Assert
        Assert.ThrowsAsync<InvalidOperationException>(async () => await _sut.CreateAsync(dto));
        _customerRepository.Verify(r => r.AddAsync(It.IsAny<Customer>(), It.IsAny<CancellationToken>()), Times.Never);
        _unitOfWork.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Never);
    }

    private static Customer CreateCustomer(string name, Guid userId)
    {
        return new Customer
        {
            Id = Guid.NewGuid(),
            Name = name,
            Email = $"{name!.ToLowerInvariant()}@example.com",
            Phone = "555-0100",
            Address = "1 Main St",
            UserId = userId
        };
    }
}
