# ADR-003: Communication Patterns Between Services

**Status**: Approved  
**Date**: 2026-05-01  
**Decision Makers**: Architecture Team, Engineering Leadership  
**Stakeholders**: Engineering Team, DevOps Team

---

## Context

In a microservices architecture, services need to communicate with each other. We need to decide:

1. **Synchronous vs Asynchronous**: When to use each pattern
2. **Protocol Selection**: REST, gRPC, message queues, events
3. **Data Consistency**: How to handle distributed transactions
4. **Failure Handling**: How to deal with service unavailability

Key scenarios requiring communication:
- **Booking Flow**: Booking → Policy → Inventory → Payment → Expense (saga)
- **Policy Validation**: Booking → Policy (synchronous request)
- **Receipt Generation**: Booking → Expense (event-driven)
- **Budget Tracking**: Policy → Budget (query)

---

## Decision

We will use **hybrid communication patterns** based on use case:

### 1. Synchronous Communication (REST APIs)

**Use For**:
- Request-response patterns requiring immediate answer
- Read operations (queries)
- External client communication (frontend → API Gateway)

**Examples**:
- Frontend → API Gateway: REST
- Booking Service → Policy Service: REST (for validation)
- API Gateway → Any Service: REST

**Protocol**: HTTP/REST with JSON  
**Library**: Axios (client), Express (server via NestJS)

### 2. Asynchronous Communication (Events via Kafka)

**Use For**:
- Fire-and-forget operations
- Broadcasting state changes to multiple services
- Eventual consistency scenarios
- Distributed transactions (Saga pattern)

**Examples**:
- Booking Service publishes `BookingConfirmed` → Expense Service listens
- Payment Service publishes `PaymentCaptured` → Booking Service listens
- Policy Service publishes `BudgetUpdated` → Interested services listen

**Protocol**: Apache Kafka with JSON messages  
**Library**: KafkaJS

### 3. Saga Pattern for Distributed Transactions

**Use For**:
- Multi-service transactions requiring compensation

**Implementation**: Choreography-based Saga using Kafka events

**Example - Booking Flow**:
```
1. BookingCreated event → Policy Service validates
2. PolicyValidated event → Inventory Service reserves
3. FlightReserved event → Payment Service processes
4. PaymentCaptured event → Booking Service confirms
5. BookingConfirmed event → Expense Service generates receipt

If step 3 fails:
- PaymentFailed event → Inventory Service cancels reservation
- ReservationCancelled event → Booking Service marks as failed
```

---

## Communication Patterns by Service

### Booking Service

**Publishes Events** (Kafka):
- `BookingCreated`
- `BookingConfirmed`
- `BookingCancelled`
- `BookingFailed`

**Consumes Events** (Kafka):
- `PolicyValidated` / `PolicyViolationDetected`
- `FlightReserved` / `ReservationFailed`
- `PaymentCaptured` / `PaymentFailed`

**Synchronous Calls** (REST):
- → Policy Service: `POST /policies/validate`
- → Inventory Service: `POST /reservations`
- → Payment Service: `POST /payments`

### Policy Service

**Publishes Events** (Kafka):
- `PolicyValidated`
- `PolicyViolationDetected`
- `BudgetUpdated`

**Consumes Events** (Kafka):
- `BookingCreated`

**Synchronous Calls** (REST):
- → Budget Service: `GET /budgets/{department}/remaining`

### Expense Service

**Publishes Events** (Kafka):
- `ReceiptGenerated`
- `ExpenseRecorded`

**Consumes Events** (Kafka):
- `BookingConfirmed`
- `BookingCancelled`

**Synchronous Calls**: None (purely event-driven)

### Payment Service

**Publishes Events** (Kafka):
- `PaymentAuthorized`
- `PaymentCaptured`
- `PaymentFailed`
- `PaymentRefunded`

**Consumes Events** (Kafka):
- `BookingCancelled` (triggers refund)

**Synchronous Calls** (REST):
- → Stripe API (external)

---

## Detailed Design

### REST API Communication

**Request Format**:
```http
POST /api/policies/validate
Authorization: Bearer <jwt_token>
X-Correlation-ID: <uuid>
Content-Type: application/json

{
  "travelerId": "uuid",
  "amount": 450.00,
  "cabinClass": "ECONOMY"
}
```

**Response Format**:
```http
HTTP/1.1 200 OK
X-Correlation-ID: <uuid>
Content-Type: application/json

{
  "valid": true,
  "policyId": "uuid",
  "violations": []
}
```

**Error Handling**:
- 4xx: Client errors (validation, auth)
- 5xx: Server errors (service down, database error)
- Retry logic with exponential backoff
- Circuit breaker after 5 consecutive failures

### Event-Driven Communication

**Event Schema**:
```json
{
  "eventId": "uuid",
  "eventType": "BookingConfirmed",
  "aggregateId": "booking-uuid",
  "aggregateType": "Booking",
  "occurredOn": "2026-05-01T10:30:00Z",
  "correlationId": "uuid",
  "causationId": "uuid",
  "data": {
    "bookingId": "uuid",
    "travelerId": "uuid",
    "totalAmount": 450.00,
    "currency": "USD"
  }
}
```

