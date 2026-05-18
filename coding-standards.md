# 🧭 Engineering Standards and Operating Principles

These standards apply across the entire codebase: **React (TypeScript) front end** and **Python back end**.
They define how we design, build, test, observe, and review software in production environments.

---

## 🚀 General Principles

### 💬 Comments

- Explain the **why**, not the **what**. The code itself should describe what it's doing.
- Use comments sparingly to clarify non-obvious decisions.
- Use comments to break up long blocks of code into logical sections using headers (e.g., `// --- Form validation ---`).
- Avoid over-commenting; prioritize writing self-descriptive code.

### 📏 Component Size & DRY Principles

- Apply the **DRY-3 rule**: refactor code into a reusable function or component once it's written for the third time.
- Keep components under ~300 lines as a general rule of thumb.
  - If a component exceeds the size limit, break it down into smaller sub-components or extract logic into custom hooks.
- Prefer small, single-responsibility modules and functions.
- Python: functions should be easy to name precisely; if naming is difficult, split responsibilities.

### 🛡️ Guard Clauses & Validation

- Prefer early returns to reduce nesting and improve readability. This applies to both conditional rendering in components and error handling in functions.
- For input validation, use Zod as high up the function call stack as possible.
- Validate inputs immediately and use a guard clause to handle invalid data.

### 🎁 Destructuring

- Always use destructuring for objects and arrays to make the code cleaner.
- Destructure objects and arrays directly in function parameters.
- Only make exceptions when there's a strong, justifiable reason, and document it with a comment.

### 🏗️ Code Structure

- No nested `if/else` statements; use early returns, guard clauses, or composition.
- Avoid deep nesting in general (max ~2 levels).
- Keep functions small and focused on a single responsibility.
- Prefer flat, readable code over clever abstractions.
- Optimize for readability and maintainability over cleverness.

### ⚡ Performance Philosophy

- Optimize for clarity first.
- Measure before optimizing.
- Avoid premature optimization.

### 🔁 Immutability

- Prefer returning new objects over mutating existing ones when it improves clarity.
- This is especially important in React state updates and domain logic.

---

## 🧱 Architecture and Responsibilities

### Backend Layers (Python)

- **Transport**: HTTP routing, serialization, authentication context, request/response mapping.
- **Application**: use-case orchestration, transactions, policy coordination, boundary translation.
- **Domain**: business rules, invariants, and pure decision logic.
- **Infrastructure**: database, external APIs, queues, cache, filesystems, and framework integrations.

Rules:

- Keep business logic out of route/handler layers.
- Domain code must not depend on transport details.
- Infrastructure should be called through application-defined interfaces where practical.

### Error Boundaries and Propagation

- Domain layer raises explicit domain exceptions.
- Application layer translates domain exceptions into user-facing outcomes.
- Transport layer maps outcomes/errors to HTTP responses.
- Infrastructure layer never swallows exceptions silently.
- Log errors at boundaries, not deep inside every helper.

---

## 🛡️ Trust Boundaries and Schema-First Development

Schema-first means:

1. Define a schema at every trust boundary.
2. Validate raw input against the schema.
3. Infer or map typed models from that schema.
4. Run business logic only on validated data.

Tool standards and rationale:

- **Zod (TypeScript)**: runtime validation with type inference at UI/API boundaries.
- **Pydantic (Python)**: runtime validation and typed models for API/service boundaries.
- **React Query**: canonical server-state management (cache, retries, stale handling).
- **Zustand**: lightweight client-only state when local state is insufficient.

---

## 📛 Naming Conventions

### React / TypeScript

- Components: `PascalCase`
- Files: `kebab-case`
- Variables/functions: `camelCase`, verb-based for functions (e.g., `getUserProfile`, `calculateTotal`, `validatePayment`)
- Constants: `SCREAMING_SNAKE_CASE` for true constants (e.g., `API_BASE_URL`), `camelCase` for configuration
- Types: `PascalCase`
- Tests: `*.test.ts` or `*.spec.ts`

### Python

- Modules/files: `snake_case.py`
- Functions/variables: `snake_case`
- Classes: `PascalCase`
- Constants: `SCREAMING_SNAKE_CASE`
- Tests: `test_*.py`

