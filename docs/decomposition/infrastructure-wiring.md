# Feature Decomposition: Docker Compose + Kubernetes Infrastructure Wiring

## Summary

This decomposition covers the full infrastructure wiring for the Corporate Travel Portal (PGT) — from per-service Dockerfiles through a local Docker Compose stack to a production-grade Kubernetes configuration managed with Kustomize. It includes all backing infrastructure (6 PostgreSQL instances, Kafka + Zookeeper, Redis), all application microservices, and the complete observability stack (Prometheus, Grafana, Jaeger, Elasticsearch, Kibana). The decomposition is split into seven independently implementable sub-modules, ordered so that each wave unblocks the next with well-defined image names, port contracts, health endpoints, and environment-variable schemas.

## Source Documents

- `PROJECT.md` — service topology (Section 3, 4, 6, 8, 9)
- `AGENTS.md` — observability requirements (Section 11), security requirements (Section 12)
- `docs/adr/ADR-001-Architecture-Style.md` — microservice + database-per-service policy
- `docs/adr/ADR-004-Amendment-01` — MongoDB removal
- `docs/adr/ADR-007` — observability stack
- `docs/adr/ADR-008` — NFR / resource limits
- `docs/adr/ADR-010` — testing coverage target

---

## Sub-Modules

### [SM-01] Service Dockerfiles (Multi-Stage Builds)

**OpenSpec Domain**: `infrastructure/dockerfiles`

**Scope**: Create production-ready multi-stage Dockerfiles for every service that does not yet have one. Each Dockerfile uses a `builder` stage (Node 20 Alpine, `npm ci`, `npm run build`) and a lean `runner` stage (Node 20 Alpine, production deps only). The `api-gateway` Dockerfile is already scaffolded and serves as the canonical template.

**Key Requirements Addressed**:
- Each service must be independently containerisable with a minimal image footprint.
- The `runner` stage must not include dev dependencies or TypeScript source.
- Images must expose the correct port via `EXPOSE` and run as a non-root user (`node`).

**Contracts / Interfaces**:

| Service | Image name (local tag) | Exposed port | Build context |
|---|---|---|---|
| `api-gateway` | `pgt/api-gateway:dev` | 4000 | `services/api-gateway` |
| `booking-service` | `pgt/booking-service:dev` | 3001 | `services/booking-service` |
| `policy-service` | `pgt/policy-service:dev` | 3002 | `services/policy-service` |
| `traveler-service` | `pgt/traveler-service:dev` | 3003 | `services/traveler-service` |
| `payment-service` | `pgt/payment-service:dev` | 3004 | `services/payment-service` |
| `inventory-service` | `pgt/inventory-service:dev` | 3005 | `services/inventory-service` |
| `expense-service` | `pgt/expense-service:dev` | 3006 | `services/expense-service` |

Health endpoint contract (all services): `GET /api/v1/health` → 200 OK (liveness); `GET /api/v1/ready` → 200 OK (readiness).

**Prerequisites**: None

**Implementation Notes**:
- Use `.dockerignore` per service to exclude `node_modules`, `dist`, `.env`, and test files.
- Pin the base image digest (e.g., `node:20-alpine`) and document the pinned digest in a comment.
- The `builder` stage must run `npm run build` successfully; if a service's `build` script is missing, add it as a prerequisite task.
- `notification-service` is not yet implemented — skip its Dockerfile.

---

### [SM-02] Docker Compose — Infrastructure Services

**OpenSpec Domain**: `infrastructure/docker-compose-infra`

**Scope**: Define the `infrastructure/docker/docker-compose.yml` (and a root-level `docker-compose.yml` that extends or references it) for all non-application backing services: 6 PostgreSQL 15 instances, Apache Kafka 3.x + Zookeeper, and Redis 7. Each PostgreSQL instance is isolated with its own named volume and database credentials.

**Key Requirements Addressed**:
- One PostgreSQL database per service (booking, policy, traveler, payment, inventory, expense) — 6 total.
- Kafka topics must be pre-created on broker startup: `booking-events`, `payment-events`, `policy-events`, `expense-events`, `inventory-events`, `traveler.created`, `traveler.updated`, `traveler.deleted`.
- Redis 7 standalone for development caching (used by inventory, policy, api-gateway).
- All data volumes must be named (not anonymous) to survive `docker-compose down`.

