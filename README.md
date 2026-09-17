# Order Management

Order management system with a .NET 8 WebAPI backend (Clean Architecture: Domain / Application / Infrastructure / WebAPI) and an Angular 18 standalone-component frontend. JWT authentication with Identity roles (Admin, Manager, Customer), EF Core + SQL Server persistence, and Angular feature modules for auth, orders, products, and customers.

## Setup

### Prerequisites

- .NET 8 SDK (installed at `~/.dotnet` on this machine — add `export PATH=$HOME/.dotnet:$HOME/.dotnet/tools:$PATH` and `export DOTNET_ROOT=$HOME/.dotnet` to your shell profile)
- Node.js 20+ / npm 10+
- SQL Server reachable at the configured connection string
- Chromium for frontend unit tests (`CHROME_BIN=/usr/bin/chromium-browser` on this machine)

### Backend (`backend/`)

Solution: `OrderManagement.sln`

| Project | Role |
|---|---|
| `OrderManagement.Domain` | POCO entities (User, Customer, Category, Product, Order, OrderItem), enums (Role, OrderStatus), repository/service-agnostic interfaces (IRepository, IUnitOfWork, per-entity repos) |
| `OrderManagement.Application` | DTOs + services (Order/Product/Category/Customer) with business rules: stock validation + totals on order create, order status transition map, category delete guard, paging/search; AutoMapper profiles |
| `OrderManagement.Infrastructure` | EF Core `AppDbContext` (Fluent API relationships), repositories + UnitOfWork, ASP.NET Core Identity (`ApplicationUser`, IdentityRole<Guid>, roles seeded Admin/Manager/Customer), JWT `TokenService` with single-use DB-backed refresh tokens, `DependencyInjection.AddInfrastructure(...)` |
| `OrderManagement.WebAPI` | Controllers: `AuthController` (register/login/refresh), `OrdersController`, `ProductsController`, `CustomersController`, `CategoriesController`; JWT bearer auth wired in `Program.cs` |

Key commands (from `backend/`):

```bash
dotnet restore
dotnet ef migrations add <Name> --project OrderManagement.Infrastructure --startup-project OrderManagement.WebAPI
dotnet ef database update --project OrderManagement.Infrastructure --startup-project OrderManagement.WebAPI
dotnet run --project OrderManagement.WebAPI
dotnet test OrderManagement.Tests
```

Configuration (`backend/OrderManagement.WebAPI/appsettings.json`):

- `ConnectionStrings:DefaultConnection` — SQL Server connection string (placeholder provided)
- `Jwt:Secret` — **replace the placeholder** with a long random secret (min 64 chars); also `Issuer`, `Audience`, `AccessTokenMinutes`, `RefreshTokenDays`

Migrations: `InitialCreate` (domain schema) and `AddIdentitySchema` (Identity + refresh tokens).

### Frontend (`frontend/order-management-ui/`)

Angular 18, standalone components, routing enabled, Bootstrap 5 via npm (wired in `angular.json`).

- `src/environments/environment.ts` — `apiUrl: http://localhost:5000/api`
- `auth/` — `AuthService` (login/register/refresh, JWT in localStorage), `authInterceptor` (Bearer attach, 401 → logout/redirect), `authGuard`, `roleGuard`, `LoginComponent`, `RegisterComponent`
- `orders/` — `OrderService`, list/detail/create components (status badges, admin status/cancel panel, dynamic order-item form)
- `products/` — `ProductService` (paging/search/category filter), list (admin/manager edit+delete), detail (stock adjust), shared create/edit form, `products.routes.ts`
- `customers/` — `CustomerService`, admin list (pagination, delete), self-service profile (`/customers/me`), `customers.routes.ts`

Key commands (from `frontend/order-management-ui/`):

```bash
npm install
npm start          # dev server
npm run build      # production build
CHROME_BIN=/usr/bin/chromium-browser npx ng test --watch=false --browsers=ChromeHeadless
```

### Tests

- Backend: `OrderManagement.Tests` (NUnit + Moq) — `OrderServiceTests`, `ProductServiceTests`, `CustomerServiceTests` (19 passing, 1 ignored pending duplicate-email validation)
- Frontend: `auth.service.spec.ts`, `order-list.component.spec.ts` (10 passing)

### Wiring

- Backend: `Program.cs` calls `AddApplication()` (services + AutoMapper profiles), `AddInfrastructure(...)` (DbContext, repositories, Identity, TokenService); `ExceptionHandlingMiddleware` maps `InvalidOperationException`/`ArgumentOutOfRangeException` to 400 ProblemDetails responses; CORS is open to `http://localhost:4200` (Angular dev server); the `http` launch profile serves on `http://localhost:5000` to match the frontend environment
- Frontend: `app.config.ts` provides `HttpClient` with `authInterceptor`; `app.routes.ts` mounts login/register, orders (behind `authGuard`), and spreads the `productRoutes`/`customerRoutes` groups (admin/manager routes behind `roleGuard`)

### Known TODOs

- Duplicate-email validation on customer create (`CustomerServiceTests.CreateCustomerAsync_WithDuplicateEmail_Throws` is `[Ignore]`d until implemented)
- Replace the placeholder JWT secret and DB credentials before any real deployment
- The category filter in the products list is a raw GUID input (no category dropdown service yet)
- Business rule violations surface as generic 400 ProblemDetails; consider distinct 409/404 semantics per case