---

## ⚛️ Frontend Structure and State

### React Component Structure

- External imports first, alphabetized.
- Internal imports next, alphabetized and grouped by type (`@components`, `@db`, `@auth`, etc.).
- Define types near where they're used.
- Place React hooks at the top of the component.
- Follow with guard clauses for loading or error states.
- Place the main component logic below the early returns.
- Use `export default function` with a descriptive name.

### Import Aliases

- `@components/*`
- `@db/*`
- `@auth/*`
- `@hooks/*`
- `@stores/*`
- `@lib/*`
- `@utils/*`

### Data Fetching (React Query)

- Use React Query for all data fetching.
- Organize hooks by domain within a dedicated file in the `@hooks` directory.
- Follow the naming convention: `use[Entity]Queries()`.
- Use factory functions for queries that require parameters (e.g., `usePuzzleQuery(arcId)`).
- Destructure the `data` and `isLoading` properties from the query hook results.
- Use mutations with a consistent pattern, e.g., `modifyPuzzle.mutate(updatedPuzzle)`.

### Server State vs Client State

- Use React Query for server state.
- Zustand is for client-side state only; do not use it for server state.
- Things like which screens are open and user preferences can go in Zustand.
- Do not duplicate server state into client state without explicit justification.
- Prefer derived state over duplicated state.
- Avoid syncing React Query responses into Zustand except for clearly documented reasons.

---

## 🟦 TypeScript Standards

### Strict Mode Requirements

Ensure the following strict mode options are enabled in `tsconfig.json`:

```jsonc
// tsconfig.json
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

### Type Strictness

- No `any` - ever. Use `unknown` if type is truly unknown.
- No type assertions (`as SomeType`) unless absolutely necessary with clear justification.
- No `@ts-ignore` or `@ts-expect-error` without explicit explanation.
- These rules apply to test code as well as production code.

#### Type Definitions

Prefer `type` over `interface`. Use `type` for data structures and shapes. Reserve `interface` ONLY for behavior contracts (ports, adapters, dependency injection):

```typescript
// Correct - type for data structures
type User = {
  readonly id: string;
  readonly email: string;
  readonly role: UserRole;
};

type PaymentRequest = {
  amount: number;
  currency: string;
};

// Correct - interface for behavior contracts
interface Logger {
  log(message: string): void;
  error(message: string, error: Error): void;
}

interface PaymentGateway {
  processPayment(payment: Payment): Promise<PaymentResult>;
  refund(transactionId: string): Promise<RefundResult>;
}

// Wrong - interface for data structure
interface User {
  id: string;
  email: string;
}
```

### Type vs. Interface Distinction

Why this distinction?

- Types describe what data IS (structure, shape).
- Interfaces describe what code DOES (behavior, contracts).
- Interfaces support declaration merging and extension, useful for dependency injection and plugin systems.
- Types are more flexible for complex type operations (unions, intersections, mapped types).
- Use explicit typing where it aids clarity, but leverage inference where appropriate.
- Utilize utility types effectively (Pick, Omit, Partial, Required, etc.).
- Create domain-specific types (e.g., UserId, PaymentId) for type safety.
- Use Zod or any other Standard Schema compliant schema library to create types, by defining schemas first.

```typescript
// Good - Branded types for type safety
type UserId = string & { readonly brand: unique symbol };
type PaymentAmount = number & { readonly brand: unique symbol };

// Avoid - No type distinction
type UserId = string;
type PaymentAmount = number;
```

### Schema-First Development with Zod

Always define your schemas first, then derive types from them:

```typescript
import { z } from "zod";

// Define schemas first - these provide runtime validation
const AddressDetailsSchema = z.object({
  houseNumber: z.string(),
  houseName: z.string().optional(),
  addressLine1: z.string().min(1),
  addressLine2: z.string().optional(),
  city: z.string().min(1),
  postcode: z.string().regex(/^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/i),
});

const PayingCardDetailsSchema = z.object({
  cvv: z.string().regex(/^\d{3,4}$/),
  token: z.string().min(1),
});