**Contracts / Interfaces**:

| Service | Container name | Internal port | Host port | Named volume |
|---|---|---|---|---|
| `postgres-booking` | `pgt-postgres-booking` | 5432 | 5432 | `pgdata-booking` |
| `postgres-policy` | `pgt-postgres-policy` | 5432 | 5433 | `pgdata-policy` |
| `postgres-traveler` | `pgt-postgres-traveler` | 5432 | 5434 | `pgdata-traveler` |
| `postgres-payment` | `pgt-postgres-payment` | 5432 | 5435 | `pgdata-payment` |
| `postgres-inventory` | `pgt-postgres-inventory` | 5432 | 5436 | `pgdata-inventory` |
| `postgres-expense` | `pgt-postgres-expense` | 5432 | 5437 | `pgdata-expense` |
| `zookeeper` | `pgt-zookeeper` | 2181 | 2181 | `zkdata` |
| `kafka` | `pgt-kafka` | 9092 | 9092 | `kafkadata` |
| `redis` | `pgt-redis` | 6379 | 6379 | `redisdata` |

Environment variable schema:
- `DATABASE_URL` for each service: `postgresql://<user>:<password>@<host>:5432/<db>`
- `KAFKA_BROKERS`: `kafka:9092`
- `REDIS_URL`: `redis://redis:6379`

**Prerequisites**: None

**Implementation Notes**:
- Use `confluentinc/cp-kafka:7.x` or `bitnami/kafka:3.x` with `KAFKA_AUTO_CREATE_TOPICS_ENABLE=true` and a Kafka initialiser container (or `KAFKA_CREATE_TOPICS` env var) to pre-create all 8 topics.
- Set Zookeeper `ZOOKEEPER_CLIENT_PORT=2181`.
- Include `healthcheck` definitions for every infrastructure container so application services can use `depends_on: condition: service_healthy`.
- Store database passwords in a root `.env` file (gitignored); provide `.env.example` with placeholder values.
- No MongoDB (ADR-004-Amendment-01).

---

### [SM-03] Docker Compose — Application Services

**OpenSpec Domain**: `infrastructure/docker-compose-app`

**Scope**: Extend the Docker Compose stack to wire all application microservices and the API gateway. Each service uses the image built by [SM-01], receives its environment variables from `.env`/`.env.example`, and declares `depends_on` conditions against the infrastructure services from [SM-02].

**Key Requirements Addressed**:
- All 7 services (api-gateway + 6 microservices) reachable on their designated host ports.
- Correct `DATABASE_URL`, Kafka, and Redis environment variables injected per service.
- `api-gateway` must receive `SERVICE_URLS` for all downstream services.
- A frontend placeholder service (e.g., `nginx:alpine` or `node:20-alpine` with a static page) on host port 3000 to satisfy the access-URL contract.
- Services restart on failure (`restart: unless-stopped`).

**Contracts / Interfaces**:

| Service | Host port | Key env vars |
|---|---|---|
| `api-gateway` | 4000 | `JWT_SECRET`, `BOOKING_SERVICE_URL`, `POLICY_SERVICE_URL`, `TRAVELER_SERVICE_URL`, `PAYMENT_SERVICE_URL`, `INVENTORY_SERVICE_URL`, `EXPENSE_SERVICE_URL`, `REDIS_URL` |
| `booking-service` | 3001 | `DATABASE_URL` (booking DB), `KAFKA_BROKERS`, `KAFKA_GROUP_ID`, `JWT_SECRET` |
| `policy-service` | 3002 | `DATABASE_URL` (policy DB), `KAFKA_BROKERS`, `KAFKA_GROUP_ID`, `JWT_SECRET`, `REDIS_URL` |
| `traveler-service` | 3003 | `DATABASE_URL` (traveler DB), `KAFKA_BROKERS`, `KAFKA_GROUP_ID`, `JWT_SECRET` |
| `payment-service` | 3004 | `DATABASE_URL` (payment DB), `KAFKA_BROKERS`, `KAFKA_GROUP_ID`, `JWT_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY` |
| `inventory-service` | 3005 | `DATABASE_URL` (inventory DB), `KAFKA_BROKERS`, `KAFKA_GROUP_ID`, `JWT_SECRET`, `REDIS_URL`, `AMADEUS_API_KEY`, `AMADEUS_API_SECRET` |
| `expense-service` | 3006 | `DATABASE_URL` (expense DB), `KAFKA_BROKERS`, `KAFKA_GROUP_ID`, `JWT_SECRET` |
| `frontend` | 3000 | — (static placeholder) |

