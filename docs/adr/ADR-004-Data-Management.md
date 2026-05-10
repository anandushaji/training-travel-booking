# ADR-004: Data Management Strategy

**Status**: Approved  
**Date**: 2026-05-01  
**Decision Makers**: Architecture Team, DBA, Engineering Leadership  
**Stakeholders**: Engineering Team, DevOps Team, Security Team

---

## Context

In a microservices architecture with 6 services, we need to decide:

1. **Database Ownership**: Who owns which database?
2. **Database Technology**: SQL vs NoSQL per service
3. **Data Consistency**: How to maintain consistency across services
4. **Schema Management**: Migration strategy
5. **Data Access**: Direct database access vs APIs
6. **Backup & Recovery**: Data protection strategy

Key principles:
- Each service should own its data
- No direct database access between services
- Support for both transactional and document data
- Scalability and performance

---

## Decision

### 1. Database-per-Service Pattern

**Each service owns its database exclusively:**

| Service | Database | Type | Rationale |
|---------|----------|------|-----------|
| Booking | PostgreSQL 15 | SQL | ACID transactions for bookings |
| Policy | PostgreSQL 15 | SQL | Complex queries for policy rules |
| Traveler | PostgreSQL 15 | SQL | Structured employee data |
| Payment | PostgreSQL 15 | SQL | ACID for financial transactions |
| Expense | PostgreSQL 15 | SQL | Relational expense data |
| Inventory | MongoDB 7 | NoSQL | Flexible schema for flight data |

**Rules**:
- ✅ Service A can ONLY access its own database
- ❌ Service A CANNOT query Service B's database directly
- ✅ Service A calls Service B's API to get data
- ✅ Service A can subscribe to Service B's events

### 2. PostgreSQL as Default

**Use PostgreSQL for**:
- Transactional data requiring ACID guarantees
- Structured, relational data
- Complex queries and joins
- Data integrity constraints

**Configuration**:
```yaml
Version: PostgreSQL 15
Connection Pool: 20 connections per service
Max Connections: 100
Shared Buffers: 256MB
Effective Cache Size: 1GB
```

### 3. MongoDB for Document Storage

**Use MongoDB for**:
- Flexible schema (flight offers vary by airline)
- High read throughput
- Embedded documents

**Only for**: Inventory Service

**Configuration**:
```yaml
Version: MongoDB 7
Replica Set: 3 nodes (primary + 2 secondaries)
Write Concern: majority
Read Preference: primaryPreferred
```

### 4. Schema Migration Strategy

**Tool**: TypeORM Migrations (PostgreSQL), Mongoose (MongoDB)

**Process**:
```bash
# 1. Create migration
npm run migration:create -- CreateBookingsTable

# 2. Run migration (staging)
npm run migration:run

# 3. Test thoroughly

# 4. Run migration (production)
npm run migration:run -- --config production
```

**Versioning**:
- Migrations are sequential: `001_CreateTables.ts`, `002_AddIndexes.ts`
- Never modify existing migrations
- Always backwards compatible (add columns, never remove)

### 5. Data Access Patterns

**Within Service** (allowed):
```typescript
// ✅ Booking Service accessing its own database
const booking = await this.bookingRepository.findById(id);
```

**Across Services** (use API):
```typescript
// ✅ Booking Service calling Policy Service API
const validation = await this.policyClient.validate({
  travelerId: booking.travelerId,
  amount: booking.totalAmount
});

// ❌ NEVER do this:
// const policy = await this.policyDatabase.query('SELECT ...');
```

**Via Events** (for denormalization):
```typescript
// ✅ Expense Service maintains denormalized traveler name
@OnEvent('TravelerUpdated')
async handleTravelerUpdated(event: TravelerUpdated) {
  await this.expenseRepository.updateTravelerName(
    event.travelerId,
    event.newName
  );
}
```

---

## Detailed Schema Design

### Booking Service Schema