const PostPaymentsRequestV3Schema = z.object({
  cardAccountId: z.string().length(16),
  amount: z.number().positive(),
  source: z.enum(["Web", "Mobile", "API"]),
  accountStatus: z.enum(["Normal", "Restricted", "Closed"]),
  lastName: z.string().min(1),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  payingCardDetails: PayingCardDetailsSchema,
  addressDetails: AddressDetailsSchema,
  brand: z.enum(["Visa", "Mastercard", "Amex"]),
});

// Derive types from schemas
type AddressDetails = z.infer<typeof AddressDetailsSchema>;
type PayingCardDetails = z.infer<typeof PayingCardDetailsSchema>;
type PostPaymentsRequestV3 = z.infer<typeof PostPaymentsRequestV3Schema>;

// Use schemas at runtime boundaries
export const parsePaymentRequest = (data: unknown): PostPaymentsRequestV3 => {
  return PostPaymentsRequestV3Schema.parse(data);
};

// Example of schema composition for complex domains
const BaseEntitySchema = z.object({
  id: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

const CustomerSchema = BaseEntitySchema.extend({
  email: z.string().email(),
  tier: z.enum(["standard", "premium", "enterprise"]),
  creditLimit: z.number().positive(),
});

type Customer = z.infer<typeof CustomerSchema>;
```

### When Schemas Are Required vs. Optional

Not all types need schemas. Use this decision framework to determine when runtime validation is necessary:

Decision Framework
Ask these questions in order:

- Does data cross a trust boundary? (external -> internal)
  - YES -> Schema required
  - NO -> Continue
- Does type have validation rules? (format, constraints, enums)
  - YES -> Schema required
  - NO -> Continue
- Is this a shared data contract? (between systems)
  - YES -> Schema required
  - NO -> Continue
- Used in test factories?
  - YES -> Schema required (for validation)
  - NO -> Continue
- Pure internal type? (utility, state, behavior)
  - YES -> Type is fine (no schema needed)
  - NO -> Schema recommended for safety

#### Schema REQUIRED Examples

```typescript
// API responses (trust boundary)
const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  role: z.enum(["admin", "user", "guest"]),
});
const user = UserSchema.parse(apiResponse);

// Business validation rules
const PaymentSchema = z.object({
  amount: z.number().positive().max(10000),
  email: z.string().email(),
  cardNumber: z.string().regex(/^\d{16}$/),
});

// Shared data contracts (events, messages)
const OrderCreatedEventSchema = z.object({
  orderId: z.string(),
  customerId: z.string(),
  items: z.array(z.object({ sku: z.string(), quantity: z.number() })),
});

// Test data factories (ensures test data validity)
const getMockUser = (): User => {
  return UserSchema.parse({
    id: "550e8400-e29b-41d4-a716-446655440000",
    email: "test@example.com",
    role: "user",
  });
};
```

#### Schema OPTIONAL Examples

```typescript
// Pure internal types (no external data, no validation)
type Point = { readonly x: number; readonly y: number };
type CartTotal = { subtotal: number; tax: number; total: number };

// Result/Option types (internal logic)
type Result<T, E = Error> = { success: true; data: T } | { success: false; error: E };

// TypeScript utilities (compile-time only)
type UserProfile = Pick<User, "id" | "name">;
type PartialUser = Partial<User>;

// Branded primitives (compile-time nominal types)
type UserId = string & { readonly brand: unique symbol };
type PaymentId = string & { readonly brand: unique symbol };

// Behavior contracts (interface for behavior, not data)
interface Logger {
  log(message: string): void;
  error(message: string, error: Error): void;
}

// Internal state machines
type LoadingState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: unknown }
  | { status: "error"; error: Error };

// Component props (usually - internal to app)
type ButtonProps = {
  label: string;
  onClick: () => void;
  variant?: "primary" | "secondary";
};
// Exception: If props come from URL params or API -> schema required
```

**Summary:** Use schemas at trust boundaries and for validation. For internal types, utilities, and behavior contracts, plain TypeScript types are sufficient.

---

## 🐍 Python Standards

### Typing and Analysis

- Use type hints for public APIs and domain logic.
- Static type checking is enforced in CI.
- Avoid `Any` except at explicit boundary conversion points.

### Schema-First Development with Pydantic

- Define Pydantic models at trust boundaries (requests, events, external integrations).
- Validate raw input immediately and only pass validated models into business logic.
- Use `model_validate` on untrusted input and `model_dump` for outbound serialization.

```python
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field


class PaymentRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    card_account_id: str = Field(min_length=16, max_length=16)
    amount: int = Field(gt=0)
    source: Literal["web", "mobile", "api"]


class PaymentResult(BaseModel):
    model_config = ConfigDict(extra="forbid")
    status: Literal["approved", "declined"]
    authorization_id: str | None = None


def parse_payment_request(data: dict) -> PaymentRequest:
    return PaymentRequest.model_validate(data)
```

### Async and Concurrency

- Default to sync code unless async provides measurable value.
- Use async for I/O-bound paths only; avoid mixed sync/async call chains when possible.
- Background jobs must be idempotent and safe to retry.
- Shared mutable state across threads/processes is prohibited unless explicitly synchronized.

### Formatting and Linting

- Use standardized formatting and linting tools.
- All checks are enforced in CI.

---

## 🔐 Security Baseline

- Validate all external inputs.
- Never trust client-provided identifiers without auth/ownership checks.
- Enforce least privilege for infrastructure permissions.
- Secrets must come from environment variables or a secret manager.
- Never hard-code credentials, tokens, or keys.
- Do not log secrets, access tokens, or PII.

---

## 📊 Observability, Logging, and Tracing

Minimum expectations:

- Every request carries a correlation/request ID.
- External calls log dependency, latency, and outcome.
- Background jobs log start, completion, and failure.
- Logs are structured and contextual.
- Errors are logged at boundaries with enough context for triage.
- Metrics/traces are captured using OpenTelemetry, ideally with automatic instrumentation.
- Logs should print locally, and be sent to OpenTelemetry in production.
- Logs must never contain sensitive information (PII, secrets, tokens).
- Standardised log formats and fields should be used for consistency and queryability.
  - Use a LOGGER wrapper to enforce structure

Logging examples:

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

---

## 🧪 Testing Principles

- Behavior-driven testing.
- No "unit tests" - this term is not helpful. Tests should verify expected behavior, treating implementation as a black box.
- Test through the public API exclusively - internals should be invisible to tests.
- No 1:1 mapping between test files and implementation files.
- Tests that examine internal implementation details are wasteful and should be avoided.
- Coverage targets: 100% coverage should be expected at all times, but these tests must ALWAYS be based on business behavior, not implementation details.
- Tests must document expected business behavior.
- Add tests for every new behavior and bug fix.
- All test code must follow the same TypeScript strict mode rules as production code.

### Testing Tools

- Jest or Vitest for testing frameworks.
- React Testing Library for React components.
- MSW (Mock Service Worker) for API mocking when needed.
- Pytest for backend tests.
- Prefer integration-style tests for route-service-domain flows.
- Use real or lightweight test databases where practical.

### Schema Usage in Tests

**CRITICAL:** Tests must use real schemas and types from the main project, not redefine their own.

```typescript
// Wrong - Defining schemas in test files
const ProjectSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  ownerId: z.string().nullable(),
  name: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

// Correct - Import schemas from the shared schema package
import { ProjectSchema, type Project } from "@your-org/schemas";
```

### Why Schema Usage in Tests Matters

- Type Safety: Ensures tests use the same types as production code.
- Consistency: Changes to schemas automatically propagate to tests.
- Maintainability: Single source of truth for data structures.
- Prevents Drift: Tests cannot accidentally diverge from real schemas.

### Implementation Details for Schema Usage in Tests

- All domain schemas should be exported from a shared schema package or module.
- Test files should import schemas from the shared location.
- If a schema is not exported yet, add it to the exports rather than duplicating it.
- Mock data factories should use the real types derived from real schemas.

```typescript
// Correct - Test factories using real schemas
import { type Project, ProjectSchema } from "@your-org/schemas";

