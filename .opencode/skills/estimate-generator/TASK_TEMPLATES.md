# Estimate Generator — Task Templates

Ready-made WBS task breakdowns for common project types.
Copy the relevant template into your `estimate_config.json` and adjust O/M/P values to your team and context.

---

## Template 1: GCP Microservices (Python/FastAPI + GKE)

**Best for:** Event-driven microservices on GCP with Pub/Sub, Cloud SQL, Firestore, Apigee, Istio.
**Based on:** Corporate Travel Booking System (8 sprints, team: 1 FE + 2 BE + 1 QA)

> **Note:** All hour values assume a team familiar with GCP but new to some patterns (Saga, CQRS, Istio).
> Adjust O and P using the risk spread table in REFERENCE.md Section 4.

### Phase 0 — Infrastructure & IaC (Sprint 1–2)

| Work Package | Task | Assignee | O | M | P | Risk |
|---|---|---|---|---|---|---|
| Networking | Terraform: Hub-Spoke VPC + Cloud NAT + Cloud DNS | BE2 | 8 | 16 | 24 | Medium |
| Networking | Firewall rules, spoke peering, egress routing | BE2 | 4 | 8 | 16 | Medium |
| GKE | GKE Autopilot cluster: europe-west1 + europe-west4 | BE2 | 8 | 12 | 20 | Medium |
| GKE | Istio service mesh install + mTLS strict mode | BE1 | 8 | 16 | 32 | High |
| GKE | Apigee X proxy + OAuth2/OIDC policy | BE1 | 8 | 16 | 24 | Medium |
| CI/CD | GitHub Actions: build, test, Docker push pipeline | BE2 | 4 | 8 | 16 | Low |
| CI/CD | Helm charts: all 5 services (base + values per env) | BE2 | 8 | 16 | 24 | Medium |
| Environments | Dev, Staging, Prod GCP projects + IAM bindings | BE2 | 4 | 8 | 16 | Medium |
| Observability | OTEL Collector DaemonSet + Cloud Logging/Monitoring/Trace | BE1 | 4 | 8 | 16 | Medium |
| Secrets | Google Secret Manager + Workload Identity setup | BE2 | 4 | 8 | 12 | Low |

### Phase 1 — Traveler Profile Service (Sprint 2–3)

| Work Package | Task | Assignee | O | M | P | Risk |
|---|---|---|---|---|---|---|
| Service scaffold | FastAPI project: structure, Dockerfile, health endpoint | BE1 | 4 | 6 | 10 | Low |
| Data model | Firestore schema: preferences, loyalty programmes | BE1 | 4 | 8 | 12 | Low |
| API | CRUD endpoints: create/read/update profile | BE1 | 8 | 12 | 18 | Low |
| Integration | HR system verification: employment-status check | BE1 | 8 | 16 | 32 | High |
| Security | Istio AuthorizationPolicy for Profile Service | BE2 | 4 | 6 | 10 | Low |
| Cache | Redis profile cache (Memorystore): TTL + invalidation | BE1 | 4 | 8 | 16 | Medium |
| Tests | Unit tests: domain logic, 80% coverage | QA1 | 4 | 8 | 12 | Low |
| Tests | Integration tests: Firestore + Redis | QA1 | 4 | 8 | 16 | Medium |

### Phase 1 — Policy Service (Sprint 2–3)

| Work Package | Task | Assignee | O | M | P | Risk |
|---|---|---|---|---|---|---|
| Service scaffold | FastAPI project: structure, Dockerfile, health endpoint | BE2 | 4 | 6 | 10 | Low |
| Data model | Cloud SQL schema: policy rules, employee groups | BE2 | 4 | 8 | 12 | Low |
| API | Policy CRUD: create, edit, deactivate by group | BE2 | 8 | 12 | 18 | Low |
| Core logic | Policy evaluation engine: rule matcher (cabin, hotel, spend cap, advance window) | BE2 | 16 | 24 | 40 | High |
| API | PolicyCheck endpoint: sync validation for Booking Service | BE2 | 8 | 12 | 20 | Medium |
| Security | Istio AuthorizationPolicy for Policy Service | BE2 | 4 | 6 | 10 | Low |
| Tests | Unit tests: rule matcher edge cases | QA1 | 8 | 12 | 20 | Medium |
| Tests | Contract tests: PolicyCheck request/response schema | QA1 | 4 | 8 | 12 | Low |

