// Questions you should be able to answer in an IAM engineer interview, with a good short answer.

export const INTERVIEW: { q: string; a: string }[] = [
  {
    q: 'What is the difference between OAuth 2.0 and OpenID Connect?',
    a: 'OAuth 2.0 is delegated authorization: it gives an app an access token to call an API on a user’s behalf. OpenID Connect is a layer on top that adds authentication: an ID token that tells the app who signed in, plus standard claims and discovery. Sign-in uses OIDC, API access uses OAuth.',
  },
  {
    q: 'Which OAuth flow would you use for a scheduled PowerShell job that disables leavers?',
    a: 'Client credentials, since no user is involved. Ideally from Azure Automation with a managed identity, or with a certificate rather than a client secret. Grant only the application permissions it needs (e.g. User.ReadWrite.All or a narrower custom role), get admin consent, and give the app an owner and a review date.',
  },
  {
    q: 'Why is PKCE needed, and does it replace the client secret?',
    a: 'PKCE stops a stolen authorization code from being redeemed: the app sends a hash of a random verifier with the authorize request and must present the verifier when redeeming. Public clients (SPAs, mobile) can’t keep a secret, so PKCE is their protection. Confidential clients should use both. Current best practice is PKCE for every client.',
  },
  {
    q: 'A user gets an error signing in to a SAML app. How do you troubleshoot?',
    a: 'First see where it fails. Entra sign-in logs show IdP-side errors (AADSTS50011 reply URL, 700016 identifier, 50105 assignment). If Entra succeeded, the SP rejected the assertion: capture it with SAML-tracer and check the NameID value, audience, recipient, time window and certificate thumbprint against the SP’s configuration. The usual suspects are a rotated or expired certificate, NameID mismatch, or clock skew.',
  },
  {
    q: 'When would you choose SAML over OpenID Connect?',
    a: 'When the app only supports SAML, which is common for enterprise SaaS. For anything new, especially SPAs, mobile apps or anything that calls APIs, OIDC/OAuth is the better choice. Either way, pair SSO with SCIM for provisioning and deprovisioning.',
  },
  {
    q: 'An app has SAML SSO. Why would you also want SCIM?',
    a: 'SSO only controls sign-in. SCIM creates the account before day one, updates it when the person changes jobs, and deactivates it when they leave or are unassigned. Without it, leavers keep app accounts, sessions and API tokens, and someone has to clean up by hand. Ask whether the app supports SCIM and what it does on active:false.',
  },
  {
    q: 'You’re connecting an app with existing users to Entra provisioning. What do you check first?',
    a: 'The matching attribute: whether the app’s existing users can be matched 1:1 to Entra users (e.g. userName = UPN), otherwise the first cycle creates duplicates. Then the attribute mappings the app supports, scope (start with a pilot group), what the app does on deactivation, token lifetime and owner, and failure notifications. Test with Provision on demand before switching it on.',
  },
  {
    q: 'How would you design a Conditional Access baseline for a new tenant?',
    a: 'Start with: MFA for all users on all apps, block legacy authentication, phishing-resistant MFA for admin roles, compliant devices for sensitive apps, block device code flow, protect security info registration, and risk-based policies if P2 is available. Exclude two monitored break-glass accounts from everything, use a naming convention, roll out via report-only and a pilot group, and keep the policies as code with backups.',
  },
  {
    q: 'A user says Conditional Access blocked them. How do you troubleshoot?',
    a: 'Find the sign-in in the Entra sign-in logs and open the Conditional Access tab: it shows every policy, whether it applied, and which grant control failed. The error code helps (53003 blocked, 53000 device not compliant, 50076 MFA). Then reproduce with the What If tool using the same user, app, platform, location and client. Usual causes: legacy client, unmanaged device, unexpected location, or the user being in a scope they shouldn’t be.',
  },
  {
    q: 'How would you roll out PIM in a tenant with ten permanent Global Admins?',
    a: 'Inventory every privileged assignment first. Keep two break-glass accounts permanently active. Remove leavers and service accounts (give workloads managed identities or scoped roles), and convert the rest to time-bound eligible assignments, preferably through groups. Configure tier-0 role settings: short activation (1–4 h), phishing-resistant MFA via an authentication context, justification, ticket and approval. Then enable PIM alerts, notify the security team on activation, and schedule quarterly access reviews.',
  },
  {
    q: 'An admin activated a role but still gets access denied. What do you check?',
    a: 'Whether the activation actually completed (pending approval?), whether the token was issued before activation (sign out and in, or wait a few minutes), whether it’s the right role and scope for the task, and whether Conditional Access or an authentication context blocked the step-up. The PIM audit history and sign-in logs show each step.',
  },
  {
    q: 'Walk me through what happens when someone leaves the company.',
    a: 'HR sets the end date → IGA or Lifecycle Workflows trigger at the end date (immediately for hostile terminations) → disable the account → revoke sessions → remove groups and roles, which SCIM-deprovisions apps → convert the mailbox to shared and delegate to the manager → remove licences → notify the manager about hardware → log everything → delete after the retention period.',
  },
  {
    q: 'How do you prevent privilege creep?',
    a: 'Recalculate access automatically on mover events from the new job’s roles, with a defined grace period. Send a micro-certification to the new manager. Run periodic access reviews focused on outliers and unused access, and report on direct (non-role) grants.',
  },
  {
    q: 'How would you automate onboarding with Entra ID?',
    a: 'HR-driven or API-driven inbound provisioning creates the user from HR data (anchored on employee ID). Dynamic groups and access packages give role-based access. A joiner Lifecycle Workflow issues a Temporary Access Pass and notifies the manager before the start date. Apps get provisioned via SCIM from group assignments.',
  },
  {
    q: 'What’s the difference between SSO and provisioning?',
    a: 'SSO (SAML/OIDC) is about signing in: proving identity to an app. Provisioning (SCIM, connectors) is about the account existing with the right permissions in that app, and being removed later. You need both: SSO without deprovisioning leaves orphan accounts with local passwords or API tokens.',
  },
  {
    q: 'How do you make an automation script safe to run in production?',
    a: 'Source control and review, a test tenant, input validation, idempotency, dry-run mode, retry with backoff on throttling, a managed identity with least-privilege permissions, structured logging, alerting on failure, and thresholds (e.g. abort if more than 50 leavers in one run).',
  },
  {
    q: 'A manager asks to “give the new hire the same access as Kari”. What do you say?',
    a: 'Copying a user copies her history, including exceptions and excess access. Instead, assign the role for the job and request anything extra explicitly, so it is approved and reviewable.',
  },
  {
    q: 'How do you handle service accounts?',
    a: 'Prefer managed identities or workload identities. Every non-human identity has an owner, a purpose, an expiry or review date, least-privilege permissions, credential rotation, and monitoring for unusual use.',
  },
]
