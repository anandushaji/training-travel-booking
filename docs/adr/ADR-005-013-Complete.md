# Architecture Decision Records (ADR) - Complete Set

## ADR-005: Security Model

**Status**: Approved  
**Date**: 2026-05-01

### Decision

Implement **Zero Trust Security** with defense-in-depth:

**Authentication**:
- JWT tokens (8-hour expiry)
- HTTPS only (TLS 1.3)
- Password hashing: bcrypt (10 rounds)

**Authorization**:
- Role-Based Access Control (RBAC)
- Roles: Employee, Manager, Admin
- API Gateway enforces auth before routing

**Data Protection**:
- Encryption at rest: AES-256
- Encryption in transit: TLS 1.3
- PCI-DSS compliance for payment data (never store full card numbers)
- GDPR compliance (right to erasure, data portability)

**Container Security**:
- Non-root users in containers
- Image scanning (Trivy)
- Security contexts in Kubernetes
- Network policies (pod-to-pod isolation)

**Secrets Management**:
- Kubernetes Secrets for sensitive data
- Environment variables for configuration
- Never commit secrets to Git

**Rationale**: Security is non-negotiable. Zero Trust ensures every request is authenticated and authorized.

---

## ADR-006: API Gateway Pattern

**Status**: Approved  
**Date**: 2026-05-01

### Decision

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

**Rationale**: Single entry point simplifies client integration, centralizes cross-cutting concerns.

---

## ADR-007: Monitoring & Observability

**Status**: Approved  
**Date**: 2026-05-01

### Decision

Implement **three pillars of observability**: Metrics, Logs, Traces.

**Metrics** (Prometheus + Grafana):
- HTTP request duration (p50, p95, p99)
- HTTP request count (by endpoint, status)
- Business metrics (bookings created, confirmed, failed)
- Database metrics (connection pool, query time)
- Kafka metrics (producer throughput, consumer lag)

**Logs** (Elasticsearch + Kibana):
- Structured logging (Winston)
- JSON format with correlation IDs
- Centralized in Elasticsearch
- Retention: 30 days

**Traces** (Jaeger + OpenTelemetry):
- Distributed tracing across services
- Request flow visualization
- Latency analysis per service
- Correlation IDs propagated through all services

**Dashboards**:
- Service health dashboard (uptime, error rate)
- Business metrics dashboard (bookings, revenue)
- Infrastructure dashboard (CPU, memory, disk)

**Alerts**:
- Service down: Immediate (PagerDuty)
- Error rate > 5%: Warning (Slack)
- Response time p99 > 1s: Warning
- Disk space > 80%: Warning

**Rationale**: Can't manage what you can't measure. Observability is critical for production operations.

---

## ADR-008: Non-Functional Requirements

**Status**: Approved  
**Date**: 2026-05-01

### Decision

Define and enforce NFRs across all services.

**Performance**:
- Response time p95 < 500ms
- Response time p99 < 1s
- Support 1,000 concurrent users
- Database query time < 100ms

**Availability**:
- 99.5% uptime (43 minutes downtime/month)
- Mean time to recovery (MTTR) < 15 minutes
- Zero-downtime deployments (blue-green)

**Scalability**:
- Horizontal scaling via Kubernetes HPA
- Auto-scale when CPU > 70%
- Handle 10x traffic spike with auto-scaling

**Security**:
- PCI-DSS compliant (payments)
- GDPR compliant (personal data)
- HTTPS only
- Security scanning on every build

**Reliability**:
- Automated failover for databases
- Circuit breakers for external APIs
- Retry logic with exponential backoff
- Health checks for all services

**Maintainability**:
- 80% code coverage
- Automated tests on every commit
- Documentation for all APIs (OpenAPI)
- ADRs for architectural decisions

**Rationale**: NFRs are as important as functional requirements. Define them upfront to avoid issues later.

---

## ADR-009: Deployment Strategy

**Status**: Approved  
**Date**: 2026-05-01

### Decision

Use **blue-green deployment** for zero-downtime releases.

**Environments**:
1. **Development**: Local (Docker Compose)
2. **Staging**: Kubernetes cluster (shared)
3. **Production**: Kubernetes cluster (dedicated)

**CI/CD Pipeline** (GitHub Actions):

```yaml
Trigger: Push to main branch
  ↓
1. Run tests (unit, integration, e2e)
  ↓
2. Build Docker image
  ↓
3. Scan image (Trivy)
  ↓
4. Push to registry
  ↓
5. Deploy to staging
  ↓
6. Run smoke tests
  ↓
7. Wait for approval (manual)
  ↓
8. Deploy to production (blue-green)
  ↓
9. Health checks
  ↓
10. Switch traffic to new version
```

**Blue-Green Process**:
1. Deploy new version (green) alongside old (blue)
2. Run health checks on green
3. Route 10% traffic to green (canary)
4. Monitor for 10 minutes
5. Route 100% traffic to green
6. Keep blue running for 1 hour (rollback option)
7. Decommission blue

**Rollback**: Route traffic back to blue in < 1 minute

**Rationale**: Blue-green eliminates downtime, provides instant rollback.

---

