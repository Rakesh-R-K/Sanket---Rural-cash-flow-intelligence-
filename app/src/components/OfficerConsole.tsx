import { useEffect, useState } from 'react'
import { api, type DistrictRisk, type EnterpriseRow, type LeadTime } from '../lib/api'
import { AnimatedNumber, RiskBadge, SectorIcon, SECTOR_LABEL } from './shared'
import { Icon } from './icons'
import { EnterpriseProfile } from './EnterpriseProfile'

const BLOCK_COLOR = (levels: Record<string, number>) =>
  levels.alert ? 'var(--red)' : levels.warning ? 'var(--amber)'
  : levels.watch ? '#eab308' : '#34d399'

function DistrictMap({ d, active, onSelectBlock }:
  { d: DistrictRisk; active: string | null; onSelectBlock: (b: string | null) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {Object.entries(d.blocks).map(([name, b]) => {
        const total = Object.values(b.levels).reduce((a, c) => a + c, 0)
        const flagged = (b.levels.alert ?? 0) + (b.levels.warning ?? 0) + (b.levels.watch ?? 0)
        const c = BLOCK_COLOR(b.levels)
        const stressedSectors = Object.entries(b.sectors)
          .filter(([, r]) => (r.alert ?? 0) + (r.warning ?? 0) > 0).map(([s]) => s)
        return (
          <button key={name} onClick={() => onSelectBlock(active === name ? null : name)}
            className={`card card-hover p-3 text-left transition-all ${active === name ? 'ring-2 ring-green-700' : ''}`}
            style={{ borderColor: c }}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">{name}</span>
              <span className={`h-2.5 w-2.5 rounded-full ${b.levels.alert ? 'live-dot' : ''}`}
                style={{ background: c }} />
            </div>
            <div className="mt-1.5 flex h-1.5 overflow-hidden rounded-full bg-stone-100">
              {(['alert', 'warning', 'watch'] as const).map(l => {
                const n = b.levels[l] ?? 0
                return n ? <div key={l} style={{
                  width: `${(n / total) * 100}%`,
                  background: l === 'alert' ? 'var(--red)' : l === 'warning' ? 'var(--amber)' : '#eab308',
                  transition: 'width .6s cubic-bezier(.22,.9,.3,1)',
                }} /> : null
              })}
            </div>
            <div className="mt-1.5 flex items-center justify-between">
              <span className="text-[11px] text-stone-500 num">{flagged}/{total} flagged</span>
              <span className="flex gap-1 text-stone-400">
                {stressedSectors.map(s => <SectorIcon key={s} sector={s} size={12} />)}
              </span>
            </div>
          </button>
        )
      })}
    </div>
  )
}

function LeadTimeCard({ lead }: { lead: LeadTime }) {
  if (lead.median_lead_days == null) return null
  const onTarget = lead.median_lead_days >= lead.target_days
  return (
    <section className="card overflow-hidden">
      <div className="border-b border-green-100 bg-gradient-to-r from-green-50 to-transparent px-4 py-2.5">
        <div className="panel-title flex items-center gap-1.5 !text-green-800">
          <Icon.clock size={12} /> Early-warning lead time
        </div>
      </div>
      <div className="flex items-end gap-3 px-4 py-3">
        <div className="countup text-4xl font-black tracking-tight text-green-900">
          <AnimatedNumber value={lead.median_lead_days} />
          <span className="ml-1 text-base font-semibold text-stone-400">days</span>
        </div>
        <div className="mb-1 ml-auto text-right">
          <div className={`text-xs font-bold ${onTarget ? 'text-green-700' : 'text-amber-700'}`}>
            {onTarget ? 'on target' : 'below target'} · {lead.target_days}d
          </div>
          <div className="text-[10px] text-stone-400 num">range {lead.min_lead_days}–{lead.max_lead_days}d · n={lead.flags_with_projected_distress}</div>
        </div>
      </div>
      <p className="px-4 pb-3 text-[11px] leading-snug text-stone-500">
        Median warning before projected cash distress — the intervention window, not an accuracy score.
      </p>
    </section>
  )
}

