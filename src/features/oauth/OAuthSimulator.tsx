import { useEffect, useMemo, useRef, useState } from 'react'
import { ACTORS, DEFAULT_OPTIONS, FLOWS, buildFlow, outcome, type Actor, type AttackId, type Credential, type FlowId, type FlowOptions } from './flows'
import { AttackVerdict, SequenceDiagram, StepDetail, Toggle, useStepPlayer, type SeqActor } from '../../components/Sequence'
import { useProgress } from '../progress/progress'

export function OAuthSimulator() {
  const [flow, setFlow] = useState<FlowId>('authcode-pkce')
  const [opts, setOpts] = useState<FlowOptions>(DEFAULT_OPTIONS)
  const defended = useRef(new Set<AttackId>())
  const { award } = useProgress()

  const steps = useMemo(() => buildFlow(flow, opts), [flow, opts])
  const player = useStepPlayer(steps.length, steps)
  const result = outcome(steps)
  const ids: Actor[] = opts.attack !== 'none' ? ['user', 'app', 'idp', 'api', 'attacker'] : ['user', 'app', 'idp', 'api']
  const actors: SeqActor[] = ids.map((id) => ({ id, ...ACTORS[id], danger: id === 'attacker' }))
  const set = (p: Partial<FlowOptions>) => setOpts((o) => ({ ...o, ...p }))

  useEffect(() => {
    if (!player.atEnd || result !== 'blocked') return
    defended.current.add(opts.attack)
    if (defended.current.has('code-interception') && defended.current.has('csrf')) award('oauth-defender')
  }, [player.atEnd, result, opts.attack, award])

  return (
    <section className="my-8 rounded-[1.75rem] border-2 border-ink bg-fog p-3 sm:p-5" aria-label="OAuth flow simulator">
      <div className="flex flex-wrap gap-2">
        {(Object.keys(FLOWS) as FlowId[]).map((f) => (
          <button
            key={f}
            onClick={() => {
              setFlow(f)
              set({ attack: 'none' })
            }}
            aria-pressed={f === flow}
            className={`chip py-1.5 font-display text-sm font-semibold ${f === flow ? 'border-ink bg-ink text-paper' : 'border-line bg-paper'}`}
          >
            {FLOWS[f].title}
          </button>
        ))}
      </div>
      <p className="mt-3 max-w-[68ch]">
        <strong>Use it when:</strong> {FLOWS[flow].when}
      </p>

      <div className="mt-4 grid gap-4 rounded-2xl border border-line bg-paper p-4 md:grid-cols-[1fr_1fr]">
        <div className="grid content-start gap-3">
          {flow === 'authcode-pkce' && (
            <>
              <Toggle on={opts.pkce} onChange={(v) => set({ pkce: v })} label="PKCE" hint="Proves the app redeeming the code is the one that asked for it." />
              <Toggle on={opts.state} onChange={(v) => set({ state: v })} label="State parameter" hint="Ties the callback to the request this browser started." />
            </>
          )}
          {flow === 'client-credentials' && (
            <fieldset>
              <legend className="font-semibold">How the app proves who it is</legend>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {(['secret', 'certificate', 'managed-identity'] as Credential[]).map((c) => (
                  <button
                    key={c}
                    onClick={() => set({ credential: c })}
                    aria-pressed={opts.credential === c}
                    className={`chip py-1 text-sm ${opts.credential === c ? 'border-ink bg-ink text-paper' : 'border-line'}`}
                  >
                    {c === 'secret' ? 'Client secret' : c === 'certificate' ? 'Certificate' : 'Managed identity'}
                  </button>
                ))}
              </div>
            </fieldset>
          )}
          {flow === 'device-code' && (
            <Toggle
              on={opts.blockDeviceCode}
              onChange={(v) => set({ blockDeviceCode: v })}
              label="Conditional Access: block device code flow"
              hint="Entra ID policy using the “Authentication flows” condition."
            />
          )}
        </div>
        <div>
          <label className="block">
            <span className="font-semibold">Attack</span>
            <select
              value={opts.attack}
              onChange={(e) => set({ attack: e.target.value as AttackId })}
              className="mt-1.5 w-full rounded-lg border-2 border-muted/70 bg-paper px-2 py-2 font-semibold"
            >
              <option value="none">No attack, the normal flow</option>
              {FLOWS[flow].attacks.map((a) => (
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
