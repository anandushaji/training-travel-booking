# ADR-007: Monitoring & Observability

**Status**: Approved  
**Date**: 2026-05-01  
**Decision Makers**: Architecture Team, Engineering Leadership  
**Stakeholders**: Engineering Team, DevOps Team

---

## Decision

Implement **three pillars of observability**: Metrics, Logs, Traces.

**Metrics** (Prometheus + Grafana):
- HTTP request duration (p50, p95, p99)
- HTTP request count (by endpoint, status)
- Business metrics (bookings created, confirmed, failed)
- Database metrics (connection pool, query time)
- Kafka metrics (producer throughput, consumer lag)

**Logs** (Elasticsearch + Kibana):
- Structured logging (Winston)
- JSON format with correlation IDs
- Centralized in Elasticsearch
- Retention: 30 days

**Traces** (Jaeger + OpenTelemetry):
- Distributed tracing across services
- Request flow visualization
- Latency analysis per service
- Correlation IDs propagated through all services

**Dashboards**:
- Service health dashboard (uptime, error rate)
- Business metrics dashboard (bookings, revenue)
- Infrastructure dashboard (CPU, memory, disk)

**Alerts**:
- Service down: Immediate (PagerDuty)
- Error rate > 5%: Warning (Slack)
- Response time p99 > 1s: Warning
- Disk space > 80%: Warning

## Rationale

Can't manage what you can't measure. Observability is critical for production operations.
