# ADR-002: Technology Stack Selection

**Status**: Approved  
**Date**: 2026-05-01  
**Decision Makers**: Architecture Team, Engineering Leadership  
**Supersedes**: ADR-002-Technology-Stack-UPDATED.md (Azure-based)

---

## Amendment 01 — Frontend Test Runner & Form/Date Libraries (2026-05-04)

**Decision**: The frontend SPA (`pgt/frontend/`) adopts the following deviations from the
original ADR, effective SM-FE-01:

| Area | Original | Amended |
|---|---|---|
| Frontend test runner | Jest 29.x | **Vitest 1.x** |
| Frontend form validation | Yup 1.x | **Zod 3.x** |
| Frontend date picker | *(not listed)* | **@mui/x-date-pickers 6.x** |

**Rationale**:
- **Vitest**: Vite's native transform pipeline makes Vitest ~10× faster than Jest+ts-jest
  for a Vite project. The `@testing-library/*` API is identical under both runners.
  Backend services retain Jest 29.x.
- **Zod**: Superior TypeScript inference (schema → type), no decorator requirement
  (compatible with strict ESM), and smaller bundle than Yup. Used exclusively on the
  frontend; backend validation retains `class-validator`.
- **@mui/x-date-pickers 6.x**: The official MUI date/time picker package, required by
  the `DatePickerInput` common component.

**Scope**: Frontend only (`pgt/frontend/`). Backend services are unaffected.

---

## Context

We need to select a technology stack that:
- Supports Domain-Driven Design patterns effectively
- Enables rapid development with limited team (5.5 FTE)
- Provides strong TypeScript support for type safety
- Has mature ecosystem for microservices
- Avoids vendor lock-in
- Minimizes licensing costs
- Supports containerization and cloud-agnostic deployment

Key requirements:
- **Backend**: RESTful APIs, event-driven architecture, DDD patterns
- **Frontend**: Modern SPA, responsive design, real-time updates
- **Database**: ACID transactions, document storage
- **Messaging**: Reliable event delivery, ordering guarantees
- **Deployment**: Container orchestration, auto-scaling

---

## Decision

### Backend Stack

**Runtime & Framework**:
- **Node.js 20 LTS** as runtime environment
- **NestJS 10.x** as application framework
- **TypeScript 5.x** for type safety

**Rationale**:
- NestJS provides built-in support for DDD patterns (modules, providers, decorators)
- Dependency injection makes testing easier
- Strong TypeScript support prevents runtime errors
- Active community and extensive documentation
- No licensing costs (MIT license)

**Database Layer**:
- **PostgreSQL 15** for transactional data (5 instances)
  - Booking, Policy, Traveler, Payment, Expense services
- **MongoDB 7** for document storage (1 instance)
  - Inventory service (flexible schema for flight data)
- **TypeORM 0.3.x** as ORM for PostgreSQL
- **Mongoose** as ODM for MongoDB

**Rationale**:
- PostgreSQL: ACID guarantees, JSON support, mature, free
- MongoDB: Flexible schema for external API data (Amadeus flight offers)
- TypeORM: Type-safe queries, migration support, works well with NestJS
- Each service owns its database (database-per-service pattern)

**Messaging & Events**:
- **Apache Kafka 3.x** for event streaming
- **KafkaJS** as Node.js client

**Rationale**:
- High throughput (millions of messages/sec)
- Event ordering guarantees per partition
- Persistent message log (replay capability)
- Battle-tested in production
- Free and open-source

**Caching**:
- **Redis 7** for caching and session management

**Rationale**:
- Sub-millisecond latency
- Supports complex data structures
- Pub/sub for real-time features
- Widely adopted, mature

### Frontend Stack

**Framework & Libraries**:
- **React 18** with TypeScript
- **Redux Toolkit + RTK Query** for state management
- **Material-UI (MUI) v5** for UI components
- **Vite** as build tool
- **React Router v6** for routing

**Rationale**:
- React: Component-based, large ecosystem, team familiarity
- Redux Toolkit: Simplified Redux patterns, less boilerplate
- RTK Query: Integrated API client with caching
- Material-UI: Production-ready components, accessibility built-in
- Vite: Fast builds, HMR, better developer experience than Webpack

### Infrastructure Stack

**Containerization**:
- **Docker** for containerization
- **Docker Compose** for local development
- **Kubernetes** for production orchestration

**Rationale**:
- Docker: Industry standard, reproducible environments
- Kubernetes: Auto-scaling, self-healing, declarative configuration
- Cloud-agnostic (can run on AWS, GCP, Azure, or on-premise)

