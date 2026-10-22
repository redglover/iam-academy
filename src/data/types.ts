export type Tone = 'key' | 'join' | 'move' | 'leave' | 'auto'

export type LabId = 'jml' | 'pipeline' | 'rbac' | 'review' | 'oauth' | 'saml' | 'saml-inspector' | 'scim' | 'ca' | 'pim'
export type DiagramId = 'jml-flow' | 'automation-arch' | 'lifecycle' | 'oauth-roles' | 'ca-engine'

export type Block =
  | { t: 'p'; text: string }
  | { t: 'h'; text: string }
  | { t: 'list'; items: string[]; ordered?: boolean }
  | { t: 'callout'; kind: 'tip' | 'warn' | 'field' | 'norway'; title: string; text: string }
  | { t: 'code'; lang: string; title: string; code: string; notes?: string[] }
  | { t: 'table'; head: string[]; rows: string[][] }
  | { t: 'compare'; items: { title: string; text: string; tone: Tone }[] }
  | { t: 'timeline'; items: { when: string; what: string; tone: Tone }[] }
  | { t: 'lab'; lab: LabId }
  | { t: 'diagram'; id: DiagramId }

export interface Question {
  q: string
  options: string[]
  answer: number
  explain: string
}

export interface ModuleMeta {
  slug: string
  title: string
  tagline: string
  minutes: number
  tone: Tone
}

export interface Module extends ModuleMeta {
  blocks: Block[]
  quiz: Question[]
}
