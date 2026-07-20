import { useEffect, useState } from 'react'
import { api, type DistrictRisk, type EnterpriseRow, type LeadTime } from '../lib/api'
import { AnimatedNumber, RiskBadge, SectorIcon, SECTOR_LABEL } from './shared'
import { Icon } from './icons'
import { EnterpriseProfile } from './EnterpriseProfile'
import { CascadeOverlay, type CascadeResult } from './CascadeOverlay'

const LEVEL_COLOR: Record<string, string> = {
  alert: 'var(--sig-red)', warning: 'var(--sig-amber)',
  watch: '#eab308', healthy: 'var(--sig-green)',
}
const blockLevel = (levels: Record<string, number>) =>
  levels.alert ? 'alert' : levels.warning ? 'warning' : levels.watch ? 'watch' : 'healthy'

/* ── signal ticker tape across the top ── */
function SignalTicker({ d }: { d: DistrictRisk }) {
  const items = d.signals.length
    ? d.signals.map(s => ({
        hot: true,
        text: `${s.commodity.toUpperCase()} ${s.kind.replace('_', ' ').toUpperCase()} z=${s.magnitude_z}`,
      }))
    : [
        { hot: false, text: 'MAIZE · district mandis · steady' },
        { hot: false, text: 'SOYBEAN · district mandis · steady' },
        { hot: false, text: 'MONSOON · Wardha · within climatology' },
      ]
  const row = [...items, { hot: false, text: `${d.kpis.total} ENTERPRISES MONITORED · WARDHA DISTRICT` }]
  const doubled = [...row, ...row]
  return (
    <div className="ticker-wrap mono border-b border-[var(--edge)] bg-[var(--deep)] py-1.5 text-[10px] tracking-[.15em]">
      <div className="ticker-track">
        {doubled.map((it, i) => (
          <span key={i} className={`flex items-center gap-2 ${it.hot ? 'text-[var(--sig-red)]' : 'text-[var(--text-faint)]'}`}>
            <span className={`h-1 w-1 rounded-full ${it.hot ? 'bg-[var(--sig-red)] dot-live' : 'bg-[var(--edge-lit)]'}`} />
            {it.text}
          </span>
        ))}
      </div>
    </div>
  )
}

/* ── radial gauge for lead time ── */
function LeadGauge({ lead }: { lead: LeadTime }) {
  if (lead.median_lead_days == null) return null
  const pct = Math.min(1, lead.median_lead_days / (lead.target_days * 2))
  const R = 42, C = 2 * Math.PI * R
  const onTarget = lead.median_lead_days >= lead.target_days
  return (
    <section className="panel scanning">
      <div className="panel-head"><Icon.clock size={11} className="lit" /> Early-warning lead time</div>
      <div className="flex items-center gap-4 p-4">
        <div className="relative h-[104px] w-[104px] shrink-0">
          <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
            <circle cx="50" cy="50" r={R} fill="none" stroke="var(--edge)" strokeWidth="7" />
            <circle cx="50" cy="50" r={R} fill="none"
              stroke={onTarget ? 'var(--sig-green)' : 'var(--sig-amber)'} strokeWidth="7"
              strokeLinecap="round" strokeDasharray={C}
              strokeDashoffset={C * (1 - pct)}
              style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(.2,.85,.25,1)', filter: `drop-shadow(0 0 6px ${onTarget ? 'var(--sig-green-glow)' : 'var(--sig-amber-glow)'})` }} />
          </svg>
          <div className="absolute inset-0 grid place-items-center">
            <div className="text-center">
              <div className="num countup text-2xl font-black text-[var(--text)]">
                <AnimatedNumber value={lead.median_lead_days} />
              </div>
              <div className="mono text-[9px] uppercase tracking-wider text-[var(--text-faint)]">days</div>
            </div>
          </div>
        </div>
        <div className="min-w-0">
          <div className={`text-xs font-bold ${onTarget ? 'text-[var(--sig-green)]' : 'text-[var(--sig-amber)]'}`}>
            {onTarget ? 'ON TARGET' : 'BELOW TARGET'} · {lead.target_days}d goal
          </div>
          <div className="mono num mt-0.5 text-[10px] text-[var(--text-faint)]">
            range {lead.min_lead_days}–{lead.max_lead_days}d · n={lead.flags_with_projected_distress}
          </div>
          <p className="mt-1.5 text-[11px] leading-snug text-[var(--text-dim)]">
            Median warning before projected cash distress — the intervention window, not an accuracy score.
          </p>
        </div>
      </div>
    </section>
  )
}

