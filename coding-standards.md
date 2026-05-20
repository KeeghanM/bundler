# Engineering standards and operating principles

These standards apply across the entire codebase, including React TypeScript front ends and Python back ends.

They define how we design, build, test, observe, and review software in production environments.

## General principles

### Solve the actual problem

Solve the real problem, not just the visible symptom.

Start by understanding the behaviour, requirements, and failure mode. Prefer a root-cause fix over a local workaround.

Before changing code, consider whether the issue is caused by:

- incorrect configuration
- missing or incorrect environment variables
- wrong secrets
- wrong URLs
- deployment/runtime settings
- dependency or version mismatch
- operator error
- bad assumptions in local setup

Do not turn configuration mistakes into permanent code paths unless there is an explicit product requirement.

When a problem is caused by configuration, call that out directly and fix the source configuration.

### Readability first

Optimise for code that future engineers can understand quickly.

Prefer clear, direct, boring code over clever abstractions.

Good code should make the common path obvious, the edge cases explicit, and the failure modes easy to reason about.

A readable solution is usually better than a shorter or more abstract solution.

Use names, types, schemas, and tests to make intent clear.

### Simplicity and scope control

Choose the smallest viable change that fully resolves the problem.

Do not avoid larger changes when the requirements demand them, but keep the implementation as small as possible while still solving the problem properly.

Avoid "sniper edits" that patch one symptom while leaving the broader behaviour broken.

Avoid broad rewrites unless they are required by the task.

### Comments

Explain the why, not the what. The code itself should describe what it is doing.

Use comments sparingly to clarify non-obvious decisions.

Use comments to break up long blocks of code into logical sections when that improves readability, for example:

```ts
// --- Form validation ---
```

Avoid over-commenting. Prioritise writing self-descriptive code.

### Component size and DRY principles

Apply the DRY-3 rule: refactor code into a reusable function or component once it is written for the third time.

Keep components under roughly 300 lines as a general rule of thumb.

If a component exceeds the size limit, break it down into smaller sub-components or extract logic into custom hooks.

Prefer small, single-responsibility modules and functions.

Python functions should be easy to name precisely. If naming is difficult, split responsibilities.

### Guard clauses and validation

Prefer early returns to reduce nesting and improve readability.

This applies to conditional rendering in components and error handling in functions.

For input validation, validate as high up the function call stack as practical.

Validate inputs immediately and use a guard clause to handle invalid data.

### Destructuring

Prefer destructuring for objects and arrays where it improves readability.

Destructure objects and arrays directly in function parameters when that keeps the signature clear.

Avoid destructuring when it makes the code harder to scan or when the original object name carries useful meaning.

### Code structure

Avoid nested `if/else` statements where guard clauses, early returns, or composition would be clearer.

Avoid deep nesting in general. Keep nesting to roughly two levels where practical.

Keep functions small and focused on a single responsibility.

Prefer flat, readable code over clever abstractions.

### Performance philosophy

Optimise for clarity first.

Measure before optimising.

Avoid premature optimisation.

When performance work is required, document the measured bottleneck and the expected improvement.

### Immutability

Prefer returning new objects over mutating existing ones when it improves clarity.

This is especially important in React state updates and domain logic.

Mutation is acceptable where it is local, intentional, and clearer than copying.

## Architecture and responsibilities

### Backend layers - Python

Use clear layers:

- Transport: HTTP routing, serialization, authentication context, request/response mapping
- Application: use-case orchestration, transactions, policy coordination, boundary translation
- Domain: business rules, invariants, and pure decision logic
- Infrastructure: database, external APIs, queues, cache, filesystems, and framework integrations

Rules:

- Keep business logic out of route/handler layers.
- Domain code must not depend on transport details.
- Infrastructure should be called through application-defined interfaces where practical.
- Application code coordinates use cases and policies.
- Transport code maps the outside world into application calls.

### Error boundaries and propagation

Domain layer raises explicit domain exceptions or returns explicit domain errors.

Application layer translates domain exceptions into user-facing outcomes.

Transport layer maps outcomes/errors to HTTP responses.

Infrastructure layer must not swallow exceptions silently.

Log errors at boundaries, not deep inside every helper.

## Trust boundaries and schema-first development

Schema-first means:

1. Define a schema at every trust boundary.
2. Validate raw input against the schema.
3. Infer or map typed models from that schema.
4. Run business logic only on validated data.

Tool standards and rationale:

- Zod for TypeScript runtime validation with type inference at UI/API boundaries.
- Pydantic for Python runtime validation and typed models for API/service boundaries.
- React Query for canonical server-state management, including cache, retries, and stale handling.
- Zustand for client-only state when local React state is insufficient.

## Naming conventions

### React and TypeScript

