import type { Module } from './types'

export const MODULES: Module[] = [
  {
    slug: 'fundamentals',
    title: 'Identity, accounts and access',
    tagline: 'The vocabulary everything else is built on.',
    minutes: 8,
    tone: 'key',
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
        options: ['Authentication', 'Authorization', 'Accounting', 'Attestation'],
        answer: 0,
        explain: 'Proving who you are is authentication. What you can do after signing in is authorization.',
      },
    ],
  },
  {
    slug: 'principles',
    title: 'The principles that never change',
    tagline: 'Least privilege, separation of duties, zero trust, and the enemies: creep and orphans.',
    minutes: 9,
    tone: 'key',
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
        options: ['Too many MFA prompts', 'Leavers who aren’t disabled', 'Movers who get new access without losing old access', 'Weak passwords'],
        answer: 2,
        explain: 'Creep comes from adding access at every job change and never removing any. Automated movers fix it by recalculating access from the new job.',
      },
      {
        q: 'An account still enabled six months after its owner left is called…',
        options: ['A service account', 'An orphan account', 'A break-glass account', 'A guest account'],
        answer: 1,
        explain: 'It has no living owner. Finding orphans is a standard reconciliation report in every IGA tool.',
      },
    ],
  },
  {
    slug: 'jml',
    title: 'Joiner, Mover, Leaver in practice',
    tagline: 'The lifecycle at the heart of every IAM team. Run it yourself.',
    minutes: 15,
    tone: 'join',
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
        options: ['Revoke sessions → disable account', 'Disable account → revoke sessions', 'Delete account → revoke sessions', 'Remove licence → disable account'],
        answer: 1,
        explain: 'If you revoke first, the user can sign in again before the disable lands and get fresh tokens. Disable first, then revoke.',
      },
      {
        q: 'Why create joiner accounts disabled, two weeks early?',
        options: [
          'To save licence cost',
          'So access is ready on day one, but the account can’t be misused before the start date',
          'Because Entra ID requires it',
          'So HR can test the account',
        ],
        answer: 1,
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
        options: ['Display name', 'Email address', 'Immutable employee ID', 'Manager + department'],
        answer: 2,
        explain: 'Names change (marriage, typos) and aren’t unique. An immutable employee ID is the anchor that ties every account to one identity.',
      },
    ],
  },
  {
    slug: 'access-models',
    title: 'Roles, attributes and groups',
    tagline: 'How you decide who gets what, at scale.',
    minutes: 11,
    tone: 'move',
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
          'A bundle of entitlements named in business terms that managers can understand and review',
          'A Conditional Access policy',
          'A service account',
        ],
        answer: 1,
        explain: 'Business roles bridge business language and technical entitlements.',
      },
      {
        q: 'Your RBAC model has 1,400 roles for 2,000 people. This is called…',
        options: ['Role mining', 'Role explosion', 'Least privilege', 'Attestation'],
        answer: 1,
        explain: 'When every slight difference becomes a new role, the model becomes as hard to manage as direct assignments. ABAC rules or role parameters can help.',
      },
    ],
  },
  {
    slug: 'automation',
    title: 'Automating IAM',
    tagline: 'From HR event to provisioned access, without a human in the loop.',
    minutes: 18,
    tone: 'auto',
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
        options: ['It runs fast', 'Running it twice gives the same result as running it once', 'It needs no permissions', 'It runs on a schedule'],
        answer: 1,
        explain: 'Retries and re-runs happen constantly in automation. Idempotent steps make them harmless.',
      },
      {
        q: 'What is SCIM’s main job?',
        options: ['Single sign-on', 'MFA', 'Standardized user and group provisioning to applications', 'Logging'],
        answer: 2,
        explain: 'SCIM creates, updates and deactivates accounts. SSO (SAML/OIDC) is about signing in, which is a different job.',
      },
      {
        q: 'Best way for an Azure runbook to authenticate to Graph?',
        options: ['Admin username and password in the script', 'A client secret in a variable', 'A managed identity with least-privilege Graph permissions', 'The global admin’s session'],
        answer: 2,
        explain: 'Managed identities have no secret to leak or rotate. Grant only the Graph application permissions the runbook needs.',
      },
      {
        q: 'Why keep a scheduled sync even when you have event-driven provisioning?',
        options: ['It’s required by SCIM', 'As a safety net that repairs missed events and detects drift', 'Events are slower', 'For licensing reasons'],
        answer: 1,
        explain: 'Webhooks get lost and people make manual changes. A reconciliation run brings everything back to desired state.',
      },
    ],
  },
  {
    slug: 'oauth',
    title: 'OAuth 2.0 and OpenID Connect',
    tagline: 'How apps get access without your password, and how to set it up in Entra ID.',
    minutes: 20,
    tone: 'key',
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
          'Exact redirect URIs. No wildcards, no open redirects.',
          'Least privilege: `User.Read`, not `Directory.ReadWrite.All`, because you can.',
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
          'Client credentials with a managed identity or certificate and the minimum application permission',
          'Device code flow every night',
        ],
        answer: 2,
        explain: 'No user is involved, so it’s client credentials. Avoid secrets that can leak, and grant only what the job needs.',
      },
      {
        q: 'The sign-in page shows AADSTS50011. What’s wrong?',
        options: ['The user has no licence', 'The redirect URI in the request doesn’t match the app registration', 'MFA failed', 'The token expired'],
        answer: 1,
        explain: 'Redirect URIs must match exactly, trailing slash included. It’s the most common setup error.',
      },
      {
        q: 'In an access token, what is the difference between `scp` and `roles`?',
        options: [
          'No difference',
          '`scp` = delegated permissions for a signed-in user; `roles` = app roles, including application permissions in client credentials',
          '`scp` is for v1 tokens only',
          '`roles` lists the user’s Entra admin roles',
        ],
        answer: 1,
        explain: 'Delegated permissions appear as scopes. Application permissions, and app roles assigned to users, appear as roles.',
      },
    ],
  },
  {
    slug: 'saml',
    title: 'SAML single sign-on',
    tagline: 'The XML protocol behind most enterprise SSO: how it works, how to set it up in Entra, and how it breaks.',
    minutes: 18,
    tone: 'auto',
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
        options: ['The service provider', 'The identity provider', 'The browser', 'Both share one key'],
        answer: 1,
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
        options: ['The users’ licences', 'Whether the SAML signing certificate expired or was rotated without updating ServiceNow', 'Conditional Access', 'The DNS of Entra ID'],
        answer: 1,
        explain: 'Entra issued the assertion fine, so the SP is rejecting it. A certificate mismatch is the classic cause.',
      },
      {
        q: 'Ingrid left yesterday and her Entra account is disabled. Why might she still have access to a SAML app?',
        options: [
          'SAML tokens never expire',
          'Her existing app session is still valid and her app account wasn’t deprovisioned',
          'Entra caches passwords for SAML apps',
          'She can’t: disabling the account ends all SAML access instantly',
        ],
        answer: 1,
        explain: 'SAML only controls new sign-ins. Session lifetime in the app and deprovisioning (SCIM) are separate problems the leaver process must handle.',
      },
    ],
  },
  {
    slug: 'governance',
    title: 'Governance: reviews, SoD and proof',
    tagline: 'Automation gives access. Governance checks that it’s still right.',
    minutes: 10,
    tone: 'auto',
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
        options: ['Fire the manager', 'Smaller, risk-focused reviews with recommendations', 'Review more often', 'Remove all access instead'],
        answer: 1,
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
    slug: 'privileged',
    title: 'Privileged access',
    tagline: 'Admin rights are the crown jewels. Treat them that way.',
    minutes: 8,
    tone: 'leave',
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
    ],
    quiz: [
      {
        q: 'What does PIM “eligible” assignment mean?',
        options: ['The user has the role permanently', 'The user can activate the role for a limited time when needed', 'The user can approve others', 'The role is disabled'],
        answer: 1,
        explain: 'Eligible means no standing privilege. You activate just in time, with MFA and justification.',
      },
      {
        q: 'Break-glass accounts should be…',
        options: ['Used daily by the IT manager', 'Synced from on-prem AD', 'Cloud-only, excluded from Conditional Access, monitored, rarely used', 'Deleted'],
        answer: 2,
        explain: 'They exist for when everything else is broken, including federation and Conditional Access. Every sign-in should alert.',
      },
    ],
  },
  {
    slug: 'compliance',
    title: 'Compliance and the Norwegian context',
    tagline: 'GDPR, NSM, ISO 27001: what auditors will ask you for.',
    minutes: 8,
    tone: 'key',
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
        options: ['5.18 Access rights', '8.24 Use of cryptography', '5.30 ICT readiness', '7.4 Physical monitoring'],
        answer: 0,
        explain: 'A.5.18 covers the access-rights lifecycle. 5.15 is the access-control policy itself.',
      },
      {
        q: 'An auditor asks: “Prove Kari’s access was removed when she left.” What do you show?',
        options: ['Her manager’s email', 'HR end date and the timestamped disable/removal entries in the audit log', 'A screenshot of her disabled account today', 'The leaver policy document'],
        answer: 1,
        explain: 'Evidence is about timing: the event and the action, with timestamps, from the system of record.',
      },
    ],
  },
]

export const moduleBySlug = (slug: string) => MODULES.find((m) => m.slug === slug)