**CI/CD**:
- **GitHub Actions** for CI/CD pipelines
- **Docker Hub** or **GitHub Container Registry** for image storage

**Rationale**:
- GitHub Actions: Free for public repos, tight integration with Git
- Declarative pipeline configuration (YAML)
- Matrix builds for parallel testing

**Observability**:
- **Prometheus** for metrics collection
- **Grafana** for visualization
- **Jaeger** for distributed tracing
- **Elasticsearch + Kibana** for log aggregation
- **OpenTelemetry** for instrumentation

**Rationale**:
- Industry-standard observability stack
- All open-source, no licensing costs
- Proven at scale

---

## Full Technology Stack

### Backend (per Microservice)

```yaml
Runtime:
  - Node.js: 20 LTS
  - Package Manager: npm 10.x

Framework:
  - NestJS: 10.x
  - Express: 4.x (underlying HTTP server)
  
Language:
  - TypeScript: 5.x
  - ES Target: ES2022

Database:
  - PostgreSQL: 15 (ACID transactions)
  - MongoDB: 7 (document storage)
  - TypeORM: 0.3.x (PostgreSQL ORM)
  - Mongoose: 8.x (MongoDB ODM)

Messaging:
  - Apache Kafka: 3.x
  - KafkaJS: 2.x
  
Caching:
  - Redis: 7
  - ioredis: 5.x (Redis client)

Testing:
  - Jest: 29.x (unit tests)
  - Supertest: 6.x (integration tests)
  - Test Coverage Target: 80%

Code Quality:
  - ESLint: 8.x
  - Prettier: 3.x
  - Husky: 8.x (git hooks)
  - lint-staged: 15.x

Validation:
  - class-validator: 0.14.x
  - class-transformer: 0.5.x

Documentation:
  - Swagger/OpenAPI: 3.0.3
  - @nestjs/swagger: 7.x

Security:
  - Passport: 0.7.x (authentication)
  - jsonwebtoken: 9.x (JWT)
  - bcrypt: 5.x (password hashing)
  - helmet: 7.x (HTTP headers)

External Integrations:
  - Stripe SDK: Latest (payments)
  - Amadeus SDK: Latest (flights)
  - Axios: 1.x (HTTP client)
```

### Frontend

```yaml
Framework:
  - React: 18.x
  - TypeScript: 5.x

State Management:
  - Redux Toolkit: 2.x
  - RTK Query: 2.x
  - React Redux: 9.x

UI Library:
  - Material-UI (MUI): 5.x
  - Emotion: 11.x (CSS-in-JS)
  - MUI Icons: 5.x
  - MUI X Date Pickers: 6.x  # Amendment 01

Routing:
  - React Router: 6.x

Forms:
  - React Hook Form: 7.x
  - Zod: 3.x (validation — Amendment 01; replaces Yup 1.x)

Build Tool:
  - Vite: 5.x

Testing:
  - Vitest: 1.x  # Amendment 01; replaces Jest 29.x for frontend only
  - React Testing Library: 14.x
  - MSW: 2.x (API mocking)

Code Quality:
  - ESLint: 8.x
  - Prettier: 3.x
  - TypeScript ESLint: 6.x

Utilities:
  - date-fns: 3.x (date handling)
  - lodash: 4.x (utilities)
  - Axios: 1.x (HTTP client)
```

### Infrastructure

```yaml
Containerization:
  - Docker: 24.x
  - Docker Compose: 2.x

Orchestration:
  - Kubernetes: 1.28.x
  - Helm: 3.x (package manager)

CI/CD:
  - GitHub Actions
  - Docker Hub / GitHub Container Registry

Observability:
  - Prometheus: 2.x (metrics)
  - Grafana: 10.x (dashboards)
  - Jaeger: 1.x (tracing)
  - Elasticsearch: 8.x (logs)
  - Kibana: 8.x (log visualization)
  - OpenTelemetry: Latest (instrumentation)

API Gateway:
  - Express Gateway: Custom implementation
  - Rate Limiting: express-rate-limit
  - Circuit Breaker: opossum

Message Queue:
  - Apache Kafka: 3.x
  - Zookeeper: 3.x (Kafka dependency)

Load Balancing:
  - Kubernetes Ingress / nginx-ingress
```

---

## Detailed Rationale

### Why Node.js + NestJS?

**Node.js**:
✅ JavaScript everywhere (frontend + backend = one language)  
✅ Non-blocking I/O perfect for microservices  
✅ Massive npm ecosystem  
✅ Team already familiar with JavaScript/TypeScript  
✅ Excellent for I/O-bound operations (API calls, database queries)  

