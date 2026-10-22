import type { ModuleMeta } from './types'

// Titles and taglines only: the shell, home page and glossary need these without pulling in
// the module text in ./modules, which loads with the module page.
export const MODULE_INDEX: ModuleMeta[] = [
  {
    slug: 'fundamentals',
    title: 'Identity, accounts and access',
    tagline: 'The vocabulary everything else is built on.',
    minutes: 8,
    tone: 'key',
  },
  {
    slug: 'principles',
    title: 'The principles that never change',
    tagline: 'Least privilege, separation of duties, zero trust, and the enemies: creep and orphans.',
    minutes: 9,
    tone: 'key',
  },
  {
    slug: 'jml',
    title: 'Joiner, Mover, Leaver in practice',
    tagline: 'The lifecycle at the heart of every IAM team. Run it yourself.',
    minutes: 15,
    tone: 'join',
  },
  {
    slug: 'access-models',
    title: 'Roles, attributes and groups',
    tagline: 'How you decide who gets what, at scale.',
    minutes: 11,
    tone: 'move',
  },
  {
    slug: 'automation',
    title: 'Automating IAM',
    tagline: 'From HR event to provisioned access, without a human in the loop.',
    minutes: 18,
    tone: 'auto',
  },
  {
    slug: 'oauth',
    title: 'OAuth 2.0 and OpenID Connect',
    tagline: 'How apps get access without your password, and how to set it up in Entra ID.',
    minutes: 20,
    tone: 'key',
  },
  {
    slug: 'saml',
    title: 'SAML single sign-on',
    tagline: 'The XML protocol behind most enterprise SSO: how it works, how to set it up in Entra, and how it breaks.',
    minutes: 18,
    tone: 'auto',
  },
  {
    slug: 'scim',
    title: 'SCIM provisioning',
    tagline: 'The standard API that creates, updates and removes accounts in apps, and closes the gap SSO leaves open.',
    minutes: 18,
    tone: 'join',
  },
  {
    slug: 'governance',
    title: 'Governance: reviews, SoD and proof',
    tagline: 'Automation gives access. Governance checks that it’s still right.',
    minutes: 10,
    tone: 'auto',
  },
  {
    slug: 'ca',
    title: 'Conditional Access',
    tagline: 'The Zero Trust policy engine behind every Entra ID sign-in: how it decides, and how to roll it out without locking anyone out.',
    minutes: 20,
    tone: 'leave',
  },
  {
    slug: 'privileged',
    title: 'Privileged access',
    tagline: 'Admin rights are the crown jewels. Treat them that way.',
    minutes: 8,
    tone: 'leave',
  },
  {
    slug: 'pim',
    title: 'PIM in practice',
    tagline: 'Just-in-time admin rights with Entra Privileged Identity Management: set it up, use it, and clean up standing access.',
    minutes: 18,
    tone: 'leave',
  },
  {
    slug: 'compliance',
    title: 'Compliance and the Norwegian context',
    tagline: 'GDPR, NSM, ISO 27001: what auditors will ask you for.',
    minutes: 8,
    tone: 'key',
  },
]

export const moduleMeta = (slug: string) => MODULE_INDEX.find((m) => m.slug === slug)
