// Separation of Duties: combinations no single person should hold.

export interface SodRule {
  id: string
  a: string
  b: string
  why: string
}

export const SOD_RULES: SodRule[] = [
  {
    id: 'SOD-01',
    a: 'erp-vendor-create',
    b: 'erp-pay-approve',
    why: 'Could create a fake supplier and approve payments to it.',
  },
  {
    id: 'SOD-02',
    a: 'erp-ap-clerk',
    b: 'erp-pay-approve',
    why: 'Could register an invoice and approve paying it: no second pair of eyes.',
  },
  {
    id: 'SOD-03',
    a: 'hris-hr-admin',
    b: 'erp-pay-approve',
    why: 'Could add a ghost employee and approve the payroll run.',
  },
]

export function sodConflicts(entitlements: Iterable<string>): SodRule[] {
  const set = new Set(entitlements)
  return SOD_RULES.filter((r) => set.has(r.a) && set.has(r.b))
}
