import { useEffect, useState } from 'react'
import { CheckCircle2, CircleHelp, FileSearch, XCircle } from 'lucide-react'
import { inspectSaml, sampleResponse, type SamlReport } from './inspect'
import { CodeBlock } from '../../components/CodeBlock'
import { useProgress } from '../progress/progress'

const prettyXml = (xml: string) => {
  let depth = 0
  return xml
    .replace(/>\s*</g, '>\n<')
    .split('\n')
    .map((line) => {
      if (/^<\//.test(line)) depth = Math.max(0, depth - 1)
      const out = '  '.repeat(depth) + line
      if (/^<[^!?/][^>]*[^/]>$/.test(line) && !/<\/[^>]+>$/.test(line)) depth++
      return out
    })
    .join('\n')
}

export function SamlInspector() {
  const [input, setInput] = useState('')
  const [audience, setAudience] = useState('')
  const [acs, setAcs] = useState('')
  const [report, setReport] = useState<SamlReport | null>(null)
  const [error, setError] = useState('')
  const { award } = useProgress()

  useEffect(() => {
    if (!input.trim()) {
      setReport(null)
      setError('')
      return
    }
    let cancelled = false
    inspectSaml(input, { expectedAudience: audience || undefined, expectedAcs: acs || undefined })
      .then((r) => {
        if (cancelled) return
        setReport(r)
        setError('')
        award('saml-inspector')
      })
      .catch((e: Error) => {
        if (cancelled) return
        setReport(null)
        setError(e.message)
      })
    return () => {
      cancelled = true
    }
  }, [input, audience, acs, award])

  return (
    <section className="my-8 rounded-[1.75rem] border-2 border-ink bg-fog p-3 sm:p-5" aria-label="SAML inspector">
      <div className="rounded-2xl border border-line bg-paper p-4">
        <label className="block">
          <span className="font-semibold">SAMLResponse or SAMLRequest</span>
          <span className="block text-sm text-muted">
            The base64 value, a whole URL with <code>SAMLRequest=</code>, or raw XML. Capture one with the SAML-tracer browser extension, or from “Test single
            sign-on” in Entra. Decoding happens only in your browser.
          </span>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={5}
            spellCheck={false}
            placeholder="PHNhbWxwOlJlc3BvbnNlIHhtbG5zOnNhbWxwPSJ1cm46b2FzaXM6bmFtZXM6dGM6U0FNTDoyLjA6cHJvdG9jb2wi…"
            className="mt-2 w-full rounded-xl border-2 border-muted/70 bg-paper p-3 font-mono text-xs focus:border-key"
          />
        </label>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="font-semibold">Expected Entity ID (optional)</span>
            <input value={audience} onChange={(e) => setAudience(e.target.value)} placeholder="https://fjordtech.my.salesforce.com" className="mt-1 w-full rounded-lg border-2 border-muted/70 bg-paper px-2.5 py-1.5 font-mono text-xs focus:border-key" />
          </label>
          <label className="block text-sm">
            <span className="font-semibold">Expected ACS / Reply URL (optional)</span>
            <input value={acs} onChange={(e) => setAcs(e.target.value)} placeholder="https://fjordtech.my.salesforce.com/saml/acs" className="mt-1 w-full rounded-lg border-2 border-muted/70 bg-paper px-2.5 py-1.5 font-mono text-xs focus:border-key" />
          </label>
        </div>
        {!input && (
          <button
            className="btn mt-3 py-1.5 text-sm"
            onClick={() => {
              setInput(sampleResponse())
              setAudience('https://fjordtech.my.salesforce.com')
              setAcs('https://fjordtech.my.salesforce.com/saml/acs')
            }}
          >
            <FileSearch size={15} /> Try a sample response
          </button>
        )}
        {error && <p className="mt-3 text-sm text-leave" role="alert">{error}</p>}
      </div>

      {report && (
        <div className="mt-4 grid gap-4">
          <div className="rounded-2xl border border-line bg-paper p-4">
            <p className="font-display text-lg font-bold">
              SAML {report.kind} <span className="font-sans text-sm font-normal text-muted">({report.binding})</span>
            </p>
            <ul className="mt-3 space-y-2">
              {report.checks.map((c) => (
                <li key={c.label} className="flex gap-2 text-sm">
                  {c.ok === true ? (
                    <CheckCircle2 size={18} className="shrink-0 text-join" role="img" aria-label="Pass:" />
                  ) : c.ok === false ? (
                    <XCircle size={18} className="shrink-0 text-leave" role="img" aria-label="Fail:" />
                  ) : (
                    <CircleHelp size={18} className="shrink-0 text-key" role="img" aria-label="Not checked:" />
                  )}
                  <span>
                    <strong>{c.label}.</strong> {c.detail}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-line bg-paper" tabIndex={0} role="group" aria-label="Decoded fields">
            <table className="w-full min-w-[480px] text-left text-sm">
              <tbody>
                {report.fields.map(([k, v]) => (
                  <tr key={k} className="border-b border-line/60 align-top last:border-0">
                    <th scope="row" className="whitespace-nowrap px-4 py-2 font-semibold">{k}</th>
                    <td className="break-all px-4 py-2 font-mono text-xs">{v}</td>
                  </tr>
                ))}
                {report.attributes.map(([k, vs]) => (
                  <tr key={k} className="border-b border-line/60 align-top last:border-0">
                    <th scope="row" className="px-4 py-2 font-semibold">
                      Attribute <span className="block break-all font-mono text-xs font-normal text-muted">{k}</span>
                    </th>
                    <td className="break-all px-4 py-2 font-mono text-xs">{vs.join(', ')}</td>
                  </tr>
                ))}
                {report.certificate && (
                  <tr className="align-top">
                    <th scope="row" className="px-4 py-2 font-semibold">Signing certificate</th>
                    <td className="break-all px-4 py-2 font-mono text-xs">
                      SHA-1 thumbprint: {report.certificate.sha1}
                      <span className="block text-muted">Compare with the thumbprint under “SAML Certificates” in Entra and the one uploaded to the SP.</span>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <CodeBlock title="Decoded XML" lang="xml" code={prettyXml(report.xml)} />
        </div>
      )}
    </section>
  )
}
