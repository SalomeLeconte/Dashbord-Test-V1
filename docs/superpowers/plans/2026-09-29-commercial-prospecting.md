# Commercial Prospecting Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace TOP 200 for COMMERCIAL accounts with a department-scoped INSEE prospecting workspace, then allow validated prospects to be added to the commercial portfolio.

**Architecture:** Keep the existing PSSR dashboard unchanged. Add a commercial-only runtime view backed by Cloudflare Functions; server-side session scope is authoritative for departments. INSEE data will later be refreshed daily at 00:00 Europe/Paris into prepared storage, with known clients/prospects excluded by SIRET/SIREN.

**Tech Stack:** Cloudflare Pages Functions, D1, JavaScript, existing dashboard build pipeline.

**Spec:** Conversation-approved commercial prospecting design.

## Global Constraints
- COMMERCIAL users see `Nouveaux prospects` instead of `TOP 200`; PSSR behavior stays unchanged.
- Departments always come from the authenticated account scope, never from client-supplied authorization.
- Allowed NAF list is fixed server-side.
- Exclude known clients and prospects by SIRET, with SIREN as secondary exclusion.
- Daily refresh target: 00:00 Europe/Paris.
- Added prospects receive `PRMMYYYY`, `source=INSEE`, creation date, owner and department.
- Prospect form validates contact, phone, email, follow-up date, machine quantities and potential server-side.
- Machine park is structured as brand + model + quantity; Komatsu share is calculated automatically.
- Competitor list supports multi-select and `Autre` only as generic value.

## Review Focus
- A COMMERCIAL account must never retrieve prospects outside its assigned departments.
- PSSR accounts must retain TOP 200 and must not access commercial APIs.
- Direct API calls must not bypass form validation or department scope.
- Known SIRET/SIREN must not reappear as new prospects.
- Refresh failures must not erase the last valid prepared prospect dataset.

---

### Task 1: Commercial-only prospecting shell
**Files:** Create `commercial-prospects-runtime.js`; modify `scripts/perf-transforms/p1-production-assets.mjs`.
- [ ] Add a commercial-only replacement for TOP 200.
- [ ] Add primary filters: department, activity, workforce, search.
- [ ] Add advanced filters: commune, NAF, company category, age, headquarters, novelty.
- [ ] Add sort control and prospect table shell.
- [ ] Keep PSSR TOP 200 unchanged.
- [ ] Build-time syntax validation through existing esbuild pipeline.
- [ ] Commit.

### Task 2: Scoped prospect read API
**Files:** Create `functions/api/commercial/prospects.js` and supporting constants/helpers.
- [ ] Require authenticated COMMERCIAL role.
- [ ] Derive departments exclusively from session scope.
- [ ] Return only prepared active prospects in allowed NAF/departments.
- [ ] Add server-side filter/query parameters that can only narrow authorized data.
- [ ] Commit.

### Task 3: INSEE refresh pipeline
**Files:** Create refresh worker/function and D1 schema/migration documentation.
- [ ] Store INSEE API key only as Cloudflare secret.
- [ ] Fetch allowed NAF × configured commercial departments with pagination.
- [ ] Exclude known SIRET/SIREN.
- [ ] Atomically replace prepared dataset only after successful refresh.
- [ ] Configure/supply cron target for 00:00 Europe/Paris with DST-safe scheduling strategy.
- [ ] Commit.

### Task 4: Add-to-portfolio workflow
**Files:** Create prospect write API and modal UI.
- [ ] Pre-fill immutable INSEE identity/address fields.
- [ ] Validate structured commercial fields server-side.
- [ ] Store machine park rows and calculate Komatsu market share.
- [ ] Generate `PRMMYYYY` and persist `source=INSEE`.
- [ ] Remove newly added prospect from new-prospect results.
- [ ] Commit.

### Task 5: Final authorization and regression verification
- [ ] Verify COMMERCIAL department isolation by direct URL/API calls.
- [ ] Verify PSSR TOP 200 regression.
- [ ] Verify admin remains unaffected.
- [ ] Verify build/deployment markers no longer depend on commercial UI text.
- [ ] Commit fixes if required.
