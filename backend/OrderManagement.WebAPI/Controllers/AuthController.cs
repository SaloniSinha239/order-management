using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using OrderManagement.Infrastructure.Identity;

namespace OrderManagement.WebAPI.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private static readonly string[] AllowedRoles = { "Admin", "Manager", "Customer" };

    private readonly UserManager<ApplicationUser> _userManager;
    private readonly SignInManager<ApplicationUser> _signInManager;
    private readonly ITokenService _tokenService;

    public AuthController(
        UserManager<ApplicationUser> userManager,
        SignInManager<ApplicationUser> signInManager,
        ITokenService tokenService)
    {
        _userManager = userManager;
        _signInManager = signInManager;
        _tokenService = tokenService;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register(RegisterRequest request, CancellationToken cancellationToken)
    {
        var role = request.Role ?? "Customer";

        if (!AllowedRoles.Contains(role))
        {
            return BadRequest(new { error = $"Role must be one of: {string.Join(", ", AllowedRoles)}." });
        }

        var user = new ApplicationUser
        {
            Id = Guid.NewGuid(),
            UserName = request.Email,
            Email = request.Email
        };

        var result = await _userManager.CreateAsync(user, request.Password);

        if (!result.Succeeded)
        {
            return BadRequest(new { errors = result.Errors.Select(e => e.Description) });
        }

        await _userManager.AddToRoleAsync(user, role);

        return Ok(new RegisterResponse(user.Id));
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginRequest request, CancellationToken cancellationToken)
    {
        var user = await _userManager.FindByEmailAsync(request.Email);

        if (user is null)
        {
            return Unauthorized(new { error = "Invalid credentials." });
        }

        var signInResult = await _signInManager.CheckPasswordSignInAsync(user, request.Password, lockoutOnFailure: true);

        if (!signInResult.Succeeded)
        {
            return Unauthorized(new { error = "Invalid credentials." });
        }

        var roles = await _userManager.GetRolesAsync(user);
        var accessToken = _tokenService.GenerateAccessToken(user.Id, user.Email!, roles);
        var refreshToken = await _tokenService.IssueRefreshTokenAsync(user.Id, cancellationToken);

        return Ok(new AuthResponse(accessToken, refreshToken));
    }

    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh(RefreshRequest request, CancellationToken cancellationToken)
    {
        var storedToken = await _tokenService.ConsumeRefreshTokenAsync(request.RefreshToken, cancellationToken);

        if (storedToken is null)
        {
            return Unauthorized(new { error = "Invalid or expired refresh token." });
        }

        var user = await _userManager.FindByIdAsync(storedToken.UserId.ToString());

        if (user is null)
        {
            return Unauthorized(new { error = "Invalid or expired refresh token." });
        }

        var roles = await _userManager.GetRolesAsync(user);
        var accessToken = _tokenService.GenerateAccessToken(user.Id, user.Email!, roles);
        var refreshToken = await _tokenService.IssueRefreshTokenAsync(user.Id, cancellationToken);

        return Ok(new AuthResponse(accessToken, refreshToken));
    }
}

public sealed record RegisterRequest(string Email, string Password, string? Role = null);
public sealed record LoginRequest(string Email, string Password);
public sealed record RefreshRequest(string RefreshToken);
public sealed record AuthResponse(string AccessToken, string RefreshToken);
public sealed record RegisterResponse(Guid UserId);
