---
name: estimate-generator
description: Generates PERT-based project estimates as structured Excel workbooks. Use when the user asks to generate a project estimate, create a sprint plan, build a WBS, or estimate effort for a software delivery project. Runs a structured discovery interview, builds a Work Breakdown Structure, assigns PERT values, models team capacity, plans sprints, and produces a 5-sheet Excel file via scripts/generate_estimate.py.
compatibility: Requires Python with openpyxl installed (`pip install openpyxl`). Uses scripts/generate_estimate.py to produce the Excel output. No external APIs required.
metadata:
  generated_at: "2026-04-29"
  generator: "custom/estimate-generator"
---

# Project Estimate Generator

## Overview

This skill produces a professional, PERT-based project estimate as a multi-sheet Excel workbook. It combines three-point estimation (Optimistic / Most Likely / Pessimistic), team capacity modelling, sprint planning, and risk-adjusted contingency into a single reproducible output.

**Output:** A 5-sheet Excel file containing:
- **Assumptions** — team, sprint, and project parameters
- **Capacity Model** — effective hours per person per sprint
- **WBS + PERT** — all tasks with O/M/P values, PERT estimate, sprint assignment, and risk
- **Sprint Plan** — tasks grouped by sprint with milestone markers
- **Summary** — total PERT hours, contingency, calendar duration, and go-live date

For detailed formula tables and edge-case rules, see `REFERENCE.md`.
For ready-made task breakdown templates by project type, see `TASK_TEMPLATES.md`.

---

## Quick Start

```bash
# 1. Run the discovery interview (see Phase 1 below)
# 2. Build the WBS + PERT values (see Phase 2–4)
# 3. Write estimate_config.json with the gathered data
# 4. Generate the Excel file
python scripts/generate_estimate.py --config estimate_config.json --output MyProject-Estimate.xlsx
```

---

## Workflow

### PHASE 1 — Discovery Interview

**MANDATORY**: Ask all questions in a single message before building anything. Wait for answers, then proceed.

> **Fast-path**: If the user has already described the project, team, and scope in this conversation, extract the answers directly — do not re-ask questions already answered.

Present exactly:

---

**Before I build the estimate, I need a few inputs:**

**1. Project & Scope**
- What is the project name?
- Do you have a scope document, architecture doc, or feature list I can read? (share file path or paste content)
- Are there any existing ADRs or design decisions that define the tech stack?

**2. Team Composition** *(number of people per role)*
- Frontend developers:
- Backend developers:
- QA engineers:
- DevOps / Infra (if dedicated):
- Any other roles:

**3. Sprint & Calendar**
- Sprint length: *(e.g., 2 weeks = 10 working days)*
- Working hours per day: *(default: 8)*
- Overhead / ceremonies per sprint: *(default: 25% — standups, retros, planning, reviews)*
- Any planned leaves or holidays during delivery: *(if none, say so)*
- Desired project start date:

**4. Risk & Contingency**
- Team familiarity with the tech stack: *(New / Familiar / Expert)*
- Any high-risk integrations or unknowns: *(list them)*
- Contingency buffer preference: *(default: 15% on uncertain tasks, 10% on known tasks)*

**5. Output**
- Where should the Excel file be saved? *(full path)*
- Which sheets do you need? *(choose one)*
  - [ ] **WBS only** — task breakdown + PERT estimates. Best for a quick standalone estimate or client-facing effort summary.
  - [ ] **WBS + Summary** — adds the totals, contingency, sprint count, and go-live date alongside the WBS.
  - [ ] **WBS + Sprint Plan** — adds sprint-by-sprint task grouping and milestone markers.
  - [ ] **All sheets** — full project pack: Assumptions + Capacity Model + WBS + PERT + Sprint Plan + Summary. Best for internal delivery planning.
  - [ ] **Custom** — specify individual sheets: `assumptions`, `wbs`, `capacity`, `sprint`, `summary`.

> **Default if unspecified:** WBS only. The WBS + PERT sheet is always the minimum viable output — it contains the full task breakdown, O/M/P values, PERT estimate, risk level, and sprint assignment.

---

### PHASE 2 — Capacity Model

Calculate per sprint before building the WBS.