### Phase 2 — Inventory Adapter / ACL (Sprint 3)

| Work Package | Task | Assignee | O | M | P | Risk |
|---|---|---|---|---|---|---|
| Service scaffold | FastAPI project: structure, Dockerfile, health endpoint | BE1 | 4 | 6 | 10 | Low |
| Integration | Amadeus GDS client: flight search API | BE1 | 8 | 16 | 32 | High |
| Integration | Amadeus GDS client: hotel search API | BE1 | 8 | 16 | 32 | High |
| Resilience | Circuit breaker + retry (tenacity): wrapping all GDS calls | BE1 | 8 | 12 | 20 | Medium |
| Cache | Redis inventory cache: TTL 5 min, key strategy | BE1 | 4 | 8 | 16 | Medium |
| Tests | Integration tests: Amadeus sandbox | QA1 | 8 | 16 | 32 | High |

### Phase 3 — Booking Service (Sprint 4–6)

| Work Package | Task | Assignee | O | M | P | Risk |
|---|---|---|---|---|---|---|
| Service scaffold | FastAPI project: structure, Dockerfile, health endpoint | BE1 | 4 | 6 | 10 | Low |
| Data model | Cloud SQL schema: bookings, outbox table | BE1 | 8 | 12 | 20 | Medium |
| CQRS write | Command handler: CreateBooking, CancelBooking | BE1 | 8 | 16 | 24 | Medium |
| CQRS read | Query handler + Firestore read model projection | BE1 | 8 | 16 | 32 | High |
| Outbox | Outbox publisher: transactional event write + APScheduler relay | BE1 | 8 | 16 | 32 | High |
| Saga | Saga choreography: domain event publishing (BookingCreated, etc.) | BE1 | 8 | 16 | 32 | High |
| Saga | Compensating transaction: CancelBooking on PolicyRejected | BE1 | 8 | 16 | 32 | High |
| Policy | PolicyCheck call (sync): integrate with Policy Service via Istio | BE1 | 4 | 8 | 16 | Medium |
| Security | Istio AuthorizationPolicy for Booking Service | BE2 | 4 | 6 | 10 | Low |
| Tests | Unit tests: booking state machine | QA1 | 8 | 12 | 20 | Medium |
| Tests | Integration tests: full booking lifecycle (E2E happy path) | QA1 | 8 | 16 | 24 | Medium |

### Phase 3 — Expense Service (Sprint 5)

| Work Package | Task | Assignee | O | M | P | Risk |
|---|---|---|---|---|---|---|
| Service scaffold | FastAPI project: structure, Dockerfile, health endpoint | BE2 | 4 | 6 | 10 | Low |
| Data model | Cloud SQL schema: expense records | BE2 | 4 | 8 | 12 | Low |
| Event consumer | Pub/Sub subscriber: BookingConfirmed -> create expense record | BE2 | 8 | 12 | 20 | Medium |
| Integration | Expensify API: submit expense record | BE2 | 8 | 16 | 32 | High |
| Dead letter | DLQ handling: failed Expensify submissions + retry logic | BE2 | 4 | 8 | 16 | Medium |
| Security | Istio AuthorizationPolicy for Expense Service | BE2 | 4 | 6 | 10 | Low |
| Tests | Unit + integration tests: event consumption + Expensify submission | QA1 | 8 | 12 | 20 | Medium |

### Phase 4 — Frontend (Sprint 4–6)

