# IAM Academy

An interactive site for learning **Identity & Access Management** by doing. You run access for *Fjordtech AS*, a fictional Norwegian company: hire, transfer and terminate people, and see what IAM does at every step.

## What's inside

**Eleven modules**, each ending with a quiz:

1. Identity, accounts and access
2. The principles that never change (least privilege, SoD, zero trust, creep, orphans)
3. Joiner, Mover, Leaver in practice
4. Roles, attributes and groups (RBAC/ABAC, role mining)
5. Automating IAM (event-driven vs. sync, SCIM, Microsoft Graph + PowerShell, Lifecycle Workflows)
6. OAuth 2.0 and OpenID Connect (flows, tokens, PKCE, Entra app registrations, consent phishing)
7. SAML single sign-on (assertions, Entra enterprise app setup, certificates, troubleshooting)
8. SCIM provisioning (schema, PATCH, Entra provisioning cycles, matching, scoping, quarantine)
9. Governance: access reviews, SoD, KPIs
10. Privileged access (PIM, JIT, break-glass, non-human identities)
11. Compliance and the Norwegian context (GDPR, NSM, ISO 27001, NIS2)

**Eight labs and a playground:**

- **JML simulator**: fire HR events in *manual* or *automated* mode, watch the audit log and the auditor's findings
- **Automation pipeline builder**: assemble a joiner/leaver runbook, get it reviewed, read the generated PowerShell
- **OAuth flow simulator**: auth code + PKCE, client credentials and device code, message by message, with attacks to switch on and defences to stop them
- **OAuth playground**: register an app in your own Entra tenant, sign in for real (auth code + PKCE, no backend), and see your decoded ID and access tokens plus a Graph `/me` call
- **SAML flow simulator**: SP- and IdP-initiated sign-in with the SP's validation checks as switches (forged, replayed and redirected assertions, certificate expiry)
- **SAML inspector**: decode a captured SAMLResponse/SAMLRequest and check audience, recipient, validity window, signature and certificate thumbprint
- **SCIM lab**: an in-browser SCIM 2.0 server. Run Entra-style provisioning cycles (joiner, mover, leaver, unassign, rename, expired token) and inspect every request, or send your own in the console
- **RBAC lab**: fix business roles, remove SoD conflicts, watch privilege creep build up
- **Access review game**: 60 seconds, 12 lines, catch the risky ones

Plus a searchable glossary, a printable cheat sheet with interview questions, XP, levels and badges. Progress is stored in your browser only.

## OAuth playground setup

In Entra ID: **App registrations → New registration**, then add a redirect URI on the **Single-page application** platform:

- `https://redglover.github.io/iam-academy/` for the deployed site
- `http://localhost:5173/` for local development

Paste the client ID (and tenant ID) into the playground. No client secret is needed. Tokens are kept in memory only.

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
- `src/features/oauth/`, `src/features/saml/`: protocol simulators, PKCE/JWT helpers, SAML decoder
- `src/features/scim/server.ts`: in-memory SCIM 2.0 server (filters, PATCH, groups); `provisioning.ts`: Entra-style provisioning cycles

Course content lives in `src/data/` as typed data, so adding a module means adding an object to `modules.ts`.

## Deploy

Pushing to `main` runs `.github/workflows/deploy.yml`, which tests, builds and publishes to GitHub Pages. Enable it once under **Settings → Pages → Source: GitHub Actions**.