Health check in Compose: `test: ["CMD", "wget", "-qO-", "http://localhost:<PORT>/api/v1/health"]` with `interval: 30s`, `timeout: 10s`, `retries: 3`.

**Prerequisites**: [SM-01], [SM-02]

**Implementation Notes**:
- Use a single `pgt-network` bridge network so all containers share DNS resolution by service name.
- The frontend placeholder can be a simple `nginx` container serving a static HTML file; full frontend implementation is out of scope for this decomposition.
- All secrets (JWT_SECRET, STRIPE keys, Amadeus keys) must be in `.env` (gitignored) and in `.env.example` with `CHANGEME` placeholders.
- Confirm `PORT` env var matches the exposed port for each service.

---

### [SM-04] Kubernetes Base Manifests (Namespace, RBAC, Storage, ConfigMaps, Secrets)

**OpenSpec Domain**: `infrastructure/k8s-base`

**Scope**: Create `infrastructure/kubernetes/base/` Kustomize base with foundational Kubernetes resources: the `pgt` namespace, RBAC roles/bindings (service accounts per microservice), PersistentVolumeClaims for each PostgreSQL instance and Redis, ConfigMaps for non-sensitive configuration, and opaque Secret templates (with placeholder values) for sensitive environment variables. No Deployments in this module.

**Key Requirements Addressed**:
- Kustomize-based structure with a `kustomization.yaml` at `infrastructure/kubernetes/base/`.
- Kubernetes Secrets for: `JWT_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `AMADEUS_API_KEY`, `AMADEUS_API_SECRET`, all `DATABASE_URL` values.
- ConfigMaps for: `KAFKA_BROKERS`, `REDIS_URL`, service discovery URLs, non-sensitive `PORT` values.
- PVCs for 6 PostgreSQL data volumes and 1 Redis data volume (RWO, 10Gi each for PostgreSQL, 2Gi for Redis).
- One Kubernetes ServiceAccount per microservice for future Workload Identity / IRSA integration.
- A `pgt-network-policy` NetworkPolicy allowing intra-namespace traffic and denying external ingress except via the API Gateway.

**Contracts / Interfaces**:

| Resource type | Naming convention | Example |
|---|---|---|
| Namespace | `pgt` | — |
| ServiceAccount | `<service-name>-sa` | `booking-service-sa` |
| Secret | `<service-name>-secrets` | `booking-service-secrets` |
| ConfigMap | `<service-name>-config` | `booking-service-config` |
| PVC | `<service-name>-postgres-pvc` | `booking-service-postgres-pvc` |
| PVC (Redis) | `redis-pvc` | — |

**Prerequisites**: None (can be developed in parallel with [SM-01] and [SM-02])

**Implementation Notes**:
- Secrets must contain base64-encoded placeholder values in base manifests; real values are injected via Kustomize `secretGenerator` in overlays or via an external secrets manager in production.
- Do not commit real secret values to Git at any layer.
- NetworkPolicy must allow Prometheus scraping from the `monitoring` namespace.
- StorageClass is left as the cluster default (`storageClassName: ""`) in base; overlays can patch to cloud-specific classes.

---

### [SM-05] Kubernetes Deployments and Services

**OpenSpec Domain**: `infrastructure/k8s-deployments`

**Scope**: Define Kubernetes `Deployment` and `Service` manifests for all 7 application services (api-gateway + 6 microservices) in `infrastructure/kubernetes/base/`. Each Deployment references the Secrets and ConfigMaps from [SM-04], defines liveness/readiness probes, and declares resource requests/limits per ADR-008.

**Key Requirements Addressed**:
- One Deployment + one ClusterIP Service per microservice.
- `api-gateway` additionally gets a `LoadBalancer` (or `NodePort` in dev) Service on port 4000.
- Liveness probe: `GET /api/v1/health`, `initialDelaySeconds: 30`, `periodSeconds: 10`.
- Readiness probe: `GET /api/v1/ready`, `initialDelaySeconds: 15`, `periodSeconds: 5`.
- Resource limits (ADR-008 baseline): `requests: {cpu: 100m, memory: 128Mi}`, `limits: {cpu: 500m, memory: 512Mi}` — patch in overlays as needed.
- Image pull policy: `IfNotPresent` in base (overlays may change to `Always` for staging/prod).
- Replica count: 1 in base (HPA in [SM-06] governs scaling in higher environments).

**Contracts / Interfaces**:

| Deployment | Container image | Service type | Service port |
|---|---|---|---|
| `api-gateway` | `pgt/api-gateway:$(TAG)` | LoadBalancer | 4000 |
| `booking-service` | `pgt/booking-service:$(TAG)` | ClusterIP | 3001 |
| `policy-service` | `pgt/policy-service:$(TAG)` | ClusterIP | 3002 |
| `traveler-service` | `pgt/traveler-service:$(TAG)` | ClusterIP | 3003 |
| `payment-service` | `pgt/payment-service:$(TAG)` | ClusterIP | 3004 |
| `inventory-service` | `pgt/inventory-service:$(TAG)` | ClusterIP | 3005 |
| `expense-service` | `pgt/expense-service:$(TAG)` | ClusterIP | 3006 |

Environment variables are injected via `envFrom: secretRef` + `envFrom: configMapRef` using the resources defined in [SM-04].

Prometheus scrape annotation on Deployment pod template:
```yaml
annotations:
  prometheus.io/scrape: "true"
  prometheus.io/port: "<PORT>"
  prometheus.io/path: "/metrics"