```sql
-- Core booking data
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    traveler_id UUID NOT NULL,
    offer_id VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL,
    itinerary JSONB NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    version INT NOT NULL DEFAULT 1,  -- Optimistic locking
    CONSTRAINT chk_status CHECK (status IN (
        'PENDING', 'RESERVED', 'PAYMENT_PROCESSING', 
        'CONFIRMED', 'CANCELLED', 'FAILED'
    ))
);

-- Indexes for performance
CREATE INDEX idx_bookings_traveler_id ON bookings(traveler_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_created_at ON bookings(created_at DESC);

-- Saga tracking
CREATE TABLE booking_sagas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(id),
    status VARCHAR(50) NOT NULL,
    current_step INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Event store (optional - for event sourcing)
CREATE TABLE event_store (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aggregate_id UUID NOT NULL,
    aggregate_type VARCHAR(100) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    event_data JSONB NOT NULL,
    event_version INT NOT NULL,
    occurred_on TIMESTAMP NOT NULL DEFAULT NOW(),
    correlation_id UUID,
    causation_id UUID
);

CREATE INDEX idx_event_store_aggregate ON event_store(aggregate_id, event_version);

-- Read model for CQRS
CREATE TABLE booking_read_model (
    id UUID PRIMARY KEY,
    traveler_id UUID NOT NULL,
    traveler_name VARCHAR(255),  -- Denormalized
    status VARCHAR(50) NOT NULL,
    origin VARCHAR(3) NOT NULL,
    destination VARCHAR(3) NOT NULL,
    departure_date DATE NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    created_at TIMESTAMP NOT NULL
);

CREATE INDEX idx_read_model_traveler ON booking_read_model(traveler_id, created_at DESC);
CREATE INDEX idx_read_model_status ON booking_read_model(status);
```

### Policy Service Schema

```sql
CREATE TABLE policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    department VARCHAR(100) NOT NULL,
    rules JSONB NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_policies_department ON policies(department);
CREATE INDEX idx_policies_active ON policies(active);

CREATE TABLE budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department VARCHAR(100) NOT NULL,
    fiscal_year INT NOT NULL,
    total_budget DECIMAL(12, 2) NOT NULL,
    spent DECIMAL(12, 2) NOT NULL DEFAULT 0,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_dept_year UNIQUE (department, fiscal_year)
);

CREATE INDEX idx_budgets_dept_year ON budgets(department, fiscal_year);
```

### Payment Service Schema

```sql
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL,
    stripe_payment_intent_id VARCHAR(255) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    status VARCHAR(50) NOT NULL,
    payment_method_id UUID,
    failure_code VARCHAR(100),
    failure_message TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    authorized_at TIMESTAMP,
    captured_at TIMESTAMP,
    failed_at TIMESTAMP,
    refunded_at TIMESTAMP,
    CONSTRAINT chk_payment_status CHECK (status IN (
        'PENDING', 'AUTHORIZED', 'CAPTURED', 
        'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED'
    ))
);

CREATE INDEX idx_payments_booking ON payments(booking_id);
CREATE INDEX idx_payments_status ON payments(status);

CREATE TABLE payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    stripe_payment_method_id VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    last4 VARCHAR(4) NOT NULL,  -- Never store full card number (PCI-DSS)
    brand VARCHAR(50),
    expiry_month INT,
    expiry_year INT,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payment_methods_user ON payment_methods(user_id);
```

### Inventory Service Schema (MongoDB)

```json
// flights collection
{
  "_id": ObjectId("..."),
  "offerId": "FLT-NYC-LAX-2024-001",
  "source": "AMADEUS",
  "searchId": "uuid",
  "price": {
    "total": "450.00",
    "currency": "USD",
    "base": "350.00"
  },
  "itineraries": [
    {
      "segments": [
        {
          "departure": {
            "iataCode": "JFK",
            "at": "2024-06-15T08:00:00"
          },
          "arrival": {
            "iataCode": "LAX",
            "at": "2024-06-15T11:30:00"
          },
          "carrierCode": "UA",
          "number": "1234",
          "duration": "PT5H30M"
        }
      ]
    }
  ],
  "validUntil": ISODate("2024-05-01T23:59:59Z"),
  "createdAt": ISODate("2024-05-01T10:00:00Z")
}

// Indexes
db.flights.createIndex({ "offerId": 1 })
db.flights.createIndex({ "validUntil": 1 }, { expireAfterSeconds: 0 })  // TTL index
db.flights.createIndex({ "searchId": 1 })
```

---

## Data Consistency Strategies

### 1. Strong Consistency (Within Service)

**Use**: When data MUST be consistent immediately

**Implementation**: ACID transactions

```typescript
await this.dataSource.transaction(async (manager) => {
  // Both operations succeed or both fail
  await manager.save(BookingEntity, booking);
  await manager.save(PaymentEntity, payment);
});
```

### 2. Eventual Consistency (Across Services)

**Use**: When data can be slightly stale (< 1 second)

**Implementation**: Event-driven updates

