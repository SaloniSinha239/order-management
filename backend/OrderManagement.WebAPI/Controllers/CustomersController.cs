using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OrderManagement.Application.Customers;
using System.Security.Claims;

namespace OrderManagement.WebAPI.Controllers;

[ApiController]
[Authorize]
[Route("api/customers")]
public class CustomersController : ControllerBase
{
    private readonly ICustomerService _customerService;

    public CustomersController(ICustomerService customerService)
    {
        _customerService = customerService;
    }

    [HttpGet]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<ActionResult<PagedCustomersResponse>> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10,
        CancellationToken cancellationToken = default)
    {
        if (page < 1)
        {
            return BadRequest(new { error = "Page must be 1 or greater." });
        }

        if (pageSize is < 1 or > 100)
        {
            return BadRequest(new { error = "Page size must be between 1 and 100." });
        }

        var all = await _customerService.GetAllAsync(cancellationToken);
        var items = all.Skip((page - 1) * pageSize).Take(pageSize).ToList();

        return Ok(new PagedCustomersResponse(items, page, pageSize, all.Count));
    }

    [HttpGet("me")]
    public async Task<ActionResult<CustomerDto>> GetMe(CancellationToken cancellationToken)
    {
        var customer = await _customerService.GetByIdAsync(GetCurrentUserGuid(), cancellationToken);

        return customer is null ? NotFound() : Ok(customer);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<CustomerDto>> GetById(Guid id, CancellationToken cancellationToken)
    {
        if (!IsPrivilegedUser() && id != GetCurrentUserGuid())
        {
            return NotFound();
        }

        var customer = await _customerService.GetByIdAsync(id, cancellationToken);

        return customer is null ? NotFound() : Ok(customer);
    }

    [HttpPost]
    public async Task<ActionResult<CustomerDto>> Create(CreateCustomerDto dto, CancellationToken cancellationToken)
    {
        var created = await _customerService.CreateAsync(dto, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<CustomerDto>> Update(Guid id, UpdateCustomerDto dto, CancellationToken cancellationToken)
    {
        if (!IsPrivilegedUser() && id != GetCurrentUserGuid())
        {
            return NotFound();
        }

        var updated = await _customerService.UpdateAsync(id, dto, cancellationToken);

        return updated is null ? NotFound() : Ok(updated);
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var deleted = await _customerService.DeleteAsync(id, cancellationToken);

        return deleted ? NoContent() : NotFound();
    }

    private bool IsPrivilegedUser()
    {
        return User.IsInRole("Admin") || User.IsInRole("Manager");
    }

    private Guid GetCurrentUserGuid()
    {
        var value = User.FindFirstValue(ClaimTypes.NameIdentifier);

        return Guid.TryParse(value, out var id)
            ? id
            : throw new InvalidOperationException("Authenticated user has no valid subject identifier.");
    }
}

public sealed record PagedCustomersResponse(IReadOnlyList<CustomerDto> Items, int Page, int PageSize, int TotalCount);