**NestJS**:
✅ Built for enterprise applications  
✅ Dependency injection out of the box  
✅ Modular architecture aligns with DDD bounded contexts  
✅ Decorators make code readable (@Controller, @Injectable)  
✅ Built-in support for microservices patterns  
✅ Extensive documentation and community  
✅ TypeScript-first (catches errors at compile time)  

**Why NOT Spring Boot (Java)?**
❌ Team lacks Java expertise  
❌ Slower development cycle  
❌ Higher memory footprint  
❌ More verbose code  

**Why NOT Django (Python)?**
❌ Python typing is weaker than TypeScript  
❌ Async support not as mature  
❌ GIL (Global Interpreter Lock) limits concurrency  
❌ Team lacks Python expertise  

### Why PostgreSQL + MongoDB?

**PostgreSQL**:
✅ ACID transactions (critical for bookings, payments)  
✅ JSON/JSONB support (flexible when needed)  
✅ Mature, battle-tested  
✅ Excellent performance  
✅ Rich indexing options  
✅ Free and open-source  
✅ Strong TypeORM integration  

Used for: Booking, Policy, Traveler, Payment, Expense services

**MongoDB**:
✅ Flexible schema (flight offers from Amadeus have varying structures)  
✅ Horizontal scaling built-in  
✅ Fast reads for document retrieval  
✅ JSON-native storage  

Used for: Inventory service only (stores flight offers from external API)

**Why NOT MySQL?**
❌ PostgreSQL has better JSON support  
❌ PostgreSQL has better standards compliance  
❌ PostgreSQL has richer data types  

**Why NOT DynamoDB?**
❌ Vendor lock-in (AWS only)  
❌ Limited query capabilities  
❌ More expensive at our scale  

### Why Kafka?

✅ High throughput (handles millions of events/sec)  
✅ Event ordering per partition (critical for saga compensation)  
✅ Event log persistence (can replay events)  
✅ Horizontal scalability  
✅ Fault tolerance (replication)  
✅ Industry standard for event streaming  
✅ Free and open-source  

**Why NOT RabbitMQ?**
❌ Lower throughput  
❌ No built-in event log persistence  
❌ Queues vs streams (we need streaming)  

**Why NOT AWS SNS/SQS?**
❌ Vendor lock-in  
❌ More expensive  
❌ Less control over infrastructure  

### Why React + Redux Toolkit?

**React**:
✅ Component-based (matches DDD bounded contexts)  
✅ Huge ecosystem  
✅ Team familiarity  
✅ Virtual DOM (good performance)  
✅ React 18 concurrent features  

**Redux Toolkit**:
✅ Simplified Redux (less boilerplate)  
✅ RTK Query integrated (API calls + caching)  
✅ DevTools for debugging  
✅ Time-travel debugging  

**Why NOT Vue.js?**
❌ Smaller ecosystem  
❌ Team lacks Vue expertise  

**Why NOT Angular?**
❌ Steeper learning curve  
❌ More opinionated  
❌ Heavier framework  

### Why Kubernetes?

✅ Auto-scaling (horizontal pod autoscaler)  
✅ Self-healing (restarts failed pods)  
✅ Declarative configuration (GitOps)  
✅ Cloud-agnostic (no vendor lock-in)  
✅ Industry standard  
✅ Service discovery built-in  
✅ Rolling updates (zero-downtime deployments)  

**Why NOT AWS ECS?**
❌ Vendor lock-in  
❌ Less portable  

**Why NOT Docker Swarm?**
❌ Smaller community  
❌ Less feature-rich  

---

## Consequences

### Positive Consequences

✅ **Type Safety**: TypeScript prevents runtime errors  
✅ **Rapid Development**: NestJS scaffolding, decorators reduce boilerplate  
✅ **Strong Ecosystem**: npm has 2+ million packages  
✅ **Cloud Agnostic**: Can deploy to any cloud or on-premise  
✅ **No Licensing Costs**: All open-source stack  
✅ **Scalability**: Kafka + Kubernetes handle growth  
✅ **Developer Experience**: Hot reload, TypeScript, debugging tools  

### Negative Consequences

❌ **Node.js Single Thread**: Not ideal for CPU-intensive tasks (mitigated by using Node.js for I/O-bound operations only)  
❌ **Operational Complexity**: Running Kafka, Kubernetes requires expertise (mitigated by training and documentation)  
❌ **Breaking Changes**: npm packages can introduce breaking changes (mitigated by package-lock.json, Dependabot)  

