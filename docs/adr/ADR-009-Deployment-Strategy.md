# ADR-009: Deployment Strategy

**Status**: Approved  
**Date**: 2026-05-01  
**Decision Makers**: Architecture Team, Engineering Leadership, DevOps Team  
**Stakeholders**: Engineering Team, Operations Team

---

## Decision

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

## Rationale

Blue-green eliminates downtime, provides instant rollback.
