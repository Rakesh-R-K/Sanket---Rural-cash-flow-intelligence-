import { useEffect, useState } from 'react'
import {
  Area, ComposedChart, Line, ReferenceLine, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from 'recharts'
import { api, type Profile } from '../lib/api'
import { RiskBadge, SECTOR_ICON, SECTOR_LABEL, fmtINR } from './shared'
import { SaakhReport } from './SaakhReport'

// history + forecast on one axis; band drawn as area behind forecast line
function CashFlowChart({ p }: { p: Profile }) {
  const hist = p.history.map(h => ({ month: h.month.slice(2), net: h.net, type: 'hist' }))
  const fc = p.forecast
  const data = [
    ...hist,
    ...(fc ? fc.points.map((pt, i) => ({
      month: pt.month.slice(2), forecast: pt.net,
      lo: fc.band[i].lo, hi: fc.band[i].hi,
    })) : []),
  ]
  return (
    <ResponsiveContainer width="100%" height={220}>
      <ComposedChart data={data} margin={{ top: 5, right: 5, bottom: 0, left: 5 }}>
        <XAxis dataKey="month" tick={{ fontSize: 10 }} interval={2} />
        <YAxis tick={{ fontSize: 10 }} width={52}
          tickFormatter={(v: number) => (Math.abs(v) >= 1000 ? `${Math.round(v / 1000)}k` : String(v))} />
        <Tooltip formatter={(v) => fmtINR(Number(v))} />
        <ReferenceLine y={0} stroke="#9ca3af" strokeDasharray="4 4" />
        <Area dataKey="hi" stroke="none" fill="#86efac" fillOpacity={0.35} />
        <Area dataKey="lo" stroke="none" fill="#fafaf5" fillOpacity={1} />
        <Line dataKey="net" stroke="#166534" dot={false} strokeWidth={2} name="Net (history)" />
        <Line dataKey="forecast" stroke="#d97706" strokeDasharray="6 3" dot={{ r: 2 }} strokeWidth={2} name="Forecast" />
      </ComposedChart>
    </ResponsiveContainer>
  )
}

export function EnterpriseProfile({ id, onBack }: { id: number; onBack: () => void }) {
  const [p, setP] = useState<Profile | null>(null)
  const [showSaakh, setShowSaakh] = useState(false)
  const [note, setNote] = useState('')
  const [logged, setLogged] = useState(false)

  const load = () => api.profile(id).then(setP)
  useEffect(() => { void load() }, [id])

  if (!p) return <div className="p-8 text-sm text-gray-500">Loading…</div>
  if (showSaakh) return <SaakhReport id={id} onBack={() => setShowSaakh(false)} />

  const worstFlag = p.flags[0]
  const logIntervention = async () => {
    if (!note.trim()) return
    await api.intervene({ enterprise_id: id, flag_id: worstFlag?.id, officer_note: note })
    setNote(''); setLogged(true)
    await load()
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="rounded bg-gray-200 px-3 py-1 text-sm">← Back</button>
        <span className="text-xl" aria-hidden>{SECTOR_ICON[p.sector]}</span>
        <div>
          <h2 className="font-bold">{p.name}</h2>
          <div className="text-xs text-gray-500">
            {SECTOR_LABEL[p.sector]} · {p.village}, {p.block} · {p.members} members
            {p.loan && <> · EMI {fmtINR(p.loan.emi)}/mo ({p.loan.lender})</>}
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {worstFlag ? <RiskBadge risk={worstFlag.level} /> : <RiskBadge risk="healthy" />}
          <button onClick={() => setShowSaakh(true)}
            className="rounded bg-green-800 px-3 py-1.5 text-xs font-semibold text-white">
            SAAKH Report →
          </button>
        </div>
      </div>

      <section className="rounded-lg border bg-white p-3 shadow-sm">
        <h3 className="mb-1 text-sm font-bold">Cash Flow — 24-month history & 6-month forecast</h3>
        <CashFlowChart p={p} />
        {p.forecast && <div className="text-right text-[10px] text-gray-400">model: {p.forecast.model_tag}</div>}
      </section>

      {p.flags.length > 0 && (
        <section className="rounded-lg border bg-white p-3 shadow-sm">
          <h3 className="mb-2 text-sm font-bold">Why this enterprise is flagged</h3>
          {p.flags.map(f => (
            <div key={f.id} className="mb-2">
              <div className="mb-1 flex items-center gap-2">
                <RiskBadge risk={f.level} small />
                <span className="text-xs text-gray-500">opened {f.opened_at}</span>
              </div>
              <ul className="ml-1 space-y-1">
                {f.reasons.map((r, i) => (
                  <li key={i} className="flex gap-2 text-sm">
                    <span className="text-amber-600">▸</span>{r.text_en}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      )}

      <section className="rounded-lg border bg-white p-3 shadow-sm">
        <h3 className="mb-2 text-sm font-bold">Log intervention</h3>
        {logged && <div className="mb-2 rounded bg-emerald-50 px-2 py-1 text-xs text-emerald-800">Logged — flag resolved. This becomes part of the enterprise's resilience history.</div>}
        <div className="flex gap-2">
          <input value={note} onChange={e => setNote(e.target.value)}
            placeholder="e.g. Visited; advised feed pre-purchase + EMI restructuring"
            className="flex-1 rounded border px-2 py-1.5 text-sm" />
          <button onClick={logIntervention} className="rounded bg-green-800 px-3 py-1.5 text-xs font-semibold text-white">Log</button>
        </div>
        {p.interventions.length > 0 && (
          <ul className="mt-2 space-y-1 text-xs text-gray-600">
            {p.interventions.map((iv, i) => <li key={i}>• {iv.logged_at.slice(0, 10)}: {iv.officer_note}</li>)}
          </ul>
        )}
      </section>

      <section className="rounded-lg border bg-white p-3 shadow-sm">
        <h3 className="mb-2 text-sm font-bold">Recent entries</h3>
        <div className="grid gap-1 text-xs">
          {p.recent_transactions.slice(0, 10).map((t, i) => (
            <div key={i} className="flex justify-between border-b border-gray-100 py-0.5">
              <span>{t.entered_at} · {t.note || t.type}</span>
              <span className={t.type === 'income' ? 'text-emerald-700' : 'text-gray-700'}>
                {t.type === 'income' ? '+' : '−'}{fmtINR(t.amount)}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
