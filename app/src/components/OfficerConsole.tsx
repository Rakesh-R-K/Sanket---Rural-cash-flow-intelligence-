import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
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

const spring = { type: 'spring', stiffness: 300, damping: 30 } as const

/* ── editorial marquee ── */
function Marquee({ d }: { d: DistrictRisk }) {
  const items = d.signals.length
    ? d.signals.map(s => ({ hot: true, text: `${s.commodity.toUpperCase()} ${s.kind.replace('_', ' ').toUpperCase()} · z=${s.magnitude_z}` }))
    : [
        { hot: false, text: 'MAIZE — district mandis steady' },
        { hot: false, text: 'SOYBEAN — district mandis steady' },
        { hot: false, text: 'MONSOON — within climatology' },
      ]
  const row = [...items,
    { hot: false, text: `${d.kpis.total} ENTERPRISES MONITORED` },
    { hot: false, text: 'WARDHA · VIDARBHA · MAHARASHTRA' },
    { hot: false, text: 'AGMARKNET LIVE · IMD CALIBRATED' }]
  const doubled = [...row, ...row]
  return (
    <div className="marquee border-b border-[var(--edge)] py-2.5">
      <div className="marquee-track mono text-[10px] font-medium tracking-[.22em]">
        {doubled.map((it, i) => (
          <span key={i} className={`flex items-center gap-2.5 ${it.hot ? 'text-[var(--sig-red)]' : 'text-[var(--ink-faint)]'}`}>
            <span className={`h-1 w-1 rounded-full ${it.hot ? 'bg-[var(--sig-red)] dot-live' : 'bg-[var(--lime)]'}`}
              style={it.hot ? undefined : { opacity: .5 }} />
            {it.text}
          </span>
        ))}
      </div>
    </div>
  )
}

/* ── qount-style stat band: huge numerals, thin rules ── */
function StatBand({ d, lead }: { d: DistrictRisk; lead: LeadTime | null }) {
  const stats = [
    { label: 'enterprises monitored', value: d.kpis.total, tone: 'var(--ink)' },
    { label: 'alerts open', value: d.kpis.alerts, tone: d.kpis.alerts ? 'var(--sig-red)' : 'var(--ink)' },
    { label: 'warnings open', value: d.kpis.warnings, tone: d.kpis.warnings ? 'var(--sig-amber)' : 'var(--ink)' },
    { label: 'days median lead time', value: lead?.median_lead_days ?? 0, tone: 'var(--lime)' },
  ]
  return (
    <motion.div className="grid grid-cols-2 divide-[var(--edge)] border-y border-[var(--edge)] md:grid-cols-4 md:divide-x"
      initial="off" animate="on" variants={{ on: { transition: { staggerChildren: .08 } } }}>
      {stats.map(s => (
        <motion.div key={s.label} className="px-5 py-5"
          variants={{ off: { opacity: 0, y: 18 }, on: { opacity: 1, y: 0, transition: spring } }}>
          <div className="display num text-[2.75rem] font-bold leading-none" style={{ color: s.tone }}>
            <AnimatedNumber value={s.value} />
          </div>
          <div className="mono mt-2 text-[9px] uppercase tracking-[.24em] text-[var(--ink-faint)]">{s.label}</div>
        </motion.div>
      ))}
    </motion.div>
  )
}

