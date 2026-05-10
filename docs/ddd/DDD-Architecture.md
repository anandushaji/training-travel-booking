# Domain-Driven Design Architecture
## Corporate Travel Portal

**Version**: 2.0  
**Date**: May 2026  
**Architecture**: Node.js + NestJS + React + Docker

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Domain Model Overview](#2-domain-model-overview)
3. [Bounded Contexts](#3-bounded-contexts)
4. [Domain Models (Detailed)](#4-domain-models-detailed)
5. [Application Architecture](#5-application-architecture)
6. [C4 Architecture Diagrams](#6-c4-architecture-diagrams)
7. [Technical Implementation](#7-technical-implementation)
8. [Folder Structure](#8-folder-structure)
9. [Docker Architecture](#9-docker-architecture)
10. [API Design (Contract-First)](#10-api-design-contract-first)
11. [Event-Driven Architecture](#11-event-driven-architecture)
12. [Data Architecture](#12-data-architecture)
13. [Observability & Monitoring](#13-observability--monitoring)
14. [Best Practices](#14-best-practices)

---

## 1. Executive Summary

### 1.1 System Overview

The Corporate Travel Portal is a microservices-based application designed using Domain-Driven Design (DDD) principles. It enables employees to search and book corporate travel while enforcing company policies and managing budgets.

**Key Architectural Principles**:
- **Domain-Driven Design**: Business logic organized around bounded contexts
- **Microservices Architecture**: 6 independent, deployable services
- **Contract-First**: OpenAPI specifications drive development
- **Event-Driven**: Asynchronous communication via Kafka
- **CQRS**: Separation of command and query responsibilities where beneficial
- **Saga Pattern**: Distributed transaction management

### 1.2 Technology Stack

**Backend**:
- **Runtime**: Node.js 20 LTS
- **Framework**: NestJS 10.x (TypeScript)
- **Databases**: PostgreSQL 15 (5 instances), MongoDB 7 (1 instance)
- **Messaging**: Apache Kafka 3.x
- **Cache**: Redis 7

**Frontend**:
- **Framework**: React 18 with TypeScript
- **State Management**: Redux Toolkit + RTK Query
- **UI Library**: Material-UI (MUI) v5
- **Build Tool**: Vite

**Infrastructure**:
- **Containerization**: Docker + Docker Compose
- **Orchestration**: Kubernetes (production)
- **CI/CD**: GitHub Actions
- **Monitoring**: Prometheus + Grafana + Jaeger

### 1.3 Core Business Capabilities

1. **Travel Search & Booking**: Find and book flights via Amadeus API
2. **Policy Management**: Define and enforce travel policies
3. **Budget Management**: Track and control departmental budgets
4. **Payment Processing**: Secure payment via Stripe
5. **Expense Tracking**: Automated receipt generation and reporting
6. **Traveler Management**: Employee profiles and preferences

---

## 2. Domain Model Overview

### 2.1 Ubiquitous Language

**Core Domain Terms**:

| Term | Definition | Example |
|------|------------|---------|
| **Traveler** | An employee who can book travel | John Doe (EMP-12345) |
| **Booking** | A confirmed trip reservation | Booking #BK-2024-001 |
| **Policy** | Rules governing travel bookings | "Max $1000 per flight" |
| **Budget** | Allocated travel spend per department | Engineering: $500K/year |
| **Itinerary** | Travel route and schedule | JFK → LAX, Jun 15-20 |
| **Offer** | A flight option from Amadeus | FLT-NYC-LAX-001 |
| **Reservation** | Temporary hold on flight inventory | PNR: ABC123 |
| **Payment** | Financial transaction | $450 charged to Visa ending 4242 |
| **Receipt** | Proof of payment document | RCP-2024-001.pdf |
| **Expense** | Travel cost to be reported | Flight: $450 |
| **Saga** | Distributed transaction workflow | Book → Pay → Confirm |
| **Policy Violation** | Breach of travel policy | "Business class not allowed" |

### 2.2 Domain Relationships

```
Traveler --makes--> Booking
Booking --validates-against--> Policy
Booking --reserves--> FlightOffer
Booking --processes--> Payment
Booking --generates--> Receipt
Receipt --creates--> Expense
Policy --consumes--> Budget
Traveler --belongs-to--> Department
Department --has--> Budget
```

---

## 3. Bounded Contexts

### 3.1 Context Map

```
┌─────────────────────────────────────────────────────────────┐
│                    Corporate Travel Portal                   │
└─────────────────────────────────────────────────────────────┘

┌──────────────────┐      ┌──────────────────┐      ┌──────────────────┐
│  Booking Context │◄────►│  Policy Context  │◄────►│ Traveler Context │
│  (Core Domain)   │  ACL │  (Core Domain)   │  SL  │ (Supporting)     │
└──────────────────┘      └──────────────────┘      └──────────────────┘
        │                          │                          │
        │ Published                │ Published                │ Shared
        │ Language                 │ Language                 │ Kernel
        │                          │                          │
        ▼                          ▼                          ▼
┌──────────────────┐      ┌──────────────────┐      ┌──────────────────┐
│ Payment Context  │      │  Budget Context  │      │ Identity Context │
│ (Supporting)     │      │ (Supporting)     │      │ (Generic)        │
└──────────────────┘      └──────────────────┘      └──────────────────┘
        │                                                     │
        │ Open Host                                          │ Conformist
        │ Service                                            │
        ▼                                                     ▼
┌──────────────────┐                              ┌──────────────────┐
│ Inventory        │                              │   HR System      │
│ Context          │                              │   (External)     │
│ (Generic)        │                              └──────────────────┘
└──────────────────┘
        │
        │ Anticorruption
        │ Layer
        ▼
┌──────────────────┐
│  Amadeus API     │
│  (External)      │
└──────────────────┘

Legend:
ACL = Anticorruption Layer
SL = Shared Language
```

### 3.2 Bounded Context Definitions

#### 3.2.1 Booking Context (Core Domain)

**Responsibility**: Orchestrate trip bookings using Saga pattern

**Domain Model**:
- **Aggregates**: Booking
- **Entities**: BookingSaga, BookingStep
- **Value Objects**: Itinerary, TripDetails
- **Domain Events**: BookingCreated, BookingConfirmed, BookingCancelled
- **Domain Services**: BookingSagaOrchestrator

**Interactions**:
- Calls Policy Context for validation
- Calls Inventory Context for reservations
- Calls Payment Context for processing
- Publishes events to Expense Context

#### 3.2.2 Policy Context (Core Domain)

**Responsibility**: Enforce travel policies and manage approvals

**Domain Model**:
- **Aggregates**: TravelPolicy, PolicyRule
- **Entities**: PolicyViolation, ApprovalWorkflow
- **Value Objects**: PolicyConstraints, ValidationResult
- **Domain Events**: PolicyValidated, PolicyViolationDetected
- **Domain Services**: PolicyValidator, ApprovalEngine

**Interactions**:
- Receives validation requests from Booking Context
- Checks budget availability from Budget Context
- Reads traveler info from Traveler Context

#### 3.2.3 Traveler Context (Supporting)

**Responsibility**: Manage employee profiles and preferences

**Domain Model**:
- **Aggregates**: Traveler
- **Entities**: TravelerProfile, Manager
- **Value Objects**: Preferences, FrequentFlyerInfo
- **Domain Events**: TravelerCreated, PreferencesUpdated
- **Domain Services**: HRSyncService

**Interactions**:
- Syncs with external HR system
- Provides traveler data to all contexts
- Shared kernel with Identity Context

#### 3.2.4 Payment Context (Supporting)

**Responsibility**: Process payments via Stripe

**Domain Model**:
- **Aggregates**: Payment
- **Entities**: PaymentMethod, Refund
- **Value Objects**: Money, CardDetails
- **Domain Events**: PaymentAuthorized, PaymentCaptured, PaymentFailed
- **Domain Services**: StripeAdapter

**Interactions**:
- Receives payment requests from Booking Context
- Publishes payment events
- Integrates with Stripe (external)

#### 3.2.5 Inventory Context (Generic)

**Responsibility**: Manage flight inventory and reservations

**Domain Model**:
- **Aggregates**: FlightOffer, Reservation
- **Entities**: Segment, Pricing
- **Value Objects**: Airport, FlightNumber
- **Domain Events**: OfferExpired, ReservationCreated
- **Domain Services**: AmadeusAdapter

**Interactions**:
- Wraps Amadeus API (anticorruption layer)
- Provides flight offers to Booking Context
- Manages reservation lifecycle

#### 3.2.6 Expense Context (Supporting)

**Responsibility**: Generate receipts and track expenses

**Domain Model**:
- **Aggregates**: Receipt, Expense
- **Entities**: ExpenseReport
- **Value Objects**: ReceiptLine, TaxInfo
- **Domain Events**: ReceiptGenerated, ExpenseRecorded
- **Domain Services**: ReceiptGenerator, ExpenseReporter

**Interactions**:
- Listens to BookingConfirmed events
- Generates receipts automatically
- Provides expense reports

---

## 4. Domain Models (Detailed)

### 4.1 Booking Context - Domain Model

#### 4.1.1 Booking Aggregate

```typescript
// Domain Layer - Aggregate Root
export class Booking extends AggregateRoot {
  private readonly id: BookingId;
  private travelerId: TravelerId;
  private itinerary: Itinerary;
  private status: BookingStatus;
  private policyValidationId: PolicyValidationId;
  private reservationId: ReservationId;
  private paymentId: PaymentId;
  private totalAmount: Money;
  private saga: BookingSaga;
  
  // Factory method
  static create(
    travelerId: TravelerId,
    itinerary: Itinerary,
    offerId: OfferId
  ): Booking {
    const booking = new Booking();
    booking.apply(new BookingCreated(
      BookingId.generate(),
      travelerId,
      itinerary,
      offerId
    ));
    return booking;
  }
  
  // Business logic
  async validatePolicy(policy: TravelPolicy): Promise<ValidationResult> {
    const result = policy.validate(this.itinerary, this.travelerId);
    
    if (!result.isValid) {
      this.apply(new PolicyViolationDetected(
        this.id,
        result.violations
      ));
      throw new PolicyViolationException(result.violations);
    }
    
    this.policyValidationId = result.validationId;
    return result;
  }
  
  reserve(reservationId: ReservationId): void {
    if (this.status !== BookingStatus.PENDING) {
      throw new InvalidStateException('Cannot reserve in current state');
    }
    
    this.reservationId = reservationId;
    this.status = BookingStatus.RESERVED;
    this.apply(new FlightReserved(this.id, reservationId));
  }
  
  processPayment(paymentId: PaymentId): void {
    this.paymentId = paymentId;
    this.status = BookingStatus.PAYMENT_PROCESSING;
    this.apply(new PaymentProcessing(this.id, paymentId));
  }
  
  confirm(): void {
    if (this.status !== BookingStatus.PAYMENT_PROCESSING) {
      throw new InvalidStateException('Cannot confirm in current state');
    }
    
    this.status = BookingStatus.CONFIRMED;
    this.apply(new BookingConfirmed(
      this.id,
      this.travelerId,
      this.itinerary,
      this.totalAmount
    ));
  }
  
  cancel(reason: string): void {
    if (this.status === BookingStatus.CANCELLED) {
      throw new InvalidStateException('Booking already cancelled');
    }
    
    this.status = BookingStatus.CANCELLED;
    this.saga.compensate(); // Trigger compensation
    this.apply(new BookingCancelled(this.id, reason));
  }
  
  // Event handlers
  onBookingCreated(event: BookingCreated): void {
    this.id = event.bookingId;
    this.travelerId = event.travelerId;
    this.itinerary = event.itinerary;
    this.status = BookingStatus.PENDING;
    this.saga = new BookingSaga(this.id);
  }
  
  onBookingConfirmed(event: BookingConfirmed): void {
    this.status = BookingStatus.CONFIRMED;
  }
}
```

#### 4.1.2 Value Objects

```typescript
// Value Object - Itinerary
export class Itinerary extends ValueObject {
  private readonly origin: Airport;
  private readonly destination: Airport;
  private readonly departureDate: Date;
  private readonly returnDate: Date;
  private readonly cabinClass: CabinClass;
  private readonly passengers: number;
  
  constructor(props: ItineraryProps) {
    super(props);
    this.validate();
  }
  
  private validate(): void {
    if (this.departureDate >= this.returnDate) {
      throw new ValidationException('Return date must be after departure');
    }
    
    if (this.passengers < 1 || this.passengers > 9) {
      throw new ValidationException('Passengers must be between 1 and 9');
    }
  }
  
  equals(other: Itinerary): boolean {
    return (
      this.origin.equals(other.origin) &&
      this.destination.equals(other.destination) &&
      this.departureDate.getTime() === other.departureDate.getTime() &&
      this.returnDate.getTime() === other.returnDate.getTime() &&
      this.cabinClass === other.cabinClass &&
      this.passengers === other.passengers
    );
  }
}

// Value Object - Money
export class Money extends ValueObject {
  private readonly amount: number;
  private readonly currency: Currency;
  
  add(other: Money): Money {
    this.ensureSameCurrency(other);
    return new Money(this.amount + other.amount, this.currency);
  }
  
  subtract(other: Money): Money {
    this.ensureSameCurrency(other);
    if (this.amount < other.amount) {
      throw new InsufficientFundsException();
    }
    return new Money(this.amount - other.amount, this.currency);
  }
  
  multiply(factor: number): Money {
    return new Money(this.amount * factor, this.currency);
  }
  
  private ensureSameCurrency(other: Money): void {
    if (this.currency !== other.currency) {
      throw new CurrencyMismatchException();
    }
  }
}
```

#### 4.1.3 Domain Services

```typescript
// Domain Service - BookingSagaOrchestrator
@Injectable()
export class BookingSagaOrchestrator {
  constructor(
    private readonly policyService: PolicyDomainService,
    private readonly inventoryService: InventoryDomainService,
    private readonly paymentService: PaymentDomainService,
    private readonly eventBus: EventBus
  ) {}
  
  async executeBookingSaga(booking: Booking): Promise<void> {
    const saga = new BookingSaga(booking.getId());
    
    try {
      // Step 1: Validate Policy
      saga.addStep(new ValidatePolicyStep());
      const policy = await this.policyService.getApplicablePolicy(
        booking.getTravelerId()
      );
      await booking.validatePolicy(policy);
      
      // Step 2: Reserve Flight
      saga.addStep(new ReserveFlightStep());
      const reservation = await this.inventoryService.createReservation(
        booking.getOfferId(),
        booking.getItinerary()
      );
      booking.reserve(reservation.getId());
      
      // Step 3: Process Payment
      saga.addStep(new ProcessPaymentStep());
      const payment = await this.paymentService.authorizePayment(
        booking.getTravelerId(),
        booking.getTotalAmount()
      );
      booking.processPayment(payment.getId());
      
      // Step 4: Confirm Booking
      booking.confirm();
      
      // Commit saga
      await saga.commit();
      
    } catch (error) {
      // Compensate in reverse order
      await saga.compensate();
      throw error;
    }
  }
}
```

#### 4.1.4 Repository Pattern

```typescript
// Domain Repository Interface (in domain layer)
export interface IBookingRepository {
  save(booking: Booking): Promise<void>;
  findById(id: BookingId): Promise<Booking | null>;
  findByTraveler(travelerId: TravelerId): Promise<Booking[]>;
  delete(id: BookingId): Promise<void>;
}

// Infrastructure Implementation (in infrastructure layer)
@Injectable()
export class BookingRepository implements IBookingRepository {
  constructor(
    @InjectRepository(BookingEntity)
    private readonly repository: Repository<BookingEntity>,
    private readonly eventBus: EventBus
  ) {}
  
  async save(booking: Booking): Promise<void> {
    const entity = this.toEntity(booking);
    await this.repository.save(entity);
    
    // Publish domain events
    const events = booking.getUncommittedEvents();
    for (const event of events) {
      await this.eventBus.publish(event);
    }
    booking.clearEvents();
  }
  
  async findById(id: BookingId): Promise<Booking | null> {
    const entity = await this.repository.findOne({
      where: { id: id.toString() }
    });
    
    if (!entity) return null;
    return this.toDomain(entity);
  }
  
  private toEntity(booking: Booking): BookingEntity {
    return {
      id: booking.getId().toString(),
      travelerId: booking.getTravelerId().toString(),
      itinerary: JSON.stringify(booking.getItinerary()),
      status: booking.getStatus(),
      totalAmount: booking.getTotalAmount().getAmount(),
      currency: booking.getTotalAmount().getCurrency(),
      // ... other fields
    };
  }
  
  private toDomain(entity: BookingEntity): Booking {
    // Reconstruct aggregate from entity
    const booking = new Booking();
    booking.reconstitute({
      id: BookingId.from(entity.id),
      travelerId: TravelerId.from(entity.travelerId),
      itinerary: JSON.parse(entity.itinerary),
      status: entity.status,
      // ... other fields
    });
    return booking;
  }
}
```

### 4.2 Policy Context - Domain Model

```typescript
// Aggregate Root - TravelPolicy
export class TravelPolicy extends AggregateRoot {
  private readonly id: PolicyId;
  private name: string;
  private department: Department;
  private rules: PolicyRule[];
  private active: boolean;
  
  static create(
    name: string,
    department: Department,
    rules: PolicyRule[]
  ): TravelPolicy {
    const policy = new TravelPolicy();
    policy.apply(new PolicyCreated(
      PolicyId.generate(),
      name,
      department,
      rules
    ));
    return policy;
  }
  
  validate(
    itinerary: Itinerary,
    traveler: TravelerId
  ): ValidationResult {
    const violations: PolicyViolation[] = [];
    
    for (const rule of this.rules) {
      const result = rule.evaluate(itinerary, traveler);
      if (!result.passed) {
        violations.push(
          new PolicyViolation(rule.getName(), result.message)
        );
      }
    }
    
    const isValid = violations.length === 0;
    
    if (!isValid) {
      this.apply(new PolicyViolationDetected(
        this.id,
        traveler,
        violations
      ));
    }
    
    return new ValidationResult(
      PolicyValidationId.generate(),
      isValid,
      violations
    );
  }
  
  addRule(rule: PolicyRule): void {
    this.rules.push(rule);
    this.apply(new PolicyRuleAdded(this.id, rule));
  }
  
  removeRule(ruleName: string): void {
    this.rules = this.rules.filter(r => r.getName() !== ruleName);
    this.apply(new PolicyRuleRemoved(this.id, ruleName));
  }
}

// Entity - PolicyRule
export class PolicyRule extends Entity {
  private readonly name: string;
  private readonly type: RuleType;
  private readonly constraints: RuleConstraints;
  
  evaluate(itinerary: Itinerary, traveler: TravelerId): RuleEvaluationResult {
    switch (this.type) {
      case RuleType.MAX_FLIGHT_COST:
        return this.evaluateMaxCost(itinerary);
      
      case RuleType.ALLOWED_CABIN_CLASSES:
        return this.evaluateCabinClass(itinerary);
      
      case RuleType.ADVANCE_BOOKING_DAYS:
        return this.evaluateAdvanceBooking(itinerary);
      
      case RuleType.REQUIRES_APPROVAL:
        return this.evaluateApprovalRequired(itinerary);
      
      default:
        return RuleEvaluationResult.passed();
    }
  }
  
  private evaluateMaxCost(itinerary: Itinerary): RuleEvaluationResult {
    const maxCost = this.constraints.get('maxAmount');
    const actualCost = itinerary.getEstimatedCost();
    
    if (actualCost.greaterThan(maxCost)) {
      return RuleEvaluationResult.failed(
        `Flight cost $${actualCost} exceeds policy limit of $${maxCost}`
      );
    }
    
    return RuleEvaluationResult.passed();
  }
  
  private evaluateCabinClass(itinerary: Itinerary): RuleEvaluationResult {
    const allowedClasses = this.constraints.get('allowedCabinClasses');
    const requestedClass = itinerary.getCabinClass();
    
    if (!allowedClasses.includes(requestedClass)) {
      return RuleEvaluationResult.failed(
        `${requestedClass} class not allowed by policy`
      );
    }
    
    return RuleEvaluationResult.passed();
  }
}

// Domain Service - PolicyValidator
@Injectable()
export class PolicyValidator {
  constructor(
    private readonly policyRepository: IPolicyRepository,
    private readonly budgetService: BudgetDomainService
  ) {}
  
  async validateBooking(
    travelerId: TravelerId,
    itinerary: Itinerary,
    amount: Money
  ): Promise<ValidationResult> {
    // Get applicable policy
    const policy = await this.policyRepository.findByTraveler(travelerId);
    
    if (!policy) {
      throw new NoPolicyFoundException(travelerId);
    }
    
    // Validate against policy rules
    const policyResult = policy.validate(itinerary, travelerId);
    
    if (!policyResult.isValid) {
      return policyResult;
    }
    
    // Check budget availability
    const department = await this.getDepartment(travelerId);
    const budgetAvailable = await this.budgetService.checkAvailability(
      department,
      amount
    );
    
    if (!budgetAvailable) {
      return ValidationResult.failed([
        new PolicyViolation('BUDGET', 'Insufficient budget available')
      ]);
    }
    
    return ValidationResult.success(policyResult.validationId);
  }
}
```

### 4.3 Payment Context - Domain Model

```typescript
// Aggregate Root - Payment
export class Payment extends AggregateRoot {
  private readonly id: PaymentId;
  private bookingId: BookingId;
  private amount: Money;
  private paymentMethod: PaymentMethod;
  private status: PaymentStatus;
  private stripePaymentIntentId: string;
  
  static authorize(
    bookingId: BookingId,
    amount: Money,
    paymentMethod: PaymentMethod
  ): Payment {
    const payment = new Payment();
    payment.apply(new PaymentAuthorized(
      PaymentId.generate(),
      bookingId,
      amount,
      paymentMethod
    ));
    return payment;
  }
  
  capture(): void {
    if (this.status !== PaymentStatus.AUTHORIZED) {
      throw new InvalidStateException('Payment must be authorized to capture');
    }
    
    this.status = PaymentStatus.CAPTURED;
    this.apply(new PaymentCaptured(this.id, this.amount));
  }
  
  fail(reason: string): void {
    this.status = PaymentStatus.FAILED;
    this.apply(new PaymentFailed(this.id, reason));
  }
  
  refund(amount: Money, reason: string): void {
    if (this.status !== PaymentStatus.CAPTURED) {
      throw new InvalidStateException('Can only refund captured payments');
    }
    
    if (amount.greaterThan(this.amount)) {
      throw new ValidationException('Refund amount cannot exceed payment amount');
    }
    
    this.status = PaymentStatus.REFUNDED;
    this.apply(new PaymentRefunded(this.id, amount, reason));
  }
}

// Value Object - PaymentMethod
export class PaymentMethod extends ValueObject {
  private readonly type: PaymentMethodType;
  private readonly stripePaymentMethodId: string;
  private readonly last4: string;
  private readonly brand: string;
  
  // PCI-DSS compliant - never store full card number
  static fromStripeToken(
    stripeToken: string,
    stripePaymentMethodId: string
  ): PaymentMethod {
    // This would call Stripe API to create payment method
    return new PaymentMethod({
      type: PaymentMethodType.CARD,
      stripePaymentMethodId,
      last4: '****', // Retrieved from Stripe
      brand: 'visa'   // Retrieved from Stripe
    });
  }
}

// Domain Service - StripeAdapter (Anticorruption Layer)
@Injectable()
export class StripeAdapter {
  constructor(
    private readonly stripe: Stripe,
    private readonly config: ConfigService
  ) {}
  
  async authorizePayment(
    payment: Payment
  ): Promise<string> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: payment.getAmount().getAmount() * 100, // Convert to cents
        currency: payment.getAmount().getCurrency().toLowerCase(),
        payment_method: payment.getPaymentMethod().getStripeId(),
        capture_method: 'manual', // Authorize only
        metadata: {
          bookingId: payment.getBookingId().toString(),
          paymentId: payment.getId().toString()
        }
      });
      
      return paymentIntent.id;
      
    } catch (error) {
      throw new PaymentProcessingException(error.message);
    }
  }
  
  async capturePayment(stripePaymentIntentId: string): Promise<void> {
    await this.stripe.paymentIntents.capture(stripePaymentIntentId);
  }
  
  async refundPayment(
    stripePaymentIntentId: string,
    amount: Money
  ): Promise<void> {
    await this.stripe.refunds.create({
      payment_intent: stripePaymentIntentId,
      amount: amount.getAmount() * 100
    });
  }
}
```

---

## 5. Application Architecture

### 5.1 Layered Architecture (per Service)

```
┌─────────────────────────────────────────────────────┐
│                Presentation Layer                    │
│  (Controllers, DTOs, Validation, Error Handling)    │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│              Application Layer                       │
│  (Use Cases, Application Services, Sagas, CQRS)    │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│                 Domain Layer                         │
│  (Aggregates, Entities, Value Objects, Services)    │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│              Infrastructure Layer                    │
│  (Repositories, External Services, Messaging)       │
└─────────────────────────────────────────────────────┘
```

### 5.2 Application Services (Use Cases)

```typescript
// Application Layer - Use Case
@Injectable()
export class CreateBookingUseCase {
  constructor(
    private readonly bookingRepository: IBookingRepository,
    private readonly sagaOrchestrator: BookingSagaOrchestrator,
    private readonly eventBus: EventBus
  ) {}
  
  async execute(command: CreateBookingCommand): Promise<BookingDto> {
    // 1. Create booking aggregate
    const booking = Booking.create(
      TravelerId.from(command.travelerId),
      new Itinerary(command.itinerary),
      OfferId.from(command.offerId)
    );
    
    // 2. Execute saga
    await this.sagaOrchestrator.executeBookingSaga(booking);
    
    // 3. Save aggregate
    await this.bookingRepository.save(booking);
    
    // 4. Return DTO
    return BookingMapper.toDto(booking);
  }
}

// Command
export class CreateBookingCommand {
  constructor(
    public readonly travelerId: string,
    public readonly offerId: string,
    public readonly itinerary: ItineraryDto
  ) {}
}

// DTO
export class BookingDto {
  id: string;
  travelerId: string;
  status: string;
  itinerary: ItineraryDto;
  totalAmount: number;
  currency: string;
  createdAt: Date;
}

// Mapper
export class BookingMapper {
  static toDto(booking: Booking): BookingDto {
    return {
      id: booking.getId().toString(),
      travelerId: booking.getTravelerId().toString(),
      status: booking.getStatus(),
      itinerary: ItineraryMapper.toDto(booking.getItinerary()),
      totalAmount: booking.getTotalAmount().getAmount(),
      currency: booking.getTotalAmount().getCurrency(),
      createdAt: booking.getCreatedAt()
    };
  }
  
  static toDomain(dto: CreateBookingDto): Booking {
    return Booking.create(
      TravelerId.from(dto.travelerId),
      ItineraryMapper.toDomain(dto.itinerary),
      OfferId.from(dto.offerId)
    );
  }
}
```

### 5.3 CQRS Pattern (Where Beneficial)

```typescript
// Command Side
@Injectable()
export class BookingCommandService {
  constructor(
    private readonly bookingRepository: IBookingRepository
  ) {}
  
  async createBooking(command: CreateBookingCommand): Promise<string> {
    const booking = Booking.create(/*...*/);
    await this.bookingRepository.save(booking);
    return booking.getId().toString();
  }
  
  async cancelBooking(command: CancelBookingCommand): Promise<void> {
    const booking = await this.bookingRepository.findById(
      BookingId.from(command.bookingId)
    );
    
    booking.cancel(command.reason);
    await this.bookingRepository.save(booking);
  }
}

// Query Side
@Injectable()
export class BookingQueryService {
  constructor(
    @InjectRepository(BookingReadModel)
    private readonly readModel: Repository<BookingReadModel>
  ) {}
  
  async getBookingById(id: string): Promise<BookingDto> {
    const readModel = await this.readModel.findOne({ where: { id } });
    return BookingMapper.fromReadModel(readModel);
  }
  
  async getBookingsByTraveler(
    travelerId: string,
    filters: BookingFilters
  ): Promise<BookingDto[]> {
    const query = this.readModel
      .createQueryBuilder('booking')
      .where('booking.travelerId = :travelerId', { travelerId });
    
    if (filters.status) {
      query.andWhere('booking.status = :status', { status: filters.status });
    }
    
    if (filters.fromDate) {
      query.andWhere('booking.createdAt >= :fromDate', { fromDate: filters.fromDate });
    }
    
    const readModels = await query.getMany();
    return readModels.map(BookingMapper.fromReadModel);
  }
}

// Read Model (Projection)
@Entity('booking_read_model')
export class BookingReadModel {
  @PrimaryColumn()
  id: string;
  
  @Column()
  travelerId: string;
  
  @Column()
  travelerName: string; // Denormalized for query performance
  
  @Column()
  status: string;
  
  @Column()
  origin: string;
  
  @Column()
  destination: string;
  
  @Column()
  departureDate: Date;
  
  @Column('decimal')
  totalAmount: number;
  
  @Column()
  currency: string;
  
  @CreateDateColumn()
  createdAt: Date;
  
  @Index()
  @Column()
  travelerId: string;
  
  @Index()
  @Column()
  status: string;
}

// Event Handler - Updates Read Model
@Injectable()
export class BookingReadModelUpdater {
  constructor(
    @InjectRepository(BookingReadModel)
    private readonly readModel: Repository<BookingReadModel>
  ) {}
  
  @OnEvent('BookingConfirmed')
  async handleBookingConfirmed(event: BookingConfirmed): Promise<void> {
    await this.readModel.save({
      id: event.bookingId,
      travelerId: event.travelerId,
      travelerName: event.travelerName, // From event payload
      status: 'CONFIRMED',
      origin: event.itinerary.origin,
      destination: event.itinerary.destination,
      departureDate: event.itinerary.departureDate,
      totalAmount: event.totalAmount.amount,
      currency: event.totalAmount.currency,
      createdAt: event.timestamp
    });
  }
}
```

---

## 6. C4 Architecture Diagrams

### 6.1 System Context Diagram (C4 Level 1)

```
                              ┌─────────────┐
                              │  Employee   │
                              │   (User)    │
                              └──────┬──────┘
                                     │
                                     ▼
                   ┌─────────────────────────────────────┐
                   │  Corporate Travel Portal System     │
                   │  (Book and manage corporate travel) │
                   └─────────────┬─────┬─────┬──────────┘
                                 │     │     │
                ┌────────────────┘     │     └────────────────┐
                │                      │                      │
                ▼                      ▼                      ▼
        ┌───────────────┐      ┌──────────────┐     ┌──────────────┐
        │   Amadeus API │      │  Stripe API  │     │  HR System   │
        │  (Flights)    │      │  (Payments)  │     │  (Employee)  │
        └───────────────┘      └──────────────┘     └──────────────┘
        
        External Systems
```

### 6.2 Container Diagram (C4 Level 2)

```
                              Employee (Web Browser)
                                      │
                                      ▼
                              ┌───────────────┐
                              │  React SPA    │
                              │  (Frontend)   │
                              │  Port: 3000   │
                              └───────┬───────┘
                                      │ HTTPS/REST
                                      ▼
                              ┌───────────────┐
                              │ API Gateway   │
                              │  (NestJS)     │
                              │  Port: 4000   │
                              └───────┬───────┘
                                      │
          ┌───────────────────────────┼───────────────────────────┐
          │                           │                           │
          ▼                           ▼                           ▼
  ┌──────────────┐          ┌──────────────┐          ┌──────────────┐
  │   Booking    │          │    Policy    │          │   Traveler   │
  │   Service    │          │   Service    │          │   Service    │
  │ (NestJS)     │          │  (NestJS)    │          │  (NestJS)    │
  │ Port: 3001   │          │  Port: 3002  │          │  Port: 3003  │
  └──────┬───────┘          └──────┬───────┘          └──────┬───────┘
         │                         │                         │
         │                         │                         │
         ▼                         ▼                         ▼
  ┌──────────────┐          ┌──────────────┐          ┌──────────────┐
  │ PostgreSQL   │          │ PostgreSQL   │          │ PostgreSQL   │
  │  (Booking)   │          │  (Policy)    │          │ (Traveler)   │
  └──────────────┘          └──────────────┘          └──────────────┘

          │                           │                           │
          ▼                           ▼                           ▼
  ┌──────────────┐          ┌──────────────┐          ┌──────────────┐
  │   Payment    │          │  Inventory   │          │   Expense    │
  │   Service    │          │   Service    │          │   Service    │
  │  (NestJS)    │          │  (NestJS)    │          │  (NestJS)    │
  │ Port: 3004   │          │ Port: 3005   │          │ Port: 3006   │
  └──────┬───────┘          └──────┬───────┘          └──────┬───────┘
         │                         │                         │
         ▼                         ▼                         ▼
  ┌──────────────┐          ┌──────────────┐          ┌──────────────┐
  │ PostgreSQL   │          │  MongoDB     │          │ PostgreSQL   │
  │  (Payment)   │          │ (Inventory)  │          │  (Expense)   │
  └──────────────┘          └──────────────┘          └──────────────┘

         │                                                     │
         └─────────────────────┬───────────────────────────── ┘
                               │
                               ▼
                       ┌──────────────┐
                       │ Apache Kafka │
                       │ (Event Bus)  │
                       │ Port: 9092   │
                       └──────────────┘

                               │
                       ┌───────┴───────┐
                       │               │
                       ▼               ▼
                ┌────────────┐  ┌────────────┐
                │   Redis    │  │Prometheus  │
                │  (Cache)   │  │ (Metrics)  │
                └────────────┘  └────────────┘
```

### 6.3 Component Diagram - Booking Service (C4 Level 3)

```
┌─────────────────────────────────────────────────────────────────┐
│                      Booking Service (NestJS)                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │             Presentation Layer (Controllers)             │   │
│  │  ┌────────────────┐  ┌────────────────┐                 │   │
│  │  │ BookingController│ │HealthController│                │   │
│  │  │ (REST Endpoints) │  │ (Health Check) │                │   │
│  │  └────────┬─────────┘  └────────────────┘                │   │
│  └───────────┼──────────────────────────────────────────────┘   │
│              │                                                   │
│  ┌───────────▼──────────────────────────────────────────────┐   │
│  │            Application Layer (Use Cases)                  │   │
│  │  ┌──────────────────┐  ┌──────────────────┐             │   │
│  │  │CreateBookingUseCase│ │CancelBookingUseCase│           │   │
│  │  └────────┬──────────┘  └────────┬──────────┘            │   │
│  │           │                      │                        │   │
│  │  ┌────────▼──────────────────────▼────────┐              │   │
│  │  │    BookingSagaOrchestrator             │              │   │
│  │  │  (Coordinates distributed transaction) │              │   │
│  │  └────────┬────────────────────────────────┘              │   │
│  └───────────┼──────────────────────────────────────────────┘   │
│              │                                                   │
│  ┌───────────▼──────────────────────────────────────────────┐   │
│  │                 Domain Layer                              │   │
│  │  ┌────────────┐  ┌───────────────┐  ┌─────────────┐     │   │
│  │  │  Booking   │  │  BookingSaga  │  │  Itinerary  │     │   │
│  │  │ (Aggregate)│  │   (Entity)    │  │(Value Object)│    │   │
│  │  └────────────┘  └───────────────┘  └─────────────┘     │   │
│  │                                                           │   │
│  │  ┌──────────────────────────────────────────┐            │   │
│  │  │  BookingSagaOrchestrator (Domain Service)│            │   │
│  │  └──────────────────────────────────────────┘            │   │
│  └───────────┬──────────────────────────────────────────────┘   │
│              │                                                   │
│  ┌───────────▼──────────────────────────────────────────────┐   │
│  │           Infrastructure Layer                            │   │
│  │  ┌─────────────────┐  ┌─────────────────┐                │   │
│  │  │BookingRepository│  │  EventPublisher │                │   │
│  │  │  (PostgreSQL)   │  │    (Kafka)      │                │   │
│  │  └─────────────────┘  └─────────────────┘                │   │
│  │                                                            │   │
│  │  ┌─────────────────┐  ┌─────────────────┐                │   │
│  │  │PolicyServiceClient│ │InventoryClient │                │   │
│  │  │  (gRPC/HTTP)    │  │  (gRPC/HTTP)   │                │   │
│  │  └─────────────────┘  └─────────────────┘                │   │
│  └────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 6.4 Technical Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                         Frontend Layer                            │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  React 18 + TypeScript + Redux Toolkit + Material-UI    │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │   │
│  │  │ Booking  │ │ Search   │ │ Profile  │ │ Expenses │   │   │
│  │  │   UI     │ │   UI     │ │   UI     │ │   UI     │   │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │   │
│  │                                                           │   │
│  │  ┌──────────────────────────────────────────────────┐   │   │
│  │  │ RTK Query (API Client with caching & prefetch)   │   │   │
│  │  └──────────────────────────────────────────────────┘   │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────────┬───────────────────────────────────────┘
                           │ HTTPS/REST + JWT
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│                      API Gateway Layer                            │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  NestJS API Gateway (Port 4000)                          │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │   │
│  │  │   Auth   │ │   Rate   │ │  Circuit │ │  Request │   │   │
│  │  │   JWT    │ │  Limit   │ │  Breaker │ │  Logging │   │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────────┬───────────────────────────────────────┘
                           │ Internal HTTP/gRPC
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│                    Microservices Layer                            │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐   │
│  │  Booking   │ │   Policy   │ │  Traveler  │ │  Payment   │   │
│  │  Service   │ │  Service   │ │  Service   │ │  Service   │   │
│  │  (NestJS)  │ │  (NestJS)  │ │  (NestJS)  │ │  (NestJS)  │   │
│  │  :3001     │ │  :3002     │ │  :3003     │ │  :3004     │   │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘   │
│                                                                   │
│  ┌────────────┐ ┌────────────┐                                  │
│  │ Inventory  │ │  Expense   │                                  │
│  │  Service   │ │  Service   │                                  │
│  │  (NestJS)  │ │  (NestJS)  │                                  │
│  │  :3005     │ │  :3006     │                                  │
│  └────────────┘ └────────────┘                                  │
└──────────────────────────┬───────────────────────────────────────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
          ▼                ▼                ▼
┌──────────────────────────────────────────────────────────────────┐
│                       Data Layer                                  │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐   │
│  │PostgreSQL  │ │PostgreSQL  │ │PostgreSQL  │ │PostgreSQL  │   │
│  │ (Booking)  │ │ (Policy)   │ │(Traveler)  │ │ (Payment)  │   │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘   │
│                                                                   │
│  ┌────────────┐ ┌────────────┐                                  │
│  │  MongoDB   │ │PostgreSQL  │                                  │
│  │(Inventory) │ │ (Expense)  │                                  │
│  └────────────┘ └────────────┘                                  │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                  Infrastructure Services                          │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐   │
│  │   Kafka    │ │   Redis    │ │ Prometheus │ │  Jaeger    │   │
│  │ (Events)   │ │  (Cache)   │ │ (Metrics)  │ │ (Tracing)  │   │
│  │  :9092     │ │  :6379     │ │  :9090     │ │ :16686     │   │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘   │
│                                                                   │
│  ┌────────────┐ ┌────────────┐                                  │
│  │Elasticsearch│ │  Kibana    │                                  │
│  │   (Logs)   │ │  (Dashboards)│                                │
│  │  :9200     │ │  :5601     │                                  │
│  └────────────┘ └────────────┘                                  │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                    External Systems                               │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐                   │
│  │  Amadeus   │ │   Stripe   │ │ HR System  │                   │
│  │    API     │ │    API     │ │   (SOAP)   │                   │
│  └────────────┘ └────────────┘ └────────────┘                   │
└──────────────────────────────────────────────────────────────────┘
```

---

## 7. Technical Implementation

### 7.1 NestJS Service Structure

```typescript
// src/booking-service/booking.module.ts
@Module({
  imports: [
    // Domain Module
    TypeOrmModule.forFeature([BookingEntity, BookingSagaEntity]),
    
    // Infrastructure
    KafkaModule,
    RedisModule,
    
    // External Services
    PolicyServiceModule,
    InventoryServiceModule,
    PaymentServiceModule,
  ],
  controllers: [
    BookingController,
    HealthController,
  ],
  providers: [
    // Use Cases
    CreateBookingUseCase,
    CancelBookingUseCase,
    GetBookingUseCase,
    
    // Domain Services
    BookingSagaOrchestrator,
    
    // Repositories
    {
      provide: 'IBookingRepository',
      useClass: BookingRepository,
    },
    
    // Event Handlers
    BookingEventHandler,
    
    // Mappers
    BookingMapper,
  ],
})
export class BookingModule {}

// src/booking-service/presentation/controllers/booking.controller.ts
@Controller('bookings')
@UseGuards(JwtAuthGuard)
@ApiTags('bookings')
export class BookingController {
  constructor(
    private readonly createBookingUseCase: CreateBookingUseCase,
    private readonly cancelBookingUseCase: CancelBookingUseCase,
    private readonly getBookingUseCase: GetBookingUseCase,
  ) {}
  
  @Post()
  @ApiOperation({ summary: 'Create a new booking' })
  @ApiResponse({ status: 201, type: BookingDto })
  async createBooking(
    @Body() dto: CreateBookingDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<BookingDto> {
    const command = new CreateBookingCommand(
      user.userId,
      dto.offerId,
      dto.itinerary,
    );
    
    return await this.createBookingUseCase.execute(command);
  }
  
  @Get(':id')
  @ApiOperation({ summary: 'Get booking by ID' })
  @ApiResponse({ status: 200, type: BookingDto })
  async getBooking(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<BookingDto> {
    const query = new GetBookingQuery(id, user.userId);
    return await this.getBookingUseCase.execute(query);
  }
  
  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel a booking' })
  @ApiResponse({ status: 200 })
  async cancelBooking(
    @Param('id') id: string,
    @Body() dto: CancelBookingDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<void> {
    const command = new CancelBookingCommand(
      id,
      user.userId,
      dto.reason,
    );
    
    await this.cancelBookingUseCase.execute(command);
  }
}

// src/booking-service/presentation/dto/create-booking.dto.ts
export class CreateBookingDto {
  @ApiProperty()
  @IsUUID()
  offerId: string;
  
  @ApiProperty()
  @ValidateNested()
  @Type(() => ItineraryDto)
  itinerary: ItineraryDto;
}

export class ItineraryDto {
  @ApiProperty()
  @IsString()
  @Length(3, 3)
  origin: string;
  
  @ApiProperty()
  @IsString()
  @Length(3, 3)
  destination: string;
  
  @ApiProperty()
  @IsISO8601()
  departureDate: string;
  
  @ApiProperty()
  @IsISO8601()
  returnDate: string;
  
  @ApiProperty({ enum: CabinClass })
  @IsEnum(CabinClass)
  cabinClass: CabinClass;
  
  @ApiProperty()
  @IsInt()
  @Min(1)
  @Max(9)
  passengers: number;
}
```

### 7.2 Event-Driven Communication

```typescript
// src/booking-service/infrastructure/messaging/booking-event-publisher.ts
@Injectable()
export class BookingEventPublisher {
  constructor(
    @Inject('KAFKA_PRODUCER')
    private readonly kafka: Producer,
  ) {}
  
  async publishBookingConfirmed(event: BookingConfirmed): Promise<void> {
    await this.kafka.send({
      topic: 'booking-events',
      messages: [
        {
          key: event.bookingId,
          value: JSON.stringify({
            type: 'BookingConfirmed',
            data: {
              bookingId: event.bookingId,
              travelerId: event.travelerId,
              itinerary: event.itinerary,
              totalAmount: event.totalAmount,
              timestamp: event.timestamp,
            },
          }),
          headers: {
            'correlation-id': event.correlationId,
            'causation-id': event.causationId,
          },
        },
      ],
    });
  }
}

// src/expense-service/infrastructure/messaging/booking-event-listener.ts
@Injectable()
export class BookingEventListener {
  constructor(
    private readonly generateReceiptUseCase: GenerateReceiptUseCase,
  ) {}
  
  @OnEvent('BookingConfirmed')
  async handleBookingConfirmed(event: BookingConfirmed): Promise<void> {
    const command = new GenerateReceiptCommand(
      event.bookingId,
      event.travelerId,
      event.totalAmount,
    );
    
    await this.generateReceiptUseCase.execute(command);
  }
}

// src/shared/infrastructure/kafka/kafka.module.ts
@Module({
  providers: [
    {
      provide: 'KAFKA_PRODUCER',
      useFactory: async (config: ConfigService) => {
        const kafka = new Kafka({
          clientId: config.get('KAFKA_CLIENT_ID'),
          brokers: config.get('KAFKA_BROKERS').split(','),
        });
        
        const producer = kafka.producer();
        await producer.connect();
        return producer;
      },
      inject: [ConfigService],
    },
    {
      provide: 'KAFKA_CONSUMER',
      useFactory: async (config: ConfigService) => {
        const kafka = new Kafka({
          clientId: config.get('KAFKA_CLIENT_ID'),
          brokers: config.get('KAFKA_BROKERS').split(','),
        });
        
        const consumer = kafka.consumer({
          groupId: config.get('KAFKA_GROUP_ID'),
        });
        await consumer.connect();
        return consumer;
      },
      inject: [ConfigService],
    },
  ],
  exports: ['KAFKA_PRODUCER', 'KAFKA_CONSUMER'],
})
export class KafkaModule {}
```

### 7.3 Repository Implementation

```typescript
// src/booking-service/infrastructure/persistence/booking.repository.ts
@Injectable()
export class BookingRepository implements IBookingRepository {
  constructor(
    @InjectRepository(BookingEntity)
    private readonly orm: Repository<BookingEntity>,
    private readonly eventBus: EventBus,
    private readonly logger: Logger,
  ) {}
  
  async save(booking: Booking): Promise<void> {
    const entity = this.toEntity(booking);
    
    await this.orm.manager.transaction(async (manager) => {
      // Save aggregate
      await manager.save(BookingEntity, entity);
      
      // Publish domain events
      const events = booking.getUncommittedEvents();
      for (const event of events) {
        await this.eventBus.publish(event);
        
        // Store event in event store for event sourcing (optional)
        await manager.save(EventStoreEntity, {
          aggregateId: booking.getId().toString(),
          aggregateType: 'Booking',
          eventType: event.constructor.name,
          eventData: JSON.stringify(event),
          timestamp: new Date(),
        });
      }
      
      booking.clearEvents();
    });
    
    this.logger.log(`Booking ${booking.getId()} saved successfully`);
  }
  
  async findById(id: BookingId): Promise<Booking | null> {
    const entity = await this.orm.findOne({
      where: { id: id.toString() },
      relations: ['saga', 'saga.steps'],
    });
    
    if (!entity) {
      return null;
    }
    
    return this.toDomain(entity);
  }
  
  private toEntity(booking: Booking): BookingEntity {
    return {
      id: booking.getId().toString(),
      travelerId: booking.getTravelerId().toString(),
      offerId: booking.getOfferId().toString(),
      status: booking.getStatus(),
      itinerary: JSON.stringify(booking.getItinerary()),
      policyValidationId: booking.getPolicyValidationId()?.toString(),
      reservationId: booking.getReservationId()?.toString(),
      paymentId: booking.getPaymentId()?.toString(),
      totalAmount: booking.getTotalAmount().getAmount(),
      currency: booking.getTotalAmount().getCurrency(),
      createdAt: booking.getCreatedAt(),
      updatedAt: new Date(),
      version: booking.getVersion(), // For optimistic locking
    };
  }
  
  private toDomain(entity: BookingEntity): Booking {
    const booking = new Booking();
    
    // Reconstitute from entity
    booking.reconstitute({
      id: BookingId.from(entity.id),
      travelerId: TravelerId.from(entity.travelerId),
      offerId: OfferId.from(entity.offerId),
      status: entity.status,
      itinerary: JSON.parse(entity.itinerary),
      policyValidationId: entity.policyValidationId 
        ? PolicyValidationId.from(entity.policyValidationId) 
        : null,
      reservationId: entity.reservationId 
        ? ReservationId.from(entity.reservationId) 
        : null,
      paymentId: entity.paymentId 
        ? PaymentId.from(entity.paymentId) 
        : null,
      totalAmount: new Money(entity.totalAmount, entity.currency),
      createdAt: entity.createdAt,
      version: entity.version,
    });
    
    return booking;
  }
}

// TypeORM Entity
@Entity('bookings')
export class BookingEntity {
  @PrimaryColumn('uuid')
  id: string;
  
  @Column('uuid')
  @Index()
  travelerId: string;
  
  @Column()
  offerId: string;
  
  @Column({
    type: 'enum',
    enum: BookingStatus,
  })
  @Index()
  status: BookingStatus;
  
  @Column('jsonb')
  itinerary: string;
  
  @Column({ nullable: true })
  policyValidationId: string;
  
  @Column({ nullable: true })
  reservationId: string;
  
  @Column({ nullable: true })
  paymentId: string;
  
  @Column('decimal', { precision: 10, scale: 2 })
  totalAmount: number;
  
  @Column()
  currency: string;
  
  @CreateDateColumn()
  createdAt: Date;
  
  @UpdateDateColumn()
  updatedAt: Date;
  
  @VersionColumn()
  version: number;
  
  @OneToOne(() => BookingSagaEntity, saga => saga.booking)
  saga: BookingSagaEntity;
}
```

---

## 8. Folder Structure

### 8.1 Backend (NestJS Microservice)

```
booking-service/
├── src/
│   ├── domain/                          # Domain Layer (Pure Business Logic)
│   │   ├── aggregates/
│   │   │   ├── booking.aggregate.ts     # Booking Aggregate Root
│   │   │   └── booking-saga.aggregate.ts
│   │   ├── entities/
│   │   │   └── booking-step.entity.ts   # Domain Entity
│   │   ├── value-objects/
│   │   │   ├── booking-id.vo.ts
│   │   │   ├── itinerary.vo.ts
│   │   │   ├── money.vo.ts
│   │   │   └── traveler-id.vo.ts
│   │   ├── events/
│   │   │   ├── booking-created.event.ts
│   │   │   ├── booking-confirmed.event.ts
│   │   │   └── booking-cancelled.event.ts
│   │   ├── services/
│   │   │   └── booking-saga-orchestrator.service.ts
│   │   ├── repositories/
│   │   │   └── booking.repository.interface.ts
│   │   └── exceptions/
│   │       ├── policy-violation.exception.ts
│   │       └── invalid-state.exception.ts
│   │
│   ├── application/                     # Application Layer (Use Cases)
│   │   ├── commands/
│   │   │   ├── create-booking.command.ts
│   │   │   ├── cancel-booking.command.ts
│   │   │   └── update-booking.command.ts
│   │   ├── queries/
│   │   │   ├── get-booking.query.ts
│   │   │   └── list-bookings.query.ts
│   │   ├── use-cases/
│   │   │   ├── create-booking.use-case.ts
│   │   │   ├── cancel-booking.use-case.ts
│   │   │   ├── get-booking.use-case.ts
│   │   │   └── list-bookings.use-case.ts
│   │   ├── dto/
│   │   │   ├── booking.dto.ts
│   │   │   └── itinerary.dto.ts
│   │   └── mappers/
│   │       ├── booking.mapper.ts
│   │       └── itinerary.mapper.ts
│   │
│   ├── infrastructure/                  # Infrastructure Layer
│   │   ├── persistence/
│   │   │   ├── entities/
│   │   │   │   ├── booking.entity.ts    # TypeORM Entity
│   │   │   │   └── booking-saga.entity.ts
│   │   │   ├── repositories/
│   │   │   │   └── booking.repository.ts
│   │   │   └── migrations/
│   │   │       └── 001-create-bookings-table.ts
│   │   ├── messaging/
│   │   │   ├── kafka/
│   │   │   │   ├── booking-event-publisher.ts
│   │   │   │   └── booking-event-listener.ts
│   │   │   └── events/
│   │   │       └── booking-events.ts
│   │   ├── external-services/
│   │   │   ├── policy-service.client.ts
│   │   │   ├── inventory-service.client.ts
│   │   │   └── payment-service.client.ts
│   │   ├── cache/
│   │   │   └── redis.service.ts
│   │   └── logging/
│   │       └── winston.logger.ts
│   │
│   ├── presentation/                    # Presentation Layer (API)
│   │   ├── controllers/
│   │   │   ├── booking.controller.ts
│   │   │   └── health.controller.ts
│   │   ├── dto/
│   │   │   ├── create-booking.dto.ts
│   │   │   ├── update-booking.dto.ts
│   │   │   └── cancel-booking.dto.ts
│   │   ├── guards/
│   │   │   ├── jwt-auth.guard.ts
│   │   │   └── roles.guard.ts
│   │   ├── decorators/
│   │   │   └── current-user.decorator.ts
│   │   ├── filters/
│   │   │   └── http-exception.filter.ts
│   │   ├── interceptors/
│   │   │   ├── logging.interceptor.ts
│   │   │   └── transform.interceptor.ts
│   │   └── pipes/
│   │       └── validation.pipe.ts
│   │
│   ├── shared/                          # Shared Utilities
│   │   ├── base-classes/
│   │   │   ├── aggregate-root.base.ts
│   │   │   ├── entity.base.ts
│   │   │   └── value-object.base.ts
│   │   ├── interfaces/
│   │   │   ├── repository.interface.ts
│   │   │   └── use-case.interface.ts
│   │   └── utils/
│   │       ├── uuid.util.ts
│   │       └── date.util.ts
│   │
│   ├── config/                          # Configuration
│   │   ├── database.config.ts
│   │   ├── kafka.config.ts
│   │   └── redis.config.ts
│   │
│   ├── booking.module.ts                # Main Module
│   └── main.ts                          # Bootstrap
│
├── test/
│   ├── unit/
│   │   ├── domain/
│   │   │   └── booking.aggregate.spec.ts
│   │   └── application/
│   │       └── create-booking.use-case.spec.ts
│   ├── integration/
│   │   └── booking.repository.spec.ts
│   └── e2e/
│       └── booking.e2e-spec.ts
│
├── openapi/
│   └── booking-service.yaml            # OpenAPI Specification
│
├── Dockerfile
├── docker-compose.yml
├── nest-cli.json
├── tsconfig.json
├── package.json
└── README.md
```

### 8.2 Frontend (React)

```
travel-portal-ui/
├── src/
│   ├── app/                             # App Setup
│   │   ├── store.ts                     # Redux Store
│   │   ├── rootReducer.ts
│   │   └── App.tsx
│   │
│   ├── features/                        # Feature Modules
│   │   ├── booking/
│   │   │   ├── components/
│   │   │   │   ├── BookingForm.tsx
│   │   │   │   ├── BookingList.tsx
│   │   │   │   └── BookingDetails.tsx
│   │   │   ├── pages/
│   │   │   │   ├── BookingPage.tsx
│   │   │   │   └── BookingConfirmationPage.tsx
│   │   │   ├── hooks/
│   │   │   │   └── useBooking.ts
│   │   │   ├── api/
│   │   │   │   └── bookingApi.ts        # RTK Query API
│   │   │   ├── slices/
│   │   │   │   └── bookingSlice.ts      # Redux Slice
│   │   │   └── types/
│   │   │       └── booking.types.ts
│   │   │
│   │   ├── search/
│   │   │   ├── components/
│   │   │   │   ├── SearchForm.tsx
│   │   │   │   ├── FlightResults.tsx
│   │   │   │   └── FlightCard.tsx
│   │   │   ├── pages/
│   │   │   │   └── SearchPage.tsx
│   │   │   ├── api/
│   │   │   │   └── flightApi.ts
│   │   │   └── slices/
│   │   │       └── searchSlice.ts
│   │   │
│   │   ├── profile/
│   │   │   ├── components/
│   │   │   ├── pages/
│   │   │   └── api/
│   │   │
│   │   ├── expenses/
│   │   │   ├── components/
│   │   │   ├── pages/
│   │   │   └── api/
│   │   │
│   │   └── auth/
│   │       ├── components/
│   │       │   └── LoginForm.tsx
│   │       ├── pages/
│   │       │   └── LoginPage.tsx
│   │       ├── slices/
│   │       │   └── authSlice.ts
│   │       └── utils/
│   │           └── jwt.utils.ts
│   │
│   ├── common/                          # Shared Components
│   │   ├── components/
│   │   │   ├── Layout/
│   │   │   │   ├── Header.tsx
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   └── Footer.tsx
│   │   │   ├── Button/
│   │   │   │   └── Button.tsx
│   │   │   ├── Input/
│   │   │   │   └── Input.tsx
│   │   │   └── Card/
│   │   │       └── Card.tsx
│   │   ├── hooks/
│   │   │   ├── useAuth.ts
│   │   │   └── useDebounce.ts
│   │   └── utils/
│   │       ├── api.utils.ts
│   │       ├── date.utils.ts
│   │       └── currency.utils.ts
│   │
│   ├── api/                             # API Client
│   │   ├── baseApi.ts                   # RTK Query Base API
│   │   ├── endpoints/
│   │   │   ├── bookings.ts
│   │   │   ├── flights.ts
│   │   │   └── travelers.ts
│   │   └── types/
│   │       └── api.types.ts
│   │
│   ├── routes/                          # Routing
│   │   ├── AppRoutes.tsx
│   │   ├── PrivateRoute.tsx
│   │   └── routes.config.ts
│   │
│   ├── theme/                           # MUI Theme
│   │   ├── theme.ts
│   │   └── overrides.ts
│   │
│   ├── assets/                          # Static Assets
│   │   ├── images/
│   │   └── icons/
│   │
│   ├── types/                           # TypeScript Types
│   │   └── global.d.ts
│   │
│   ├── index.tsx                        # Entry Point
│   └── vite-env.d.ts
│
├── public/
│   ├── index.html
│   └── favicon.ico
│
├── Dockerfile
├── vite.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

---

## 9. Docker Architecture

### 9.1 Multi-Stage Dockerfile (NestJS Service)

```dockerfile
# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig*.json ./
COPY nest-cli.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY src/ ./src/

# Build application
RUN npm run build

# Remove dev dependencies
RUN npm prune --production

# Stage 2: Production
FROM node:20-alpine

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy built application from builder
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./

# Switch to non-root user
USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => r.statusCode === 200 ? process.exit(0) : process.exit(1))"

# Expose port
EXPOSE 3001

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start application
CMD ["node", "dist/main.js"]
```

### 9.2 Dockerfile (React)

```dockerfile
# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build application
RUN npm run build

# Stage 2: Production (Nginx)
FROM nginx:alpine

# Copy built assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Health check
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

### 9.3 Docker Compose (Complete Stack)

```yaml
version: '3.8'

services:
  # Frontend
  frontend:
    build:
      context: ./travel-portal-ui
      dockerfile: Dockerfile
    ports:
      - "3000:80"
    environment:
      - REACT_APP_API_URL=http://api-gateway:4000
    depends_on:
      - api-gateway
    networks:
      - frontend-network

  # API Gateway
  api-gateway:
    build:
      context: ./api-gateway
      dockerfile: Dockerfile
    ports:
      - "4000:4000"
    environment:
      - NODE_ENV=production
      - JWT_SECRET=${JWT_SECRET}
      - BOOKING_SERVICE_URL=http://booking-service:3001
      - POLICY_SERVICE_URL=http://policy-service:3002
      - TRAVELER_SERVICE_URL=http://traveler-service:3003
      - PAYMENT_SERVICE_URL=http://payment-service:3004
      - INVENTORY_SERVICE_URL=http://inventory-service:3005
      - EXPENSE_SERVICE_URL=http://expense-service:3006
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis
      - booking-service
      - policy-service
      - traveler-service
      - payment-service
      - inventory-service
      - expense-service
    networks:
      - frontend-network
      - backend-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:4000/health"]
      interval: 30s
      timeout: 3s
      retries: 3

  # Booking Service
  booking-service:
    build:
      context: ./booking-service
      dockerfile: Dockerfile
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://user:password@booking-db:5432/booking
      - KAFKA_BROKERS=kafka:9092
      - REDIS_URL=redis://redis:6379
    depends_on:
      - booking-db
      - kafka
      - redis
    networks:
      - backend-network
      - database-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 3s
      retries: 3

  # Policy Service
  policy-service:
    build:
      context: ./policy-service
      dockerfile: Dockerfile
    ports:
      - "3002:3002"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://user:password@policy-db:5432/policy
      - KAFKA_BROKERS=kafka:9092
      - REDIS_URL=redis://redis:6379
    depends_on:
      - policy-db
      - kafka
      - redis
    networks:
      - backend-network
      - database-network

  # Traveler Service
  traveler-service:
    build:
      context: ./traveler-service
      dockerfile: Dockerfile
    ports:
      - "3003:3003"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://user:password@traveler-db:5432/traveler
      - KAFKA_BROKERS=kafka:9092
    depends_on:
      - traveler-db
      - kafka
    networks:
      - backend-network
      - database-network

  # Payment Service
  payment-service:
    build:
      context: ./payment-service
      dockerfile: Dockerfile
    ports:
      - "3004:3004"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://user:password@payment-db:5432/payment
      - STRIPE_API_KEY=${STRIPE_API_KEY}
      - KAFKA_BROKERS=kafka:9092
    depends_on:
      - payment-db
      - kafka
    networks:
      - backend-network
      - database-network

  # Inventory Service
  inventory-service:
    build:
      context: ./inventory-service
      dockerfile: Dockerfile
    ports:
      - "3005:3005"
    environment:
      - NODE_ENV=production
      - MONGODB_URL=mongodb://inventory-db:27017/inventory
      - AMADEUS_API_KEY=${AMADEUS_API_KEY}
      - AMADEUS_API_SECRET=${AMADEUS_API_SECRET}
      - REDIS_URL=redis://redis:6379
    depends_on:
      - inventory-db
      - redis
    networks:
      - backend-network
      - database-network

  # Expense Service
  expense-service:
    build:
      context: ./expense-service
      dockerfile: Dockerfile
    ports:
      - "3006:3006"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://user:password@expense-db:5432/expense
      - KAFKA_BROKERS=kafka:9092
    depends_on:
      - expense-db
      - kafka
    networks:
      - backend-network
      - database-network

  # Databases
  booking-db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=booking
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=password
    volumes:
      - booking-data:/var/lib/postgresql/data
    networks:
      - database-network

  policy-db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=policy
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=password
    volumes:
      - policy-data:/var/lib/postgresql/data
    networks:
      - database-network

  traveler-db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=traveler
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=password
    volumes:
      - traveler-data:/var/lib/postgresql/data
    networks:
      - database-network

  payment-db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=payment
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=password
    volumes:
      - payment-data:/var/lib/postgresql/data
    networks:
      - database-network

  expense-db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=expense
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=password
    volumes:
      - expense-data:/var/lib/postgresql/data
    networks:
      - database-network

  inventory-db:
    image: mongo:7
    environment:
      - MONGO_INITDB_DATABASE=inventory
    volumes:
      - inventory-data:/data/db
    networks:
      - database-network

  # Infrastructure
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    networks:
      - backend-network
    command: redis-server --appendonly yes

  zookeeper:
    image: confluentinc/cp-zookeeper:7.5.0
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181
      ZOOKEEPER_TICK_TIME: 2000
    networks:
      - backend-network

  kafka:
    image: confluentinc/cp-kafka:7.5.0
    depends_on:
      - zookeeper
    ports:
      - "9092:9092"
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka:9092
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
    networks:
      - backend-network

  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus-data:/prometheus
    networks:
      - backend-network

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3100:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana-data:/var/lib/grafana
    depends_on:
      - prometheus
    networks:
      - backend-network

  jaeger:
    image: jaegertracing/all-in-one:latest
    ports:
      - "16686:16686"
      - "14268:14268"
    networks:
      - backend-network

networks:
  frontend-network:
    driver: bridge
  backend-network:
    driver: bridge
  database-network:
    driver: bridge
    internal: true

volumes:
  booking-data:
  policy-data:
  traveler-data:
  payment-data:
  expense-data:
  inventory-data:
  redis-data:
  prometheus-data:
  grafana-data:
```

---

## 10. API Design (Contract-First)

### 10.1 OpenAPI-First Development

```yaml
# openapi/booking-service.yaml
openapi: 3.0.3
info:
  title: Booking Service API
  version: 1.0.0
  description: Corporate Travel Portal - Booking Service

servers:
  - url: http://localhost:3001
    description: Development
  - url: https://api.travel.company.com/api/bookings
    description: Production

tags:
  - name: Bookings
    description: Booking management operations

paths:
  /bookings:
    post:
      operationId: createBooking
      tags: [Bookings]
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateBookingRequest'
      responses:
        '201':
          description: Booking created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Booking'
        '400':
          $ref: '#/components/responses/BadRequest'
        '422':
          $ref: '#/components/responses/ValidationError'

components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

  schemas:
    CreateBookingRequest:
      type: object
      required:
        - travelerId
        - offerId
        - itinerary
      properties:
        travelerId:
          type: string
          format: uuid
        offerId:
          type: string
        itinerary:
          $ref: '#/components/schemas/Itinerary'

    Booking:
      type: object
      properties:
        id:
          type: string
          format: uuid
        travelerId:
          type: string
          format: uuid
        status:
          type: string
          enum: [PENDING, CONFIRMED, CANCELLED]
        itinerary:
          $ref: '#/components/schemas/Itinerary'
        totalAmount:
          type: number
        currency:
          type: string
        createdAt:
          type: string
          format: date-time

    Itinerary:
      type: object
      required:
        - origin
        - destination
        - departureDate
        - returnDate
      properties:
        origin:
          type: string
          pattern: '^[A-Z]{3}$'
        destination:
          type: string
          pattern: '^[A-Z]{3}$'
        departureDate:
          type: string
          format: date
        returnDate:
          type: string
          format: date
        cabinClass:
          type: string
          enum: [ECONOMY, PREMIUM_ECONOMY, BUSINESS, FIRST]
        passengers:
          type: integer
          minimum: 1
          maximum: 9

  responses:
    BadRequest:
      description: Bad request
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'

    ValidationError:
      description: Validation error
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ValidationErrorResponse'
```

### 10.2 Code Generation from OpenAPI

```bash
# Generate TypeScript DTOs and Client
npx @openapitools/openapi-generator-cli generate \
  -i openapi/booking-service.yaml \
  -g typescript-axios \
  -o src/generated/booking-client

# Generate NestJS DTOs
npx @openapitools/openapi-generator-cli generate \
  -i openapi/booking-service.yaml \
  -g typescript-nestjs \
  -o src/generated/dto

# Generate validation decorators
npm run openapi:generate-validators
```

### 10.3 Spec-Driven Development Workflow

```
1. Write OpenAPI Spec First
   └─> openapi/booking-service.yaml

2. Generate Code from Spec
   ├─> DTOs (TypeScript interfaces)
   ├─> Validators (class-validator decorators)
   ├─> API Client (Axios)
   └─> Mock Server (for testing)

3. Implement Business Logic
   └─> Use generated DTOs and validators

4. Validate Implementation Against Spec
   └─> Run contract tests (Pact, Dredd)

5. Deploy with Spec
   └─> Swagger UI auto-generated from spec
```

---

## 11. Event-Driven Architecture

### 11.1 Domain Events

```typescript
// Base Domain Event
export abstract class DomainEvent {
  public readonly occurredOn: Date;
  public readonly aggregateId: string;
  public readonly eventId: string;
  public readonly correlationId: string;
  public readonly causationId: string;
  
  constructor(aggregateId: string, correlationId?: string, causationId?: string) {
    this.aggregateId = aggregateId;
    this.occurredOn = new Date();
    this.eventId = uuidv4();
    this.correlationId = correlationId || uuidv4();
    this.causationId = causationId || this.eventId;
  }
  
  abstract get eventName(): string;
}

// Booking Events
export class BookingCreated extends DomainEvent {
  get eventName(): string {
    return 'BookingCreated';
  }
  
  constructor(
    public readonly bookingId: string,
    public readonly travelerId: string,
    public readonly itinerary: Itinerary,
    public readonly offerId: string,
    correlationId?: string
  ) {
    super(bookingId, correlationId);
  }
}

export class BookingConfirmed extends DomainEvent {
  get eventName(): string {
    return 'BookingConfirmed';
  }
  
  constructor(
    public readonly bookingId: string,
    public readonly travelerId: string,
    public readonly travelerName: string,
    public readonly itinerary: Itinerary,
    public readonly totalAmount: Money,
    public readonly paymentId: string,
    public readonly reservationId: string,
    correlationId?: string,
    causationId?: string
  ) {
    super(bookingId, correlationId, causationId);
  }
}

export class BookingCancelled extends DomainEvent {
  get eventName(): string {
    return 'BookingCancelled';
  }
  
  constructor(
    public readonly bookingId: string,
    public readonly reason: string,
    correlationId?: string,
    causationId?: string
  ) {
    super(bookingId, correlationId, causationId);
  }
}
```

### 11.2 Event Bus Implementation

```typescript
// Event Bus Interface
export interface IEventBus {
  publish(event: DomainEvent): Promise<void>;
  subscribe(eventName: string, handler: EventHandler): void;
}

// Kafka Event Bus Implementation
@Injectable()
export class KafkaEventBus implements IEventBus {
  constructor(
    @Inject('KAFKA_PRODUCER')
    private readonly producer: Producer,
    private readonly logger: Logger
  ) {}
  
  async publish(event: DomainEvent): Promise<void> {
    try {
      await this.producer.send({
        topic: this.getTopicForEvent(event.eventName),
        messages: [
          {
            key: event.aggregateId,
            value: JSON.stringify({
              eventId: event.eventId,
              eventName: event.eventName,
              aggregateId: event.aggregateId,
              occurredOn: event.occurredOn.toISOString(),
              data: event,
            }),
            headers: {
              'correlation-id': event.correlationId,
              'causation-id': event.causationId,
              'event-type': event.eventName,
            },
          },
        ],
      });
      
      this.logger.log(`Event ${event.eventName} published successfully`);
    } catch (error) {
      this.logger.error(`Failed to publish event ${event.eventName}`, error);
      throw error;
    }
  }
  
  subscribe(eventName: string, handler: EventHandler): void {
    // Implementation depends on your event handler registration mechanism
    // This is typically done through NestJS @OnEvent decorator
  }
  
  private getTopicForEvent(eventName: string): string {
    // Map events to Kafka topics
    const topicMap = {
      BookingCreated: 'booking-events',
      BookingConfirmed: 'booking-events',
      BookingCancelled: 'booking-events',
      PaymentAuthorized: 'payment-events',
      PaymentCaptured: 'payment-events',
      // ... other events
    };
    
    return topicMap[eventName] || 'domain-events';
  }
}
```

### 11.3 Event Handlers (Saga Steps)

```typescript
// Event Handler for Expense Service
@Injectable()
export class BookingEventHandler {
  constructor(
    private readonly generateReceiptUseCase: GenerateReceiptUseCase,
    private readonly logger: Logger
  ) {}
  
  @OnEvent('BookingConfirmed')
  async handleBookingConfirmed(event: BookingConfirmed): Promise<void> {
    this.logger.log(`Handling BookingConfirmed event: ${event.eventId}`);
    
    try {
      const command = new GenerateReceiptCommand(
        event.bookingId,
        event.travelerId,
        event.totalAmount,
        event.itinerary,
        event.correlationId
      );
      
      await this.generateReceiptUseCase.execute(command);
      
      this.logger.log(`Receipt generated for booking ${event.bookingId}`);
    } catch (error) {
      this.logger.error(`Failed to generate receipt for booking ${event.bookingId}`, error);
      // Implement retry logic or dead letter queue
    }
  }
  
  @OnEvent('BookingCancelled')
  async handleBookingCancelled(event: BookingCancelled): Promise<void> {
    this.logger.log(`Handling BookingCancelled event: ${event.eventId}`);
    
    // Mark receipt as cancelled
    // Trigger refund process
    // Update expense records
  }
}
```

---

## 12. Data Architecture

### 12.1 Database Schema (Booking Service)

```sql
-- Bookings Table
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    traveler_id UUID NOT NULL,
    offer_id VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL,
    itinerary JSONB NOT NULL,
    policy_validation_id UUID,
    reservation_id UUID,
    payment_id UUID,
    total_amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    version INT NOT NULL DEFAULT 1,
    CONSTRAINT chk_status CHECK (status IN ('PENDING', 'RESERVED', 'PAYMENT_PROCESSING', 'CONFIRMED', 'CANCELLED', 'FAILED'))
);

-- Indexes
CREATE INDEX idx_bookings_traveler_id ON bookings(traveler_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_created_at ON bookings(created_at DESC);

-- Booking Sagas Table
CREATE TABLE booking_sagas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(id),
    status VARCHAR(50) NOT NULL,
    current_step INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_saga_status CHECK (status IN ('STARTED', 'IN_PROGRESS', 'COMPLETED', 'COMPENSATING', 'COMPENSATED', 'FAILED'))
);

-- Saga Steps Table
CREATE TABLE booking_saga_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    saga_id UUID NOT NULL REFERENCES booking_sagas(id),
    step_number INT NOT NULL,
    step_name VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    error_message TEXT,
    retry_count INT NOT NULL DEFAULT 0,
    CONSTRAINT chk_step_status CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'COMPENSATING', 'COMPENSATED'))
);

-- Event Store (for Event Sourcing)
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
CREATE INDEX idx_event_store_type ON event_store(event_type);
CREATE INDEX idx_event_store_correlation ON event_store(correlation_id);

-- Read Model (CQRS Query Side)
CREATE TABLE booking_read_model (
    id UUID PRIMARY KEY,
    traveler_id UUID NOT NULL,
    traveler_name VARCHAR(255),
    traveler_email VARCHAR(255),
    status VARCHAR(50) NOT NULL,
    origin VARCHAR(3) NOT NULL,
    destination VARCHAR(3) NOT NULL,
    departure_date DATE NOT NULL,
    return_date DATE,
    cabin_class VARCHAR(50),
    total_amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    created_at TIMESTAMP NOT NULL
);

CREATE INDEX idx_read_model_traveler ON booking_read_model(traveler_id, created_at DESC);
CREATE INDEX idx_read_model_status ON booking_read_model(status);
CREATE INDEX idx_read_model_dates ON booking_read_model(departure_date);
```

### 12.2 Data Migration Strategy

```typescript
// TypeORM Migration
import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateBookingsTable1714000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'bookings',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          {
            name: 'traveler_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'offer_id',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '50',
            isNullable: false,
          },
          {
            name: 'itinerary',
            type: 'jsonb',
            isNullable: false,
          },
          {
            name: 'total_amount',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'currency',
            type: 'varchar',
            length: '3',
            default: "'USD'",
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'version',
            type: 'int',
            default: 1,
          },
        ],
        indices: [
          {
            name: 'IDX_BOOKINGS_TRAVELER_ID',
            columnNames: ['traveler_id'],
          },
          {
            name: 'IDX_BOOKINGS_STATUS',
            columnNames: ['status'],
          },
        ],
      }),
      true
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('bookings');
  }
}
```

---

## 13. Observability & Monitoring

### 13.1 Distributed Tracing

```typescript
// OpenTelemetry Setup
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';

export function setupTelemetry(serviceName: string): NodeSDK {
  const exporter = new JaegerExporter({
    endpoint: process.env.JAEGER_ENDPOINT || 'http://jaeger:14268/api/traces',
  });

  const sdk = new NodeSDK({
    serviceName,
    traceExporter: exporter,
    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-http': {},
        '@opentelemetry/instrumentation-express': {},
        '@opentelemetry/instrumentation-pg': {},
        '@opentelemetry/instrumentation-redis': {},
      }),
    ],
  });

  sdk.start();

  return sdk;
}

// In main.ts
async function bootstrap() {
  const telemetry = setupTelemetry('booking-service');
  
  const app = await NestFactory.create(AppModule);
  
  // ... other setup
  
  await app.listen(3001);
  
  // Graceful shutdown
  app.enableShutdownHooks();
  process.on('SIGTERM', async () => {
    await telemetry.shutdown();
    await app.close();
  });
}
```

### 13.2 Metrics Collection

```typescript
// Prometheus Metrics
import { Counter, Histogram, Registry } from 'prom-client';

export class MetricsService {
  private readonly registry: Registry;
  
  public readonly httpRequestDuration: Histogram;
  public readonly httpRequestTotal: Counter;
  public readonly bookingCreated: Counter;
  public readonly bookingConfirmed: Counter;
  public readonly bookingFailed: Counter;
  
  constructor() {
    this.registry = new Registry();
    
    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
      registers: [this.registry],
    });
    
    this.httpRequestTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.registry],
    });
    
    this.bookingCreated = new Counter({
      name: 'booking_created_total',
      help: 'Total number of bookings created',
      registers: [this.registry],
    });
    
    this.bookingConfirmed = new Counter({
      name: 'booking_confirmed_total',
      help: 'Total number of bookings confirmed',
      registers: [this.registry],
    });
    
    this.bookingFailed = new Counter({
      name: 'booking_failed_total',
      help: 'Total number of booking failures',
      labelNames: ['reason'],
      registers: [this.registry],
    });
  }
  
  getMetrics(): Promise<string> {
    return this.registry.metrics();
  }
}

// Metrics Controller
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}
  
  @Get()
  async getMetrics(): Promise<string> {
    return await this.metricsService.getMetrics();
  }
}
```

### 13.3 Structured Logging

```typescript
// Winston Logger Configuration
import winston from 'winston';
import { ElasticsearchTransport } from 'winston-elasticsearch';

export function createLogger(serviceName: string): winston.Logger {
  const esTransport = new ElasticsearchTransport({
    level: 'info',
    clientOpts: {
      node: process.env.ELASTICSEARCH_URL || 'http://elasticsearch:9200',
    },
    index: `${serviceName}-logs`,
  });

  return winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json()
    ),
    defaultMeta: {
      service: serviceName,
      environment: process.env.NODE_ENV || 'development',
    },
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        ),
      }),
      esTransport,
    ],
  });
}

// Logging Interceptor
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: Logger) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, headers } = request;
    const correlationId = headers['x-correlation-id'] || uuidv4();
    
    const startTime = Date.now();
    
    this.logger.log({
      message: 'Incoming request',
      method,
      url,
      correlationId,
      userId: request.user?.userId,
    });

    return next.handle().pipe(
      tap((data) => {
        const duration = Date.now() - startTime;
        this.logger.log({
          message: 'Request completed',
          method,
          url,
          correlationId,
          duration,
          statusCode: context.switchToHttp().getResponse().statusCode,
        });
      }),
      catchError((error) => {
        const duration = Date.now() - startTime;
        this.logger.error({
          message: 'Request failed',
          method,
          url,
          correlationId,
          duration,
          error: error.message,
          stack: error.stack,
        });
        throw error;
      })
    );
  }
}
```

---

## 14. Best Practices

### 14.1 Development Best Practices

**Domain-Driven Design**:
✅ Keep domain logic pure and framework-agnostic  
✅ Use ubiquitous language consistently  
✅ Model aggregates around transactional boundaries  
✅ Value objects are immutable  
✅ Repositories only return aggregates, never entities  
✅ Domain events capture significant business occurrences  

**Microservices**:
✅ Each service owns its database  
✅ Communicate via events (asynchronous) or APIs (synchronous)  
✅ Implement circuit breakers for external calls  
✅ Use correlation IDs for distributed tracing  
✅ Independent deployment per service  

**Code Quality**:
✅ TypeScript strict mode enabled  
✅ 80%+ test coverage (unit + integration)  
✅ ESLint + Prettier for code formatting  
✅ Husky + lint-staged for pre-commit hooks  
✅ Conventional commits  

**Security**:
✅ JWT authentication with short expiry (8 hours)  
✅ RBAC for authorization  
✅ Never store sensitive data in logs  
✅ PCI-DSS compliance for payment data  
✅ Input validation on all endpoints  
✅ SQL injection prevention (parameterized queries)  

### 14.2 Scalability Best Practices

✅ Horizontal scaling with Kubernetes HPA  
✅ Redis caching for frequently accessed data  
✅ Database connection pooling  
✅ Asynchronous processing via Kafka  
✅ CQRS for read-heavy operations  
✅ Database read replicas for queries  
✅ CDN for static assets  

### 14.3 Maintainability Best Practices

✅ Clear folder structure by layer  
✅ Contract-first API design (OpenAPI)  
✅ Comprehensive documentation  
✅ ADRs for architectural decisions  
✅ Runbooks for operational procedures  
✅ Automated dependency updates (Dependabot)  
✅ Regular security scanning (Snyk, Trivy)  

---

## Appendix A: Glossary

| Term | Definition |
|------|------------|
| **Aggregate** | Cluster of domain objects treated as a unit for data changes |
| **Bounded Context** | Explicit boundary within which a domain model is defined |
| **CQRS** | Command Query Responsibility Segregation - separating read and write operations |
| **DDD** | Domain-Driven Design - software design focused on modeling business domains |
| **Event Sourcing** | Storing state changes as a sequence of events |
| **Saga** | Pattern for managing distributed transactions across microservices |
| **Value Object** | Immutable object defined by its attributes rather than identity |

---

## Appendix B: References

- Domain-Driven Design by Eric Evans
- Implementing Domain-Driven Design by Vaughn Vernon
- Microservices Patterns by Chris Richardson
- Building Microservices by Sam Newman
- NestJS Documentation: https://docs.nestjs.com
- TypeORM Documentation: https://typeorm.io
- React Documentation: https://react.dev

---

**Document Version**: 2.0  
**Last Updated**: May 2026  
**Maintained By**: Architecture Team  
**Review Cycle**: Monthly
