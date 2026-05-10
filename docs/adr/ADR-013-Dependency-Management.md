# ADR-013: Dependency Management

**Status**: Approved  
**Date**: 2026-05-01  
**Decision Makers**: Architecture Team, Engineering Leadership  
**Stakeholders**: Engineering Team, Security Team

---

## Decision

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

## Rationale

Keep dependencies up to date without breaking changes.
