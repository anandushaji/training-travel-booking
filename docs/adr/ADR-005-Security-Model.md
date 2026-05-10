# ADR-005: Security Model

**Status**: Approved  
**Date**: 2026-05-01  
**Decision Makers**: Architecture Team, Engineering Leadership  
**Stakeholders**: Engineering Team, DevOps Team, Security Team

---

## Decision

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

## Rationale

Security is non-negotiable. Zero Trust ensures every request is authenticated and authorized.