```

**Prerequisites**: [SM-04]

**Implementation Notes**:
- Use `$(TAG)` as a Kustomize image tag transformer variable; overlays set the concrete tag.
- `serviceAccountName` must match the SA created in [SM-04].
- Deployments for stateful backing services (PostgreSQL, Kafka, Redis) are not defined here — in K8s they use StatefulSets and are covered in [SM-04] or managed via Helm charts; document the decision in the spec.
- For local dev, backing services remain in Docker Compose; the Kubernetes manifests target staging/production clusters.

---

### [SM-06] Kubernetes Overlays — Dev / Staging / Prod (Kustomize Patches + HPA)

**OpenSpec Domain**: `infrastructure/k8s-overlays`

**Scope**: Create Kustomize overlays under `infrastructure/kubernetes/overlays/{development,staging,production}/` that patch the base manifests for environment-specific concerns: image tags, replica counts, resource limits, StorageClass, HPA for api-gateway and booking-service, and environment-specific Secrets/ConfigMaps.

**Key Requirements Addressed**:
- `development` overlay: single replica, `IfNotPresent` images, minimal resource limits, `NodePort` for api-gateway.
- `staging` overlay: 2 replicas, `Always` pull, moderate limits, HPA min=1 max=3.
- `production` overlay: HPA for `api-gateway` (min=2, max=10, CPU target 70%) and `booking-service` (min=2, max=8, CPU target 70%), strict resource limits, cloud StorageClass (`gp3` / `premium-rwo`).
- All overlays use `secretGenerator` (with `disableNameSuffixHash: true`) to inject real secret values from `.env` files managed outside Git.
- NetworkPolicy and RBAC are inherited from base unchanged.

**Contracts / Interfaces**:

| Overlay | Image tag source | api-gateway replicas | HPA |
|---|---|---|---|
| `development` | `dev` (local build) | 1 | None |
| `staging` | CI-built semver tag | 1 (min) | min=1 max=3 |
| `production` | CI-built semver tag | 2 (min) | min=2 max=10 |

HPA metric: `resource.cpu.averageUtilization: 70` for both auto-scaled deployments.

Each overlay contains:
- `kustomization.yaml` referencing `../../base`
- `patches/` folder with strategic-merge or JSON patches
- `secrets/` folder (gitignored) with `.env` files for `secretGenerator`

**Prerequisites**: [SM-05]

**Implementation Notes**:
- Store the HPA manifests in `base/hpa/` gated behind a Kustomize component so they can be selectively enabled per overlay.
- The `development` overlay is the primary target for CI smoke tests (Kind or k3d).
- Document the rollout strategy: `RollingUpdate` with `maxSurge: 1`, `maxUnavailable: 0` for all production Deployments.
- Consider adding `PodDisruptionBudget` (minAvailable: 1) for api-gateway and booking-service in the production overlay.

---

### [SM-07] Observability Stack (Prometheus, Grafana, Jaeger, Elasticsearch, Kibana)

**OpenSpec Domain**: `infrastructure/observability`

**Scope**: Wire the full observability stack in both Docker Compose (dev) and Kubernetes (staging/prod). This includes Prometheus scrape configuration for all services, Grafana datasources and pre-built dashboards, Jaeger for distributed tracing, and Elasticsearch + Kibana for log aggregation. Grafana dashboard JSON files live in `infrastructure/monitoring/grafana-dashboards/`.

**Key Requirements Addressed**:
- Prometheus 2.x scrapes all services at `/metrics` every 15 seconds.
- Grafana at port 3100 (Docker Compose host port; K8s NodePort/Ingress in overlays). Default credentials: `admin/admin` (changed via overlay Secret in production).
- Jaeger 1.x all-in-one at port 16686 (UI); services emit traces via OpenTelemetry SDK to Jaeger collector at `jaeger:14268` (HTTP) or `jaeger:4317` (OTLP gRPC).
- Elasticsearch 8.x at port 9200; Kibana at port 5601.
- All services emit JSON-structured logs (Winston) consumed by Filebeat or a Fluentd sidecar shipping to Elasticsearch.
- Pre-built Grafana dashboards: `pgt-overview.json` (request rates, error rates, p95 latency per service), `pgt-kafka.json` (consumer lag), `pgt-postgres.json` (connection counts, query durations).

**Contracts / Interfaces**:

Docker Compose additions:

| Service | Container | Host port | Volume |
|---|---|---|---|
| `prometheus` | `pgt-prometheus` | 9090 | `prometheus-data` |
| `grafana` | `pgt-grafana` | 3100 | `grafana-data` |
| `jaeger` | `pgt-jaeger` | 16686 (UI), 14268, 4317 | — |
| `elasticsearch` | `pgt-elasticsearch` | 9200 | `esdata` |
| `kibana` | `pgt-kibana` | 5601 | — |

`infrastructure/monitoring/prometheus.yml` scrape job template:
```yaml
scrape_configs:
  - job_name: '<service-name>'
    static_configs:
      - targets: ['<container-name>:<PORT>']
    metrics_path: /metrics
    scrape_interval: 15s