```typescript
// Booking Service publishes event
await this.eventBus.publish(new BookingConfirmed(booking));

// Expense Service updates asynchronously
@OnEvent('BookingConfirmed')
async updateExpenses(event: BookingConfirmed) {
  await this.expenseRepository.create(event.toExpense());
}
```

**Consistency Window**: Typically < 1 second (Kafka latency)

### 3. Saga Pattern (Distributed Transactions)

**Use**: Multi-service operations requiring rollback

**Implementation**: Compensating transactions

```typescript
// Forward transaction
try {
  await policyService.validate(booking);     // Step 1
  await inventoryService.reserve(booking);   // Step 2
  await paymentService.capture(booking);     // Step 3
  await booking.confirm();                   // Step 4
} catch (error) {
  // Compensation (reverse order)
  await paymentService.refund(booking);      // Undo Step 3
  await inventoryService.cancel(booking);    // Undo Step 2
  await booking.markAsFailed();              // Undo Step 4
}
```

---

## Denormalization Strategy

### When to Denormalize

**Denormalize when**:
- Joining across services would require multiple API calls
- Read performance is critical
- Data changes infrequently

**Example**: Expense Service denormalizes traveler name

```sql
-- Expense Service database
CREATE TABLE expenses (
    id UUID PRIMARY KEY,
    booking_id UUID NOT NULL,
    traveler_id UUID NOT NULL,
    traveler_name VARCHAR(255),  -- DENORMALIZED from Traveler Service
    amount DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP NOT NULL
);
```

**Update Mechanism**:
```typescript
// Traveler Service publishes event when name changes
await this.eventBus.publish(new TravelerNameUpdated(
  travelerId,
  oldName,
  newName
));

// Expense Service listens and updates denormalized data
@OnEvent('TravelerNameUpdated')
async updateTravelerName(event: TravelerNameUpdated) {
  await this.expenseRepository.update(
    { travelerId: event.travelerId },
    { travelerName: event.newName }
  );
}
```

### When NOT to Denormalize

**Don't denormalize when**:
- Data changes frequently (causes many updates)
- Single API call is acceptable
- Strong consistency is required

---

## Backup & Recovery

### PostgreSQL Backup Strategy

**Full Backups**: Daily at 2:00 AM UTC
```bash
pg_dump -h booking-db -U postgres booking > booking_backup_$(date +%Y%m%d).sql
```

**Point-in-Time Recovery (PITR)**:
- WAL (Write-Ahead Logging) enabled
- WAL files retained for 7 days
- Can restore to any point in last 7 days

**Retention Policy**:
- Daily backups: 30 days
- Weekly backups: 90 days
- Monthly backups: 1 year

### MongoDB Backup Strategy

**Replica Set**: Automatic replication to 2 secondary nodes

**Backups**: Daily snapshots
```bash
mongodump --host inventory-db --out /backups/inventory_$(date +%Y%m%d)
```

**Retention**: Same as PostgreSQL

### Disaster Recovery

**Recovery Time Objective (RTO)**: 4 hours  
**Recovery Point Objective (RPO)**: 1 hour

**Process**:
1. Identify failed database
2. Spin up new instance
3. Restore from latest backup
4. Replay WAL files (PostgreSQL) or oplog (MongoDB)
5. Update DNS / Kubernetes service
6. Resume operations

---

## Data Privacy & Security

### PCI-DSS Compliance (Payment Data)

**Never Store**:
- Full credit card numbers
- CVV codes

**Store Only**:
- Last 4 digits
- Brand (Visa, Mastercard)
- Expiry month/year
- Stripe payment method ID (tokenized)

**Encryption**:
- All payment data encrypted at rest (AES-256)
- TLS 1.3 for data in transit

### GDPR Compliance (Personal Data)

**Data Subject Rights**:
- Right to access: API endpoint to export all user data
- Right to erasure: Soft delete with anonymization
- Right to portability: Export in JSON format

**Implementation**:
```typescript
// Anonymize user data
async anonymizeUser(userId: string): Promise<void> {
  await this.dataSource.transaction(async (manager) => {
    await manager.update(TravelerEntity, { id: userId }, {
      email: `anonymized-${userId}@deleted.com`,
      firstName: 'ANONYMIZED',
      lastName: 'ANONYMIZED',
      phone: null,
      deletedAt: new Date()
    });
  });
}
```

---

## Performance Optimization

### Indexing Strategy

**Rule**: Index all foreign keys and frequent query columns

