# ADR-010: Testing Strategy

**Status**: Approved  
**Date**: 2026-05-01  
**Decision Makers**: Architecture Team, Engineering Leadership  
**Stakeholders**: Engineering Team, QA Team

---

## Decision

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

## Rationale

Testing is non-negotiable. Automated tests prevent regressions and enable confident deployments.
