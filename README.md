# Corporate Travel Portal

<div align="center">

![Version](https://img.shields.io/badge/version-2.0-blue.svg)
![Architecture](https://img.shields.io/badge/architecture-Microservices%20%2B%20DDD-green.svg)
![Status](https://img.shields.io/badge/status-Production%20Ready-success.svg)

**Enterprise corporate travel booking platform • Domain-Driven Design • Cloud-Agnostic**

[Quick Start](#-quick-start) • [Documentation](#-documentation) • [Architecture](#-architecture) • [Tech Stack](#-tech-stack)

</div>

---

## 📋 Overview

An enterprise-grade travel booking and management platform enabling employees to search and book flights while enforcing company policies, managing budgets, processing secure payments, and automating expense reporting.

**Problem**: Manual travel booking, policy violations, budget overruns, expense reporting inefficiency

**Solution**: Automated policy enforcement • Budget tracking • Integrated booking (Amadeus) • Secure payments (Stripe) • Automated expenses

---

## 🎯 Key Features

**Employees**: Search flights • Quick booking • Expense tracking  
**Managers**: Approve travel • Monitor budgets • Generate reports  
**Admins**: Configure policies • Allocate budgets • System management

---

## 🏗️ Architecture

### High-Level

```
Employee → React SPA → API Gateway → 6 Microservices → Databases + Kafka
```

### Principles

✅ **Domain-Driven Design**: Business logic in pure domain layer, bounded contexts  
✅ **Microservices**: 6 independent services, database-per-service  
✅ **Event-Driven**: Kafka for async communication, Saga pattern  
✅ **Cloud-Agnostic**: Docker + Kubernetes, deploy anywhere

---

## 📚 Documentation

> **🚀 Quick Navigation**: Read files in this order for fastest onboarding

### 1️⃣ **Start Here**

**[PROJECT.md](PROJECT.md)** ⭐ **Read this first**
- Single source of truth for all project context
- Required for AI agents (if using AGENTS.md workflow)
- Complete tech stack, service topology, ADRs, conventions
- 500+ lines covering every architectural decision

### 2️⃣ **Architecture Decision Records (ADRs)**

**Location**: [docs/adr/](docs/adr/)

| ADR | Document | Summary |
|-----|----------|---------|
| **001** | [Architecture-Style.md](docs/adr/ADR-001-Architecture-Style.md) | Why DDD + Microservices |
| **002** | [Technology-Stack.md](docs/adr/ADR-002-Technology-Stack.md) | Node.js 20, React 18, PostgreSQL 15, Kafka 3 |
| **003** | [Communication-Patterns.md](docs/adr/ADR-003-Communication-Patterns.md) | REST + Events, Saga pattern |
| **004** | [Data-Management.md](docs/adr/ADR-004-Data-Management.md) | Database-per-service, schemas |
| **005-013** | [ADR-005-013-Complete.md](docs/adr/ADR-005-013-Complete.md) | Security, Gateway, Monitoring, Testing, Deployment |

**Total**: 13 ADRs documenting every major decision

### 3️⃣ **Technical Architecture**

**[DDD-Architecture.md](docs/DDD-Architecture.md)** - Complete implementation guide
- 14 sections, 50+ pages, 30+ code examples
- Domain models, aggregates, entities, value objects
- Folder structure, Docker setup, API design
- Event-driven architecture, CQRS, Saga pattern

### 4️⃣ **Visual Diagrams**

**[Architecture-Diagrams.md](docs/architecture/Architecture-Diagrams.md)** - 10 comprehensive diagrams

**C4 Model** (Levels 1-3):
- [System Context](docs/architecture/diagrams/system-context-diagram.png) - Users & external systems
- [Container Diagram](docs/architecture/diagrams/container-diagram.png) - All 6 microservices
- [Component Diagrams](docs/architecture/diagrams/services/) - Internal service structure

**Technical Diagrams**:
- [Technical Stack](docs/architecture/diagrams/dashboard-architecture.png) - Complete tech stack
- [Booking Flow](docs/architecture/diagrams/flows/booking-flow-saga-pattern.png) - Saga pattern
- [Kubernetes](docs/architecture/diagrams/kubernetes-deployment.png) - Production deployment
- [Network Security](docs/architecture/diagrams/network-segmentation.png) - Security zones

### 5️⃣ **API Contracts**

**Location**: [docs/contracts/openapi/](docs/contracts/openapi/)

| Service | Spec | Endpoints | Port |
|---------|------|-----------|------|
| Booking | [booking-service.yaml](docs/contracts/openapi/booking-service.yaml) | 11 | 3001 |
| Policy | [policy-service.yaml](docs/contracts/openapi/policy-service.yaml) | 12 | 3002 |
| Traveler | [traveler-service.yaml](docs/contracts/openapi/traveler-service.yaml) | 10 | 3003 |
| Payment | [payment-service.yaml](docs/contracts/openapi/payment-service.yaml) | 13 | 3004 |
| Inventory | [inventory-service.yaml](docs/contracts/openapi/inventory-service.yaml) | 10 | 3005 |
| Expense | [expense-service.yaml](docs/contracts/openapi/expense-service.yaml) | 11 | 3006 |

**Total**: 67 REST endpoints, OpenAPI 3.0 specs

---

## 🛠️ Tech Stack

| Layer | Technology | Version |
|-------|------------|---------|
| **Backend** | Node.js + NestJS | 20 LTS, 10.x |
| **Frontend** | React + TypeScript | 18.x, 5.x |
| **Databases** | PostgreSQL, MongoDB | 15, 7 |
| **Messaging** | Apache Kafka | 3.x |
| **Cache** | Redis | 7 |
| **Container** | Docker + Kubernetes | 24.x, 1.28.x |
| **Observability** | Prometheus + Jaeger + ELK | Latest |

See [PROJECT.md - Section 2](PROJECT.md#required-2-tech-stack) for complete list with exact versions.

---

## 🚀 Quick Start

### Prerequisites

```bash
Node.js:  v20.x LTS
Docker:   v24.x+
```

### 1. Clone & Setup

```bash
git clone https://github.com/company/corporate-travel-portal.git
cd corporate-travel-portal
cp .env.example .env     # Edit with your credentials
```

### 2. Start Infrastructure

```bash
docker-compose up -d     # Starts: 6 services, 6 databases, Kafka, Redis, monitoring
```

### 3. Start Frontend

```bash
cd frontend
npm install
npm run dev              # http://localhost:3000
```

### 4. Verify

```bash
./scripts/check-health.sh
```

### 5. Access Applications

| App | URL | Credentials |
|-----|-----|-------------|
| **Frontend** | http://localhost:3000 | Register new account |
| **Grafana** | http://localhost:3100 | admin/admin |
| **Jaeger** | http://localhost:16686 | N/A |
| **Kibana** | http://localhost:5601 | N/A |

See [PROJECT.md - Section 10 & 11](PROJECT.md#recommended-10-build-run-and-test-commands) for complete setup guide.

---

## 📁 Project Structure

See [PROJECT.md - Section 3](PROJECT.md#required-3-repository-structure) for complete folder tree.

**Key Directories**:
- `services/` - 6 microservices (booking, policy, traveler, payment, inventory, expense)
- `api-gateway/` - Single entry point (auth, rate limiting, routing)
- `frontend/` - React SPA (Material-UI, Redux Toolkit)
- `docs/` - Architecture docs, ADRs, diagrams
- `contracts/` - OpenAPI 3.0 specifications
- `infrastructure/` - Docker Compose, Kubernetes manifests

---

## 🔄 Development

### Workflow

```bash
# Create feature branch
git checkout -b feature/booking-cancellation

# Commit (conventional commits)
git commit -m "feat: Add booking cancellation"

# Test
npm test                 # Unit + integration
npm run test:coverage    # Target: 80%

# Deploy
./scripts/deploy.sh staging
```

See [PROJECT.md - Section 9 & 12](PROJECT.md#recommended-9-coding-conventions) for coding conventions and workflows.

---

## 📊 System Metrics

| Metric | Value |
|--------|-------|
| **Services** | 6 microservices |
| **Endpoints** | 67 REST APIs |
| **Databases** | 6 instances (5 PostgreSQL + 1 MongoDB) |
| **Test Coverage** | 82% |
| **Documentation** | 50+ pages |
| **Team Size** | 5.5 FTE |
| **Timeline** | 16 weeks to MVP |

---

## 🔐 Security & Compliance

- **Auth**: JWT (8h expiry), RBAC (Employee/Manager/Admin)
- **Encryption**: AES-256 (rest), TLS 1.3 (transit)
- **PCI-DSS**: Stripe tokenization (never store full cards)
- **GDPR**: Right to access, erasure, portability

See [PROJECT.md - Section 7 & ADR-005](docs/adr/ADR-005-013-Complete.md) for complete security model.

---

## 📞 Support

### Documentation

- 📘 [PROJECT.md](PROJECT.md) - **Start here** (project context)
- 📊 [Architecture Diagrams](docs/architecture/Architecture-Diagrams.md)
- 📋 [ADRs](docs/adr/) - Decision records
- 📄 [OpenAPI Specs](docs/contracts/openapi/) - API contracts
- 📖 [DDD Architecture](docs/DDD-Architecture.md) - Implementation guide

### Contact

- 💬 Slack: #corporate-travel-dev
- 📧 Email: dev-team@company.com
- 🚨 Incidents: PagerDuty

---

## 🗺️ Roadmap

- ✅ **Phase 1** (Weeks 1-8): MVP - Core booking flow
- ✅ **Phase 2** (Weeks 9-16): Enhancements - Analytics, reporting
- 🔄 **Phase 3** (Months 5-6): Scale - Performance optimization
- 📋 **Phase 4** (Months 7+): Mobile apps, AI recommendations, hotel booking

---

## 📜 License

Proprietary - Copyright © 2026 Company Name. All rights reserved.

---

<div align="center">

**Built with Domain-Driven Design + Microservices**

**Last Updated**: May 2026 | **Version**: 2.0 | **Status**: Production Ready

[⬆ Back to Top](#corporate-travel-portal)

</div>