| Work Package | Task | Assignee | O | M | P | Risk |
|---|---|---|---|---|---|---|
| Project setup | React SPA: project scaffold, routing, SSO (Google Cloud Identity) | FE1 | 4 | 8 | 12 | Low |
| Auth | OAuth2/OIDC login flow + RBAC role detection | FE1 | 8 | 12 | 20 | Medium |
| Search | Flight search UI: form, results list, policy filter badge | FE1 | 8 | 16 | 24 | Medium |
| Search | Hotel search UI: form, results list, policy filter badge | FE1 | 8 | 16 | 24 | Medium |
| Booking | Booking confirmation flow: select, review, confirm | FE1 | 8 | 16 | 24 | Medium |
| Booking | Booking history: list, detail, cancel action | FE1 | 8 | 16 | 24 | Medium |
| Profile | Preferences UI: seat, meal, loyalty programmes | FE1 | 4 | 8 | 12 | Low |
| Admin | Policy management UI: create/edit/deactivate | FE1 | 8 | 16 | 24 | Medium |
| Admin | Admin booking view: all-org booking list | FE1 | 4 | 8 | 12 | Low |
| Web BFF | Web BFF: FastAPI aggregator for search + profile + booking | BE1 | 8 | 16 | 24 | Medium |
| Tests | Component tests (React Testing Library): critical flows | QA1 | 8 | 12 | 20 | Medium |

### Phase 5 — Integration & Performance (Sprint 6–7)

| Work Package | Task | Assignee | O | M | P | Risk |
|---|---|---|---|---|---|---|
| E2E tests | Playwright: full booking flow (search -> confirm -> expense) | QA1 | 8 | 16 | 24 | Medium |
| E2E tests | Playwright: policy rejection flow | QA1 | 4 | 8 | 16 | Medium |
| E2E tests | Playwright: cancellation + compensating transaction | QA1 | 4 | 8 | 16 | Medium |
| Load test | k6 load test: 500 RPS booking search, p95 < 300ms | BE2 | 8 | 16 | 24 | Medium |
| Load test | k6 load test: booking creation write path | BE2 | 4 | 8 | 16 | Medium |
| Trace validation | OTEL trace end-to-end: booking + cancellation + async Pub/Sub | BE1 | 4 | 8 | 16 | Medium |

### Phase 6 — NFR Hardening & DR (Sprint 7)

| Work Package | Task | Assignee | O | M | P | Risk |
|---|---|---|---|---|---|---|
| Security | SAST scan (Semgrep): zero Critical/High findings | BE2 | 4 | 8 | 16 | Medium |
| Security | DAST scan (OWASP ZAP): API gateway boundary | BE2 | 4 | 8 | 16 | Medium |
| DR | DR runbook: write failover playbook (europe-west1 -> europe-west4) | BE2 | 8 | 16 | 24 | Medium |
| DR | DR drill: execute failover in staging, verify RTO <= 1h | BE2 | 8 | 16 | 32 | High |
| SLO | SLO dashboard setup: 12 per-service indicators in Cloud Monitoring | BE1 | 4 | 8 | 12 | Low |
| SLO | PagerDuty alerting: SLO breach policies | BE1 | 4 | 6 | 10 | Low |

### Phase 7 — UAT, Go-Live Prep & Cutover (Sprint 8)

| Work Package | Task | Assignee | O | M | P | Risk |
|---|---|---|---|---|---|---|
| UAT | UAT environment setup + test data seeding | QA1 | 4 | 8 | 12 | Low |
| UAT | Employee UAT: 2 users complete full booking unassisted | QA1 | 4 | 8 | 12 | Low |
| UAT | Admin UAT: 1 admin creates policy + views booking | QA1 | 4 | 6 | 10 | Low |
| Prod | Production deployment: all 5 services | BE2 | 4 | 8 | 16 | Medium |
| Prod | Production smoke test: health checks + one booking end-to-end | QA1 | 4 | 6 | 10 | Low |
| Docs | Runbook: day-2 ops, alert response, deployment guide | BE1 | 8 | 12 | 20 | Low |
| Docs | Handover: architecture overview, ADR index, runbook walkthrough | BE1 | 4 | 8 | 12 | Low |
| Go-live | Go/no-go checklist execution + stakeholder sign-off | BE1 | 4 | 6 | 10 | Low |

---

## Template 2: Blank WBS (Any Project)

Copy this JSON structure into `estimate_config.json` and fill in your tasks:

