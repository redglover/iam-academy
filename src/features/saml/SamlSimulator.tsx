import { useEffect, useMemo, useRef, useState } from 'react'
import { SAML_ACTORS, SAML_ATTACKS, SAML_DEFAULTS, SAML_FLOWS, buildSamlFlow, type SamlAttack, type SamlFlowId, type SamlOptions } from './flows'
import { AttackVerdict, SequenceDiagram, StepDetail, Toggle, seqOutcome, useStepPlayer } from '../../components/Sequence'
import { useProgress } from '../progress/progress'

export function SamlSimulator() {
  const [flow, setFlow] = useState<SamlFlowId>('sp-initiated')
  const [opts, setOpts] = useState<SamlOptions>(SAML_DEFAULTS)
  const defended = useRef(new Set<SamlAttack>())
  const { award } = useProgress()

  const steps = useMemo(() => buildSamlFlow(flow, opts), [flow, opts])
  const player = useStepPlayer(steps.length, steps)
  const result = seqOutcome(steps)
  const attacking = opts.attack !== 'none' && opts.attack !== 'expired-cert'
  const actors = attacking ? [SAML_ACTORS.user, SAML_ACTORS.sp, SAML_ACTORS.idp, SAML_ACTORS.attacker] : [SAML_ACTORS.user, SAML_ACTORS.sp, SAML_ACTORS.idp]
  const set = (p: Partial<SamlOptions>) => setOpts((o) => ({ ...o, ...p }))

  useEffect(() => {
    if (!player.atEnd || result !== 'blocked') return
    defended.current.add(opts.attack)
    if (SAML_ATTACKS.every((a) => defended.current.has(a.id))) award('saml-defender')
  }, [player.atEnd, result, opts.attack, award])

  return (
    <section className="my-8 rounded-[1.75rem] border-2 border-ink bg-fog p-3 sm:p-5" aria-label="SAML flow simulator">
      <div className="flex flex-wrap gap-2">
        {(Object.keys(SAML_FLOWS) as SamlFlowId[]).map((f) => (
          <button
            key={f}
            onClick={() => setFlow(f)}
            aria-pressed={f === flow}
            className={`chip py-1.5 font-display text-sm font-semibold ${f === flow ? 'border-ink bg-ink text-paper' : 'border-line bg-paper'}`}
          >
            {SAML_FLOWS[f].title}
          </button>
        ))}
      </div>
      <p className="mt-3 max-w-[68ch]">{SAML_FLOWS[flow].when}</p>

      <div className="mt-4 grid gap-4 rounded-2xl border border-line bg-paper p-4 md:grid-cols-[1fr_1fr]">
        <div className="grid content-start gap-3">
          <p className="font-semibold">What Salesforce (the SP) checks</p>
          <Toggle on={opts.verifySignature} onChange={(v) => set({ verifySignature: v })} label="Verify the signature" hint="Against the IdP certificate uploaded to the SP." />
          <Toggle on={opts.checkAudience} onChange={(v) => set({ checkAudience: v })} label="Check the audience" hint="The assertion must name this SP’s Entity ID." />
          <Toggle on={opts.checkReplay} onChange={(v) => set({ checkReplay: v })} label="Reject replays" hint="InResponseTo must match a sent request; each assertion ID is accepted once." />
          <Toggle on={opts.certMonitoring} onChange={(v) => set({ certMonitoring: v })} label="Certificate expiry monitoring" hint="An IAM process, not a protocol check: rotate before expiry." />
        </div>
        <div>
          <label className="block">
            <span className="font-semibold">Scenario</span>
            <select value={opts.attack} onChange={(e) => set({ attack: e.target.value as SamlAttack })} className="mt-1.5 w-full rounded-lg border-2 border-muted/70 bg-paper px-2 py-2 font-semibold">
              <option value="none">Normal sign-in</option>
              {SAML_ATTACKS.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </select>
          </label>
          {opts.attack !== 'none' && <AttackVerdict result={result} />}
        </div>
      </div>

      <SequenceDiagram actors={actors} steps={steps} current={player.i} onSelect={player.setI} />
      <StepDetail steps={steps} actors={actors} player={player} />
    </section>
  )
}