- Components: `PascalCase`
- Files: `kebab-case`
- Variables/functions: `camelCase`, verb-based for functions, for example `getUserProfile`, `calculateTotal`, `validatePayment`
- Constants: `SCREAMING_SNAKE_CASE` for true constants, for example `API_BASE_URL`; `camelCase` for configuration
- Types: `PascalCase`
- Tests: `*.test.ts` or `*.spec.ts`

### Python

- Modules/files: `snake_case.py`
- Functions/variables: `snake_case`
- Classes: `PascalCase`
- Constants: `SCREAMING_SNAKE_CASE`
- Tests: `test_*.py`

## Frontend structure and state

### React component structure

Use this order unless the existing file structure gives a good reason not to:

1. External imports, alphabetised.
2. Internal imports, alphabetised and grouped by type.
3. Types near where they are used.
4. React hooks at the top of the component.
5. Guard clauses for loading or error states.
6. Main component logic.
7. Render output.

Use `export default function` with a descriptive name for page-level or primary components.

### Import aliases

Use the repo's configured aliases. Common aliases include:

- `@components/*`
- `@db/*`
- `@auth/*`
- `@hooks/*`
- `@stores/*`
- `@lib/*`
- `@utils/*`

Do not invent new aliases without updating the relevant configuration and documentation.

### Data fetching - React Query

Use React Query for server state and data fetching.

Organise hooks by domain within a dedicated file in the `@hooks` directory.

Follow clear naming conventions, such as:

```ts
useAccountQuery()
useAccountMutations()
usePuzzleQuery(arcId)
```

Use factory functions for queries that require parameters.

Destructure commonly used properties from query hook results when it improves readability, for example:

```ts
const { data, isLoading, error } = useAccountQuery()
```

Use mutations with a consistent pattern, for example:

```ts
modifyPuzzle.mutate(updatedPuzzle)
```

### Server state vs client state

Use React Query for server state.

Use Zustand for client-side state only.

Suitable client state examples:

- open/closed screens
- local UI preferences
- unsaved local workflow state

Do not duplicate server state into client state without explicit justification.

Prefer derived state over duplicated state.

Avoid syncing React Query responses into Zustand except for clearly documented reasons.

## TypeScript standards

### Strict mode requirements

Ensure strict mode options are enabled in `tsconfig.json`:

```jsonc
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
  },
}
```

### Type strictness

Avoid `any` in application code.

Use `unknown` when a value is truly unknown, then narrow it safely.

If `any` is unavoidable at an external boundary, isolate it, convert it to a typed value immediately, and document why it is required.

Avoid type assertions such as `as SomeType` unless necessary. If used, keep the assertion close to the validation or boundary that justifies it.

Do not use `@ts-ignore` or `@ts-expect-error` without an explicit explanation.

These rules apply to test code as well as production code.

### Type definitions

Prefer `type` over `interface` for data structures and shapes.

Reserve `interface` for behaviour contracts, such as ports, adapters, and dependency injection.

```ts
type User = {
  readonly id: string
  readonly email: string
  readonly role: UserRole
}

interface Logger {
  log(message: string): void
  error(message: string, error: Error): void
}
```

Use explicit typing where it aids clarity, but leverage inference where appropriate.

Use utility types effectively, including `Pick`, `Omit`, `Partial`, and `Required`.

Create domain-specific types where they improve safety and clarity.

```ts
type UserId = string & { readonly brand: unique symbol }
type PaymentAmount = number & { readonly brand: unique symbol }
```

### Schema-first development with Zod

Define schemas first when runtime validation is required, then derive types from them.

```ts
import { z } from 'zod'

const AddressDetailsSchema = z.object({
  houseNumber: z.string(),
  houseName: z.string().optional(),
  addressLine1: z.string().min(1),
  addressLine2: z.string().optional(),
  city: z.string().min(1),
  postcode: z.string().regex(/^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/i),
})

type AddressDetails = z.infer<typeof AddressDetailsSchema>

export const parseAddressDetails = (data: unknown): AddressDetails => {
  return AddressDetailsSchema.parse(data)
}
```

### When schemas are required

Use schemas when:

- data crosses a trust boundary
- data has validation rules
- data is a shared contract between systems
- data is used in test factories and schema validation would catch invalid fixtures
- input comes from APIs, URLs, forms, events, queues, files, or external integrations

Examples:

```ts
const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  role: z.enum(['admin', 'user', 'guest']),
})

const user = UserSchema.parse(apiResponse)
```

### When schemas are optional

Plain TypeScript types are sufficient for:

- pure internal types
- utility types
- behaviour contracts
- component props that do not cross a trust boundary
- internal state machines
- compile-time-only transformations

Example:

```ts
type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E }
```

## Python standards

### Typing and analysis

Use type hints for public APIs and domain logic.

Static type checking is enforced in CI.