```json
{
  "project_name": "YOUR PROJECT NAME",
  "sprint_length_days": 10,
  "hours_per_day": 8,
  "overhead_pct": 25,
  "contingency_pct": 15,
  "start_date": "YYYY-MM-DD",
  "team": {
    "FE": 1,
    "BE": 2,
    "QA": 1
  },
  "milestones": {
    "2": "M1 — Infrastructure Ready",
    "4": "M2 — Core Features Complete",
    "6": "M3 — Integration Complete",
    "8": "M4 — Production Go-Live"
  },
  "tasks": [
    {
      "phase": "Phase 0",
      "work_package": "Infrastructure",
      "task": "TASK DESCRIPTION",
      "assignee": "BE1",
      "O": 8,
      "M": 16,
      "P": 24,
      "sprint": 1,
      "risk": "Medium",
      "notes": "Optional: ADR ref, dependency, assumption"
    }
  ]
}
```

### Standard Phase Names (adapt freely)

| Phase | Typical focus |
|-------|--------------|
| Phase 0 | Infrastructure, IaC, CI/CD, environments |
| Phase 1 | Highest-risk or most-depended-upon service/module |
| Phase 2 | Second priority service/module |
| Phase 3 | Third service / external integrations |
| Phase 4 | Frontend / UI / BFF |
| Phase 5 | E2E integration, performance, contract tests |
| Phase 6 | Security, NFR hardening, DR, observability |
| Phase 7 | UAT, go-live prep, cutover, handover docs |

### Assignee naming convention

| Role | Naming |
|------|--------|
| Frontend developer 1 | FE1 |
| Frontend developer 2 | FE2 |
| Backend developer 1 | BE1 |
| Backend developer 2 | BE2 |
| QA engineer | QA1 |
| DevOps / Infra | OPS1 |
| Full-stack | FS1 |

---

## Template 3: Minimal API + Frontend (2-person team)

**Best for:** Small REST API + SPA, 1 BE + 1 FE, 4–6 sprints.

```json
{
  "project_name": "My API Project",
  "sprint_length_days": 10,
  "hours_per_day": 8,
  "overhead_pct": 25,
  "contingency_pct": 15,
  "start_date": "YYYY-MM-DD",
  "team": { "FE": 1, "BE": 1 },
  "milestones": {
    "2": "M1 — API Core Done",
    "4": "M2 — Frontend Done",
    "6": "M3 — Go-Live"
  },
  "tasks": [
    { "phase": "Phase 0", "work_package": "Infrastructure", "task": "Cloud project + CI/CD pipeline",     "assignee": "BE1", "O": 4, "M": 8,  "P": 16, "sprint": 1, "risk": "Low" },
    { "phase": "Phase 1", "work_package": "Auth",           "task": "Auth service: JWT / OAuth2 setup",   "assignee": "BE1", "O": 4, "M": 8,  "P": 16, "sprint": 1, "risk": "Medium" },
    { "phase": "Phase 1", "work_package": "Core API",       "task": "Resource A: CRUD endpoints",         "assignee": "BE1", "O": 8, "M": 12, "P": 20, "sprint": 2, "risk": "Low" },
    { "phase": "Phase 1", "work_package": "Core API",       "task": "Resource B: CRUD endpoints",         "assignee": "BE1", "O": 8, "M": 12, "P": 20, "sprint": 2, "risk": "Low" },
    { "phase": "Phase 2", "work_package": "Frontend",       "task": "SPA scaffold + auth flow",           "assignee": "FE1", "O": 4, "M": 8,  "P": 16, "sprint": 1, "risk": "Low" },
    { "phase": "Phase 2", "work_package": "Frontend",       "task": "Resource A views (list + detail)",   "assignee": "FE1", "O": 8, "M": 12, "P": 20, "sprint": 3, "risk": "Low" },
    { "phase": "Phase 2", "work_package": "Frontend",       "task": "Resource B views (list + detail)",   "assignee": "FE1", "O": 8, "M": 12, "P": 20, "sprint": 3, "risk": "Low" },
    { "phase": "Phase 3", "work_package": "Testing",        "task": "E2E tests: critical user flows",     "assignee": "FE1", "O": 4, "M": 8,  "P": 16, "sprint": 4, "risk": "Low" },
    { "phase": "Phase 3", "work_package": "Go-Live",        "task": "Production deploy + smoke test",     "assignee": "BE1", "O": 4, "M": 8,  "P": 16, "sprint": 6, "risk": "Low" }
  ]
}
```