```
Gross hours per person per sprint  = sprint_days × hours_per_day
Overhead deduction                 = gross_hours × overhead_pct
Effective hours per person/sprint  = gross_hours − overhead_deduction

Total team capacity per sprint     = sum(effective_hours × headcount per role)
```

**Example** (2-week sprint, 8 h/day, 25% overhead, team: 1 FE + 2 BE + 1 QA):
```
Gross per person   = 10 × 8 = 80 h
Overhead           = 80 × 0.25 = 20 h
Effective          = 60 h/person/sprint
Total capacity     = (1 + 2 + 1) × 60 = 240 h/sprint
```

---

### PHASE 3 — WBS Construction

**Decompose scope into tasks following these rules:**

1. **Phases** — group tasks by delivery phase (Infrastructure → Core Services → Integration → Frontend → Testing → Release)
2. **Work packages** — within each phase, group by bounded context or system area
3. **Tasks** — individual units of 1–5 days. Never create tasks larger than 5 days (40h at 8h/day); split them.
4. **Assignee** — assign each task to a specific role (FE1, BE1, BE2, QA1, etc.)
5. **Sprint** — assign tasks to a sprint based on dependencies and capacity

**Standard Phase Structure** (adapt to project):

| Phase | Typical Content |
|-------|----------------|
| Phase 0 | Infrastructure, IaC, CI/CD, Environments |
| Phase 1 | Core domain services (highest-risk first) |
| Phase 2 | Supporting services |
| Phase 3 | External integrations / adapters |
| Phase 4 | Frontend / BFF |
| Phase 5 | End-to-end integration, performance tests |
| Phase 6 | NFR hardening, security, DR |
| Phase 7 | UAT, go-live prep, cutover |

For a ready-made task list for GCP microservices projects, read `TASK_TEMPLATES.md`.

---

### PHASE 4 — PERT Value Assignment

**Formula:**
```
E = (O + 4M + P) / 6
Variance = ((P - O) / 6)²
```

**O / M / P assignment rules by risk:**

| Risk Level | Trigger | O | M | P |
|------------|---------|---|---|---|
| **Low** | Well-understood; team has done it before | 0.7 × M | Baseline | 1.3 × M |
| **Medium** | Some unknowns; team familiar with approach | 0.6 × M | Baseline | 1.6 × M |
| **High** | New technology, unclear requirements, external dependency | 0.5 × M | Baseline | 2.0 × M |
| **Critical** | Never done before; blocking dependency unknown | 0.4 × M | Baseline | 3.0 × M |

**Indicators for each risk level:**

- **Low**: CRUD endpoints, standard DB migrations, config file changes, well-documented library integrations
- **Medium**: New service scaffolding, new DB schema with foreign keys, CI/CD pipeline setup, known external API
- **High**: First use of a new technology (e.g., Istio mesh, Saga pattern), external API with no sandbox, async event flows
- **Critical**: Core architectural spike, ambiguous acceptance criteria, dependency on another team's delivery

**Practical O/M/P Ranges (hours):**

| Task Size | M (Most Likely) | O (Low risk) | O (High risk) | P (Low risk) | P (High risk) |
|-----------|----------------|--------------|---------------|--------------|---------------|
| XS (half-day) | 4 h | 3 h | 2 h | 6 h | 8 h |
| S (1 day) | 8 h | 5 h | 4 h | 12 h | 16 h |
| M (2 days) | 16 h | 10 h | 8 h | 24 h | 32 h |
| L (3 days) | 24 h | 16 h | 12 h | 36 h | 48 h |
| XL (5 days) | 40 h | 28 h | 20 h | 56 h | 80 h |

> If a task exceeds XL (> 40h M), split it into smaller tasks.

---

### PHASE 5 — Sprint Loading Rules

1. **Respect capacity**: No person's task load in a sprint may exceed their effective hours.
2. **Front-load risk**: High-risk tasks go in early sprints (1–3) to surface problems early.
3. **Dependencies first**: Infrastructure and shared services before consuming services.
4. **Leave 10% slack**: Keep ~10% of each sprint's capacity free for unplanned work.
5. **Milestones**: Place milestone markers at logical sprint completions (e.g., "Infrastructure Ready" at end of Sprint 2).

