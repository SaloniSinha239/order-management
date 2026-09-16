using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OrderManagement.Application.Orders;
using System.Security.Claims;

namespace OrderManagement.WebAPI.Controllers;

[ApiController]
[Authorize]
[Route("api/orders")]
public class OrdersController : ControllerBase
{
    private readonly IOrderService _orderService;

    public OrdersController(IOrderService orderService)
    {
        _orderService = orderService;
    }

    [HttpPost]
    public async Task<ActionResult<OrderDto>> Create(CreateOrderDto dto, CancellationToken cancellationToken)
    {
        var created = await _orderService.CreateOrderAsync(dto, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<OrderDto>> GetById(Guid id, CancellationToken cancellationToken)
    {
        var order = await _orderService.GetOrderByIdAsync(id, cancellationToken);

        if (order is null)
        {
            return NotFound();
        }

        if (IsPrivilegedUser() || order.CustomerId == GetCurrentUserGuid())
        {
            return Ok(order);
        }

        return NotFound();
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<OrderDto>>> GetByCustomer([FromQuery] Guid? customerId, CancellationToken cancellationToken)
    {
        if (IsPrivilegedUser())
        {
            if (customerId is null)
            {
                return BadRequest(new { error = "customerId is required." });
            }

            return Ok(await _orderService.GetOrdersByCustomerAsync(customerId.Value, cancellationToken));
        }

        var currentUserId = GetCurrentUserGuid();

        if (customerId.HasValue && customerId.Value != currentUserId)
        {
            return Forbid();
        }

        return Ok(await _orderService.GetOrdersByCustomerAsync(currentUserId, cancellationToken));
    }

    [HttpPut("{id:guid}/status")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<ActionResult<OrderDto>> UpdateStatus(Guid id, UpdateOrderStatusDto dto, CancellationToken cancellationToken)
    {
        var updated = await _orderService.UpdateStatusAsync(id, dto, cancellationToken);

        if (updated is null)
        {
            return NotFound();
        }

        return Ok(updated);
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var deleted = await _orderService.CancelOrderAsync(id, cancellationToken);

        if (deleted is null)
        {
            return NotFound();
        }

        return NoContent();
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