/* ── district map: SVG constellation of blocks ── */
function DistrictMap({ d, active, onSelectBlock }:
  { d: DistrictRisk; active: string | null; onSelectBlock: (b: string | null) => void }) {
  // fixed layout for Wardha's four demo blocks, drawn as a connected graph
  const POS: Record<string, { x: number; y: number }> = {
    Seloo: { x: 30, y: 24 }, Wardha: { x: 50, y: 50 },
    Deoli: { x: 68, y: 34 }, Arvi: { x: 22, y: 62 }, Hinganghat: { x: 66, y: 74 },
  }
  const blocks = Object.entries(d.blocks)
  const edges: [string, string][] = []
  for (let i = 0; i < blocks.length; i++)
    for (let j = i + 1; j < blocks.length; j++) edges.push([blocks[i][0], blocks[j][0]])
  return (
    <div className="relative">
      <svg viewBox="0 0 100 92" className="w-full">
        {edges.map(([a, b], i) => {
          const p1 = POS[a] ?? { x: 50, y: 50 }, p2 = POS[b] ?? { x: 50, y: 50 }
          return <line key={i} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
            stroke="var(--edge)" strokeWidth=".5" strokeDasharray="2 3"
            style={{ animation: 'dashFlow 3s linear infinite' }} />
        })}
        {blocks.map(([name, b]) => {
          const p = POS[name] ?? { x: 50, y: 50 }
          const lvl = blockLevel(b.levels)
          const total = Object.values(b.levels).reduce((s, n) => s + n, 0)
          const flagged = (b.levels.alert ?? 0) + (b.levels.warning ?? 0) + (b.levels.watch ?? 0)
          const r = 6 + Math.min(6, total * 0.45)
          const c = LEVEL_COLOR[lvl]
          return (
            <g key={name} onClick={() => onSelectBlock(active === name ? null : name)}
              className="cursor-pointer" style={{ animation: 'popIn .5s both' }}>
              {lvl !== 'healthy' && (
                <circle cx={p.x} cy={p.y} r={r} fill="none" stroke={c} strokeWidth=".8" opacity=".6">
                  <animate attributeName="r" values={`${r};${r * 2.1}`} dur="1.8s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values=".6;0" dur="1.8s" repeatCount="indefinite" />
                </circle>
              )}
              <circle cx={p.x} cy={p.y} r={r} fill={c} fillOpacity={active === name ? .5 : .22}
                stroke={c} strokeWidth={active === name ? 1.6 : 1}
                style={{ transition: 'all .4s ease', filter: lvl !== 'healthy' ? `drop-shadow(0 0 4px ${c})` : undefined }} />
              <text x={p.x} y={p.y - r - 3} textAnchor="middle" fill="var(--text-dim)"
                fontSize="4.4" fontWeight="700" style={{ letterSpacing: '.08em' }}>{name.toUpperCase()}</text>
              <text x={p.x} y={p.y + 1.6} textAnchor="middle" fill="var(--text)"
                fontSize="4.6" fontWeight="800" className="num">{flagged}/{total}</text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

/* ── portfolio composition bar ── */
function CompositionBar({ rows }: { rows: EnterpriseRow[] }) {
  const counts = { alert: 0, warning: 0, watch: 0, healthy: 0 }
  rows.forEach(r => { counts[r.risk] += 1 })
  const total = rows.length || 1
  return (
    <div className="flex h-2 overflow-hidden rounded-full border border-[var(--edge)]">
      {(['alert', 'warning', 'watch', 'healthy'] as const).map(l => counts[l] > 0 && (
        <div key={l} title={`${counts[l]} ${l}`}
          style={{ width: `${(counts[l] / total) * 100}%`, background: LEVEL_COLOR[l], opacity: l === 'healthy' ? .45 : .9, transition: 'width .8s cubic-bezier(.2,.85,.25,1)' }} />
      ))}
    </div>
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
  const [cascade, setCascade] = useState<CascadeResult | null>(null)

  const refresh = async () => {
    const [r, d, l] = await Promise.all([api.enterprises(), api.district(), api.leadtime()])
    setRows(r); setDistrict(d); setLead(l); setLoaded(true)
  }
  useEffect(() => { void refresh() }, [])

  const runShock = async (key: string, label: string) => {
    setBusy(label)
    const result = await api.shock(key)
    setCascade(result)          // overlay narrates while data refreshes behind
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
    <>
      {cascade && <CascadeOverlay result={cascade} onDone={() => setCascade(null)} />}
      {district && <SignalTicker d={district} />}

      <div className="mx-auto grid max-w-6xl gap-5 p-4 lg:grid-cols-[1fr_340px]">
        {/* ── left: triage ── */}
        <div>
          <div className="rise mb-4 flex flex-wrap items-center gap-x-4 gap-y-2">
            <div>
              <div className="mono text-[10px] uppercase tracking-[.2em] text-[var(--text-faint)]">Field officer console</div>
              <h2 className="text-xl font-black tracking-tight text-[var(--text)]">Wardha District</h2>
            </div>
            {district && (
              <div className="mono ml-auto flex items-center gap-4 text-xs">
                <span className="num text-[var(--text-dim)]">{district.kpis.total} monitored</span>
                <span className="flex items-center gap-1.5 font-bold text-[var(--sig-red)]">
                  <Icon.alert size={13} /><AnimatedNumber value={district.kpis.alerts} /> ALERT
                </span>
                <span className="flex items-center gap-1.5 font-bold text-[var(--sig-amber)]">
                  <Icon.warning size={13} /><AnimatedNumber value={district.kpis.warnings} /> WARN
                </span>
              </div>
            )}
          </div>

          <div className="rise rise-1 mb-3"><CompositionBar rows={rows} /></div>

          {blockFilter && (
            <button onClick={() => setBlockFilter(null)}
              className="fade mono mb-3 rounded-full border border-[var(--edge-lit)] bg-[var(--surface)] px-3 py-1 text-[10px] uppercase tracking-wider text-[var(--text-dim)] hover:text-[var(--text)]">
              filter: {blockFilter} — clear ×
            </button>
          )}

          {!loaded ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton h-16" />)}
            </div>
          ) : (
            <div className="stagger space-y-2" key={blockFilter ?? 'all'}>
              {visible.map(e => (
                <button key={e.id} onClick={() => setSelected(e.id)}
                  className={`panel panel-hover rail-${e.risk} flex w-full items-center gap-3 p-3 text-left`}>
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-[var(--edge)] bg-[var(--deep)] text-[var(--text-dim)]">
                    <SectorIcon sector={e.sector} size={17} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-bold text-[var(--text)]">{e.name}</span>
                      <RiskBadge risk={e.risk} small />
                    </div>
                    <div className="mono text-[10px] uppercase tracking-wide text-[var(--text-faint)]">
                      {SECTOR_LABEL[e.sector]} · {e.village} · {e.block}
                    </div>
                    {e.top_reason && (
                      <div className="mt-0.5 flex items-center gap-1 truncate text-xs text-[var(--text-dim)]">
                        <Icon.arrowRight size={10} className="shrink-0 text-[var(--text-faint)]" />
                        {e.top_reason.text_en}
                      </div>
                    )}
                  </div>
                  {e.reason_count > 0 && (
                    <span className="mono num rounded-md border border-[var(--edge)] bg-[var(--deep)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--text-dim)]">
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
          {lead && <div className="rise rise-1"><LeadGauge lead={lead} /></div>}

          {district && (
            <section className="panel rise rise-2">
              <div className="panel-head"><Icon.map size={11} className="lit" /> District constellation</div>
              <div className="p-3">
                <DistrictMap d={district} active={blockFilter} onSelectBlock={setBlockFilter} />
              </div>
            </section>
          )}

          {district && district.bulletins.length > 0 && (
            <section className="panel rise rise-3" style={{ borderColor: 'rgba(251,95,95,.3)' }}>
              <div className="panel-head" style={{ color: 'var(--sig-red)' }}>
                <Icon.signal size={11} /> Cluster bulletins
              </div>
              <div className="space-y-2 p-3">
                {district.bulletins.map((b, i) => (
                  <div key={i} className="fade rounded-lg border border-[rgba(251,95,95,.2)] bg-[rgba(251,95,95,.05)] p-2.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--text)]">
                      <SectorIcon sector={b.sector} size={13} /> {SECTOR_LABEL[b.sector]}
                      <span className="mono num ml-auto rounded bg-[rgba(251,95,95,.15)] px-1.5 py-0.5 text-[9px] font-bold text-[var(--sig-red)]">
                        {b.stressed_units}/{b.exposed_units} STRESSED
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] leading-snug text-[var(--text-dim)]">{b.text}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="panel rise rise-4" style={{ borderStyle: 'dashed' }}>
            <div className="panel-head">Scenario simulator · demo</div>
            <div className="flex flex-wrap gap-2 p-3">
              <button disabled={!!busy} onClick={() => runShock('feed_spike', 'feed spike')}
                className="flex items-center gap-1.5 rounded-lg border border-[rgba(251,191,36,.4)] bg-[rgba(251,191,36,.1)] px-3 py-2 text-xs font-bold text-[var(--sig-amber)] transition hover:bg-[rgba(251,191,36,.18)] active:scale-95 disabled:opacity-30">
                <Icon.play size={11} /> Feed-price spike
              </button>
              <button disabled={!!busy} onClick={() => runShock('monsoon_deficit', 'monsoon deficit')}
                className="flex items-center gap-1.5 rounded-lg border border-[rgba(56,189,248,.4)] bg-[rgba(56,189,248,.08)] px-3 py-2 text-xs font-bold text-[var(--sig-blue)] transition hover:bg-[rgba(56,189,248,.16)] active:scale-95 disabled:opacity-30">
                <Icon.play size={11} /> Monsoon deficit
              </button>
              <button disabled={!!busy} onClick={runReset}
                className="flex items-center gap-1.5 rounded-lg border border-[var(--edge-lit)] bg-[var(--surface-2)] px-3 py-2 text-xs font-bold text-[var(--text-dim)] transition hover:text-[var(--text)] active:scale-95 disabled:opacity-30">
                <Icon.refresh size={11} /> Reset
              </button>
            </div>
            {busy && (
              <div className="mono flex items-center gap-2 px-4 pb-3 text-[10px] uppercase tracking-wider text-[var(--text-faint)]">
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-[var(--edge)] border-t-[var(--sig-green)]" />
                {busy} — running cascade
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  )
}