**Sprint capacity check** (per person):
```python
# Before assigning a task to a sprint, verify:
sprint_load[sprint][assignee] + task_pert_hours <= effective_hours_per_sprint
```

---

### PHASE 6 — Contingency & Summary Calculation

```
Raw PERT total       = sum of all task PERT estimates
Contingency buffer   = Raw PERT total × contingency_pct
Total with buffer    = Raw PERT total + Contingency buffer
Total days           = Total with buffer / (team_size × effective_hours_per_sprint) × sprint_days
Number of sprints    = ceil(Total with buffer / total_team_capacity_per_sprint)
Go-live date         = start_date + (num_sprints × sprint_length_days) working days
```

**Default contingency rates:**
- 10% for projects where team is Expert on all tech
- 15% for Familiar team (recommended default)
- 20% for New tech stack or high external dependency count

---

### PHASE 7 — Generate the Excel File

#### Step 1: Write `estimate_config.json`

```json
{
  "project_name": "Project Name",
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
    "4": "M2 — Core Services Live",
    "6": "M3 — Integration Complete",
    "8": "M4 — Production Go-Live"
  },
  "tasks": [
    {
      "phase": "Phase 0",
      "work_package": "Infrastructure",
      "task": "Terraform: VPC + Networking",
      "assignee": "BE1",
      "O": 8,
      "M": 16,
      "P": 24,
      "sprint": 1,
      "risk": "Medium",
      "notes": "ADR-0008"
    }
  ]
}
```

#### Step 2: Run the script

Use `--sheets` to control which sheets are generated. Pass a comma-separated list or the shorthand `all`.

```bash
# WBS only (default — quickest, most common)
python scripts/generate_estimate.py --config estimate_config.json --output Estimate.xlsx --sheets wbs

# WBS + Summary (effort totals, go-live date, contingency)
python scripts/generate_estimate.py --config estimate_config.json --output Estimate.xlsx --sheets wbs,summary

# WBS + Sprint Plan (task grouping by sprint with milestones)
python scripts/generate_estimate.py --config estimate_config.json --output Estimate.xlsx --sheets wbs,sprint

# Full project pack (all 5 sheets)
python scripts/generate_estimate.py --config estimate_config.json --output Estimate.xlsx --sheets all
```

**Available sheet names:**

| Name | Sheet content | Needs |
|------|--------------|-------|
| `assumptions` | Project parameters, team, capacity formula | — |
| `wbs` | Full task list: Phase, Work Package, Task, O/M/P, PERT, Sprint, Risk | — |
| `capacity` | Per-role gross / ceremony / effective / usable hours | — |
| `sprint` | Tasks grouped by sprint, milestone markers, load vs. capacity | wbs data |
| `summary` | PERT total, contingency, sprint count, go-live date, confidence note | wbs data |

> **Note:** `sprint` and `summary` always use WBS data for calculations even if the `wbs` sheet itself is not included in the output file.

---

## Quick Reference

| Item | Default | Override with |
|------|---------|--------------|
| Sprint length | 10 working days (2 weeks) | `sprint_length_days` in config |
| Hours per day | 8 h | `hours_per_day` in config |
| Overhead | 25% | `overhead_pct` in config |
| Contingency | 15% | `contingency_pct` in config |
| Max task size | 40h (5 days) | Split any task exceeding this |
| Sprint slack | 10% reserved | Built into capacity model |
| PERT formula | `(O + 4M + P) / 6` | Fixed — do not change |
| Sheets output | `wbs` only | `--sheets wbs,summary` / `--sheets all` |

**Sheet selection cheat-sheet:**

| Scenario | `--sheets` value |
|----------|-----------------|
| Quick estimate for a client conversation | `wbs` |
| Client-facing proposal with timeline | `wbs,summary` |
| Internal planning with sprint breakdown | `wbs,sprint` |
| Full delivery project pack | `all` |
| Capacity deep-dive without task list | `assumptions,capacity,summary` |

## Next Steps

- For full PERT methodology, variance calculation, and project-level confidence intervals → read `REFERENCE.md`
- For ready-made task breakdowns (GCP microservices, SPA frontend, API projects) → read `TASK_TEMPLATES.md`
- To generate the Excel output → run `scripts/generate_estimate.py`
- To install the required library: `pip install openpyxl`
