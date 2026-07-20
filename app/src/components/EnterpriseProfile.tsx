import { useEffect, useState } from 'react'
import {
  Area, ComposedChart, Line, ReferenceLine, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from 'recharts'
import { api, type Profile } from '../lib/api'
import { RiskBadge, SectorIcon, SECTOR_LABEL, fmtINR } from './shared'
import { Icon } from './icons'
import { SaakhReport } from './SaakhReport'

function CashFlowChart({ p }: { p: Profile }) {
  const hist = p.history.map(h => ({ month: h.month.slice(2), net: h.net }))
  const fc = p.forecast
  const data = [
    ...hist,
    ...(fc ? fc.points.map((pt, i) => ({
      month: pt.month.slice(2), forecast: pt.net,
      lo: fc.band[i].lo, hi: fc.band[i].hi,
    })) : []),
  ]
  return (
    <ResponsiveContainer width="100%" height={230}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 4 }}>
        <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#a8a29e' }} interval={2}
          axisLine={{ stroke: '#e7e5e0' }} tickLine={false} />
        <YAxis tick={{ fontSize: 10, fill: '#a8a29e' }} width={48} axisLine={false} tickLine={false}
          tickFormatter={(v: number) => (Math.abs(v) >= 1000 ? `${Math.round(v / 1000)}k` : String(v))} />
        <Tooltip
          contentStyle={{ borderRadius: 10, border: '1px solid #e7e5e0', fontSize: 12, boxShadow: '0 8px 24px -8px rgb(0 0 0 / .15)' }}
          formatter={(v) => fmtINR(Number(v))} />
        <ReferenceLine y={0} stroke="#d6d3cd" strokeDasharray="4 4" />
        <Area dataKey="hi" stroke="none" fill="#86efac" fillOpacity={0.3} isAnimationActive animationDuration={800} />
        <Area dataKey="lo" stroke="none" fill="#f7f6f1" fillOpacity={1} isAnimationActive animationDuration={800} />
        <Line dataKey="net" stroke="#166534" dot={false} strokeWidth={2.2} name="Net (history)"
          isAnimationActive animationDuration={900} />
        <Line dataKey="forecast" stroke="#d97706" strokeDasharray="6 3" dot={{ r: 2.5, fill: '#d97706' }}
          strokeWidth={2.2} name="Forecast" isAnimationActive animationDuration={900} animationBegin={400} />
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

  if (!p) return (
    <div className="mx-auto max-w-4xl space-y-3 p-4">
      <div className="skeleton h-14" /><div className="skeleton h-60" /><div className="skeleton h-32" />
    </div>
  )
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
      <div className="rise flex flex-wrap items-center gap-3">
        <button onClick={onBack}
          className="flex items-center gap-1 rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-sm text-stone-600 transition hover:border-stone-300">
          <Icon.chevronLeft size={14} /> Back
        </button>
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-green-50 text-green-800">
          <SectorIcon sector={p.sector} size={20} />
        </span>
        <div>
          <h2 className="font-bold leading-tight">{p.name}</h2>
          <div className="text-xs text-stone-400">
            {SECTOR_LABEL[p.sector]} · {p.village}, {p.block} · {p.members} members
            {p.loan && <> · EMI {fmtINR(p.loan.emi)}/mo · {p.loan.lender}</>}
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {worstFlag ? <RiskBadge risk={worstFlag.level} /> : <RiskBadge risk="healthy" />}
          <button onClick={() => setShowSaakh(true)}
            className="flex items-center gap-1.5 rounded-lg bg-green-800 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-green-900 active:scale-95">
            <Icon.report size={13} /> SAAKH Report
          </button>
        </div>
      </div>

      <section className="card rise rise-1 overflow-hidden">
        <div className="flex items-baseline justify-between border-b border-stone-100 px-4 py-2.5">
          <div className="panel-title">Cash flow — 24-month history · 6-month forecast</div>
          {p.forecast && <span className="text-[10px] text-stone-300">model: {p.forecast.model_tag}</span>}
        </div>
        <div className="p-3"><CashFlowChart p={p} /></div>
      </section>

      {p.flags.length > 0 && (
        <section className="card rise rise-2 overflow-hidden">
          <div className="border-b border-stone-100 px-4 py-2.5">
            <div className="panel-title">Why this enterprise is flagged</div>
          </div>
          <div className="p-4">
            {p.flags.map(f => (
              <div key={f.id} className="mb-3 last:mb-0">
                <div className="mb-1.5 flex items-center gap-2">
                  <RiskBadge risk={f.level} small />
                  <span className="text-xs text-stone-400">opened {f.opened_at}</span>
                </div>
                <ul className="stagger space-y-1.5">
                  {f.reasons.map((r, i) => (
                    <li key={i} className="flex gap-2 text-sm text-stone-700">
                      <Icon.arrowRight size={13} className="mt-1 shrink-0 text-amber-500" />
                      {r.text_en}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="card rise rise-3 overflow-hidden">
        <div className="border-b border-stone-100 px-4 py-2.5">
          <div className="panel-title">Log intervention</div>
        </div>
        <div className="p-4">
          {logged && (
            <div className="fade mb-2 flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
              <Icon.check size={13} /> Logged — flag resolved. This becomes part of the enterprise's resilience history.
            </div>
          )}
          <div className="flex gap-2">
            <input value={note} onChange={e => setNote(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && logIntervention()}
              placeholder="e.g. Visited; advised feed pre-purchase and EMI restructuring"
              className="flex-1 rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none transition focus:border-green-700 focus:ring-2 focus:ring-green-100" />
            <button onClick={logIntervention}
              className="rounded-lg bg-green-800 px-4 py-2 text-xs font-semibold text-white transition hover:bg-green-900 active:scale-95">
              Log
            </button>
          </div>
          {p.interventions.length > 0 && (
            <ul className="mt-3 space-y-1 text-xs text-stone-500">
              {p.interventions.map((iv, i) => (
                <li key={i} className="flex gap-1.5">
                  <Icon.check size={12} className="mt-0.5 shrink-0 text-emerald-600" />
                  {iv.logged_at.slice(0, 10)} — {iv.officer_note}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="card rise rise-4 overflow-hidden">
        <div className="border-b border-stone-100 px-4 py-2.5">
          <div className="panel-title">Recent entries</div>
        </div>
        <div className="grid gap-0.5 p-4 pt-2 text-xs">
          {p.recent_transactions.slice(0, 10).map((t, i) => (
            <div key={i} className="flex items-center justify-between border-b border-stone-50 py-1.5 last:border-0">
              <span className="flex items-center gap-2 text-stone-500">
                {t.type === 'income' ? <Icon.income size={12} className="text-emerald-600" /> : <Icon.expense size={12} className="text-stone-400" />}
                {t.entered_at} · {t.note || t.type}
              </span>
              <span className={`num font-semibold ${t.type === 'income' ? 'text-emerald-700' : 'text-stone-600'}`}>
                {t.type === 'income' ? '+' : '−'}{fmtINR(t.amount)}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
