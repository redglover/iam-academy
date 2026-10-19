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