---

## Migration Path

Since we're starting fresh (no legacy Azure system to migrate):

**Phase 1 (Weeks 1-2)**: Setup
- Initialize Git repositories
- Setup CI/CD pipelines
- Configure Docker Compose for local dev
- Setup Kubernetes cluster (staging)

**Phase 2 (Weeks 3-8)**: Core Services
- Implement Booking Service
- Implement Policy Service
- Implement Traveler Service
- Deploy to staging

**Phase 3 (Weeks 9-14)**: Supporting Services
- Implement Payment Service
- Implement Inventory Service
- Implement Expense Service
- Integration testing

**Phase 4 (Weeks 15-16)**: Production Launch
- Performance testing
- Security audit
- Production deployment
- Monitoring setup

---

## Cost Analysis

### Infrastructure Costs (Monthly Estimate)

**Kubernetes Cluster**:
- 3 worker nodes (8 vCPU, 32GB RAM each): $600/month
- 1 master node (4 vCPU, 16GB RAM): $150/month

**Databases**:
- 6 PostgreSQL instances (small): $300/month
- 1 MongoDB instance: $50/month

**Kafka Cluster**:
- 3 broker nodes: $300/month

**Redis**:
- 1 instance (8GB): $50/month

**Observability**:
- Prometheus + Grafana + Jaeger: $100/month
- Elasticsearch cluster: $200/month

**Load Balancer**: $50/month

**Total Infrastructure**: ~$1,800/month

**Licensing Costs**: $0 (all open-source)

**Development Costs**:
- 5.5 FTE × $80,000 labor budget = 16 weeks of development

**Total Project Cost**: ~$80,000 + ($1,800 × 4 months) = ~$87,200

---

## Alternatives Considered

### Alternative 1: .NET Core + Azure Stack

**Pros**:
- Excellent C# type system
- Strong tooling (Visual Studio)
- Azure integration

**Cons**:
- Vendor lock-in (Azure)
- Higher infrastructure costs
- Team lacks .NET expertise
- Less flexibility

**Why Rejected**: Vendor lock-in and cost

### Alternative 2: Go + gRPC

**Pros**:
- Excellent performance
- Built for concurrency
- Small binary size

**Cons**:
- Team lacks Go expertise
- Smaller ecosystem than Node.js
- More verbose than TypeScript
- Steeper learning curve

**Why Rejected**: Team expertise and development velocity

### Alternative 3: Python + Django/FastAPI

**Pros**:
- Clean syntax
- Good for data processing
- Team has some Python knowledge

**Cons**:
- GIL limits concurrency
- Weaker type system than TypeScript
- Async ecosystem less mature
- Slower than Node.js for I/O

**Why Rejected**: Concurrency and type safety concerns

---

## Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| npm package vulnerabilities | High | Medium | Dependabot, Snyk scanning, npm audit |
| Kafka operational complexity | Medium | High | Managed Kafka (Confluent Cloud) as fallback |
| TypeScript compilation bugs | Low | Low | Comprehensive testing, strict mode |
| Node.js memory leaks | Medium | Low | Memory profiling, heap snapshots |
| Breaking changes in dependencies | Medium | Medium | Lock versions, incremental upgrades |

---

## Success Metrics

**Performance**:
- 95th percentile API latency < 500ms ✅
- Support 1,000 concurrent users ✅
- Database query time < 100ms ✅

**Development Velocity**:
- Deploy to staging in < 5 minutes ✅
- Hot reload in < 2 seconds ✅
- Build time < 3 minutes ✅

**Cost**:
- Infrastructure costs < $2,000/month ✅
- Zero licensing fees ✅

**Reliability**:
- 99.5% uptime ✅
- Mean time to recovery < 15 minutes ✅

---

## Review & Evolution

**Review Cycle**: Quarterly  
**Next Review**: 2026-08-01

**Triggers for Re-evaluation**:
- Node.js performance becomes bottleneck
- Team composition changes (e.g., hire .NET experts)
- Infrastructure costs exceed budget
- Better technology emerges (e.g., Deno becomes production-ready)

---

## Related ADRs

- ADR-001: Architecture Style
- ADR-003: Communication Patterns
- ADR-004: Data Management
- ADR-005: Security Model

---

## Approved By

- CTO: ✅
- Engineering Manager: ✅
- Lead Architect: ✅
- DevOps Lead: ✅

**Implementation Start**: 2026-05-01  
**Status**: Active