/* ── constellation map ── */
function DistrictMap({ d, active, onSelectBlock }:
  { d: DistrictRisk; active: string | null; onSelectBlock: (b: string | null) => void }) {
  const POS: Record<string, { x: number; y: number }> = {
    Seloo: { x: 30, y: 24 }, Deoli: { x: 68, y: 34 },
    Arvi: { x: 22, y: 62 }, Hinganghat: { x: 66, y: 74 },
  }
  const blocks = Object.entries(d.blocks)
  const edges: [string, string][] = []
  for (let i = 0; i < blocks.length; i++)
    for (let j = i + 1; j < blocks.length; j++) edges.push([blocks[i][0], blocks[j][0]])
  return (
    <svg viewBox="0 0 100 92" className="w-full">
      {edges.map(([a, b], i) => {
        const p1 = POS[a] ?? { x: 50, y: 50 }, p2 = POS[b] ?? { x: 50, y: 50 }
        return <line key={i} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
          stroke="var(--edge-lit)" strokeWidth=".4" strokeDasharray="2 3"
          style={{ animation: 'dashFlow 3s linear infinite' }} />
      })}
      {blocks.map(([name, b], bi) => {
        const p = POS[name] ?? { x: 50, y: 50 }
        const lvl = blockLevel(b.levels)
        const total = Object.values(b.levels).reduce((s, n) => s + n, 0)
        const flagged = (b.levels.alert ?? 0) + (b.levels.warning ?? 0) + (b.levels.watch ?? 0)
        const r = 6 + Math.min(6, total * 0.45)
        const c = LEVEL_COLOR[lvl]
        return (
          <motion.g key={name} onClick={() => onSelectBlock(active === name ? null : name)}
            className="cursor-pointer"
            initial={{ opacity: 0, scale: .6 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ ...spring, delay: bi * .1 }}>
            {lvl !== 'healthy' && (
              <circle cx={p.x} cy={p.y} r={r} fill="none" stroke={c} strokeWidth=".7" opacity=".55">
                <animate attributeName="r" values={`${r};${r * 2.1}`} dur="1.9s" repeatCount="indefinite" />
                <animate attributeName="opacity" values=".55;0" dur="1.9s" repeatCount="indefinite" />
              </circle>
            )}
            <circle cx={p.x} cy={p.y} r={r} fill={c} fillOpacity={active === name ? .5 : .2}
              stroke={c} strokeWidth={active === name ? 1.5 : .9}
              style={{ transition: 'all .4s ease', filter: lvl !== 'healthy' ? `drop-shadow(0 0 5px ${c})` : undefined }} />
            <text x={p.x} y={p.y - r - 3.2} textAnchor="middle" fill="var(--ink-dim)"
              fontSize="4.2" fontWeight="700" style={{ letterSpacing: '.12em' }}>{name.toUpperCase()}</text>
            <text x={p.x} y={p.y + 1.7} textAnchor="middle" fill="var(--ink)"
              fontSize="4.6" fontWeight="800" className="num">{flagged}/{total}</text>
          </motion.g>
        )
      })}
    </svg>
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
    setCascade(result)
    await refresh()
    setBusy(null)
  }
  const runReset = async () => {
    setBusy('resetting')
    await api.reset()
    await refresh()
    setSelected(null); setBusy(null)
  }

  if (selected !== null)
    return <EnterpriseProfile id={selected} onBack={() => { setSelected(null); void refresh() }} />

  const visible = blockFilter ? rows.filter(r => r.block === blockFilter) : rows
  const needAttention = (district?.kpis.alerts ?? 0) + (district?.kpis.warnings ?? 0)

  return (
    <>
      <AnimatePresence>
        {cascade && <CascadeOverlay result={cascade} onDone={() => setCascade(null)} />}
      </AnimatePresence>
      {district && <Marquee d={district} />}

      {/* ── editorial hero ── */}
      <section className="mx-auto max-w-6xl px-5 pb-8 pt-10">
        <motion.div className="kicker" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: .1 }}>
          Field officer console · Wardha district
        </motion.div>
        <motion.h1 className="display mt-4 max-w-3xl text-[clamp(2.2rem,5.5vw,4rem)] font-bold leading-[1.02] tracking-tight text-[var(--ink)]"
          initial="off" animate="on" variants={{ on: { transition: { staggerChildren: .09, delayChildren: .15 } } }}>
          {[
            <span key="a">Every rupee flow,{' '}</span>,
            <span key="b" className="text-[var(--ink-faint)]">seen early.{' '}</span>,
            <span key="c" className="serif-accent text-[var(--lime)]" style={{ textShadow: '0 0 30px var(--lime-glow)' }}>
              {needAttention > 0 ? `${needAttention} need you today.` : 'All quiet today.'}
            </span>,
          ].map((chunk, i) => (
            <motion.span key={i} className="inline-block"
              variants={{ off: { opacity: 0, y: 28, filter: 'blur(8px)' }, on: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: .6, ease: [.2, .8, .2, 1] } } }}>
              {chunk}
            </motion.span>
          ))}
        </motion.h1>
        {district && <div className="mt-8"><StatBand d={district} lead={lead} /></div>}
      </section>

      <div className="mx-auto grid max-w-6xl gap-6 px-5 lg:grid-cols-[1fr_330px]">
        {/* ── triage ── */}
        <div>
          <div className="mb-4 flex items-center gap-3">
            <span className="kicker">Triage — ranked by risk</span>
            {blockFilter && (
              <motion.button initial={{ opacity: 0, scale: .8 }} animate={{ opacity: 1, scale: 1 }}
                onClick={() => setBlockFilter(null)}
                className="mono rounded-full border border-[rgba(201,242,75,.4)] bg-[rgba(201,242,75,.08)] px-3 py-1 text-[9px] uppercase tracking-[.2em] text-[var(--lime)]">
                {blockFilter} — clear ×
              </motion.button>
            )}
          </div>

          {!loaded ? (
            <div className="space-y-2.5">
              {Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton h-[72px]" />)}
            </div>
          ) : (
            <motion.div className="space-y-2.5" initial="off" animate="on"
              variants={{ on: { transition: { staggerChildren: .045 } } }} key={blockFilter ?? 'all'}>
              {visible.map(e => (
                <motion.button key={e.id} layout onClick={() => setSelected(e.id)}
                  variants={{ off: { opacity: 0, y: 20 }, on: { opacity: 1, y: 0, transition: spring } }}
                  whileHover={{ x: 8, transition: { type: 'spring', stiffness: 500, damping: 28 } }}
                  whileTap={{ scale: .985 }}
                  className={`panel panel-hover rail-${e.risk} group flex w-full items-center gap-4 p-4 text-left`}>
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[var(--edge)] bg-[var(--bg-2)] text-[var(--ink-dim)] transition-colors group-hover:border-[rgba(201,242,75,.35)] group-hover:text-[var(--lime)]">
                    <SectorIcon sector={e.sector} size={18} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2.5">
                      <span className="display truncate text-[15px] font-bold text-[var(--ink)]">{e.name}</span>
                      <RiskBadge risk={e.risk} small />
                    </div>
                    <div className="mono mt-0.5 text-[9px] uppercase tracking-[.18em] text-[var(--ink-faint)]">
                      {SECTOR_LABEL[e.sector]} · {e.village} · {e.block}
                    </div>
                    {e.top_reason && (
                      <div className="mt-1 flex items-center gap-1.5 truncate text-xs text-[var(--ink-dim)]">
                        <Icon.arrowRight size={10} className="shrink-0 text-[var(--ink-faint)]" />
                        {e.top_reason.text_en}
                      </div>
                    )}
                  </div>
                  <span className="translate-x-1 text-[var(--ink-faint)] opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:text-[var(--lime)] group-hover:opacity-100">
                    <Icon.arrowRight size={16} />
                  </span>
                </motion.button>
              ))}
            </motion.div>
          )}
        </div>

        {/* ── rail ── */}
        <div className="space-y-5">
          {district && (
            <motion.section className="panel panel-lit" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: .2 }}>
              <div className="panel-head"><Icon.map size={11} className="lit" /> District constellation</div>
              <div className="p-4">
                <DistrictMap d={district} active={blockFilter} onSelectBlock={setBlockFilter} />
              </div>
            </motion.section>
          )}

          {district && district.bulletins.length > 0 && (
            <motion.section className="panel" style={{ borderColor: 'rgba(248,113,113,.3)' }}
              initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: .3 }}>
              <div className="panel-head" style={{ color: 'var(--sig-red)' }}>
                <Icon.signal size={11} /> Cluster bulletins
              </div>
              <div className="space-y-2.5 p-3.5">
                {district.bulletins.map((b, i) => (
                  <motion.div key={i} className="rounded-xl border border-[rgba(248,113,113,.2)] bg-[rgba(248,113,113,.05)] p-3"
                    initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} transition={{ ...spring, delay: .35 + i * .1 }}>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--ink)]">
                      <SectorIcon sector={b.sector} size={13} /> {SECTOR_LABEL[b.sector]}
                      <span className="mono num ml-auto rounded-md bg-[rgba(248,113,113,.14)] px-1.5 py-0.5 text-[8.5px] font-bold tracking-wider text-[var(--sig-red)]">
                        {b.stressed_units}/{b.exposed_units} STRESSED
                      </span>
                    </div>
                    <p className="mt-1.5 text-[11px] leading-relaxed text-[var(--ink-dim)]">{b.text}</p>
                  </motion.div>
                ))}
              </div>
            </motion.section>
          )}

          <motion.section className="panel" style={{ borderStyle: 'dashed' }}
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: .4 }}>
            <div className="panel-head">Scenario simulator · demo</div>
            <div className="flex flex-wrap gap-2 p-3.5">
              {[
                { key: 'feed_spike', label: 'Feed-price spike', color: 'var(--sig-amber)', bg: 'rgba(251,191,36' },
                { key: 'monsoon_deficit', label: 'Monsoon deficit', color: 'var(--sig-blue)', bg: 'rgba(96,165,250' },
              ].map(s => (
                <motion.button key={s.key} disabled={!!busy}
                  whileHover={{ scale: 1.04 }} whileTap={{ scale: .95 }}
                  onClick={() => runShock(s.key, s.label)}
                  className="flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold transition-colors disabled:opacity-30"
                  style={{ color: s.color, borderColor: `${s.bg},.4)`, background: `${s.bg},.08)` }}>
                  <Icon.play size={11} /> {s.label}
                </motion.button>
              ))}
              <motion.button disabled={!!busy} whileHover={{ scale: 1.04 }} whileTap={{ scale: .95 }}
                onClick={runReset}
                className="flex items-center gap-1.5 rounded-xl border border-[var(--edge-lit)] bg-[var(--surface-2)] px-3.5 py-2 text-xs font-bold text-[var(--ink-dim)] transition-colors hover:text-[var(--ink)] disabled:opacity-30">
                <Icon.refresh size={11} /> Reset
              </motion.button>
            </div>
            {busy && (
              <div className="mono flex items-center gap-2 px-4 pb-3.5 text-[9px] uppercase tracking-[.2em] text-[var(--ink-faint)]">
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-[var(--edge)] border-t-[var(--lime)]" />
                {busy} — running cascade
              </div>
            )}
          </motion.section>
        </div>
      </div>
    </>
  )
}