const getMockProject = (overrides?: Partial<Project>): Project => {
  const baseProject = {
    id: "proj_123",
    workspaceId: "ws_456",
    ownerId: "user_789",
    name: "Test Project",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const projectData = { ...baseProject, ...overrides };

  // Validate against real schema to catch type mismatches
  return ProjectSchema.parse(projectData);
};
```

### Schema Usage in Tests (Python)

- Tests must import Pydantic models from the application, not redefine them.
- Factory helpers should validate data with `model_validate` to catch invalid fixtures early.

```python
import pytest
from pydantic import ValidationError
from app.schemas.payment import PaymentRequest


def get_mock_payment_request(overrides: dict | None = None) -> PaymentRequest:
    base = {
        "card_account_id": "1234567890123456",
        "amount": 100,
        "source": "web",
    }
    data = {**base, **(overrides or {})}
    return PaymentRequest.model_validate(data)


def test_rejects_negative_amount() -> None:
    with pytest.raises(ValidationError):
        get_mock_payment_request({"amount": -100})
```

### Test Organization

```text
src/
  features/
    payment/
      payment-processor.ts
      payment-validator.ts
      payment-processor.test.ts // The validator is an implementation detail. Validation is covered by testing business behavior.
```

### Test Data Pattern

Use factory functions with optional overrides for test data:

```typescript
const getMockPaymentPostPaymentRequest = (
  overrides?: Partial<PostPaymentsRequestV3>,
): PostPaymentsRequestV3 => {
  return {
    cardAccountId: "1234567890123456",
    amount: 100,
    source: "Web",
    accountStatus: "Normal",
    lastName: "Doe",
    dateOfBirth: "1980-01-01",
    payingCardDetails: {
      cvv: "123",
      token: "token",
    },
    addressDetails: getMockAddressDetails(),
    brand: "Visa",
    ...overrides,
  };
};

const getMockAddressDetails = (overrides?: Partial<AddressDetails>): AddressDetails => {
  return {
    houseNumber: "123",
    houseName: "Test House",
    addressLine1: "Test Address Line 1",
    addressLine2: "Test Address Line 2",
    city: "Test City",
    ...overrides,
  };
};
```

### Key Principles for Test Data Patterns

- Always return complete objects with sensible defaults.
- Accept optional `Partial<T>` overrides.
- Build incrementally - extract nested object factories as needed.
- Compose factories for complex objects.
- Consider using a test data builder pattern for very complex objects.

### Validating Test Data

When schemas exist, validate factory output to catch test data issues early:

```typescript
import { type Payment, PaymentSchema } from "../schemas/payment.schema";

const getMockPayment = (overrides?: Partial<Payment>): Payment => {
  const basePayment = {
    amount: 100,
    currency: "GBP",
    cardId: "card_123",
    customerId: "cust_456",
  };

  const paymentData = { ...basePayment, ...overrides };

  // Validate against real schema to catch type mismatches
  return PaymentSchema.parse(paymentData);
};

// This catches errors in test setup:
const payment = getMockPayment({
  amount: -100,
});
```

### Why Validate Test Data

- Ensures test factories produce valid data that matches production schemas.
- Catches test data bugs immediately rather than in test assertions.
- Documents constraints (e.g., "amount must be positive") in schema, not in every test.
- Prevents tests from passing with invalid data that would fail in production.

### Anti-Patterns in Tests

Avoid these test smells:

```typescript
// Bad - Implementation-focused test
it("should call validateAmount", () => {
  const spy = jest.spyOn(validator, "validateAmount");
  processPayment(payment);
  expect(spy).toHaveBeenCalled();
});

// Good - Behavior-focused test
it("should reject payments with negative amounts", () => {
  const payment = getMockPayment({ amount: -100 });
  const result = processPayment(payment);
  expect(result.success).toBe(false);
  expect(result.error.message).toBe("Invalid amount");
});

// Bad - Using let and beforeEach (shared mutable state)
let payment: Payment;
beforeEach(() => {
  payment = { amount: 100 };
});
it("should process payment", () => {
  processPayment(payment);
});

// Good - Factory functions (isolated, immutable)
it("should process payment", () => {
  const payment = getMockPayment({ amount: 100 });
  processPayment(payment);
});
```

### Achieving 100% Coverage Through Business Behavior

Example showing how validation code gets 100% coverage without testing it directly:

```typescript
// payment-validator.ts (implementation detail)
export const validatePaymentAmount = (amount: number): boolean => {
  return amount > 0 && amount <= 10000;
};

export const validateCardDetails = (card: PayingCardDetails): boolean => {
  return /^\d{3,4}$/.test(card.cvv) && card.token.length > 0;
};

// payment-processor.ts (public API)
export const processPayment = (request: PaymentRequest): Result<Payment, PaymentError> => {
  // Validation is used internally but not exposed
  if (!validatePaymentAmount(request.amount)) {
    return { success: false, error: new PaymentError("Invalid amount") };
  }

  if (!validateCardDetails(request.payingCardDetails)) {
    return { success: false, error: new PaymentError("Invalid card details") };
  }

  // Process payment...
  return { success: true, data: executedPayment };
};

// payment-processor.test.ts
describe("Payment processing", () => {
  // These tests achieve 100% coverage of validation code
  // without directly testing the validator functions

  it("should reject payments with negative amounts", () => {
    const payment = getMockPaymentPostPaymentRequest({ amount: -100 });
    const result = processPayment(payment);

    expect(result.success).toBe(false);
    expect(result.error.message).toBe("Invalid amount");
  });

  it("should reject payments exceeding maximum amount", () => {
    const payment = getMockPaymentPostPaymentRequest({ amount: 10001 });
    const result = processPayment(payment);

    expect(result.success).toBe(false);
    expect(result.error.message).toBe("Invalid amount");
  });

  it("should reject payments with invalid CVV format", () => {
    const payment = getMockPaymentPostPaymentRequest({
      payingCardDetails: { cvv: "12", token: "valid-token" },
    });
    const result = processPayment(payment);

    expect(result.success).toBe(false);
    expect(result.error.message).toBe("Invalid card details");
  });

  it("should process valid payments successfully", () => {
    const payment = getMockPaymentPostPaymentRequest({
      amount: 100,
      payingCardDetails: { cvv: "123", token: "valid-token" },
    });
    const result = processPayment(payment);

    expect(result.success).toBe(true);
    expect(result.data.status).toBe("completed");
  });
});
```

### React Component Testing

```typescript
// Good - testing user-visible behavior
describe('PaymentForm', () => {
  it('should show error when submitting invalid amount', async () => {
    render(<PaymentForm />);

    const amountInput = screen.getByLabelText('Amount');
    const submitButton = screen.getByRole('button', { name: 'Submit Payment' });

    await userEvent.type(amountInput, '-100');
    await userEvent.click(submitButton);

    expect(screen.getByText('Amount must be positive')).toBeInTheDocument();
  });
});
```

---

## 🔍 Code Review and PR Standards

- Prefer small, focused PRs when possible.
- Every PR must explain intent, context, and trade-offs.
- At least one approving review is required before merge.
- CI must pass (formatting, linting, typing, tests).
- New behavior requires tests or an explicit rationale when tests are not feasible.

### 📝 Commit Message Standard

- Commit messages must follow the **Conventional Commits** specification.
- Preferred format: `type(scope): concise imperative summary`
- Supported types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `ci`, `build`, `perf`, `revert`.
- If Commitizen (or equivalent tooling) is not installed, write commit messages manually in Conventional Commits format.
- Use `!` in the header or a `BREAKING CHANGE:` footer for breaking changes.

---

## 🏗️ Infrastructure, Data, and Deployment (Mandatory)

### ✅ Infrastructure as Code (ALWAYS)

- All infrastructure must be defined as code.
- Manual console changes are prohibited.
- Changes are reviewed via PR and applied via CI/CD.

### ✅ Database Migrations (ALWAYS)

- All schema changes use versioned migrations.
- Manual SQL changes in production are prohibited.

### ✅ Data Access (ALWAYS)

- Use an ORM by default.
- Raw SQL is allowed only when necessary, isolated, and reviewed.

---

## 🧰 Tooling and Enforcement

- Formatting, linting, type checking, and tests must run in CI.
- CI blocks merges on failure.
- `lint-staged` is required for local pre-commit quality checks.
- Standards are enforceable, not advisory.

---

## 💡 Example Patterns

### Error Handling

Use Result types or early returns:

```typescript
// Good - Result type pattern
type Result<T, E = Error> = { success: true; data: T } | { success: false; error: E };

const processPayment = (payment: Payment): Result<ProcessedPayment, PaymentError> => {
  if (!isValidPayment(payment)) {
    return { success: false, error: new PaymentError("Invalid payment") };
  }

  if (!hasSufficientFunds(payment)) {
    return { success: false, error: new PaymentError("Insufficient funds") };
  }

  return { success: true, data: executePayment(payment) };
};

// Also good - early returns with exceptions
const processPaymentWithExceptions = (payment: Payment): ProcessedPayment => {
  if (!isValidPayment(payment)) {
    throw new PaymentError("Invalid payment");
  }

  if (!hasSufficientFunds(payment)) {
    throw new PaymentError("Insufficient funds");
  }

  return executePayment(payment);
};
```

### Testing Behavior

```typescript
// Good - tests behavior through public API
describe("PaymentProcessor", () => {
  it("should decline payment when insufficient funds", () => {
    const payment = getMockPaymentPostPaymentRequest({ amount: 1000 });
    const account = getMockAccount({ balance: 500 });

    const result = processPayment(payment, account);

    expect(result.success).toBe(false);
    expect(result.error.message).toBe("Insufficient funds");
  });

  it("should process valid payment successfully", () => {
    const payment = getMockPaymentPostPaymentRequest({ amount: 100 });
    const account = getMockAccount({ balance: 500 });

    const result = processPayment(payment, account);

    expect(result.success).toBe(true);
    expect(result.data.remainingBalance).toBe(400);
  });
});

// Avoid - testing implementation details
describe("PaymentProcessor", () => {
  it("should call checkBalance method", () => {
    // This tests implementation, not behavior
  });
});
```

---

## 🚫 Common Patterns to Avoid (Anti-Patterns)

- Deep nesting and complex conditionals.
- Large multi-responsibility functions/components.
- Copying server state into local state stores without clear need.
- Silent error handling or catch-and-ignore blocks.
- Tests tightly coupled to implementation details.

```typescript
// Avoid: Mutation
const addItem = (items: Item[], newItem: Item) => {
  items.push(newItem);
  return items;
};

// Prefer: Immutable update
const addItemImmutable = (items: Item[], newItem: Item): Item[] => {
  return [...items, newItem];
};

// Avoid: Nested conditionals
if (user) {
  if (user.isActive) {
    if (user.hasPermission) {
      // do something
    }
  }
}

// Prefer: Early returns
if (!user || !user.isActive || !user.hasPermission) {
  return;
}
// do something

// Avoid: Large functions
const processOrder = (order: Order) => {
  // 100+ lines of code
};

// Prefer: Composed small functions
const processOrderComposed = (order: Order) => {
  const validatedOrder = validateOrder(order);
  const pricedOrder = calculatePricing(validatedOrder);
  const finalOrder = applyDiscounts(pricedOrder);
  return submitOrder(finalOrder);
};
```

---

## 🧩 Reference Patterns (Minimal)

### Boundary Validation (TypeScript)

```ts
const CreateUserInput = z.object({
  email: z.string().email(),
  name: z.string().min(1),
});

const input = CreateUserInput.parse(request.body);
await createUser(input);
```

### Route -> Application -> Domain (Python)

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

### React Component Shape

```tsx
import { useAccountQuery } from "@hooks/use-account-query";

export default function AccountPanel() {
  const { data, isLoading, error } = useAccountQuery();

  if (isLoading) return <Spinner />;
  if (error) return <ErrorState />;

  return <AccountView account={data} />;
}
```

---

## 📝 Documentation Philosophy

We believe that good documentation starts with well-written code. Documentation should complement the code, not replace it.

If your code is clean, well-structured, and follows best practices, it will be easier to understand and maintain.

We write documentation not for ourselves or our current team, but for future developers who were not there when we first wrote this code. Documentation is a living document that should be updated as the code changes.
