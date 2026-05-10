# ADR-006: API Gateway Pattern

**Status**: Approved  
**Date**: 2026-05-01  
**Decision Makers**: Architecture Team, Engineering Leadership  
**Stakeholders**: Engineering Team, DevOps Team

---

## Decision

Implement **centralized API Gateway** as single entry point.

**Responsibilities**:
1. Authentication (validate JWT)
2. Rate limiting (100 req/15min per user)
3. Request routing (to appropriate service)
4. Response aggregation (if needed)
5. Circuit breaking (prevent cascading failures)
6. Logging (correlation IDs)

**Implementation**:
- Express.js + NestJS
- Port 4000
- Routes to 6 backend services

**Route Mapping**:
```
/api/bookings/*   → booking-service:3001
/api/policies/*   → policy-service:3002
/api/travelers/*  → traveler-service:3003
/api/payments/*   → payment-service:3004
/api/flights/*    → inventory-service:3005
/api/expenses/*   → expense-service:3006
```

**Circuit Breaker Config**:
- Threshold: 50% failure rate
- Volume: 10 requests
- Sleep window: 30 seconds

## Rationale

Single entry point simplifies client integration, centralizes cross-cutting concerns.
