export interface Term {
  term: string
  def: string
  module?: string
}

export const GLOSSARY: Term[] = [
  { term: 'AAA', def: 'Authentication, Authorization, Accounting: prove who you are, decide what you may do, record what you did.', module: 'fundamentals' },
  { term: 'ABAC', def: 'Attribute-based access control. Access computed from attributes such as department, location and employment type.', module: 'access-models' },
  { term: 'Access review', def: 'Periodic check where a reviewer confirms or revokes existing access. Also called certification or attestation.', module: 'governance' },
  { term: 'Authoritative source', def: 'The system trusted as the truth for a piece of identity data. Usually HR for employees.', module: 'fundamentals' },
  { term: 'Birthright access', def: 'Access everyone of a given worker type receives automatically, without a request.', module: 'jml' },
  { term: 'Break-glass account', def: 'Emergency admin account excluded from normal controls, monitored and used only when everything else fails.', module: 'privileged' },
  { term: 'Business role', def: 'A bundle of entitlements named in business terms (e.g. “Accounts Payable Specialist”).', module: 'access-models' },
  { term: 'Conditional Access', def: 'Entra ID policy engine that evaluates user, device, location and risk on every sign-in.', module: 'principles' },
  { term: 'Connector', def: 'Integration that lets an IGA tool read and write accounts in a target system.', module: 'automation' },
  { term: 'Deprovisioning', def: 'Removing or disabling accounts and access, typically for leavers and movers.', module: 'jml' },
  { term: 'Desired state', def: 'Automation style that declares what access should exist and fixes any difference, instead of issuing one-off commands.', module: 'automation' },
  { term: 'Dynamic group', def: 'Group whose membership is computed from a rule on user attributes and updates automatically.', module: 'access-models' },
  { term: 'Entitlement', def: 'A single technical permission in a system: a group, an app role, a profile.', module: 'access-models' },
  { term: 'Entra ID', def: 'Microsoft’s cloud identity platform (formerly Azure AD).', module: 'fundamentals' },
  { term: 'Graph API', def: 'Microsoft’s REST API for Entra ID, M365 and more. The basis for most Microsoft IAM automation.', module: 'automation' },
  { term: 'Idempotent', def: 'An operation that has the same effect whether you run it once or many times.', module: 'automation' },
  { term: 'IGA', def: 'Identity Governance and Administration: lifecycle, roles, requests and reviews. Examples: SailPoint, Omada, Saviynt.', module: 'fundamentals' },
  { term: 'JIT access', def: 'Just-in-time: privileges are granted only when needed, for a limited time.', module: 'privileged' },
  { term: 'JML', def: 'Joiner–Mover–Leaver, the three lifecycle events that change someone’s access.', module: 'jml' },
  { term: 'Least privilege', def: 'Only the access needed for the job, for as long as it is needed.', module: 'principles' },
  { term: 'Lifecycle Workflows', def: 'Entra ID Governance feature that runs joiner/mover/leaver tasks relative to hire and leave dates.', module: 'automation' },
  { term: 'Managed identity', def: 'Azure-managed credential for a workload. No secret to store or rotate.', module: 'automation' },
  { term: 'Micro-certification', def: 'A small, event-triggered access review, e.g. the new manager confirming a mover’s access.', module: 'jml' },
  { term: 'Orphan account', def: 'An account with no active owner, typically a leaver that was never cleaned up.', module: 'principles' },
  { term: 'PAM', def: 'Privileged Access Management: controls for admin accounts and powerful credentials.', module: 'privileged' },
  { term: 'PIM', def: 'Entra Privileged Identity Management: eligible roles activated just in time.', module: 'privileged' },
  { term: 'Privilege creep', def: 'Gradual build-up of access beyond what the current job needs, usually through job changes.', module: 'principles' },
  { term: 'RBAC', def: 'Role-based access control. Access granted through roles.', module: 'access-models' },
  { term: 'Reconciliation', def: 'Comparing what access exists in a system with what should exist, and flagging or fixing the difference.', module: 'automation' },
  { term: 'Role explosion', def: 'When an RBAC model grows so many roles that it is unmanageable.', module: 'access-models' },
  { term: 'Role mining', def: 'Analyzing existing access to discover candidate roles and outliers.', module: 'access-models' },
  { term: 'SCIM', def: 'System for Cross-domain Identity Management. Standard REST API for provisioning users and groups (RFC 7643/7644).', module: 'automation' },
  { term: 'SoD', def: 'Separation of duties. No single person controls a sensitive process end to end.', module: 'principles' },
  { term: 'Temporary Access Pass', def: 'Time-limited passcode in Entra ID used to onboard new users and register MFA or passwordless methods.', module: 'jml' },
  { term: 'Zero trust', def: 'Never trust, always verify. Every request is evaluated, regardless of network location.', module: 'principles' },
]