**Kafka Topics**:
- `booking-events`: All booking-related events
- `payment-events`: All payment-related events
- `policy-events`: All policy-related events
- `expense-events`: All expense-related events

**Event Ordering**: Guaranteed within partition (use aggregateId as partition key)

**Event Retention**: 7 days (configurable)

**Idempotency**:
- All event handlers must be idempotent
- Store eventId in database to detect duplicates
- Use unique constraint on eventId

```typescript
@OnEvent('BookingConfirmed')
async handleBookingConfirmed(event: BookingConfirmed): Promise<void> {
  // Check if already processed
  const exists = await this.processedEvents.exists(event.eventId);
  if (exists) {
    this.logger.warn(`Event ${event.eventId} already processed`);
    return;
  }
  
  // Process event
  await this.generateReceipt(event);
  
  // Mark as processed
  await this.processedEvents.save(event.eventId);
}
```

---

## Saga Pattern Implementation

### Choreography vs Orchestration

**Decision**: Use **Choreography** (event-based coordination)

**Why**:
- ✅ Loose coupling between services
- ✅ Services respond to events independently
- ✅ Easy to add new services to saga
- ✅ No central coordinator (single point of failure)

**Why NOT Orchestration**:
- ❌ Requires centralized orchestrator
- ❌ Tighter coupling
- ❌ Orchestrator becomes complex

### Saga Steps (Booking Example)

```
Step 1: Validate Policy
  Forward: Policy validation
  Compensate: None (validation has no side effects)

Step 2: Reserve Flight
  Forward: Create reservation in Amadeus
  Compensate: Cancel reservation

Step 3: Process Payment
  Forward: Authorize + Capture payment via Stripe
  Compensate: Refund payment

Step 4: Confirm Booking
  Forward: Mark booking as confirmed
  Compensate: Mark booking as cancelled

Step 5: Generate Receipt
  Forward: Generate PDF receipt
  Compensate: Mark receipt as void
```

### Compensation Flow

If payment fails at Step 3:

```
PaymentFailed event published
  ↓
Inventory Service listens
  ↓
Cancels reservation (compensates Step 2)
  ↓
Publishes ReservationCancelled event
  ↓
Booking Service listens
  ↓
Marks booking as failed (compensates Step 4)
  ↓
Publishes BookingFailed event
  ↓
Frontend shows error to user
```

---

## API Gateway Pattern

**Purpose**: Single entry point for all client requests

**Responsibilities**:
1. **Authentication**: Validate JWT tokens
2. **Rate Limiting**: Prevent abuse
3. **Request Routing**: Route to appropriate service
4. **Response Aggregation**: Combine responses (if needed)
5. **Circuit Breaking**: Prevent cascading failures
6. **Logging**: Centralized request logging

**Implementation**:

```typescript
// API Gateway Route
app.use('/api/bookings', async (req, res) => {
  try {
    // 1. Authenticate
    const user = await authenticateToken(req.headers.authorization);
    
    // 2. Check rate limit
    await checkRateLimit(user.id);
    
    // 3. Circuit breaker
    const response = await circuitBreaker.fire(async () => {
      return await axios.post('http://booking-service:3001/bookings', req.body, {
        headers: {
          'X-User-ID': user.id,
          'X-Correlation-ID': req.correlationId
        }
      });
    });
    
    // 4. Return response
    res.json(response.data);
    
  } catch (error) {
    if (error instanceof CircuitBreakerOpenError) {
      res.status(503).json({ error: 'Service temporarily unavailable' });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});
```

**Circuit Breaker Configuration**:
- Threshold: 50% failure rate
- Volume Threshold: 10 requests
- Sleep Window: 30 seconds
- Timeout: 5 seconds

---

## Service Discovery

**Development**: Hardcoded URLs in environment variables
```
BOOKING_SERVICE_URL=http://booking-service:3001
POLICY_SERVICE_URL=http://policy-service:3002
```

**Production**: Kubernetes Service Discovery
- Services accessible via DNS: `http://booking-service:3001`
- Kubernetes handles load balancing and health checks

---

## Data Consistency

### Strong Consistency

**Use When**: Within a single service boundary

**Implementation**: ACID transactions in PostgreSQL

```typescript
await this.dataSource.transaction(async (manager) => {
  await manager.save(BookingEntity, booking);
  await manager.save(BookingSagaEntity, saga);
});
```

### Eventual Consistency

**Use When**: Across service boundaries

**Implementation**: Event-driven updates

```typescript
// Booking Service publishes event
await eventBus.publish(new BookingConfirmed(booking));

// Expense Service eventually processes
@OnEvent('BookingConfirmed')
async updateExpenses(event: BookingConfirmed) {
  await this.expenseRepository.create(event.toExpense());
}
```

**Consistency Window**: Typically < 1 second (depends on Kafka latency)

---

## Failure Handling

### Retry Strategies

**Synchronous Calls (REST)**:
- Exponential backoff: 100ms, 200ms, 400ms, 800ms, 1600ms
- Max retries: 5
- Timeout: 5 seconds per request
- Circuit breaker after 5 consecutive failures