```

Kubernetes: deploy observability stack in a dedicated `monitoring` namespace. Prometheus uses `ServiceMonitor` CRDs (or pod annotations) to discover application pods. Grafana, Jaeger, and ELK stack are deployed via Kustomize manifests in `infrastructure/kubernetes/base/monitoring/`.

**Prerequisites**: [SM-02] (Docker Compose infra must exist before adding observability containers to it); [SM-05] (K8s deployments must have Prometheus annotations)

**Implementation Notes**:
- Elasticsearch requires `vm.max_map_count=262144` on the host; document this in the `README` and add a `sysctl` init container in K8s.
- Use `xpack.security.enabled=false` in the development overlay; enable it with TLS in production.
- Jaeger all-in-one is suitable for dev and staging; production should use a Jaeger Collector + Cassandra/Elasticsearch backend (note as a future ADR).
- Grafana dashboard JSON files must be mounted via ConfigMap in K8s; a provisioning sidecar is not required for initial implementation.
- Add a `OTEL_EXPORTER_OTLP_ENDPOINT` env var to each service's ConfigMap pointing to `http://jaeger:4317`.

---

## Dependency Order (Suggested Implementation Sequence)

```
Wave 1 (no prerequisites):
  SM-01  — Service Dockerfiles
  SM-02  — Docker Compose Infrastructure Services
  SM-04  — Kubernetes Base Manifests

Wave 2 (depends on Wave 1):
  SM-03  — Docker Compose Application Services  [requires SM-01, SM-02]
  SM-05  — Kubernetes Deployments + Services     [requires SM-04]

Wave 3 (depends on Wave 2):
  SM-06  — Kubernetes Overlays + HPA             [requires SM-05]
  SM-07  — Observability Stack                   [requires SM-02 (Compose), SM-05 (K8s)]
```