Avoid `Any` except at explicit boundary conversion points.

If `Any` is unavoidable, isolate it and convert it into a typed value as soon as possible.

### Schema-first development with Pydantic

Define Pydantic models at trust boundaries, including requests, events, and external integrations.

Validate raw input immediately and only pass validated models into business logic.

Use `model_validate` on untrusted input and `model_dump` for outbound serialization.

```py
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field


class PaymentRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    card_account_id: str = Field(min_length=16, max_length=16)
    amount: int = Field(gt=0)
    source: Literal["web", "mobile", "api"]


def parse_payment_request(data: dict) -> PaymentRequest:
    return PaymentRequest.model_validate(data)
```

### Async and concurrency

Follow the framework's existing concurrency model.

Default to sync code unless the stack is already async or async provides clear value.

Use async for I/O-bound paths where it fits the framework.

Avoid mixed sync/async call chains when possible.

Background jobs must be idempotent and safe to retry.

Shared mutable state across threads/processes is prohibited unless explicitly synchronised.

### Formatting and linting

Use the repo's standard formatting and linting tools.

All checks must be enforced in CI.

Do not introduce formatting that conflicts with the repo's configured tools.

## Security baseline

Validate all external inputs.

Never trust client-provided identifiers without auth and ownership checks.

Enforce least privilege for infrastructure permissions.

Secrets must come from environment variables or a secret manager.

Never hard-code credentials, tokens, or keys.

Do not log secrets, access tokens, or PII.

Do not weaken security controls to make implementation or tests easier.

Do not bypass authentication, authorisation, CSRF protection, CORS rules, TLS checks, input validation, rate limits, or audit logging unless the requirements explicitly call for it.

Never add fallback credentials, hard-coded secrets, test-only production paths, or silent failure paths for security-sensitive behaviour.

## Observability, logging, and tracing

Minimum expectations:

- Every request carries a correlation/request ID.
- External calls log dependency, latency, and outcome.
- Background jobs log start, completion, and failure.
- Logs are structured and contextual.
- Errors are logged at boundaries with enough context for triage.
- Metrics/traces are captured using OpenTelemetry where practical.
- Logs print locally and are sent to OpenTelemetry in production.
- Logs never contain sensitive information, including PII, secrets, or tokens.
- Standardised log formats and fields are used for consistency and queryability.
- A logger wrapper should be used where practical to enforce structure.

Good:

```json
{
  "event": "external_call",
  "dependency": "billing-api",
  "latency_ms": 213,
  "status": "timeout",
  "request_id": "req_123"
}
```

Bad:

```text
failed request for user john.doe@example.com token=abc123
```

## Testing principles

Tests should verify expected behaviour.

Treat implementation as a black box where practical.

Test through public APIs, user-visible behaviour, or stable service boundaries.

Avoid 1:1 mapping between test files and implementation files when it encourages implementation-coupled tests.

Avoid tests that examine internal implementation details.

Aim for comprehensive behaviour coverage. Do not add brittle tests purely to satisfy a coverage number.

Add tests for every new behaviour and bug fix.

All test code must follow the same TypeScript strict mode rules as production code.

### Testing tools

Use the repo's chosen test tools. Common defaults:

- Jest or Vitest for TypeScript tests.
- React Testing Library for React components.
- MSW for API mocking where needed.
- Pytest for backend tests.
- Integration-style tests for route-service-domain flows.
- Real or lightweight test databases where practical.

### Schema usage in tests

Tests must use real schemas and types from the main project, not redefine their own.

Wrong:

```ts
const ProjectSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  name: z.string(),
})
```

Correct:

```ts
import { ProjectSchema, type Project } from '@your-org/schemas'
```

If a schema is not exported yet, add it to the exports rather than duplicating it.

Mock data factories should use real types derived from real schemas.

### Test data pattern

Use factory functions with optional overrides for test data.

```ts
const getMockPayment = (overrides?: Partial<Payment>): Payment => {
  const basePayment = {
    amount: 100,
    currency: 'GBP',
    cardId: 'card_123',
    customerId: 'cust_456',
  }

  const paymentData = { ...basePayment, ...overrides }

  return PaymentSchema.parse(paymentData)
}
```

Key principles:

- Return complete objects with sensible defaults.
- Accept optional `Partial<T>` overrides.
- Build incrementally.
- Extract nested object factories as needed.
- Compose factories for complex objects.
- Validate factory output when schemas exist.

### Anti-patterns in tests

Avoid implementation-focused tests:

```ts
it('should call validateAmount', () => {
  const spy = jest.spyOn(validator, 'validateAmount')
  processPayment(payment)
  expect(spy).toHaveBeenCalled()
})
```

Prefer behaviour-focused tests:

```ts
it('should reject payments with negative amounts', () => {
  const payment = getMockPayment({ amount: -100 })
  const result = processPayment(payment)

  expect(result.success).toBe(false)
  expect(result.error.message).toBe('Invalid amount')
})
```

Avoid shared mutable state:

```ts
let payment: Payment

beforeEach(() => {
  payment = { amount: 100 }
})
```

Prefer isolated factories:

```ts
it('should process payment', () => {
  const payment = getMockPayment({ amount: 100 })
  processPayment(payment)
})
```

### React component testing

Test user-visible behaviour.

```tsx
describe('PaymentForm', () => {
  it('shows an error when submitting an invalid amount', async () => {
    render(<PaymentForm />)

    const amountInput = screen.getByLabelText('Amount')
    const submitButton = screen.getByRole('button', { name: 'Submit payment' })

    await userEvent.type(amountInput, '-100')
    await userEvent.click(submitButton)

    expect(screen.getByText('Amount must be positive')).toBeInTheDocument()
  })
})
```

## Code review and PR standards

Prefer small, focused PRs when possible.

Every PR must explain:

- intent
- context
- trade-offs
- tests run
- rollout/migration impact
- risks and follow-ups

At least one approving review is required before merge.

CI must pass, including formatting, linting, typing, and tests.

New behaviour requires tests or an explicit rationale when tests are not feasible.

### Commit message standard

Commit messages must follow the Conventional Commits specification.

Preferred format:

```text
type(scope): concise imperative summary
```

Supported types:

- `feat`
- `fix`
- `docs`
- `refactor`
- `test`
- `chore`
- `ci`
- `build`
- `perf`
- `revert`

Use `!` in the header or a `BREAKING CHANGE:` footer for breaking changes.

Examples:

```text
feat(auth): add session refresh endpoint
fix(payments): reject negative payment amounts
test(api): cover expired token handling
docs: update local setup instructions
```

## Infrastructure, data, and deployment

### Infrastructure as code

All infrastructure must be defined as code.

Manual console changes are prohibited.

Infrastructure changes must be reviewed via PR and applied via CI/CD.

### Database migrations

All schema changes must use versioned migrations.

Manual SQL changes in production are prohibited.

Migrations must include rollback or recovery guidance where practical.

### Data access

Use the repo's established data access pattern.

Use an ORM by default where the repo already uses one.

Raw SQL is allowed when necessary, but it must be isolated, parameterised, tested, and reviewed.

## Tooling and enforcement

Formatting, linting, type checking, and tests must run in CI.

CI blocks merges on failure.

Local pre-commit quality checks should run via `lint-staged` or equivalent tooling where practical.

Standards are enforceable, not advisory.

## Common patterns to avoid

Avoid:

- deep nesting and complex conditionals
- large multi-responsibility functions/components
- copying server state into local state stores without clear need
- silent error handling or catch-and-ignore blocks
- tests tightly coupled to implementation details
- introducing new dependencies without checking existing patterns
- large unrelated rewrites
- clever abstractions that make the code harder to read

Avoid mutation when immutable updates are clearer:

```ts
const addItem = (items: Item[], newItem: Item) => {
  items.push(newItem)
  return items
}
```

Prefer:

```ts
const addItem = (items: Item[], newItem: Item): Item[] => {
  return [...items, newItem]
}
```

Avoid nested conditionals:

```ts
if (user) {
  if (user.isActive) {
    if (user.hasPermission) {
      // do something
    }
  }
}
```

Prefer guard clauses:

```ts
if (!user || !user.isActive || !user.hasPermission) {
  return
}

// do something
```

## Reference patterns

### Boundary validation - TypeScript

```ts
const CreateUserInput = z.object({
  email: z.string().email(),
  name: z.string().min(1),
})

const input = CreateUserInput.parse(request.body)
await createUser(input)
```

### Route to application to domain - Python

```py
@router.post("/users")
async def create_user(payload: CreateUserRequest) -> CreateUserResponse:
    result = await user_service.create_user(payload)
    return CreateUserResponse.model_validate(result)


class UserService:
    async def create_user(self, payload: CreateUserRequest) -> UserDTO:
        user = User.register(email=payload.email, name=payload.name)
        await self.repo.save(user)
        return UserDTO.from_domain(user)
```

### React component shape

```tsx
import { useAccountQuery } from '@hooks/use-account-query'

export default function AccountPanel() {
  const { data, isLoading, error } = useAccountQuery()

  if (isLoading) return <Spinner />
  if (error) return <ErrorState />

  return <AccountView account={data} />
}
```

## Documentation philosophy

Good documentation starts with well-written code.

Documentation should complement the code, not replace it.

Write documentation for future developers who were not present when the code was first written.

Documentation is a living artefact and should be updated as the code changes.

Prefer concise documentation that explains intent, trade-offs, operation, and maintenance concerns.