## ADR-010: Testing Strategy

**Status**: Approved  
**Date**: 2026-05-01

### Decision

Implement **test pyramid** with 80% coverage target.

**Unit Tests** (70% of tests):
- Test domain logic (aggregates, entities, value objects)
- No external dependencies (mock everything)
- Fast execution (< 1 second total)
- Tool: Jest
- Coverage: 90% of domain layer

**Integration Tests** (20% of tests):
- Test API endpoints with real database
- Use test database (docker container)
- Test event handlers with real Kafka
- Tool: Jest + Supertest
- Coverage: All API endpoints

**End-to-End Tests** (10% of tests):
- Test critical user flows
- Booking flow (search → book → pay → confirm)
- Run against staging environment
- Tool: Jest + Puppeteer
- Coverage: 5 critical flows

**Contract Tests**:
- Verify OpenAPI contracts
- Producer (service) generates contract
- Consumer (frontend) verifies contract
- Tool: Pact

**Performance Tests**:
- Load testing (1,000 concurrent users)
- Stress testing (find breaking point)
- Endurance testing (12-hour sustained load)
- Tool: k6

**Test Automation**:
- Run on every commit (CI pipeline)
- Block merge if tests fail
- Code coverage report on every PR

**Rationale**: Testing is non-negotiable. Automated tests prevent regressions and enable confident deployments.

---

## ADR-011: Error Handling & Resilience

**Status**: Approved  
**Date**: 2026-05-01

### Decision

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

**Rationale**: Failures are inevitable in distributed systems. Handle them gracefully.

---

## ADR-012: Development Workflow

**Status**: Approved  
**Date**: 2026-05-01

### Decision

Adopt **GitFlow** with feature branches.

**Branches**:
- `main`: Production code (always deployable)
- `develop`: Integration branch
- `feature/*`: Feature development
- `hotfix/*`: Production bugs

**Workflow**:
1. Create feature branch from `develop`
2. Implement feature with tests
3. Open PR (requires 1 approval)
4. CI runs tests + linting
5. Merge to `develop`
6. Deploy to staging (automatic)
7. QA testing in staging
8. Merge `develop` to `main` (weekly)
9. Deploy to production (automatic)

**Code Review Checklist**:
- ✅ Tests added/updated
- ✅ Code coverage maintained
- ✅ No secrets in code
- ✅ Documentation updated
- ✅ OpenAPI spec updated (if API changed)

**Commit Convention**:
```
feat: Add booking cancellation
fix: Fix payment retry logic
docs: Update API documentation
test: Add integration tests for policy validation
chore: Update dependencies
```

**Rationale**: Consistent workflow improves collaboration and code quality.

---

## ADR-013: Dependency Management

**Status**: Approved  
**Date**: 2026-05-01

### Decision

Use **automated dependency updates** with manual approval.

**Tools**:
- Dependabot (GitHub)
- npm audit (security scanning)
- Snyk (vulnerability scanning)

**Update Strategy**:
- **Patch versions** (1.2.3 → 1.2.4): Auto-merge if tests pass
- **Minor versions** (1.2.0 → 1.3.0): Manual review
- **Major versions** (1.0.0 → 2.0.0): Manual review + testing

**Security Updates**:
- Critical: Immediate (< 24 hours)
- High: Within 1 week
- Medium: Within 1 month
- Low: Next release

**Process**:
1. Dependabot creates PR
2. CI runs all tests
3. If patch version + tests pass → Auto-merge
4. If minor/major → Manual review
5. Update CHANGELOG.md

**Lock Files**:
- Commit `package-lock.json` (npm)
- Ensures reproducible builds

**Rationale**: Keep dependencies up to date without breaking changes.

---

## ADR Index

| ADR | Title | Status | Date |
|-----|-------|--------|------|
| ADR-001 | Architecture Style | Approved | 2026-05-01 |
| ADR-002 | Technology Stack | Approved | 2026-05-01 |
| ADR-003 | Communication Patterns | Approved | 2026-05-01 |
| ADR-004 | Data Management | Approved | 2026-05-01 |
| ADR-005 | Security Model | Approved | 2026-05-01 |
| ADR-006 | API Gateway Pattern | Approved | 2026-05-01 |
| ADR-007 | Monitoring & Observability | Approved | 2026-05-01 |
| ADR-008 | Non-Functional Requirements | Approved | 2026-05-01 |
| ADR-009 | Deployment Strategy | Approved | 2026-05-01 |
| ADR-010 | Testing Strategy | Approved | 2026-05-01 |
| ADR-011 | Error Handling & Resilience | Approved | 2026-05-01 |
| ADR-012 | Development Workflow | Approved | 2026-05-01 |
| ADR-013 | Dependency Management | Approved | 2026-05-01 |

---

## Review Cycle

**Frequency**: Quarterly  
**Next Review**: 2026-08-01

**Review Triggers**:
- System handles >10x current traffic
- Team grows >15 engineers
- Business model changes
- Technology landscape shifts
- Operational costs exceed budget by >30%

---

**Document Owner**: Architecture Team  
**Maintained By**: Lead Architect  
**Last Updated**: 2026-05-01