Wave 1 sub-modules are fully parallel. SM-03 and SM-05 are parallel within Wave 2. SM-06 and SM-07 are parallel within Wave 3.

---

## Cross-Cutting Concerns

### Health Probes
All seven services **must** expose:
- `GET /api/v1/health` → `200 OK` (liveness: process is alive)
- `GET /api/v1/ready` → `200 OK` (readiness: DB connection and dependencies are healthy)

These are referenced in Docker Compose `healthcheck`, Kubernetes liveness probes, and readiness probes across SM-01 through SM-07. If a service does not yet implement these endpoints, that must be a prerequisite task in the corresponding service spec before any infrastructure sub-module can be verified.

### Resource Limits (ADR-008)
Baseline K8s resource values (patch in overlays):

| Tier | CPU request | CPU limit | Memory request | Memory limit |
|---|---|---|---|---|
| API Gateway | 200m | 1000m | 256Mi | 1Gi |
| Core services (booking, payment) | 150m | 750m | 256Mi | 768Mi |
| Other services | 100m | 500m | 128Mi | 512Mi |
| Observability (Prometheus, ES) | 250m | 2000m | 512Mi | 2Gi |

### Secret Management
- **Development**: `.env` file at project root (gitignored); `.env.example` committed with `CHANGEME` placeholders.
- **Kubernetes staging/production**: Kustomize `secretGenerator` with external `.env` files (not committed); long-term migration path to Vault or AWS Secrets Manager documented as a future ADR.
- **Never** commit real secrets at any layer (enforced by `.gitignore` and pre-commit hook).

### Network Isolation
- Docker Compose: single `pgt-network` bridge; no host-network access except on declared host ports.
- Kubernetes: `NetworkPolicy` in base allows intra-`pgt` namespace traffic and traffic from `monitoring` namespace (Prometheus). All ingress from outside the cluster is routed exclusively through the api-gateway Service. Egress to external APIs (Stripe, Amadeus) is permitted from `payment-service` and `inventory-service` respectively.

### Image Tagging Strategy
- Local dev: `dev` tag (built by `docker-compose build`).
- CI: semver tag derived from Git tag (e.g., `1.2.3`) plus a `latest` alias.
- Kustomize image transformer in each overlay sets the concrete tag; base manifests use `$(TAG)` as the image tag placeholder.

### `.gitignore` Additions Required
```
.env
infrastructure/kubernetes/overlays/*/secrets/
```

### Port Registry (single source of truth)

| Service | Process port | Docker Compose host port | K8s Service port |
|---|---|---|---|
| Frontend | 3000 | 3000 | 3000 |
| API Gateway | 4000 | 4000 | 4000 |
| booking-service | 3001 | 3001 | 3001 |
| policy-service | 3002 | 3002 | 3002 |
| traveler-service | 3003 | 3003 | 3003 |
| payment-service | 3004 | 3004 | 3004 |
| inventory-service | 3005 | 3005 | 3005 |
| expense-service | 3006 | 3006 | 3006 |
| Prometheus | 9090 | 9090 | 9090 |
| Grafana | 3100 | 3100 | 3100 |
| Jaeger UI | 16686 | 16686 | 16686 |
| Kibana | 5601 | 5601 | 5601 |
| Elasticsearch | 9200 | 9200 | 9200 |

---

## Recommended Next Step

Run the `spec-generator` skill, passing this decomposition and `PROJECT.md` as source documents. Start with the **Wave 1 modules** (SM-01, SM-02, SM-04) — they are fully independent and unblock all downstream work. SM-03 and SM-05 should be specced immediately after Wave 1 is approved so implementation can proceed without gaps.
