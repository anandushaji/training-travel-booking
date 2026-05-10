# Estimate Generator — Reference

Detailed formulas, look-up tables, and edge-case rules for the estimate-generator skill.
The main workflow is in `SKILL.md`. This file is for deep-dive reference only.

---

## 1. PERT Formula — Full Detail

### Single-task estimate
```
E  = (O + 4M + P) / 6          # Expected duration (weighted mean)
SD = (P - O) / 6                # Standard deviation
V  = SD²                        # Variance
```

### Project-level confidence interval
When tasks are independent, the project total follows a normal distribution:

```
Total_E  = sum(E_i)             # Sum of all task expected values
Total_V  = sum(V_i)             # Sum of all task variances
Total_SD = sqrt(Total_V)        # Project standard deviation

50% confidence  = Total_E
85% confidence  = Total_E + 1.0 × Total_SD
95% confidence  = Total_E + 1.65 × Total_SD
99% confidence  = Total_E + 2.33 × Total_SD
```

**Practical guidance:**
- Use **50%** as the raw estimate (before contingency)
- Use **85%** as the committed delivery estimate for clients
- Add the explicit contingency buffer on top of the PERT total (15% default)

---

## 2. Capacity Model — Full Detail

### Variables
```
sprint_days        = number of working days in a sprint (e.g. 10 for 2-week sprint)
hours_per_day      = contracted working hours per day (default: 8)
overhead_pct       = % of gross hours lost to ceremonies (default: 25%)
slack_pct          = % of effective hours kept as buffer (default: 10%)

gross_hours        = sprint_days × hours_per_day
ceremony_hours     = gross_hours × overhead_pct
effective_hours    = gross_hours - ceremony_hours
usable_hours       = effective_hours × (1 - slack_pct)    # hours actually assignable
```

### Example: 2-week sprint, 8h/day, 25% overhead, 10% slack
```
gross_hours    = 10 × 8  = 80 h
ceremonies     = 80 × 0.25 = 20 h
effective      = 80 - 20 = 60 h
usable         = 60 × 0.90 = 54 h  (54 h can be assigned; 6 h held as sprint buffer)
```

### What counts as overhead (25% default)
| Activity | Typical Hours/Sprint |
|----------|---------------------|
| Daily standups (15 min × 10 days) | 2.5 h |
| Sprint planning | 2.0 h |
| Sprint review | 1.0 h |
| Retrospective | 1.0 h |
| Backlog grooming | 2.0 h |
| 1:1s / team meetings | 3.0 h |
| Unplanned interruptions | 8.5 h |
| **Total** | **~20 h (25% of 80)** |

### Adjusting overhead
| Team situation | Recommended overhead_pct |
|----------------|--------------------------|
| Small team (2–3 people), async-first | 20% |
| Normal agile team (4–6 people) | 25% (default) |
| Large team with many stakeholders | 30% |
| Team doing support + delivery | 35% |

---

## 3. Risk Level Decision Table

Use this table to assign a risk level to each task:

| Factor | Low (1) | Medium (2) | High (3) | Critical (4) |
|--------|---------|-----------|---------|------------|
| **Team familiarity** | Done many times | Done before | New to team | Never done anywhere |
| **Requirements clarity** | Fully specified | Mostly clear | Partially clear | Ambiguous / TBD |
| **External dependency** | None | Known stable API | Known but unproven | Unknown / no sandbox |
| **Technology maturity** | Stable, well-documented | Stable, less common | Newer, less documented | Cutting-edge / beta |
| **Integration complexity** | Internal only | 1 external system | 2–3 external systems | Many, complex data flows |

**Risk level = max of any column score:**
- Score 1 → Low
- Score 2 → Medium
- Score 3 → High
- Score 4 → Critical

---

## 4. O/M/P Spread by Risk Level

| Risk | O = M × | P = M × | PERT = M × | SD = M × |
|------|---------|---------|-----------|---------|
| Low | 0.70 | 1.30 | 1.00 | 0.10 |
| Medium | 0.60 | 1.60 | 1.03 | 0.17 |
| High | 0.50 | 2.00 | 1.08 | 0.25 |
| Critical | 0.40 | 3.00 | 1.23 | 0.43 |