```typescript
const retryConfig = {
  retries: 5,
  retryDelay: exponentialDelay,
  retryCondition: (error) => {
    return error.response?.status >= 500;
  }
};
```

**Asynchronous Events (Kafka)**:
- Kafka automatically retries delivery
- Dead Letter Queue (DLQ) after 10 failures
- Manual intervention for DLQ messages

### Timeout Policies

| Operation | Timeout | Retry |
|-----------|---------|-------|
| REST API call | 5s | 5x with backoff |
| Database query | 10s | 3x |
| External API (Stripe) | 10s | 3x with backoff |
| External API (Amadeus) | 15s | 3x with backoff |
| Kafka produce | 30s | Kafka handles |
| Kafka consume | Infinite | Manual DLQ |

---

## Consequences

### Positive Consequences

✅ **Loose Coupling**: Services can evolve independently  
✅ **Scalability**: Async processing handles spikes  
✅ **Resilience**: Circuit breakers prevent cascading failures  
✅ **Flexibility**: Mix sync and async based on needs  
✅ **Auditability**: Event log provides complete history  

### Negative Consequences

❌ **Complexity**: Managing distributed transactions is hard  
❌ **Debugging**: Tracing requests across services requires tooling  
❌ **Eventual Consistency**: Users may see stale data temporarily  
❌ **Operational Overhead**: Kafka requires maintenance  

**Mitigations**:
- Distributed tracing (Jaeger) for debugging
- Clear documentation of saga flows
- Monitoring dashboards for event processing
- Correlation IDs for request tracking

---

## Alternatives Considered

### Alternative 1: Synchronous Only (REST)

**Pros**:
- Simpler mental model
- Immediate consistency
- Easier debugging

**Cons**:
- Tight coupling
- Cascading failures
- Poor scalability
- Blocking operations

**Why Rejected**: Not suitable for complex workflows like booking saga

### Alternative 2: Asynchronous Only (Events)

**Pros**:
- Maximum decoupling
- Best scalability
- Resilient to failures

**Cons**:
- Everything is eventually consistent
- Harder for users (no immediate feedback)
- More complex for simple queries

**Why Rejected**: Some operations need immediate response (e.g., search flights)

### Alternative 3: gRPC for Inter-Service Communication

**Pros**:
- Better performance than REST
- Strong typing with Protobuf
- Bidirectional streaming

**Cons**:
- Steeper learning curve
- Less tooling than REST
- Harder to debug

**Why Rejected**: REST is sufficient for our scale; team familiarity matters more

---

## Implementation Guidelines

### REST API Best Practices

1. **Use standard HTTP methods**: GET, POST, PUT, PATCH, DELETE
2. **Version APIs**: `/api/v1/bookings`
3. **Use proper status codes**: 200, 201, 400, 401, 404, 500
4. **Include correlation IDs**: `X-Correlation-ID` header
5. **Document with OpenAPI**: Auto-generate from NestJS decorators
6. **Implement health checks**: `GET /health`, `GET /ready`

### Event Best Practices

1. **Past tense naming**: `BookingCreated`, not `CreateBooking`
2. **Include all context**: Event should be self-contained
3. **Immutable events**: Never change published events
4. **Idempotent handlers**: Handle duplicate events gracefully
5. **Version events**: Include schema version in event
6. **Monitor lag**: Alert if consumer lag > 1000 messages

---

## Monitoring & Observability

### Metrics to Track

**REST APIs**:
- Request count (by endpoint, status code)
- Response time (p50, p95, p99)
- Error rate
- Circuit breaker state

**Kafka Events**:
- Producer throughput
- Consumer lag
- Failed messages (DLQ)
- Processing time per event

**Implementation**:
```typescript
// Prometheus metrics
httpRequestDuration.observe({ 
  method: 'POST', 
  route: '/bookings', 
  status: 201 
}, duration);

eventProcessingDuration.observe({ 
  eventType: 'BookingConfirmed' 
}, duration);
```

### Tracing

**Correlation ID Flow**:
```
User Request → API Gateway (generates correlation ID)
  ↓ (REST)
Booking Service (propagates correlation ID)
  ↓ (Event with correlation ID in header)
Policy Service (reads correlation ID from event)
  ↓ (REST with correlation ID in header)
Budget Service
```

All logs include correlation ID for request tracing.

---

## Security Considerations

### REST APIs

**Authentication**: JWT tokens in `Authorization` header  
**Authorization**: Role-based access control (RBAC)  
**TLS**: All communication over HTTPS in production  
**Rate Limiting**: 100 requests/15 min per user  

### Kafka Events

**Encryption**: TLS for broker communication  
**Authorization**: ACLs on topics (who can publish/consume)  
**Sensitive Data**: Never include full credit card numbers in events  

---

## Related ADRs

- ADR-001: Architecture Style
- ADR-002: Technology Stack
- ADR-004: Data Management
- ADR-005: Security Model

---

## Approved By

- CTO: ✅
- Engineering Manager: ✅
- Lead Architect: ✅

**Implementation Start**: 2026-05-01  
**Status**: Active
