# ADR-008: Non-Functional Requirements

**Status**: Approved  
**Date**: 2026-05-01  
**Decision Makers**: Architecture Team, Engineering Leadership  
**Stakeholders**: Engineering Team, Product Team, Operations Team

---

## Decision

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

## Rationale

NFRs are as important as functional requirements. Define them upfront to avoid issues later.