**Note:** For High/Critical risk tasks, the PERT estimate is meaningfully above M — this is intentional. It reflects the statistical asymmetry of uncertain tasks.

---

## 5. Contingency Buffer Rules

### When to apply contingency
Contingency is applied as a single lump sum on top of the total PERT estimate, **not** per task.

| Project situation | Recommended contingency |
|-------------------|------------------------|
| Expert team, known tech, clear scope | 10% |
| Familiar team, mostly known tech (default) | 15% |
| New team or new tech stack | 20% |
| High external dependency count (3+) | 20% |
| Both new team AND new tech | 25% |

### What contingency covers
- Tasks not yet identified at estimation time
- Rework from integration failures
- Environment setup delays
- Stakeholder change requests (minor)
- Technical debt discovered during delivery

### What contingency does NOT cover
- Major scope changes (require a re-estimate)
- Team attrition (re-estimate the affected work packages)
- External vendor delays beyond 1 sprint (escalate)

---

## 6. Sprint Loading — Detailed Rules

### Hard rules (never violate)
1. A person cannot be assigned more than their **usable hours** in a single sprint.
2. A task must not span sprints — if it doesn't fit, split it or move it to the next sprint.
3. Tasks with dependencies must be scheduled after their prerequisite tasks complete.

### Soft rules (apply judgment)
1. Aim for ≤ 90% load per person (leave slack for reviews and PR feedback).
2. High-risk tasks should be in Sprint 1–3 to maximise time to recover.
3. Integration tasks should be in the sprint immediately after all their dependencies land.
4. Testing tasks follow the feature they test by at most 1 sprint.

### Sprint loading example
```
Person: BE1
Sprint capacity: 54 usable hours

Task A: PERT = 16 h  → Running total: 16 h  ✓
Task B: PERT = 24 h  → Running total: 40 h  ✓
Task C: PERT = 20 h  → Running total: 60 h  ✗ EXCEEDS 54 h → move to Sprint N+1
```

---

## 7. Excel Sheet Reference

The 5 sheets generated by `scripts/generate_estimate.py`:

### Sheet 1: Assumptions
| Field | Description |
|-------|-------------|
| Project Name | From config |
| Sprint Length (days) | From config |
| Hours per Day | From config |
| Overhead % | From config |
| Contingency % | From config |
| Start Date | From config |
| Team Composition | Headcount per role |

### Sheet 2: Capacity Model
Per-person, per-sprint breakdown:
- Gross hours
- Ceremony hours
- Effective hours
- Usable hours (after slack)
- Total team capacity per sprint

### Sheet 3: WBS + PERT
One row per task:
`Phase | Work Package | Task | Assignee | O | M | P | PERT | Variance | Sprint | Risk | Notes`

PERT and Variance are computed by the script from O/M/P inputs.

### Sheet 4: Sprint Plan
Tasks grouped by sprint number, with:
- Sprint date range
- Per-person load summary
- Milestone markers (if any)
- Sprint total PERT hours vs. capacity

### Sheet 5: Summary
- Total tasks, total phases
- Raw PERT total (hours)
- Contingency buffer (hours)
- Total with contingency (hours)
- Total calendar days
- Number of sprints
- Start date / Go-live date
- Confidence level note

---

## 8. Common Mistakes to Avoid

| Mistake | Effect | Fix |
|---------|--------|-----|
| Assigning P = M × 1.1 for all tasks | Massively underestimates uncertainty | Use the spread table in Section 4 |
| Creating tasks > 5 days | Hides risk and makes tracking impossible | Split into ≤ 5-day tasks |
| Ignoring overhead | Inflated capacity, missed deadlines | Always deduct 20–30% |
| Applying contingency per-task | Double-counts risk already in P | Apply contingency once on total |
| Treating PERT as a commitment | PERT is a probability, not a promise | Communicate the confidence interval |
| Forgetting integration and test tasks | Under-estimates by 20–30% | Always include Phase 5–6 tasks |
| Not front-loading risk | Surprises in Sprint 6+ | High-risk tasks in Sprint 1–3 |
