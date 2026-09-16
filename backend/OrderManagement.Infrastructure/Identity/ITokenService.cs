namespace OrderManagement.Infrastructure.Identity;

public interface ITokenService
{
    string GenerateAccessToken(Guid userId, string email, IEnumerable<string> roles);
    Task<string> IssueRefreshTokenAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<RefreshToken?> ConsumeRefreshTokenAsync(string token, CancellationToken cancellationToken = default);
}
