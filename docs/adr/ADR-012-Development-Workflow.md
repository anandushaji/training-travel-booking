# ADR-012: Development Workflow

**Status**: Approved  
**Date**: 2026-05-01  
**Decision Makers**: Architecture Team, Engineering Leadership  
**Stakeholders**: Engineering Team

---

## Decision

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

## Rationale

Consistent workflow improves collaboration and code quality.