export function OfficerConsole() {
  const [rows, setRows] = useState<EnterpriseRow[]>([])
  const [district, setDistrict] = useState<DistrictRisk | null>(null)
  const [lead, setLead] = useState<LeadTime | null>(null)
  const [selected, setSelected] = useState<number | null>(null)
  const [blockFilter, setBlockFilter] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)

  const refresh = async () => {
    const [r, d, l] = await Promise.all([api.enterprises(), api.district(), api.leadtime()])
    setRows(r); setDistrict(d); setLead(l); setLoaded(true)
  }
  useEffect(() => { void refresh() }, [])

  const runShock = async (key: string, label: string) => {
    setBusy(label)
    await api.shock(key)
    await refresh()
    setBusy(null)
  }
  const runReset = async () => {
    setBusy('Resetting')
    await api.reset()
    await refresh()
    setSelected(null); setBusy(null)
  }

  if (selected !== null)
    return <EnterpriseProfile id={selected} onBack={() => { setSelected(null); void refresh() }} />

  const visible = blockFilter ? rows.filter(r => r.block === blockFilter) : rows

  return (
    <div className="mx-auto grid max-w-6xl gap-5 p-4 lg:grid-cols-[1fr_330px]">
      {/* ── triage list ── */}
      <div>
        <div className="rise mb-4 flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <h2 className="text-xl font-bold tracking-tight">Wardha District</h2>
          {district && (
            <div className="flex items-center gap-3 text-sm text-stone-500">
              <span className="num">{district.kpis.total} enterprises</span>
              <span className="flex items-center gap-1 font-semibold text-red-700">
                <Icon.alert size={13} /><AnimatedNumber value={district.kpis.alerts} /> alert
              </span>
              <span className="flex items-center gap-1 font-semibold text-amber-700">
                <Icon.warning size={13} /><AnimatedNumber value={district.kpis.warnings} /> warning
              </span>
            </div>
          )}
          {blockFilter && (
            <button onClick={() => setBlockFilter(null)}
              className="rounded-full border border-stone-300 bg-white px-2.5 py-0.5 text-xs font-medium text-stone-600 hover:border-stone-400">
              {blockFilter} ×
            </button>
          )}
        </div>

        {!loaded ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton h-16" />)}
          </div>
        ) : (
          <div className="stagger space-y-2" key={blockFilter ?? 'all'}>
            {visible.map(e => (
              <button key={e.id} onClick={() => setSelected(e.id)}
                className={`card card-hover risk-rail-${e.risk} flex w-full items-center gap-3 p-3 text-left`}>
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-stone-100 text-stone-600">
                  <SectorIcon sector={e.sector} size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold">{e.name}</span>
                    <RiskBadge risk={e.risk} small />
                  </div>
                  <div className="text-xs text-stone-400">
                    {SECTOR_LABEL[e.sector]} · {e.village}, {e.block}
                  </div>
                  {e.top_reason && (
                    <div className="mt-0.5 flex items-center gap-1 truncate text-xs text-stone-600">
                      <Icon.arrowRight size={10} className="shrink-0 text-stone-300" />
                      {e.top_reason.text_en}
                    </div>
                  )}
                </div>
                {e.reason_count > 0 && (
                  <span className="num rounded-full bg-stone-100 px-2 py-0.5 text-xs font-bold text-stone-600">
                    {e.reason_count}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── right rail ── */}
      <div className="space-y-4">
        {lead && <div className="rise rise-1"><LeadTimeCard lead={lead} /></div>}

        {district && district.bulletins.length > 0 && (
          <section className="card rise rise-2 overflow-hidden">
            <div className="border-b border-red-100 bg-gradient-to-r from-red-50 to-transparent px-4 py-2.5">
              <div className="panel-title flex items-center gap-1.5 !text-red-800">
                <Icon.signal size={12} /> Cluster bulletins
              </div>
            </div>
            <div className="space-y-2 p-3">
              {district.bulletins.map((b, i) => (
                <div key={i} className="fade rounded-lg border border-red-100 bg-red-50/50 p-2.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-700">
                    <SectorIcon sector={b.sector} size={13} /> {SECTOR_LABEL[b.sector]}
                    <span className="num ml-auto rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-700">
                      {b.stressed_units}/{b.exposed_units} stressed
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] leading-snug text-stone-600">{b.text}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {district && (
          <>
            <section className="card rise rise-3 overflow-hidden">
              <div className="border-b border-stone-100 px-4 py-2.5">
                <div className="panel-title flex items-center gap-1.5">
                  <Icon.map size={12} /> District risk map
                </div>
              </div>
              <div className="p-3">
                <DistrictMap d={district} active={blockFilter} onSelectBlock={setBlockFilter} />
              </div>
            </section>

            <section className="card rise rise-4 overflow-hidden">
              <div className="border-b border-stone-100 px-4 py-2.5">
                <div className="panel-title flex items-center gap-1.5">
                  <Icon.signal size={12} /> Active signals
                </div>
              </div>
              <div className="p-3">
                {district.signals.length === 0 ? (
                  <div className="text-xs text-stone-400">No active market or climate signals</div>
                ) : (
                  <div className="space-y-1.5">
                    {district.signals.map((s, i) => (
                      <div key={i} className="fade flex items-center gap-2 rounded-lg border border-red-100 bg-red-50/60 px-2.5 py-1.5 text-xs">
                        <span className="h-1.5 w-1.5 rounded-full bg-red-500 live-dot" />
                        <span className="font-bold uppercase tracking-wide text-red-700">{s.commodity}</span>
                        <span className="text-stone-600">{s.kind.replace('_', ' ')}</span>
                        <span className="num ml-auto font-mono font-semibold text-red-600">z={s.magnitude_z}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </>
        )}

        <section className="card rise rise-5 overflow-hidden border-dashed">
          <div className="border-b border-stone-100 px-4 py-2.5">
            <div className="panel-title">Scenario simulator · demo</div>
          </div>
          <div className="flex flex-wrap gap-2 p-3">
            <button disabled={!!busy} onClick={() => runShock('feed_spike', 'Injecting feed-price spike')}
              className="flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-amber-700 active:scale-95 disabled:opacity-40">
              <Icon.play size={11} /> Feed-price spike
            </button>
            <button disabled={!!busy} onClick={() => runShock('monsoon_deficit', 'Injecting monsoon deficit')}
              className="flex items-center gap-1.5 rounded-lg bg-sky-700 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-sky-800 active:scale-95 disabled:opacity-40">
              <Icon.play size={11} /> Monsoon deficit
            </button>
            <button disabled={!!busy} onClick={runReset}
              className="flex items-center gap-1.5 rounded-lg bg-stone-500 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-stone-600 active:scale-95 disabled:opacity-40">
              <Icon.refresh size={11} /> Reset
            </button>
          </div>
          {busy && (
            <div className="flex items-center gap-2 px-4 pb-3 text-xs text-stone-500">
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-stone-300 border-t-green-700" />
              {busy} — running cascade…
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
