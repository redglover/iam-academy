# IAM Academy

An interactive site for learning **Identity & Access Management** by doing. You run access for *Fjordtech AS*, a fictional Norwegian company: hire, transfer and terminate people, and see what IAM does at every step.

## What's inside

**Eight modules**, each ending with a quiz:

1. Identity, accounts and access
2. The principles that never change (least privilege, SoD, zero trust, creep, orphans)
3. Joiner, Mover, Leaver in practice
4. Roles, attributes and groups (RBAC/ABAC, role mining)
5. Automating IAM (event-driven vs. sync, SCIM, Microsoft Graph + PowerShell, Lifecycle Workflows)
6. Governance: access reviews, SoD, KPIs
7. Privileged access (PIM, JIT, break-glass, non-human identities)
8. Compliance and the Norwegian context (GDPR, NSM, ISO 27001, NIS2)

**Four labs:**

- **JML simulator**: fire HR events in *manual* or *automated* mode, watch the audit log and the auditor's findings
- **Automation pipeline builder**: assemble a joiner/leaver runbook, get it reviewed, read the generated PowerShell
- **RBAC lab**: fix business roles, remove SoD conflicts, watch privilege creep build up
- **Access review game**: 60 seconds, 12 lines, catch the risky ones

Plus a searchable glossary, a printable cheat sheet with interview questions, XP, levels and badges. Progress is stored in your browser only.

## Run locally

```bash
npm install
npm run dev       # http://localhost:5173
npm test          # engine unit tests (Vitest)
npm run build     # typecheck + production build
```

## Stack

Vite, React 18, TypeScript, Tailwind CSS, framer-motion, lucide-react. The simulation logic is plain TypeScript, with no UI dependencies:

- `src/features/jml-sim/engine.ts`: JML plans, state transitions, audit findings
- `src/features/automation/pipeline.ts`: runbook blocks, validator, script generator
- `src/features/rbac-lab/sod.ts`: separation-of-duties rules

Course content lives in `src/data/` as typed data, so adding a module means adding an object to `modules.ts`.

## Deploy

Pushing to `main` runs `.github/workflows/deploy.yml`, which tests, builds and publishes to GitHub Pages. Enable it once under **Settings → Pages → Source: GitHub Actions**.
