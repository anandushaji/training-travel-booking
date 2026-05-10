# ADR-011: Error Handling & Resilience

**Status**: Approved  
**Date**: 2026-05-01  
**Decision Makers**: Architecture Team, Engineering Leadership  
**Stakeholders**: Engineering Team, DevOps Team

---

## Decision

Implement **comprehensive error handling** at all layers.

**Error Classification**:

| Type | HTTP Code | Example | Retry? |
|------|-----------|---------|--------|
| Validation | 400 | Invalid input | No |
| Authentication | 401 | Missing JWT | No |
| Authorization | 403 | Insufficient permissions | No |
| Not Found | 404 | Resource doesn't exist | No |
| Business Logic | 422 | Policy violation | No |
| Rate Limit | 429 | Too many requests | Yes (after delay) |
| Server Error | 500 | Unexpected error | Yes |
| Service Unavailable | 503 | Circuit open | Yes |

**Error Response Format**:
```json
{
  "error": "ValidationError",
  "message": "Invalid booking request",
  "details": [
    {
      "field": "departureDate",
      "message": "Must be in the future"
    }
  ],
  "correlationId": "uuid",
  "timestamp": "2026-05-01T10:30:00Z"
}
```

**Retry Strategy**:
- Exponential backoff: 100ms, 200ms, 400ms, 800ms, 1600ms
- Max retries: 5
- Only retry idempotent operations
- Only retry 5xx errors and network failures

**Circuit Breaker**:
- Open after 5 consecutive failures
- Half-open after 30 seconds
- Fully open after 3 half-open failures

**Fallback Strategies**:
- Return cached data (if available)
- Return degraded response
- Return error with retry-after header

## Rationale

Failures are inevitable in distributed systems. Handle them gracefully.