```sql
-- Good indexes
CREATE INDEX idx_bookings_traveler_id ON bookings(traveler_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_created_at ON bookings(created_at DESC);

-- Composite index for common queries
CREATE INDEX idx_bookings_traveler_status ON bookings(traveler_id, status);
```

**Monitoring**: Track slow queries (> 100ms)

### Connection Pooling

```typescript
// TypeORM configuration
{
  type: 'postgres',
  host: 'booking-db',
  port: 5432,
  username: 'postgres',
  password: process.env.DB_PASSWORD,
  database: 'booking',
  extra: {
    max: 20,           // Max connections in pool
    min: 5,            // Min connections to maintain
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000
  }
}
```

### Query Optimization

**Use**:
- SELECT only needed columns (not SELECT *)
- LIMIT for pagination
- Prepared statements (prevent SQL injection + caching)

```typescript
// ❌ Bad
const bookings = await this.repository.query('SELECT * FROM bookings');

// ✅ Good
const bookings = await this.repository
  .createQueryBuilder('booking')
  .select(['booking.id', 'booking.status', 'booking.totalAmount'])
  .where('booking.travelerId = :travelerId', { travelerId })
  .limit(20)
  .getMany();
```

---

## Monitoring & Observability

### Database Metrics

**Track**:
- Connection pool usage
- Query execution time (p50, p95, p99)
- Slow queries (> 100ms)
- Database size
- Replication lag (for read replicas)

**Tools**: Prometheus + Grafana

**Alerts**:
- Connection pool > 90% utilization
- Query time p99 > 500ms
- Disk space > 80% full
- Replication lag > 5 seconds

### Query Logging

**Development**: Log all queries
**Production**: Log only slow queries (> 100ms)

```typescript
// TypeORM logging
{
  logging: process.env.NODE_ENV === 'production' ? ['error', 'warn'] : true,
  maxQueryExecutionTime: 100  // Log queries > 100ms
}
```

---

## Consequences

### Positive Consequences

✅ **Service Independence**: Each service owns its data  
✅ **Technology Freedom**: Can use SQL or NoSQL per service  
✅ **Scalability**: Databases scale independently  
✅ **Fault Isolation**: Database failure affects only one service  
✅ **Clear Boundaries**: No accidental coupling via shared database  

### Negative Consequences

❌ **No Cross-Service Joins**: Must use API calls or denormalization  
❌ **Data Duplication**: Denormalized data exists in multiple places  
❌ **Eventual Consistency**: Data may be temporarily out of sync  
❌ **Operational Overhead**: 6 databases to manage instead of 1  

**Mitigations**:
- Event-driven updates for denormalization
- Monitoring for consistency lag
- Automated backups and alerts
- Clear documentation of data ownership

---

## Alternatives Considered

### Alternative 1: Shared Database

**Pros**:
- Single source of truth
- ACID transactions across all data
- Easy joins
- Simpler operations

**Cons**:
- Tight coupling between services
- Single point of failure
- Harder to scale
- Schema changes affect all services
- No technology freedom

**Why Rejected**: Violates microservices principles, creates coupling

### Alternative 2: One Database per Domain (3 databases instead of 6)

**Pros**:
- Fewer databases to manage
- Easier joins within domain

**Cons**:
- Still creates coupling within domain
- Services within same domain can't scale independently
- Schema changes affect multiple services

**Why Rejected**: Not granular enough for our needs

### Alternative 3: Event Sourcing Everywhere

**Pros**:
- Complete audit trail
- Time travel queries
- Can rebuild state from events

**Cons**:
- Massive complexity
- Requires significant expertise
- Overkill for our scale

**Why Rejected**: Too complex for current needs

---

## Migration Plan

**Phase 1** (Week 1): Setup
- Provision 6 database instances
- Configure backups
- Setup monitoring

**Phase 2** (Weeks 2-8): Development
- Implement schema per service
- Create migrations
- Test locally with Docker Compose

**Phase 3** (Week 9): Staging Deployment
- Run migrations in staging
- Load test
- Verify backups

**Phase 4** (Week 15): Production
- Run migrations in production
- Monitor closely
- Rollback plan ready

---

## Related ADRs

- ADR-001: Architecture Style
- ADR-002: Technology Stack
- ADR-003: Communication Patterns
- ADR-005: Security Model

---

## Approved By

- CTO: ✅
- DBA: ✅
- Lead Architect: ✅
- Security Lead: ✅

**Implementation Start**: 2026-05-01  
**Status**: Active
