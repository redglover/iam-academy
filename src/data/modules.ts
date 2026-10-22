import type { Module } from './types'
import { moduleMeta } from './moduleIndex'

const meta = (slug: string) => {
  const m = moduleMeta(slug)
  if (!m) throw new Error(`No module index entry for ${slug}`)
  return m
}

export const MODULES: Module[] = [
  {
    ...meta('fundamentals'),
    blocks: [
      {
        t: 'p',
        text: 'IAM answers one question, millions of times a day: **should this person (or machine) be able to do this thing, right now?** Getting that right is security. Getting it fast is productivity. Proving it afterwards is compliance. An IAM engineer builds the systems that do all three.',
      },
      { t: 'h', text: 'Identity is not the same as account' },
      {
        t: 'p',
        text: 'An **identity** is the person: Ingrid Haugen, employee E10421, Backend Developer in Engineering. An **account** is her representation in one system: `ingrid.haugen@fjordtech.no` in Entra ID, `ihaugen` in the ERP, a SCIM-provisioned user in GitHub. One identity typically owns 5–50 accounts. IAM keeps them all tied to the same identity, so when Ingrid leaves, every one of them goes.',
      },
      { t: 'diagram', id: 'lifecycle' },
      { t: 'h', text: 'AuthN, AuthZ and the A you forget' },
      {
        t: 'compare',
        items: [
          { title: 'Authentication (AuthN)', text: 'Who are you? Password, MFA, passkey, BankID. Proves the identity.', tone: 'key' },
          { title: 'Authorization (AuthZ)', text: 'What may you do? Groups, roles, policies. Decides access.', tone: 'join' },
          { title: 'Accounting / Audit', text: 'What did you do, and who allowed it? Logs and evidence. Proves it afterwards.', tone: 'auto' },
        ],
      },
      { t: 'h', text: 'The source of truth' },
      {
        t: 'p',
        text: 'Access should follow **facts about the person**: department, job title, manager, employment type, start date, end date. Those facts live in the HR system. That makes HR the *authoritative source*: IAM reads from it and never the other way round. If HR says Ingrid ended on Friday, IAM removes her access on Friday, whether or not anyone remembers to file a ticket.',
      },
      {
        t: 'callout',
        kind: 'field',
        title: 'In the field',
        text: 'Half of real-world IAM work is data quality. Missing managers, contractors who aren’t in HR at all, two employee IDs for one rehired person. Before you automate anything, find out how good the HR data is.',
      },
      { t: 'h', text: 'The IAM landscape in one table' },
      {
        t: 'table',
        head: ['Area', 'What it does', 'Typical tools'],
        rows: [
          ['Directory', 'Stores accounts and groups', 'Entra ID, Active Directory'],
          ['Access management (AM)', 'Sign-in, SSO, MFA, conditional access', 'Entra ID, Okta, ID-porten, BankID'],
          ['Identity governance (IGA)', 'Lifecycle (JML), roles, requests, access reviews', 'SailPoint, Omada, Saviynt, Entra ID Governance'],
          ['Privileged access (PAM)', 'Admin accounts, vaulting, just-in-time elevation', 'Entra PIM, CyberArk, Delinea'],
          ['Provisioning', 'Moves identity data between systems', 'SCIM, Graph API, connectors, Logic Apps'],
        ],
      },
    ],
    quiz: [
      {
        q: 'Ingrid has an Entra ID account, a GitHub account and an ERP user. How many identities does she have?',
        options: ['Three', 'One', 'It depends on the IGA tool', 'Zero until she signs in'],
        answer: 1,
        explain: 'One person, one identity. The three are accounts linked to that identity, which is why removing the identity can clean up all of them.',
      },
      {
        q: 'Which system should be authoritative for “Ingrid works in Finance from 1 March”?',
        options: ['Entra ID', 'The IT service desk', 'The HR system', 'Ingrid’s manager’s email'],
        answer: 2,
        explain: 'HR owns employment facts. IAM consumes them. If IAM had to be told separately, it would drift out of sync.',
      },
      {
        q: 'A user signs in with password + authenticator app. Which part of AAA is that?',
        options: ['Authorization', 'Authentication', 'Accounting', 'Attestation'],
        answer: 1,
        explain: 'Proving who you are is authentication. What you can do after signing in is authorization.',
      },
    ],
  },
  {
    ...meta('principles'),
    blocks: [
      {
        t: 'p',
        text: 'Tools change every few years. These principles don’t. In design meetings, audits and interviews, every IAM decision gets justified with one of them.',
      },
      { t: 'h', text: 'Least privilege' },
      {
        t: 'p',
        text: 'Give exactly the access needed for the job, for as long as it’s needed, and nothing more. Its sibling is **need-to-know**: even inside a system, you only see the data your task requires. Least privilege is easy to state and hard to keep, because access only grows unless something actively removes it.',
      },
      { t: 'h', text: 'Separation of duties (SoD)' },
      {
        t: 'p',
        text: 'No single person should control a sensitive process end to end. The person who **creates a supplier** must not also **approve payments** to suppliers. Otherwise fraud only needs one bad actor. IGA tools check SoD rules when access is requested and during reviews.',
      },
      { t: 'h', text: 'Zero trust' },
      {
        t: 'p',
        text: '“Never trust, always verify.” Being on the office network proves nothing. Every request is evaluated on identity, device health, location and risk, which in Entra ID is the job of **Conditional Access**. Identity becomes the new perimeter, which is why IAM teams have become central to security.',
      },
      { t: 'h', text: 'The two enemies' },
      {
        t: 'compare',
        items: [
          {
            title: 'Privilege creep',
            text: 'Ola moves from Sales to Finance to Engineering and keeps everything from every job. After five years he can do far more than anyone intended. Caused by movers who only ever get access added.',
            tone: 'move',
          },
          {
            title: 'Orphan accounts',
            text: 'Accounts with no active owner: leavers who were never cleaned up, test users, the SaaS app nobody connected to IAM. Attackers love them, because nobody notices when they are used.',
            tone: 'leave',
          },
        ],
      },
      {
        t: 'callout',
        kind: 'warn',
        title: 'Why this matters',
        text: 'Year after year, breach reports name stolen or abused credentials as a leading way in. Orphan accounts and excess privilege decide how bad the breach gets once someone is in.',
      },
      { t: 'h', text: 'Defense in depth and secure by default' },
      {
        t: 'list',
        items: [
          '**Defense in depth:** MFA *and* conditional access *and* least privilege *and* monitoring. Any single control will fail sometimes.',
          '**Secure by default:** new accounts start disabled, new groups start empty, new apps require assignment. Access is opt-in.',
          '**Accountability:** every account has an owner, every group has an owner, every privilege has a reason you can look up.',
        ],
      },
    ],
    quiz: [
      {
        q: 'Kari in Finance can both register supplier invoices and approve payments. Which principle is broken?',
        options: ['Zero trust', 'Separation of duties', 'Need-to-know', 'Secure by default'],
        answer: 1,
        explain: 'Registering and approving the same transaction removes the second pair of eyes. That’s a classic SoD conflict.',
      },
      {
        q: 'What mainly causes privilege creep?',
        options: ['Movers who get new access without losing old access', 'Leavers who aren’t disabled', 'Too many MFA prompts', 'Weak passwords'],
        answer: 0,
        explain: 'Creep comes from adding access at every job change and never removing any. Automated movers fix it by recalculating access from the new job.',
      },
      {
        q: 'An account still enabled six months after its owner left is called…',
        options: ['An orphan account', 'A service account', 'A break-glass account', 'A guest account'],
        answer: 0,
        explain: 'It has no living owner. Finding orphans is a standard reconciliation report in every IGA tool.',
      },
    ],
  },
  {
    ...meta('jml'),
    blocks: [
      {
        t: 'p',
        text: '**JML** describes the three moments in an employee’s life that change their access: they **join**, they **move** (new job, department, manager or location), and they **leave**. A good JML process makes all three automatic, driven by HR events, so access is right on day one and gone on the last day.',
      },
      { t: 'diagram', id: 'jml-flow' },
      { t: 'h', text: 'Joiner: productive on day one' },
      {
        t: 'timeline',
        items: [
          { when: 'Day −14', what: 'HR signs the contract and registers the worker with a start date. IGA picks it up within minutes.', tone: 'join' },
          { when: 'Day −14', what: 'Account created **disabled**, unique username generated, manager set, birthright groups and role-based access assigned.', tone: 'join' },
          { when: 'Day −1', what: 'Manager receives a welcome kit: username plus a Temporary Access Pass to hand over in person.', tone: 'auto' },
          { when: 'Day 1, 06:00', what: 'Account enabled automatically. The new hire registers MFA with the Temporary Access Pass and everything works.', tone: 'join' },
        ],
      },
      {
        t: 'list',
        items: [
          '**Birthright access**: what everyone of a given worker type gets with no request, such as an account, email, intranet and VPN.',
          '**Role-based access**: what the job implies. Department = Sales gives the `BR-Sales-Rep` role, which gives CRM access.',
          '**Requested access**: anything else goes through a request with approval (manager, then system owner) in the IGA portal.',
          '**Rehire check**: match on employee ID before creating anything. A returning employee should get their old identity back, not a duplicate.',
        ],
      },
      { t: 'h', text: 'Mover: the one everybody gets wrong' },
      {
        t: 'p',
        text: 'Joiners and leavers are visible: someone is waiting for a laptop, someone handed in a badge. Movers are quiet. Nobody complains about *too much* access. When the department attribute changes in HR, IGA should **recalculate** access from the new job: remove what the old role gave, add what the new role gives, and ask the new manager to confirm whatever is left (a *micro-certification*).',
      },
      {
        t: 'callout',
        kind: 'tip',
        title: 'Grace periods',
        text: 'A hard cut on the transfer date can break real work, because people often finish old tasks for a week or two. Mature setups keep old access for a defined grace period (e.g. 14 days), then remove it automatically. “Defined” and “automatically” are the important words.',
      },
      { t: 'h', text: 'Leaver: fast, ordered, reversible' },
      {
        t: 'timeline',
        items: [
          { when: 'Last day, 16:00', what: 'HR end date reached → IGA starts the leaver workflow. For hostile terminations, HR triggers it immediately.', tone: 'leave' },
          { when: '+1 min', what: '**Disable** the account, then **revoke all sessions**. In that order: lock the door, then remove the people inside.', tone: 'leave' },
          { when: '+5 min', what: 'Remove group memberships and roles. SCIM deactivates SaaS accounts. Mailbox is converted to shared and the manager gets access.', tone: 'leave' },
          { when: '+10 min', what: 'Licences returned. Manager notified to collect hardware. Everything logged.', tone: 'auto' },
          { when: 'Day +30', what: 'Account deleted per retention policy. Until then it can be restored if the termination was a mistake.', tone: 'leave' },
        ],
      },
      {
        t: 'callout',
        kind: 'field',
        title: 'Contractors and other edge cases',
        text: 'Contractors often aren’t in the HR system. Give them a sponsor (an internal owner) and a mandatory end date, and run the leaver automatically when it passes unless the sponsor extends it. The same goes for interns, board members and service accounts: everything needs an owner and an expiry.',
      },
      { t: 'h', text: 'Try it: the Fjordtech JML simulator' },
      {
        t: 'p',
        text: 'Pick a persona, fire HR events, and watch the access change. Run each event in **manual** mode first, then **automated**, and compare the findings panel. That’s the business case for IAM automation in one screen.',
      },
      { t: 'lab', lab: 'jml' },
    ],
    quiz: [
      {
        q: 'In a leaver workflow, which order is correct?',
        options: ['Revoke sessions → disable account', 'Remove licence → disable account', 'Delete account → revoke sessions', 'Disable account → revoke sessions'],
        answer: 3,
        explain: 'If you revoke first, the user can sign in again before the disable lands and get fresh tokens. Disable first, then revoke.',
      },
      {
        q: 'Why create joiner accounts disabled, two weeks early?',
        options: [
          'To save licence cost',
          'So HR can test the account',
          'Because Entra ID requires it',
          'So access is ready on day one, but the account can’t be misused before the start date',
        ],
        answer: 3,
        explain: 'Everything is prepared, groups, licences and app accounts, but nobody can sign in until the start date flips it on.',
      },
      {
        q: 'Ola moves from Sales to Finance. What should happen to his CRM access?',
        options: [
          'Keep it, he might need it',
          'Removed automatically (optionally after a short grace period) because no role for his new job grants it',
          'Removed at the next yearly access review',
          'Ola should file a ticket to remove it',
        ],
        answer: 1,
        explain: 'Access follows the job. Waiting for a yearly review means months of excess access, and asking Ola to remove his own access never happens in practice.',
      },
      {
        q: 'What is the safest way to match an HR record to an existing account?',
        options: ['Immutable employee ID', 'Email address', 'Display name', 'Manager + department'],
        answer: 0,
        explain: 'Names change (marriage, typos) and aren’t unique. An immutable employee ID is the anchor that ties every account to one identity.',
      },
    ],
  },
  {
    ...meta('access-models'),
    blocks: [
      {
        t: 'p',
        text: 'With 50 employees you can hand-pick access. With 5,000 you need a **model**: rules that turn facts about a person into access. The two main families are RBAC and ABAC, and most real organizations use a mix.',
      },
      {
        t: 'compare',
        items: [
          { title: 'RBAC: role-based', text: 'Access comes in bundles called roles. “Sales Rep” = CRM user + Sales Teams + price list. Easy to understand, easy to review. Risk: role explosion (hundreds of near-identical roles).', tone: 'move' },
          { title: 'ABAC: attribute-based', text: 'Access is computed from attributes: department = Sales AND country = NO AND employeeType = employee. Very flexible, fewer objects. Risk: harder to explain “why does she have this?”.', tone: 'auto' },
        ],
      },
      { t: 'h', text: 'Business roles vs. technical entitlements' },
      {
        t: 'p',
        text: 'A **technical entitlement** is something a system understands: AD group `SG-ERP-AP-Clerk`, Salesforce profile `Sales User`. A **business role** is something a manager understands: “Accounts Payable Specialist”. Business roles contain entitlements. Managers review roles, systems receive entitlements, and the IGA tool translates between the two.',
      },
      {
        t: 'code',
        lang: 'text',
        title: 'Entra ID dynamic group: ABAC in one line',
        code: '(user.department -eq "Sales") -and (user.userType -eq "Member") -and (user.accountEnabled -eq true)',
        notes: [
          'Membership updates itself when HR data changes. That’s the mover problem solved for this group.',
          'Assign apps and licences to the group, never to individual users.',
        ],
      },
      { t: 'h', text: 'Role mining' },
      {
        t: 'p',
        text: 'Where do roles come from? **Top-down**: interview the business about what each job needs. **Bottom-up**: analyze who has what today and look for clusters (“90 % of Finance has these 6 groups”). Real projects do both, and use the analysis to find outliers, people whose access looks nothing like their peers’.',
      },
      { t: 'h', text: 'Try it: build roles, then break them' },
      {
        t: 'p',
        text: 'Drag entitlements into roles, assign roles to people, and watch for **SoD conflicts** and **excess access**. Then press “simulate 3 years of manual moves” to watch privilege creep happen.',
      },
      { t: 'lab', lab: 'rbac' },
    ],
    quiz: [
      {
        q: 'Which statement best describes a business role?',
        options: [
          'An AD group',
          'A Conditional Access policy',
          'A bundle of entitlements named in business terms that managers can understand and review',
          'A service account',
        ],
        answer: 2,
        explain: 'Business roles bridge business language and technical entitlements.',
      },
      {
        q: 'Your RBAC model has 1,400 roles for 2,000 people. This is called…',
        options: ['Role explosion', 'Role mining', 'Least privilege', 'Attestation'],
        answer: 0,
        explain: 'When every slight difference becomes a new role, the model becomes as hard to manage as direct assignments. ABAC rules or role parameters can help.',
      },
    ],
  },
  {
    ...meta('automation'),
    blocks: [
      {
        t: 'p',
        text: 'Manual IAM means tickets, copy-pasting and forgotten steps. Automation means every JML event runs the **same tested workflow**, in minutes, with a log entry for every action. This is where IAM engineers spend most of their time: building and maintaining the plumbing.',
      },
      { t: 'diagram', id: 'automation-arch' },
      { t: 'h', text: 'Three integration patterns' },
      {
        t: 'table',
        head: ['Pattern', 'How it works', 'When to use'],
        rows: [
          ['Event-driven', 'HR sends a webhook or event when data changes. Automation reacts within seconds.', 'Leavers (speed matters), modern HR systems'],
          ['Scheduled sync', 'Every N minutes or hours, compare HR with the directory and fix differences.', 'Legacy systems, and as a safety net behind events'],
          ['Request-based', 'User asks in a portal, approvers approve, a connector provisions.', 'Anything not covered by roles'],
        ],
      },
      {
        t: 'callout',
        kind: 'tip',
        title: 'Desired state beats commands',
        text: 'The most robust automations don’t say “add Ingrid to group X”. They say “Ingrid *should* have X, Y and Z” and fix whatever differs. That way a failed run is repaired by the next one, and manual changes made outside IAM get detected and reverted.',
      },
      { t: 'h', text: 'SCIM: the standard language of provisioning' },
      {
        t: 'p',
        text: '**SCIM 2.0** (RFC 7643/7644) is a REST API every modern SaaS app can expose: `/Users` and `/Groups` with standard JSON. Entra ID’s provisioning service speaks SCIM, so connecting a new app is configuration instead of code.',
      },
      {
        t: 'code',
        lang: 'http',
        title: 'Joiner: create user in GitHub via SCIM',
        code: `POST /scim/v2/Users HTTP/1.1
Authorization: Bearer <token>
Content-Type: application/scim+json

{
  "schemas": ["urn:ietf:params:scim:schemas:core:2.0:User"],
  "externalId": "E10421",
  "userName": "ingrid.haugen@fjordtech.no",
  "name": { "givenName": "Ingrid", "familyName": "Haugen" },
  "emails": [{ "value": "ingrid.haugen@fjordtech.no", "primary": true }],
  "active": true
}`,
        notes: ['`externalId` carries the immutable employee ID, the anchor.', 'A leaver is the same resource with `PATCH … "active": false`.'],
      },
      { t: 'h', text: 'Microsoft Graph + PowerShell: the IAM engineer’s Swiss army knife' },
      {
        t: 'code',
        lang: 'powershell',
        title: 'Leaver runbook (Azure Automation / Function, managed identity)',
        code: `param([Parameter(Mandatory)][string]$EmployeeId)
$ErrorActionPreference = 'Stop'
Connect-MgGraph -Identity          # managed identity, no stored secrets

$user = Get-MgUser -Filter "employeeId eq '$EmployeeId'" \`
        -Property Id,UserPrincipalName,AccountEnabled
if (-not $user) { throw "No user with employeeId $EmployeeId" }
if (-not $user.AccountEnabled) { Write-Output 'Already disabled'; return }   # idempotent

Update-MgUser -UserId $user.Id -AccountEnabled:$false    # 1. lock the door
Revoke-MgUserSignInSession -UserId $user.Id              # 2. kill live tokens

Get-MgUserMemberOf -UserId $user.Id -All |               # 3. remove groups
  Where-Object { $_.AdditionalProperties['@odata.type'] -eq '#microsoft.graph.group' } |
  ForEach-Object { Remove-MgGroupMemberDirectoryObjectByRef -GroupId $_.Id -DirectoryObjectId $user.Id }

Write-Output (@{ action='leaver'; upn=$user.UserPrincipalName; at=(Get-Date -AsUTC) } | ConvertTo-Json)`,
        notes: [
          '`Connect-MgGraph -Identity`: the runbook authenticates as an Azure managed identity, so there is no password in the script.',
          'Idempotency check: running the script twice is safe.',
          'Group removal also triggers SCIM deprovisioning for apps assigned through those groups.',
          'In production: dynamic and role-assignable groups need different handling, and add retry on HTTP 429.',
        ],
      },
      { t: 'h', text: 'Low-code options' },
      {
        t: 'list',
        items: [
          '**Entra ID Lifecycle Workflows** (Entra ID Governance): built-in joiner/mover/leaver templates that run tasks such as generating a Temporary Access Pass, adding to groups, or disabling and removing licences, relative to the employee’s hire or leave date.',
          '**HR-driven / API-driven inbound provisioning**: Workday and SuccessFactors connectors, or post SCIM bulk requests from any HR system to create and update users in Entra ID and AD.',
          '**Logic Apps / Power Automate**: glue for approvals, Teams notifications and ServiceNow tickets for the systems that can’t be automated.',
          '**IGA connectors** (SailPoint, Omada): read and write to hundreds of target systems, with reconciliation built in.',
        ],
      },
      {
        t: 'callout',
        kind: 'field',
        title: 'Engineering hygiene for IAM automation',
        text: 'Treat runbooks like production code: version control, code review, a test tenant, **dry-run mode** that logs what *would* change, rate-limit handling, alerting on failures, and a kill switch. A bug in a leaver script can disable the whole company in a minute.',
      },
      { t: 'h', text: 'Try it: build a runbook and get it reviewed' },
      {
        t: 'p',
        text: 'Add blocks, put them in order, and the reviewer flags what a senior IAM engineer would. Watch out: a few blocks are traps. The right panel generates the PowerShell your pipeline turns into.',
      },
      { t: 'lab', lab: 'pipeline' },
    ],
    quiz: [
      {
        q: 'What does “idempotent” mean for a provisioning script?',
        options: ['Running it twice gives the same result as running it once', 'It runs fast', 'It needs no permissions', 'It runs on a schedule'],
        answer: 0,
        explain: 'Retries and re-runs happen constantly in automation. Idempotent steps make them harmless.',
      },
      {
        q: 'What is SCIM’s main job?',
        options: ['Single sign-on', 'MFA', 'Logging', 'Standardized user and group provisioning to applications'],
        answer: 3,
        explain: 'SCIM creates, updates and deactivates accounts. SSO (SAML/OIDC) is about signing in, which is a different job.',
      },
      {
        q: 'Best way for an Azure runbook to authenticate to Graph?',
        options: ['A managed identity with least-privilege Graph permissions', 'A client secret in a variable', 'Admin username and password in the script', 'The global admin’s session'],
        answer: 0,
        explain: 'Managed identities have no secret to leak or rotate. Grant only the Graph application permissions the runbook needs.',
      },
      {
        q: 'Why keep a scheduled sync even when you have event-driven provisioning?',
        options: ['It’s required by SCIM', 'Events are slower', 'As a safety net that repairs missed events and detects drift', 'For licensing reasons'],
        answer: 2,
        explain: 'Webhooks get lost and people make manual changes. A reconciliation run brings everything back to desired state.',
      },
    ],
  },
  {
    ...meta('oauth'),
    blocks: [
      {
        t: 'p',
        text: 'Every “Sign in with Microsoft” button, every SaaS app connected to Entra ID, and every automation script that calls Graph uses **OAuth 2.0**. As an IAM engineer you register these apps, choose their permissions, approve consent, troubleshoot sign-in errors, and clean up the ones nobody owns.',
      },
      { t: 'h', text: 'The idea: a key card, not your password' },
      {
        t: 'p',
        text: 'At a hotel you show ID once at the front desk and get a key card that opens *your room*, *until checkout*. OAuth works the same way: you prove who you are to the **authorization server** once, and the app receives a **token** that grants specific access for a limited time. The app never sees your password, and the token can be revoked without changing it.',
      },
      { t: 'diagram', id: 'oauth-roles' },
      {
        t: 'compare',
        items: [
          { title: 'OAuth 2.0: authorization', text: 'Gives an app an **access token** to call an API. Answers “what may this app do?”. On its own it says nothing reliable about who the user is.', tone: 'key' },
          { title: 'OpenID Connect: authentication', text: 'A layer on top of OAuth that adds the **ID token**: a signed statement of who signed in. Answers “who is this?”. Sign-in buttons are OIDC.', tone: 'join' },
        ],
      },
      { t: 'h', text: 'Three tokens, three jobs' },
      {
        t: 'table',
        head: ['Token', 'For whom', 'What it’s for', 'Lifetime (Entra)'],
        rows: [
          ['ID token', 'The app', 'Who signed in: name, `oid`, `tid`, `nonce`', '~1 hour'],
          ['Access token', 'The API', 'Calling the API. Carries `aud`, `scp` or `roles`', '60–90 min by default'],
          ['Refresh token', 'The authorization server', 'Getting new access tokens silently', '24 h for SPAs, up to 90 days otherwise'],
        ],
      },
      {
        t: 'p',
        text: 'Most of these are **JWTs**: three base64url parts, `header.payload.signature`. Anyone can decode them, so they are signed, not secret. The receiver checks the signature with the issuer’s public key (found via the `kid` header), then checks `iss`, `aud` and `exp`. In the playground you can decode your own.',
      },
      { t: 'h', text: 'Which flow when' },
      {
        t: 'table',
        head: ['Flow', 'Use it for', 'Notes'],
        rows: [
          ['Authorization code + PKCE', 'Any app where a user signs in: web, SPA, mobile, desktop', 'The default. PKCE for every client, even with a secret.'],
          ['Client credentials', 'Daemons, scheduled jobs, service-to-service. No user.', 'App permissions (`roles`), admin consent. Your JML runbooks use this.'],
          ['Device code', 'CLIs, TVs, devices without a browser', 'Popular with phishers. Block it with Conditional Access where it isn’t needed.'],
          ['On-behalf-of', 'An API calling another API as the user', 'Exchanges the incoming token for a new one.'],
          ['Implicit, password (ROPC)', 'Nothing new', 'Deprecated. Tokens in URLs, or the app handling passwords and skipping MFA.'],
        ],
      },
      { t: 'h', text: 'Authorization code + PKCE, step by step' },
      {
        t: 'timeline',
        items: [
          { when: '1. Prepare', what: 'The app creates random `state`, `nonce` and a **code verifier**, and hashes the verifier into a **code challenge**.', tone: 'key' },
          { when: '2. Authorize', what: 'The browser is sent to `/authorize` with client ID, redirect URI, scopes, state, nonce and the challenge.', tone: 'key' },
          { when: '3. Sign in', what: 'The user authenticates (MFA, Conditional Access) and consents to the scopes.', tone: 'join' },
          { when: '4. Callback', what: 'Entra redirects to the redirect URI with a short-lived, single-use **code** and the same state.', tone: 'key' },
          { when: '5. Redeem', what: 'The app POSTs code + **verifier** to `/token`. Entra checks that the verifier hashes to the challenge.', tone: 'auto' },
          { when: '6. Use', what: 'The app validates the ID token, then calls the API with `Authorization: Bearer <access token>`.', tone: 'join' },
        ],
      },
      {
        t: 'code',
        lang: 'http',
        title: 'Step 2: the authorize request',
        code: `GET https://login.microsoftonline.com/{tenant}/oauth2/v2.0/authorize
  ?client_id=6731de76-14a6-49ae-97bc-6eba6914391e
  &response_type=code
  &redirect_uri=https%3A%2F%2Fportal.fjordtech.no%2Fcallback
  &scope=openid%20profile%20User.Read
  &state=af0ifjsldkj
  &nonce=n-0S6_WzA2Mj
  &code_challenge=E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM
  &code_challenge_method=S256`,
        notes: ['`{tenant}`: your tenant ID, or `organizations` / `common` / `consumers` for multi-tenant apps.', 'Nothing here is secret. It travels through the address bar.'],
      },
      {
        t: 'code',
        lang: 'http',
        title: 'Step 5: redeeming the code',
        code: `POST https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token
Content-Type: application/x-www-form-urlencoded

client_id=6731de76-14a6-49ae-97bc-6eba6914391e
&grant_type=authorization_code
&code=0.AXkA3Lq…
&redirect_uri=https%3A%2F%2Fportal.fjordtech.no%2Fcallback
&code_verifier=dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk`,
        notes: ['A confidential client (a web server) would also send its credential here. An SPA can’t keep one, so PKCE is its protection.'],
      },
      { t: 'h', text: 'Try it: watch the flows, then attack them' },
      {
        t: 'p',
        text: 'Step through each flow message by message. Then pick an attack and toggle the defences to see which setting stops it.',
      },
      { t: 'lab', lab: 'oauth' },
      { t: 'h', text: 'Setting it up in Entra ID' },
      {
        t: 'compare',
        items: [
          { title: 'App registration', text: 'The *definition* of the app: client ID, redirect URIs, credentials, the permissions it asks for. Lives in the home tenant.', tone: 'key' },
          { title: 'Enterprise application', text: 'The *service principal*: the app’s instance in a tenant. Holds consents, user assignments, Conditional Access targeting and sign-in logs. This is what you govern.', tone: 'auto' },
        ],
      },
      {
        t: 'timeline',
        items: [
          { when: 'Register', what: 'Entra admin center → App registrations → New registration. Name it and choose the supported account types (single tenant unless you need more).', tone: 'key' },
          { when: 'Redirect URI', what: 'Pick the **platform**: *Web* (server apps, can hold a secret), *Single-page application* (browser code, PKCE, CORS on the token endpoint), or *Mobile & desktop*. The URI must match exactly.', tone: 'key' },
          { when: 'Permissions', what: '**Delegated** (`scp`) when acting as the signed-in user, **Application** (`roles`) for client credentials. Ask for the least you need.', tone: 'move' },
          { when: 'Consent', what: 'Users can consent to low-risk delegated permissions if policy allows. Application permissions and sensitive scopes need **admin consent**.', tone: 'move' },
          { when: 'Credentials', what: 'Only for confidential clients. Prefer **managed identity** or **federated credentials**, then **certificates**. Use client secrets only if you must, with short expiry.', tone: 'leave' },
          { when: 'Govern', what: 'Assign owners, require user assignment for sensitive apps, target them with Conditional Access, and include them in access reviews.', tone: 'auto' },
        ],
      },
      {
        t: 'callout',
        kind: 'tip',
        title: 'Do it for real',
        text: 'Open the [OAuth playground](#/oauth-playground): register an app in your own tenant, sign in with authorization code + PKCE, and read your own decoded ID token and access token.',
      },
      {
        t: 'code',
        lang: 'powershell',
        title: 'Client credentials with a certificate: the automation pattern',
        code: `# One-time: the app registration has the application permission User.ReadWrite.All (admin-consented)
# and a certificate uploaded under "Certificates & secrets". The private key stays on the runner.

Connect-MgGraph -ClientId '6731de76-14a6-49ae-97bc-6eba6914391e' \`
                -TenantId 'fjordtech.onmicrosoft.com' \`
                -CertificateThumbprint 'A1B2C3D4E5F60718293A4B5C6D7E8F9012345678'

(Get-MgContext).Scopes        # → User.ReadWrite.All  (these are app "roles", not delegated scopes)
Update-MgUser -UserId 'kari.lunde@fjordtech.no' -AccountEnabled:$false`,
        notes: ['Under the hood: a JWT signed with the private key is sent as `client_assertion` to `/token` with `grant_type=client_credentials` and `scope=https://graph.microsoft.com/.default`.', 'Running in Azure? Skip the certificate and use `Connect-MgGraph -Identity` with a managed identity.'],
      },
      { t: 'h', text: 'Security checklist' },
      {
        t: 'list',
        items: [
          '**state** on every authorize request, checked on the callback (stops login CSRF).',
          '**PKCE** for every client (stops stolen authorization codes being redeemed).',
          '**nonce** checked inside the ID token (stops replayed ID tokens).',
          'Validate ID tokens properly: signature, `iss`, `aud`, `exp`. Never trust a token just because it decodes.',
          'Keep tokens in memory in SPAs, not localStorage, where any injected script can read them.',
          'A **Content Security Policy** that only allows your own scripts and only lets the page call Entra ID and the APIs it needs.',
          'Exact redirect URIs. No wildcards, no open redirects.',
          'Least privilege: `User.Read`, not `Directory.ReadWrite.All`, because you can.',
        ],
      },
      {
        t: 'code',
        lang: 'html',
        title: 'The Content Security Policy this site ships with',
        code: `<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'sha256-Q5hTi/iNi+0bgIewmEVEtnaBTY6eunZWV1Ja2ex2K6k=';
  connect-src 'self' https://login.microsoftonline.com https://graph.microsoft.com;
  object-src 'none'; base-uri 'self'; form-action 'none'; …">`,
        notes: [
          '`script-src` runs only scripts from this site plus one inline script, pinned by its SHA-256 hash. An injected `<script>` or `onclick=` is refused.',
          '`connect-src` is the token guard: even if a script does get in, the browser won’t let it send a stolen token anywhere except Entra ID and Graph.',
          'GitHub Pages can’t set response headers, so this one is a `<meta>` tag. A real header is better where you have one: it also supports `frame-ancestors` (clickjacking) and `report-to`.',
          'Redirecting to the sign-in page is a navigation, not a request, so `connect-src` doesn’t affect it. Only the token and Graph calls are fetches.',
        ],
      },
      {
        t: 'callout',
        kind: 'warn',
        title: 'Consent phishing: an IAM problem, not just a developer one',
        text: 'Attackers register a legit-looking multi-tenant app (“Fjordtech Docs Viewer”) that asks for `Mail.Read` and `offline_access`, then email a sign-in link. One click on *Accept* gives them persistent mailbox access, MFA included, no password stolen. Defences: restrict user consent to verified publishers and low-risk permissions, enable the **admin consent workflow**, and regularly review enterprise apps and their granted permissions.',
      },
    ],
    quiz: [
      {
        q: 'Which token should an app send to Microsoft Graph?',
        options: ['The ID token', 'The access token', 'The refresh token', 'The authorization code'],
        answer: 1,
        explain: 'Access tokens are for APIs. The ID token is for the app itself and must never be sent to APIs as a credential.',
      },
      {
        q: 'An attacker steals an authorization code from a mobile app’s redirect. What stops them redeeming it?',
        options: ['The state parameter', 'PKCE', 'The nonce', 'HTTPS'],
        answer: 1,
        explain: 'Only the app that created the code verifier can redeem the code. State protects the callback against CSRF, and nonce protects the ID token against replay.',
      },
      {
        q: 'Your nightly leaver runbook needs to disable users in Entra ID. Which setup is best?',
        options: [
          'Authorization code flow with the IAM admin’s account',
          'Client credentials with a client secret in the script',
          'Device code flow every night',
          'Client credentials with a managed identity or certificate and the minimum application permission',
        ],
        answer: 3,
        explain: 'No user is involved, so it’s client credentials. Avoid secrets that can leak, and grant only what the job needs.',
      },
      {
        q: 'The sign-in page shows AADSTS50011. What’s wrong?',
        options: ['The user has no licence', 'MFA failed', 'The redirect URI in the request doesn’t match the app registration', 'The token expired'],
        answer: 2,
        explain: 'Redirect URIs must match exactly, trailing slash included. It’s the most common setup error.',
      },
      {
        q: 'In an access token, what is the difference between `scp` and `roles`?',
        options: [
          'No difference',
          '`scp` is for v1 tokens only',
          '`scp` = delegated permissions for a signed-in user; `roles` = app roles, including application permissions in client credentials',
          '`roles` lists the user’s Entra admin roles',
        ],
        answer: 2,
        explain: 'Delegated permissions appear as scopes. Application permissions, and app roles assigned to users, appear as roles.',
      },
    ],
  },
  {
    ...meta('saml'),
    blocks: [
      {
        t: 'p',
        text: '**SAML 2.0** (Security Assertion Markup Language) is how most enterprise SaaS apps do single sign-on: Salesforce, ServiceNow, Workday, AWS, Atlassian and thousands more. It is from 2005 and uses XML, but it isn’t going away. In a typical IAM team a large share of the “can you set up SSO for app X?” tickets are SAML.',
      },
      { t: 'h', text: 'Two parties and a signed note' },
      {
        t: 'compare',
        items: [
          { title: 'Identity provider (IdP)', text: 'Authenticates the user and issues a signed **assertion**. In our case Entra ID. Holds the private signing key.', tone: 'key' },
          { title: 'Service provider (SP)', text: 'The app. Trusts the IdP, receives the assertion, checks it, and creates its own session. Holds the IdP’s public certificate.', tone: 'auto' },
        ],
      },
      {
        t: 'p',
        text: 'The assertion is like a signed note from HR to a building guard: “The bearer is Ingrid Haugen, she works in Sales, valid for the next 5 minutes, for the Salesforce building only. Signed, Entra.” The guard doesn’t call HR. They check the signature, the name of the building and the time. The two systems never talk directly: everything travels **through the browser**.',
      },
      { t: 'h', text: 'The words you need' },
      {
        t: 'table',
        head: ['Term', 'Meaning', 'Name in Entra'],
        rows: [
          ['Entity ID', 'Unique name of the SP (or IdP), usually a URL', 'Identifier'],
          ['ACS URL', 'Assertion Consumer Service: where the SP receives assertions', 'Reply URL'],
          ['AuthnRequest', 'The SP’s “please authenticate this user” message', '–'],
          ['Assertion', 'The signed XML statement about the user', '–'],
          ['NameID', 'The user identifier the SP matches on', 'Unique User Identifier (Name ID)'],
          ['Attributes', 'Extra claims: email, name, groups, roles', 'Attributes & Claims'],
          ['RelayState', 'Where to send the user after sign-in', 'Relay State'],
          ['Metadata', 'XML file describing an IdP or SP: entity ID, endpoints, certificates', 'Federation Metadata XML'],
          ['Bindings', 'How messages travel: HTTP-Redirect (in the URL) or HTTP-POST (in a form)', '–'],
        ],
      },
      { t: 'h', text: 'What’s inside an assertion' },
      {
        t: 'code',
        lang: 'xml',
        title: 'The parts an SP must check (simplified)',
        code: `<Assertion ID="_a1b2c3d4" IssueInstant="2026-10-19T08:00:00Z">
  <Issuer>https://sts.windows.net/{tenant-id}/</Issuer>          <!-- who says so -->
  <ds:Signature>…</ds:Signature>                                 <!-- proof Entra wrote it -->
  <Subject>
    <NameID>ingrid.haugen@fjordtech.no</NameID>                  <!-- who the user is -->
    <SubjectConfirmationData Recipient="https://…/saml/acs"     <!-- where it may be used -->
        NotOnOrAfter="2026-10-19T08:05:00Z"
        InResponseTo="_c7f2e9a1"/>                               <!-- which request it answers -->
  </Subject>
  <Conditions NotBefore="…07:55:00Z" NotOnOrAfter="…09:00:00Z">  <!-- when it is valid -->
    <AudienceRestriction>
      <Audience>https://fjordtech.my.salesforce.com</Audience>   <!-- which app it is for -->
    </AudienceRestriction>
  </Conditions>
  <AttributeStatement>…email, displayname, groups…</AttributeStatement>
  <AuthnStatement SessionIndex="_a1b2c3d4">…</AuthnStatement>    <!-- how and when they signed in -->
</Assertion>`,
        notes: ['Base64 is encoding, not encryption: anyone holding the browser can read an assertion. Entra can additionally encrypt it with the SP’s certificate.'],
      },
      { t: 'h', text: 'Try it: watch the flow, then break it' },
      {
        t: 'p',
        text: 'Step through SP-initiated and IdP-initiated sign-in. Then pick a scenario and switch off the SP’s checks one by one to see what each one protects against.',
      },
      { t: 'lab', lab: 'saml' },
      { t: 'h', text: 'SAML vs OpenID Connect' },
      {
        t: 'table',
        head: ['', 'SAML 2.0', 'OpenID Connect'],
        rows: [
          ['Format', 'XML assertions, XML signatures', 'JSON / JWT tokens'],
          ['Transport', 'Browser redirects and form POSTs', 'Redirects plus back-channel HTTPS calls'],
          ['Best for', 'Enterprise SaaS web apps, legacy apps', 'Modern web, SPA, mobile and API access'],
          ['API access', 'No. It only signs you in to the app', 'Yes, through OAuth access tokens'],
          ['Mobile / native apps', 'Awkward', 'Designed for it'],
          ['In practice', 'Use it when the app only supports SAML', 'Prefer it for anything new you build'],
        ],
      },
      { t: 'h', text: 'Setting up SAML SSO in Entra ID' },
      {
        t: 'timeline',
        items: [
          { when: 'Add the app', what: 'Entra admin center → Enterprise applications → New application. Use the **gallery** entry if there is one (pre-filled, often with SCIM). Otherwise “Create your own application” → non-gallery.', tone: 'key' },
          { when: 'Basic SAML config', what: 'Single sign-on → SAML. Enter the **Identifier (Entity ID)** and **Reply URL (ACS)** from the app’s SAML settings, or upload the SP’s metadata file. Sign-on URL is only needed for SP-initiated sign-in from My Apps.', tone: 'key' },
          { when: 'Claims', what: 'Attributes & Claims: choose the **Unique User Identifier** the app matches on (UPN, email or an immutable ID) and add what the app needs: name, email, groups or app roles.', tone: 'move' },
          { when: 'Certificate', what: 'SAML Certificates: download the certificate (Base64) or the **Federation Metadata URL** and give it to the SP. Note the expiry date (3 years by default) and add notification emails.', tone: 'leave' },
          { when: 'SP side', what: 'In the app: paste Entra’s **Login URL**, **Microsoft Entra Identifier** (IdP Entity ID) and certificate. Map the NameID to the app’s user field (e.g. Salesforce Federation ID).', tone: 'auto' },
          { when: 'Assign and test', what: 'Users and groups: assign who may use the app (set “Assignment required” to Yes). Use **Test single sign-on**, then enforce SSO in the app and keep one break-glass local admin.', tone: 'join' },
        ],
      },
      {
        t: 'callout',
        kind: 'field',
        title: 'Certificate expiry is the classic SAML outage',
        text: 'Entra’s SAML signing certificates expire, 3 years by default. When one does, every sign-in to that app fails. Good practice: notification emails to a shared IAM mailbox, an inventory of SAML apps and their expiry dates (Graph can list `keyCredentials` on service principals), and planned rotation: create the new certificate, give it to the SP, then activate it in Entra.',
      },
      { t: 'h', text: 'Troubleshooting cheat sheet' },
      {
        t: 'table',
        head: ['Symptom', 'Usual cause', 'Fix'],
        rows: [
          ['AADSTS50011', 'The ACS URL in the request isn’t a registered Reply URL', 'Add the exact URL under Basic SAML Configuration'],
          ['AADSTS700016', 'No app with that Entity ID in the tenant', 'Make the Identifier in Entra match the SP’s Issuer exactly'],
          ['AADSTS50105', 'User isn’t assigned to the app', 'Assign the user or their group'],
          ['AADSTS75011', 'SP demands an authentication method the user didn’t use', 'Remove the RequestedAuthnContext in the SP, or align it'],
          ['SP: “invalid signature”', 'Certificate on the SP is old or wrong', 'Upload the current certificate, compare thumbprints'],
          ['SP: “assertion expired / not yet valid”', 'Clock skew between servers', 'Fix NTP on the SP, or allow a few minutes of skew'],
          ['SP: “user not found”', 'NameID doesn’t match the SP’s user field', 'Align the claim (UPN vs email vs employee ID)'],
        ],
      },
      {
        t: 'callout',
        kind: 'tip',
        title: 'Read real assertions',
        text: 'Install the **SAML-tracer** browser extension, sign in to a SAML app, and paste the SAMLResponse into the inspector below. It shows exactly what Entra sent: the NameID, attributes, audience, validity window and certificate thumbprint. This is the first thing to do when SSO breaks.',
      },
      { t: 'lab', lab: 'saml-inspector' },
      { t: 'h', text: 'SAML and the leaver problem' },
      {
        t: 'p',
        text: 'SAML signs people **in**. It never signs anyone **out of existence**. When Ingrid leaves and her Entra account is disabled, she can’t start new sessions, but:',
      },
      {
        t: 'list',
        items: [
          'Her **existing SP session** keeps working until it times out, sometimes for days. Short app session lifetimes or an admin session kill are needed for sensitive apps.',
          'Her **account in the app still exists**, with its data and any local password or API token. Deprovisioning needs **SCIM** or a connector, not SAML.',
          'Apps that create users on first sign-in (**JIT provisioning**) never remove them. Run reconciliation against the app’s user list.',
          'Single Logout (SLO) exists in the standard but is unreliable in practice. Don’t rely on it as a security control.',
        ],
      },
      {
        t: 'callout',
        kind: 'warn',
        title: 'Security essentials for SPs',
        text: 'Validate the signature on the assertion that is actually used (XML signature wrapping attacks hide a forged assertion next to a signed one). Check **Audience**, **Recipient**, time window and **InResponseTo**. Accept each assertion once. Disable IdP-initiated sign-in if the app doesn’t need it, and use well-maintained SAML libraries, never hand-written XML parsing.',
      },
    ],
    quiz: [
      {
        q: 'In SAML, which party holds the private key that signs assertions?',
        options: ['The service provider', 'Both share one key', 'The browser', 'The identity provider'],
        answer: 3,
        explain: 'The IdP signs with its private key. The SP verifies with the IdP’s public certificate, which is why the SP needs the certificate and why its expiry matters.',
      },
      {
        q: 'What does Entra call the SP’s Assertion Consumer Service URL?',
        options: ['Identifier', 'Reply URL', 'Sign-on URL', 'Logout URL'],
        answer: 1,
        explain: 'Reply URL = ACS. Identifier = the SP’s Entity ID. A mismatch in the Reply URL gives AADSTS50011.',
      },
      {
        q: 'A forwarded assertion for “Fjordtech Lunch” is accepted by Salesforce. Which check is missing?',
        options: ['Signature', 'Audience', 'NameID format', 'RelayState'],
        answer: 1,
        explain: 'The signature is valid because Entra really signed it, but the audience names a different app. The SP must reject it.',
      },
      {
        q: 'Monday 08:00: nobody can sign in to ServiceNow via SSO. Entra sign-in logs show success. What do you check first?',
        options: ['The users’ licences', 'The DNS of Entra ID', 'Conditional Access', 'Whether the SAML signing certificate expired or was rotated without updating ServiceNow'],
        answer: 3,
        explain: 'Entra issued the assertion fine, so the SP is rejecting it. A certificate mismatch is the classic cause.',
      },
      {
        q: 'Ingrid left yesterday and her Entra account is disabled. Why might she still have access to a SAML app?',
        options: [
          'SAML tokens never expire',
          'She can’t: disabling the account ends all SAML access instantly',
          'Entra caches passwords for SAML apps',
          'Her existing app session is still valid and her app account wasn’t deprovisioned',
        ],
        answer: 3,
        explain: 'SAML only controls new sign-ins. Session lifetime in the app and deprovisioning (SCIM) are separate problems the leaver process must handle.',
      },
    ],
  },
  {
    ...meta('scim'),
    blocks: [
      {
        t: 'p',
        text: 'SSO (SAML or OIDC) decides how people **sign in** to an app. It doesn’t create their account there, update it when they change jobs, or remove it when they leave. That’s **provisioning**, and **SCIM 2.0** (System for Cross-domain Identity Management) is the standard way to do it. In JML terms: SSO is the door, SCIM is the list of people who have a key.',
      },
      {
        t: 'compare',
        items: [
          { title: 'Without SCIM', text: 'Accounts appear on first sign-in (JIT) or are created by hand. Nobody removes them. Leavers keep app accounts, API tokens and data. Department changes never reach the app.', tone: 'leave' },
          { title: 'With SCIM', text: 'Entra pushes changes within about 40 minutes: create on assignment, update on mover, deactivate on leaver or unassignment. One place to manage it, with logs for every change.', tone: 'join' },
        ],
      },
      { t: 'h', text: 'Two RFCs, one REST API' },
      {
        t: 'p',
        text: '**RFC 7643** defines the *schema*: what a User and a Group look like in JSON. **RFC 7644** defines the *protocol*: REST endpoints, filtering, PATCH and errors. The identity system is the **client** and the app is the **service provider**, which exposes the SCIM endpoint. Note the direction: the IdP calls the app.',
      },
      {
        t: 'table',
        head: ['Request', 'Does', 'Used for'],
        rows: [
          ['`GET /ServiceProviderConfig`', 'What the app supports: PATCH, filtering, bulk, auth', 'Discovery'],
          ['`GET /Users?filter=userName eq "…"`', 'Find a user by the matching attribute', 'Matching before create'],
          ['`POST /Users`', 'Create a user', 'Joiner'],
          ['`PATCH /Users/{id}`', 'Change specific attributes', 'Mover, leaver (`active: false`)'],
          ['`PUT /Users/{id}`', 'Replace the whole user', 'Rare. PATCH is preferred'],
          ['`DELETE /Users/{id}`', 'Delete the user', 'Hard delete, after retention'],
          ['`POST /Groups`, `PATCH /Groups/{id}`', 'Create groups, add or remove members', 'Group push, app roles'],
        ],
      },
      {
        t: 'code',
        lang: 'json',
        title: 'A SCIM user with the enterprise extension',
        code: `{
  "schemas": ["urn:ietf:params:scim:schemas:core:2.0:User",
              "urn:ietf:params:scim:schemas:extension:enterprise:2.0:User"],
  "id": "u-0001",                          // assigned by the app
  "externalId": "ingrid.haugen",           // assigned by the IdP
  "userName": "ingrid.haugen@fjordtech.no",
  "active": true,
  "name": { "givenName": "Ingrid", "familyName": "Haugen" },
  "displayName": "Ingrid Haugen",
  "emails": [{ "type": "work", "primary": true, "value": "ingrid.haugen@fjordtech.no" }],
  "title": "Account Executive",
  "urn:ietf:params:scim:schemas:extension:enterprise:2.0:User": {
    "employeeNumber": "E10421",
    "department": "Sales",
    "manager": { "value": "u-0002" }
  },
  "meta": { "resourceType": "User", "created": "2026-10-19T08:00:00Z", "location": ".../Users/u-0001" }
}`,
        notes: ['`id` belongs to the app, `externalId` to the client. Both sides can find the record again.', 'Multi-valued attributes like `emails` are arrays of objects with a `type`, which is why PATCH paths look like `emails[type eq "work"].value`.'],
      },
      { t: 'h', text: 'PATCH: how changes travel' },
      {
        t: 'code',
        lang: 'http',
        title: 'Mover and leaver in one request each',
        code: `PATCH /scim/v2/Users/u-0001
Content-Type: application/scim+json

{ "schemas": ["urn:ietf:params:scim:api:messages:2.0:PatchOp"],
  "Operations": [
    { "op": "replace", "path": "title", "value": "Financial Controller" },
    { "op": "replace", "path": "urn:ietf:params:scim:schemas:extension:enterprise:2.0:User:department", "value": "Finance" }
  ] }

PATCH /scim/v2/Users/u-0001
{ "schemas": ["urn:ietf:params:scim:api:messages:2.0:PatchOp"],
  "Operations": [ { "op": "replace", "path": "active", "value": false } ] }`,
        notes: ['Ops are `add`, `replace` and `remove`. A leaver is usually a **soft delete** (`active: false`): the account is blocked but its data and audit history remain.'],
      },
      { t: 'h', text: 'Try it: run Fjordtech’s provisioning' },
      {
        t: 'p',
        text: 'Run an initial cycle, then make JML changes on the Entra side: transfer Ingrid, disable Kari, hire Ola, unassign someone, rename Kari. Run incremental cycles and open the log to see every SCIM request and response. Then switch to the console and send your own requests to the same server.',
      },
      { t: 'lab', lab: 'scim' },
      { t: 'h', text: 'How the Entra provisioning service works' },
      {
        t: 'timeline',
        items: [
          { when: 'Initial cycle', what: 'Reads every user and group in scope, finds each in the app by the **matching attribute** (default: `userName` ← UPN), and creates or updates. Can take hours in big tenants.', tone: 'join' },
          { when: 'Incremental', what: 'About every **40 minutes**, processes only what changed since the last watermark. Unchanged users generate no traffic.', tone: 'join' },
          { when: 'Scoping', what: '“Sync only assigned users and groups” (the default) plus optional **scoping filters** such as `department EQUALS Sales`. Leaving scope = soft delete in the app.', tone: 'move' },
          { when: 'Mappings', what: '**Attribute mappings** decide which Entra attribute fills which SCIM attribute, with expressions like `Switch()`, `Join()` or `NormalizeDiacritics()` for æøå.', tone: 'move' },
          { when: 'Failures', what: 'Per-user errors show in the **provisioning logs**. If most requests fail (wrong token, app down), the job goes into **quarantine** and retries less often until fixed.', tone: 'leave' },
          { when: 'On demand', what: '**Provision on demand** runs one user immediately and shows each step. Your best debugging tool.', tone: 'auto' },
        ],
      },
      {
        t: 'timeline',
        items: [
          { when: '1. Add the app', what: 'Enterprise applications → the app from the gallery (many have SCIM pre-built) or your own non-gallery app.', tone: 'key' },
          { when: '2. Connect', what: 'Provisioning → Mode: **Automatic**. Enter the **Tenant URL** (the app’s SCIM base URL) and **Secret Token** from the app’s admin settings. Click **Test Connection**.', tone: 'key' },
          { when: '3. Map', what: 'Review attribute mappings: confirm the matching attribute, remove what the app doesn’t support, add what it needs (department, employee number, manager).', tone: 'move' },
          { when: '4. Scope', what: 'Assign users or groups, or add scoping filters. Start with a small pilot group.', tone: 'move' },
          { when: '5. Test, then start', what: 'Use Provision on demand for one user, check the app, then set Provisioning Status **On**. Watch the provisioning logs and set up a notification email for failures.', tone: 'join' },
        ],
      },
      {
        t: 'callout',
        kind: 'warn',
        title: 'The matching attribute decides whether you get duplicates',
        text: 'If the app already has users (created by hand or by JIT) and the matching values don’t line up, for example the app uses email and Entra sends UPN, the first cycle creates **duplicates** instead of linking. Before switching on, export the app’s users and check that the matching attribute matches 1:1. Prefer immutable values like an employee ID over names.',
      },
      { t: 'h', text: 'SCIM the other way: from HR into Entra' },
      {
        t: 'p',
        text: 'SCIM is not only outbound. Entra’s **API-driven inbound provisioning** accepts SCIM bulk requests (`POST /bulkUpload`) from any HR system or script, and creates and updates users in Entra ID and on-premises AD. That is how the joiner in the JML module can start from HR without a special connector: the HR export is turned into SCIM, Entra creates the user, and outbound SCIM provisions the apps. One standard, end to end.',
      },
      { t: 'h', text: 'Troubleshooting cheat sheet' },
      {
        t: 'table',
        head: ['Symptom', 'Likely cause', 'Fix'],
        rows: [
          ['Test Connection fails / 401', 'Wrong Tenant URL or expired secret token', 'Generate a new token in the app, check the URL ends in `/scim/v2` (or as documented)'],
          ['Job in quarantine', 'Most requests failing for a long time', 'Fix the cause, then restart provisioning (clear state if needed)'],
          ['409 Conflict on create', 'User exists in the app but didn’t match', 'Align the matching attribute, or fix the existing user’s value'],
          ['Duplicates in the app', 'Matching attribute differs between systems', 'Clean up duplicates, change the matching attribute, restart'],
          ['400 invalid attribute', 'Mapping sends something the app doesn’t support', 'Remove or fix the mapping. Check the app’s schema'],
          ['User skipped', 'Not in scope: not assigned, or excluded by a scoping filter', 'Check assignment and scoping. Provision on demand shows why'],
          ['Leaver still active in the app', 'App ignores `active: false`, or provisioning is paused', 'Verify in the provisioning logs, test the app’s behaviour, add monitoring'],
        ],
      },
      {
        t: 'code',
        lang: 'powershell',
        title: 'Test an app’s SCIM endpoint yourself',
        code: `$base    = 'https://fjordtech.my.salesforce.com/scim/v2'
$headers = @{ Authorization = "Bearer $env:SCIM_TOKEN" }   # never hard-code the token

Invoke-RestMethod "$base/ServiceProviderConfig" -Headers $headers
Invoke-RestMethod "$base/Users?filter=userName eq \`"ingrid.haugen@fjordtech.no\`"" -Headers $headers

$body = @{ schemas = @('urn:ietf:params:scim:api:messages:2.0:PatchOp')
           Operations = @(@{ op = 'replace'; path = 'active'; value = $false }) } | ConvertTo-Json -Depth 5
Invoke-RestMethod "$base/Users/u-0001" -Method Patch -Headers $headers -Body $body -ContentType 'application/scim+json'`,
        notes: ['Microsoft also publishes a SCIM validator that runs the same requests Entra will send against your endpoint. Use it before connecting a custom app.'],
      },
      {
        t: 'callout',
        kind: 'field',
        title: 'Things to ask before you connect an app',
        text: 'Does the app support SCIM, and on which licence tier (it’s often “Enterprise only”)? What does it do on `active: false`: block sign-in, free the licence, delete data? Does it support Groups? What’s its matching field? Is the token long-lived, and who rotates it? The answers decide whether your leaver process actually works.',
      },
    ],
    quiz: [
      {
        q: 'In SCIM, who calls whom?',
        options: ['The app calls Entra to fetch users', 'The browser posts users to the app', 'Entra (the client) calls the app’s SCIM endpoint (the service provider)', 'HR calls the app directly'],
        answer: 2,
        explain: 'The identity system pushes changes to the app’s SCIM API. That’s why you configure a Tenant URL and a token from the app in Entra.',
      },
      {
        q: 'How does Entra normally handle a leaver in a SCIM app?',
        options: ['DELETE /Users/{id} immediately', 'It emails the app owner', 'Nothing, SSO handles it', 'PATCH with active = false (soft delete)'],
        answer: 3,
        explain: 'Soft delete blocks the account while keeping data and history. Hard deletion can follow later, according to the app’s retention policy.',
      },
      {
        q: 'You turn on provisioning for an app that already has 500 users, and get 500 duplicates. Why?',
        options: ['The token expired', 'The matching attribute values didn’t line up, so Entra created new users instead of linking', 'Incremental cycles are too fast', 'The app doesn’t support PATCH'],
        answer: 1,
        explain: 'Before the first cycle, check that the matching attribute (e.g. userName = UPN) matches the existing users in the app.',
      },
      {
        q: 'Ingrid moves from Sales to Finance. What does SCIM send?',
        options: ['PATCH /Users/{id} replacing department (and title)', 'POST /Users with a new account', 'DELETE then POST', 'Nothing until the next access review'],
        answer: 0,
        explain: 'Changes are PATCHed onto the existing account. The app can then adjust her roles based on the new department.',
      },
      {
        q: 'What does an incremental provisioning cycle process?',
        options: ['Only objects that changed since the last cycle', 'Every user in the tenant', 'Only new users', 'Only groups'],
        answer: 0,
        explain: 'Incremental cycles use a watermark, so unchanged users produce no SCIM traffic. That is why they can run every ~40 minutes.',
      },
    ],
  },
  {
    ...meta('governance'),
    blocks: [
      {
        t: 'p',
        text: 'Even with perfect JML, access drifts: exceptions get granted, projects end, roles get too broad. **Identity governance** is the recurring check that access is still appropriate, plus the evidence that you checked.',
      },
      { t: 'h', text: 'Access reviews (certifications)' },
      {
        t: 'p',
        text: 'Periodically, a reviewer, usually the manager or the system owner, sees a list of who has what and decides **keep** or **revoke** for each item. Revocations should be carried out automatically. Typical cadence: quarterly for privileged and sensitive access, yearly for everything else.',
      },
      {
        t: 'callout',
        kind: 'warn',
        title: 'Rubber-stamping',
        text: 'Managers facing 400 lines will click “approve all”. Fight it with smaller reviews, highlighting what is *unusual* (peer outliers, unused for 90 days, high risk), and pre-recommendations from the IGA tool. A review is only worth something if the reviewer can actually make the decision.',
      },
      { t: 'h', text: 'Try it: you’re the reviewer' },
      { t: 'p', text: 'Twelve access lines and sixty seconds. Revoke what shouldn’t be there. You score for catching risk and lose points for revoking legitimate access.' },
      { t: 'lab', lab: 'review' },
      { t: 'h', text: 'KPIs that matter' },
      {
        t: 'table',
        head: ['Metric', 'Good looks like'],
        rows: [
          ['Time to provision (joiner)', 'Ready before day one, 100 %'],
          ['Time to deprovision (leaver)', 'Under 1 hour from HR end date'],
          ['Orphan accounts', 'Zero, reconciled weekly'],
          ['Access review completion', '> 95 % on time, with real revocations'],
          ['% access via roles vs. direct grants', 'Rising over time'],
          ['SoD violations', 'Zero unmitigated'],
        ],
      },
    ],
    quiz: [
      {
        q: 'A manager approves all 400 lines in an access review in 2 minutes. What’s the best fix?',
        options: ['Fire the manager', 'Remove all access instead', 'Review more often', 'Smaller, risk-focused reviews with recommendations'],
        answer: 3,
        explain: 'Make good decisions easy: show what matters, not everything.',
      },
      {
        q: 'Which access should be reviewed most often?',
        options: ['Email', 'Intranet', 'Privileged and sensitive access', 'Printer access'],
        answer: 2,
        explain: 'Review frequency should match risk.',
      },
    ],
  },
  {
    ...meta('ca'),
    blocks: [
      {
        t: 'p',
        text: '**Conditional Access (CA)** is Entra ID’s if-then engine: *if* this user, on this device, from here, to this app, at this risk level, *then* block, or allow after MFA or a device check. It is how Zero Trust becomes concrete: no request is trusted because it comes from the office network. In most Microsoft shops, the CA policy set is one of the most important things the IAM team owns.',
      },
      { t: 'diagram', id: 'ca-engine' },
      { t: 'h', text: 'Anatomy of a policy' },
      {
        t: 'table',
        head: ['Part', 'What you set', 'Examples'],
        rows: [
          ['Users', 'Include and exclude users, groups, directory roles, guests, workload identities', 'All users except break-glass; Admin roles; Guests'],
          ['Target resources', 'Cloud apps, user actions, or authentication contexts', 'All apps; Visma ERP; “Register security information”'],
          ['Conditions', 'User risk, sign-in risk, device platforms, locations, client apps, filter for devices, authentication flows', 'Legacy clients; iOS/Android; outside trusted locations; high risk'],
          ['Grant controls', 'Block, or grant requiring one or all of the selected controls', 'MFA, authentication strength, compliant or hybrid-joined device, app protection, password change'],
          ['Session controls', 'Limits after sign-in', 'Sign-in frequency, no persistent browser, app-enforced restrictions, CAE'],
          ['State', 'On, Report-only, or Off', 'Always start in Report-only'],
        ],
      },
      { t: 'h', text: 'How Entra combines policies' },
      {
        t: 'list',
        items: [
          '**Every policy is evaluated.** It’s not a firewall rule list: there is no order and no “first match wins”.',
          '**Exclusions beat inclusions.** If you are in both, you are out.',
          '**Block wins.** If any applicable policy blocks, nothing else matters.',
          '**All grants must be met.** If one policy requires MFA and another a compliant device, the user needs both.',
          '**No applicable policy means password only.** Gaps in coverage are silent. That’s why “all users, all apps” baselines matter.',
          '**Some controls can’t be met by some clients.** Legacy protocols can’t do MFA, so “require MFA” blocks them anyway, without an explanation in the client.',
        ],
      },
      { t: 'h', text: 'Try it: What If, then build your own' },
      {
        t: 'p',
        text: 'In **What If**, pick a scenario and see which of Fjordtech’s policies apply, why the others don’t, and the final decision. Turn policies off or to report-only to see the gaps. In **Policy missions**, build policies that meet a goal; test sign-ins check your work.',
      },
      { t: 'lab', lab: 'ca' },
      { t: 'h', text: 'A solid baseline policy set' },
      {
        t: 'timeline',
        items: [
          { when: 'CA001', what: '**All users, all apps: require MFA.** The single most valuable policy. Exclude break-glass.', tone: 'key' },
          { when: 'CA002', what: '**Block legacy authentication.** IMAP, POP, SMTP AUTH and other basic auth can’t do MFA and are a favourite for password spraying.', tone: 'leave' },
          { when: 'CA003', what: '**Admin roles: phishing-resistant MFA** (authentication strength). Admins are the prize, and push notifications can be phished or fatigue-bombed.', tone: 'leave' },
          { when: 'CA004', what: '**Sensitive apps: require a compliant device.** Finance, HR and admin portals only from managed machines.', tone: 'move' },
          { when: 'CA005', what: '**Risk-based (Entra ID P2):** block or step up on high sign-in risk; secure password change on high user risk.', tone: 'move' },
          { when: 'CA006', what: '**Block device code flow** and other authentication flows nobody uses. Cheap, and it stops device code phishing.', tone: 'leave' },
          { when: 'CA007', what: '**Protect security info registration:** registering MFA methods only from trusted locations or compliant devices, so an attacker with a password can’t enrol their own phone.', tone: 'key' },
          { when: 'CA008', what: '**Guests:** require MFA (accepting the home tenant’s MFA through cross-tenant settings) and limit what they can reach.', tone: 'key' },
        ],
      },
      {
        t: 'callout',
        kind: 'warn',
        title: 'Break-glass: exclude, then watch',
        text: 'Every policy should exclude two **emergency access accounts**: cloud-only, long random passwords or FIDO2 keys kept in a safe, not tied to any one person, used only when CA or MFA itself is broken. Alert on every single sign-in. The one exception you add to every policy must be the most watched account in the tenant.',
      },
      { t: 'h', text: 'Rolling out without locking out' },
      {
        t: 'timeline',
        items: [
          { when: 'Design', what: 'Name policies consistently (`CA001-AllUsers-AllApps-RequireMFA`), use groups for exclusions, and document why each exclusion exists and who owns it.', tone: 'key' },
          { when: 'Report-only', what: 'Create the policy in **Report-only**. It is evaluated on every sign-in and logged, but nothing is enforced.', tone: 'auto' },
          { when: 'Analyse', what: 'Check the **Conditional Access** tab in sign-in logs and the insights workbook: who would have been blocked or prompted? Use the **What If** tool for edge cases.', tone: 'auto' },
          { when: 'Pilot', what: 'Switch on for a pilot group (the IAM team first), then widen to everyone.', tone: 'join' },
          { when: 'Operate', what: 'Back up policies as code, review exclusions quarterly, and alert on policy changes in the audit log.', tone: 'join' },
        ],
      },
      {
        t: 'code',
        lang: 'powershell',
        title: 'Policy as code: create CA002 in report-only with Microsoft Graph',
        code: `Connect-MgGraph -Scopes 'Policy.ReadWrite.ConditionalAccess','Policy.Read.All'

$policy = @{
  displayName   = 'CA002-AllUsers-AllApps-BlockLegacyAuth'
  state         = 'enabledForReportingButNotEnforced'      # report-only
  conditions    = @{
    users          = @{ includeUsers = @('All'); excludeGroups = @('<break-glass-group-id>') }
    applications   = @{ includeApplications = @('All') }
    clientAppTypes = @('exchangeActiveSync', 'other')        # = legacy authentication
  }
  grantControls = @{ operator = 'OR'; builtInControls = @('block') }
}
New-MgIdentityConditionalAccessPolicy -BodyParameter $policy

# Back up every policy as JSON
Get-MgIdentityConditionalAccessPolicy -All | ForEach-Object {
  $_ | ConvertTo-Json -Depth 10 | Out-File ".\\ca-backup\\$($_.DisplayName).json"
}`,
        notes: ['States are `enabled`, `disabled` and `enabledForReportingButNotEnforced`.', 'Tools like Microsoft365DSC or Terraform can manage the whole policy set from Git, with review before changes go live.'],
      },
      { t: 'h', text: 'Sessions, CAE and the leaver' },
      {
        t: 'p',
        text: 'CA is checked when a token is issued, and access tokens normally live about an hour. **Continuous Access Evaluation (CAE)** closes that gap for supporting apps like Exchange, SharePoint, Teams and Graph: when an account is disabled, a password changes, sessions are revoked or the user moves to a disallowed network, the app rejects the token within minutes. In JML terms: CAE makes the leaver’s “disable, then revoke sessions” step take effect almost immediately in the apps that matter most.',
      },
      {
        t: 'callout',
        kind: 'field',
        title: 'Licensing in one line',
        text: 'Conditional Access needs **Entra ID P1** (included in Microsoft 365 E3/Business Premium). Risk-based conditions need **P2** (E5 or Entra ID Governance/Suite). Small tenants without P1 can turn on **security defaults**, a fixed, free baseline (MFA for everyone, legacy auth blocked), but they can’t customise it.',
      },
      { t: 'h', text: 'Troubleshooting cheat sheet' },
      {
        t: 'table',
        head: ['Symptom', 'Meaning', 'Where to look'],
        rows: [
          ['AADSTS53003', 'Blocked by a Conditional Access policy', 'Sign-in log → Conditional Access tab shows which policy and why'],
          ['AADSTS53000', 'Device must be compliant / managed', 'Intune compliance status of the device, device registration'],
          ['AADSTS50076 / 50079', 'MFA required / user must register MFA', 'Authentication methods of the user, registration campaign'],
          ['Scanner or app stopped sending mail', 'Legacy auth now blocked', 'Sign-in logs filtered on client app = other clients; move to OAuth or a connector'],
          ['Policy “didn’t work”', 'User excluded, app not targeted, condition not met, or report-only', 'What If tool with the exact user, app and conditions'],
          ['Everyone locked out', 'A block or unmet grant on all users without exclusions', 'Break-glass account, then fix the policy'],
        ],
      },
      {
        t: 'callout',
        kind: 'norway',
        title: 'Why auditors care',
        text: 'NSM’s grunnprinsipper ask for strong authentication, especially for privileged and remote access, and NIS2 lists MFA as a baseline measure. A documented CA policy set with sign-in logs is the evidence that those controls exist and are enforced.',
      },
    ],
    quiz: [
      {
        q: 'Two policies apply: one requires MFA, the other blocks. What happens?',
        options: ['MFA, then access', 'Block', 'Whichever policy was created first wins', 'The user chooses'],
        answer: 1,
        explain: 'All applicable policies are combined and block always wins.',
      },
      {
        q: 'A user is in the included group “All users” and in the excluded group “Break-glass”. Does the policy apply?',
        options: ['Yes, inclusion wins', 'Only for admin portals', 'No, exclusion wins', 'Only in report-only'],
        answer: 2,
        explain: 'Exclusions always take precedence over inclusions.',
      },
      {
        q: 'You enable “Require MFA for all users”. A printer that sends email with SMTP AUTH stops working. Why?',
        options: ['The printer is too old for TLS', 'SMTP is blocked by Exchange', 'Legacy protocols can’t perform MFA, so the requirement can’t be met', 'The printer isn’t licensed'],
        answer: 2,
        explain: 'Basic-auth protocols have no way to show an MFA prompt. Move the device to OAuth, an SMTP relay or a connector, rather than excluding it.',
      },
      {
        q: 'What is the safest way to introduce a new policy that targets all users?',
        options: ['Turn it on Friday evening', 'Exclude all admins permanently', 'Test it on the CEO first', 'Create it in Report-only, analyse sign-in logs and What If, pilot, then enable'],
        answer: 3,
        explain: 'Report-only shows the impact without enforcing anything. Pilot groups catch the rest.',
      },
      {
        q: 'Which policy best protects admin accounts from phishing?',
        options: ['Require MFA (any method)', 'Require phishing-resistant MFA through an authentication strength', 'Block legacy auth', 'Require a password change every 30 days'],
        answer: 1,
        explain: 'Push and OTP codes can be phished or fatigue-bombed. FIDO2 keys, passkeys and Windows Hello are bound to the real site.',
      },
    ],
  },
  {
    ...meta('privileged'),
    blocks: [
      {
        t: 'p',
        text: 'A compromised normal user is an incident. A compromised **Global Administrator** is a catastrophe. Privileged Access Management (PAM) shrinks the number of admins, the time they hold power, and the paths an attacker can take to them.',
      },
      {
        t: 'list',
        items: [
          '**Separate admin accounts**: `adm-ingrid` for admin work, used from a hardened device. Never read email as an admin.',
          '**Just-in-time (JIT)**: no standing admin rights. With Entra **PIM**, you *activate* a role for 1–8 hours, with justification, MFA and possibly approval.',
          '**Just enough administration**: Helpdesk Administrator to reset passwords, not Global Administrator.',
          '**Break-glass accounts**: two emergency cloud-only accounts, excluded from Conditional Access, with long secrets in a safe and alerting on every sign-in.',
          '**Phishing-resistant MFA**: FIDO2 keys or passkeys for all admin roles.',
        ],
      },
      {
        t: 'code',
        lang: 'powershell',
        title: 'Report: who holds permanent Global Administrator?',
        code: `$ga = Get-MgDirectoryRole -Filter "displayName eq 'Global Administrator'"
Get-MgDirectoryRoleMember -DirectoryRoleId $ga.Id |
  ForEach-Object { Get-MgUser -UserId $_.Id -Property DisplayName,UserPrincipalName } |
  Select-Object DisplayName, UserPrincipalName`,
        notes: ['Lists *active* members. Users eligible through PIM appear only after activation. That’s the point.', 'Target: 2 break-glass accounts + zero standing humans.'],
      },
      {
        t: 'callout',
        kind: 'field',
        title: 'Don’t forget non-human identities',
        text: 'Service accounts, app registrations, managed identities and API keys often outnumber humans 10:1 and have more privileges. They need owners, expiry, credential rotation and reviews too. This is the fastest-growing area of IAM.',
      },
      {
        t: 'callout',
        kind: 'tip',
        title: 'Go deeper',
        text: 'The next module, [PIM in practice](#/learn/pim), shows activation, approval, role settings and how to clean up standing admin access, with a hands-on lab.',
      },
    ],
    quiz: [
      {
        q: 'What does PIM “eligible” assignment mean?',
        options: ['The user can activate the role for a limited time when needed', 'The user has the role permanently', 'The user can approve others', 'The role is disabled'],
        answer: 0,
        explain: 'Eligible means no standing privilege. You activate just in time, with MFA and justification.',
      },
      {
        q: 'Break-glass accounts should be…',
        options: ['Cloud-only, excluded from Conditional Access, monitored, rarely used', 'Synced from on-prem AD', 'Used daily by the IT manager', 'Deleted'],
        answer: 0,
        explain: 'They exist for when everything else is broken, including federation and Conditional Access. Every sign-in should alert.',
      },
    ],
  },
  {
    ...meta('pim'),
    blocks: [
      {
        t: 'p',
        text: 'Most serious breaches end with an attacker using an admin account. **Privileged Identity Management (PIM)** shrinks that target: instead of being Global Administrator around the clock, Erik is *eligible* for it, and *activates* it for two hours when he needs it, with phishing-resistant MFA, a reason, a ticket and someone’s approval. The rest of the time his account is an ordinary user account, and so is whatever an attacker steals.',
      },
      { t: 'h', text: 'The vocabulary' },
      {
        t: 'table',
        head: ['Term', 'Meaning'],
        rows: [
          ['Eligible', 'May activate the role when needed. Has no rights until then.'],
          ['Active', 'Has the role’s rights right now, either after activation or by direct assignment.'],
          ['Permanent vs time-bound', 'Whether the eligible or active assignment itself has an end date.'],
          ['Activation', 'Turning an eligible assignment into a temporary active one, subject to the role settings.'],
          ['Role settings', 'Per-role rules: max duration, MFA or authentication context, justification, ticket, approval, notifications.'],
          ['Approver', 'Person or group who must approve activations for a role. Never the requester.'],
          ['PIM for Groups', 'Just-in-time *membership* (or ownership) of a group, which in turn grants Azure, app or Exchange roles.'],
          ['Azure resource roles', 'The same model for Azure RBAC: Owner or Contributor on a subscription, eligible and activated.'],
        ],
      },
      {
        t: 'callout',
        kind: 'field',
        title: 'Licensing',
        text: 'PIM needs **Entra ID P2** (or Entra ID Governance) for the users who are eligible, approve or are reviewed. Microsoft 365 E5 includes it.',
      },
      { t: 'h', text: 'What an activation looks like' },
      {
        t: 'timeline',
        items: [
          { when: '1. Request', what: 'Erik opens **My roles** in the Entra admin center (or the PIM API), picks Global Administrator, chooses 2 hours.', tone: 'key' },
          { when: '2. Step up', what: 'PIM requires MFA, ideally a Conditional Access **authentication context** that demands phishing-resistant MFA. Erik touches his FIDO2 key.', tone: 'leave' },
          { when: '3. Explain', what: 'Justification “Update the guest CA policy” and ticket CHG-1042, so the audit log says *why*.', tone: 'key' },
          { when: '4. Approve', what: 'For tier-0 roles, Marte gets an email and approves or denies. Erik can’t approve himself.', tone: 'move' },
          { when: '5. Work', what: 'The role is active. It can take a few minutes to take effect; signing out and in refreshes the token.', tone: 'join' },
          { when: '6. Expire', what: 'After 2 hours the role is removed automatically, or earlier if Erik clicks Deactivate. Every step is in the PIM audit history.', tone: 'auto' },
        ],
      },
      { t: 'h', text: 'Try it: activate, approve, expire, then clean up' },
      {
        t: 'p',
        text: 'Be Erik and activate Global Administrator, approve it as Marte, and fast-forward the clock until it expires. Then try Nora and the tier-0 Azure group. Finally, clean up Fjordtech’s standing access and fix the Global Administrator role settings until there are no findings left.',
      },
      { t: 'lab', lab: 'pim' },
      { t: 'h', text: 'Recommended role settings' },
      {
        t: 'table',
        head: ['Setting', 'Tier 0 (Global Admin, Privileged Role Admin, prod Owner groups)', 'Tier 1 (User Admin, Helpdesk, Exchange Admin)', 'Tier 2 (readers)'],
        rows: [
          ['Assignment', 'Eligible only, time-bound (e.g. 6 months)', 'Eligible, time-bound (e.g. 12 months)', 'Active is fine'],
          ['Max activation', '1–4 h', '4–8 h', 'n/a'],
          ['On activation', 'Auth context: phishing-resistant MFA', 'MFA', 'n/a'],
          ['Justification / ticket', 'Both', 'Justification', 'n/a'],
          ['Approval', 'Yes, by a small group (not the requester’s team only)', 'Usually no', 'No'],
          ['Notifications', 'Alert the security team on every activation', 'Digest', 'None'],
        ],
      },
      {
        t: 'callout',
        kind: 'warn',
        title: 'Break-glass stays permanent',
        text: 'The two emergency access accounts are the one deliberate exception: **permanently active** Global Administrators, excluded from Conditional Access, with alerts on every sign-in. PIM, MFA and Conditional Access are exactly what might be broken when you need them.',
      },
      { t: 'h', text: 'PIM for Groups' },
      {
        t: 'p',
        text: 'Many privileges aren’t Entra roles: Owner on the production subscription, admin in an app, an Exchange role group. Put them on a group (a **role-assignable group** if it holds Entra roles), make people *eligible members*, and they activate membership the same way. One mechanism for everything privileged, with the same approval, MFA and audit trail.',
      },
      { t: 'h', text: 'Running PIM day to day' },
      {
        t: 'list',
        items: [
          '**PIM alerts** flag drift: too many Global Admins, roles assigned outside PIM, eligible roles nobody has activated in months, activations without MFA.',
          '**Access reviews** of privileged roles every quarter: reviewers confirm each eligible and active assignment, and denied ones are removed automatically.',
          '**Assign through groups** tied to job roles, so movers lose eligibility automatically when they leave the group, and leavers lose everything when the account is disabled and groups are stripped.',
          '**Report standing access** regularly and treat every permanent active tier-0 assignment, except break-glass, as a finding.',
          '**Service accounts** don’t belong in PIM roles: they can’t do MFA. Use managed identities or workload identities with narrowly scoped permissions.',
        ],
      },
      {
        t: 'code',
        lang: 'powershell',
        title: 'PIM with Microsoft Graph PowerShell',
        code: `Connect-MgGraph -Scopes 'RoleManagement.ReadWrite.Directory'
$ga   = Get-MgRoleManagementDirectoryRoleDefinition -Filter "displayName eq 'Global Administrator'"
$erik = Get-MgUser -UserId 'erik.dahl@fjordtech.no'

# Who is permanently active in Global Administrator? (should be break-glass only)
Get-MgRoleManagementDirectoryRoleAssignmentSchedule -Filter "roleDefinitionId eq '$($ga.Id)'" -ExpandProperty Principal |
  Where-Object { $_.ScheduleInfo.Expiration.Type -eq 'noExpiration' } |
  Select-Object @{ n = 'Principal'; e = { $_.Principal.AdditionalProperties.displayName } }, AssignmentType

# Make Erik eligible for 180 days
New-MgRoleManagementDirectoryRoleEligibilityScheduleRequest -BodyParameter @{
  action = 'adminAssign'; principalId = $erik.Id; roleDefinitionId = $ga.Id; directoryScopeId = '/'
  justification = 'IAM engineer, CHG-1001'
  scheduleInfo = @{ startDateTime = (Get-Date); expiration = @{ type = 'afterDuration'; duration = 'P180D' } }
}

# Erik activates for 2 hours (run as Erik)
New-MgRoleManagementDirectoryRoleAssignmentScheduleRequest -BodyParameter @{
  action = 'selfActivate'; principalId = $erik.Id; roleDefinitionId = $ga.Id; directoryScopeId = '/'
  justification = 'Update guest CA policy'; ticketInfo = @{ ticketNumber = 'CHG-1042'; ticketSystem = 'ServiceNow' }
  scheduleInfo = @{ startDateTime = (Get-Date); expiration = @{ type = 'afterDuration'; duration = 'PT2H' } }
}`,
        notes: ['Durations use ISO 8601: `PT2H` is 2 hours, `P180D` is 180 days.', 'Eligibility, activation and role settings (`roleManagementPolicies`) are all in the Graph API, so they can be scripted, reviewed and backed up like Conditional Access policies.'],
      },
      { t: 'h', text: 'Troubleshooting cheat sheet' },
      {
        t: 'table',
        head: ['Symptom', 'Likely cause', 'Fix'],
        rows: [
          ['Activated, but still “access denied”', 'The token predates the activation', 'Wait a few minutes, or sign out and in again'],
          ['Request stuck as pending', 'Approval required, approvers haven’t acted', 'Check who the approvers are; have a backup approver group'],
          ['“Authentication context required” on activation', 'Role demands phishing-resistant MFA', 'Sign in with a FIDO2 key, passkey or Windows Hello'],
          ['Role missing from My roles', 'Eligibility expired, or assigned to a group you left', 'Ask for renewal; check the eligible assignment’s end date'],
          ['Duration options too short', 'Max activation set in role settings', 'Activate again, or ask whether the setting fits the task'],
          ['Many permanent Global Admins', 'Assignments made outside PIM or before PIM existed', 'Convert to eligible, keep only break-glass permanent'],
        ],
      },
    ],
    quiz: [
      {
        q: 'Erik is *eligible* for Global Administrator. What can he do right now?',
        options: ['Everything a Global Admin can', 'Read-only admin tasks', 'Nothing extra until he activates the role', 'Approve other activations'],
        answer: 2,
        explain: 'Eligible means no rights until activation. That’s the point: a stolen eligible account isn’t an admin account.',
      },
      {
        q: 'Erik requests Global Administrator and is also listed as an approver. Can he approve his own request?',
        options: ['No, requesters can never approve their own activation', 'Yes, approvers can approve anything', 'Only outside business hours', 'Only for less than an hour'],
        answer: 0,
        explain: 'Approval is a second pair of eyes. PIM never lets a requester approve themselves.',
      },
      {
        q: 'Which accounts should stay permanently active Global Administrators?',
        options: ['The IT manager', 'All IAM engineers', 'Two monitored break-glass accounts', 'Service accounts used by scripts'],
        answer: 2,
        explain: 'Break-glass accounts must work when PIM, MFA or Conditional Access are broken. Everyone else should be eligible.',
      },
      {
        q: 'How do you require phishing-resistant MFA specifically when someone activates Global Administrator?',
        options: ['Require MFA in the role settings', 'Shorten the activation to 1 hour', 'Block legacy auth', 'Link the role setting to a Conditional Access authentication context that requires phishing-resistant authentication strength'],
        answer: 3,
        explain: 'Authentication contexts let PIM ask Conditional Access for a stronger check at activation time.',
      },
      {
        q: 'Azure subscription Owner isn’t an Entra role. How do you make it just-in-time?',
        options: ['PIM for Groups: make the group that holds Owner a PIM group with eligible members (or use PIM for Azure resources)', 'You can’t', 'Give everyone Owner and review yearly', 'Use a shared admin account'],
        answer: 0,
        explain: 'PIM for Groups (or PIM for Azure resource roles) brings the same activation, approval and audit to non-Entra privileges.',
      },
    ],
  },
  {
    ...meta('compliance'),
    blocks: [
      {
        t: 'p',
        text: 'Compliance frameworks rarely tell you *how* to do IAM, but they all expect the same outcomes: access is approved, appropriate, reviewed and removed on time, and you can **prove** it.',
      },
      {
        t: 'table',
        head: ['Framework', 'What it expects from IAM'],
        rows: [
          ['GDPR / personopplysningsloven', 'Data minimisation (art. 5) and appropriate security (art. 32). Only people who need personal data can access it. Logging of who accessed what.'],
          ['NSM Grunnprinsipper for IKT-sikkerhet', 'Principle “Kontroller identiteter og tilganger”: central identity management, least privilege, MFA, separate admin accounts, removing access when no longer needed.'],
          ['ISO/IEC 27001:2022 Annex A', '5.15 Access control · 5.16 Identity management · 5.17 Authentication information · 5.18 Access rights · 8.2 Privileged access rights'],
          ['NIS2 / digitalsikkerhetsloven', 'Access control and MFA as baseline measures for essential and important entities.'],
        ],
      },
      {
        t: 'callout',
        kind: 'norway',
        title: 'Norwegian identity landscape',
        text: 'Expect to meet **ID-porten** and **BankID** for citizens and customers, **Feide** in education, **HelseID** in health, and Altinn authorization for acting on behalf of organizations. Inside companies, Entra ID with HR integration (Visma, SAP SuccessFactors, Workday) is the most common setup.',
      },
      { t: 'h', text: 'Audit evidence you should be able to produce in minutes' },
      {
        t: 'list',
        items: [
          'For any leaver: HR end date vs. timestamp of account disable.',
          'For any access: who requested, who approved, when, and why.',
          'Completed access reviews with decisions and executed revocations.',
          'List of privileged role holders and PIM activations.',
          'SoD ruleset and any approved exceptions with expiry.',
        ],
      },
    ],
    quiz: [
      {
        q: 'Which ISO 27001:2022 control covers provisioning, review and removal of access rights?',
        options: ['8.24 Use of cryptography', '5.18 Access rights', '5.30 ICT readiness', '7.4 Physical monitoring'],
        answer: 1,
        explain: 'A.5.18 covers the access-rights lifecycle. 5.15 is the access-control policy itself.',
      },
      {
        q: 'An auditor asks: “Prove Kari’s access was removed when she left.” What do you show?',
        options: ['Her manager’s email', 'A screenshot of her disabled account today', 'HR end date and the timestamped disable/removal entries in the audit log', 'The leaver policy document'],
        answer: 2,
        explain: 'Evidence is about timing: the event and the action, with timestamps, from the system of record.',
      },
    ],
  },
]

export const moduleBySlug = (slug: string) => MODULES.find((m) => m.slug === slug)
