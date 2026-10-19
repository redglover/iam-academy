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
