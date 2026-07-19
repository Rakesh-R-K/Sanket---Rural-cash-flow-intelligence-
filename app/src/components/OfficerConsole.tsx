import { useEffect, useState } from 'react'
import { api, type DistrictRisk, type EnterpriseRow } from '../lib/api'
import { RiskBadge, SECTOR_ICON, SECTOR_LABEL } from './shared'
import { EnterpriseProfile } from './EnterpriseProfile'

// SVG block-tile choropleth: offline by construction, no map library.
function DistrictMap({ d, onSelectBlock }: { d: DistrictRisk; onSelectBlock: (b: string | null) => void }) {
  const blocks = Object.entries(d.blocks)
  const color = (levels: Record<string, number>) =>
    levels.alert ? '#dc2626' : levels.warning ? '#f59e0b' : levels.watch ? '#fbbf24' : '#34d399'
  return (
    <div className="grid grid-cols-2 gap-2">
      {blocks.map(([name, b]) => {
        const total = Object.values(b.levels).reduce((a, c) => a + c, 0)
        const flagged = (b.levels.alert ?? 0) + (b.levels.warning ?? 0) + (b.levels.watch ?? 0)
        return (
          <button key={name} onClick={() => onSelectBlock(name)}
            className="rounded-lg border-2 p-3 text-left transition hover:scale-[1.02]"
            style={{ borderColor: color(b.levels), background: color(b.levels) + '18' }}>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm">{name}</span>
              <span className="h-3 w-3 rounded-full" style={{ background: color(b.levels) }} />
            </div>
            <div className="mt-1 text-xs text-gray-600">{flagged}/{total} flagged</div>
            <div className="mt-1 flex gap-1 text-xs">
              {Object.entries(b.sectors).filter(([, risks]) =>
                (risks.alert ?? 0) + (risks.warning ?? 0) > 0)
                .map(([s]) => <span key={s} title={SECTOR_LABEL[s]}>{SECTOR_ICON[s]}</span>)}
            </div>
          </button>
        )
      })}
    </div>
  )
}

function SignalTicker({ signals }: { signals: DistrictRisk['signals'] }) {
  if (!signals.length)
    return <div className="text-xs text-gray-500">No active market/climate signals</div>
  const label: Record<string, string> = {
    price_spike: 'price spike', price_crash: 'price crash',
    rain_deficit: 'monsoon deficit', rain_excess: 'excess rainfall',
  }
  return (
    <div className="space-y-1">
      {signals.map((s, i) => (
        <div key={i} className="flex items-center gap-2 rounded border border-red-200 bg-red-50 px-2 py-1 text-xs">
          <span className="font-semibold uppercase text-red-700">{s.commodity}</span>
          <span>{label[s.kind] ?? s.kind}</span>
          <span className="ml-auto font-mono text-red-600">z={s.magnitude_z}</span>
        </div>
      ))}
    </div>
  )
}

export function OfficerConsole() {
  const [rows, setRows] = useState<EnterpriseRow[]>([])
  const [district, setDistrict] = useState<DistrictRisk | null>(null)
  const [selected, setSelected] = useState<number | null>(null)
  const [blockFilter, setBlockFilter] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const refresh = async () => {
    const [r, d] = await Promise.all([api.enterprises(), api.district()])
    setRows(r); setDistrict(d)
  }
  useEffect(() => { void refresh() }, [])

  const runShock = async (key: string) => {
    setBusy(true)
    await api.shock(key)
    await refresh()
    setBusy(false)
  }
  const runReset = async () => {
    setBusy(true)
    await api.reset()
    await refresh()
    setSelected(null); setBusy(false)
  }

  if (selected !== null)
    return <EnterpriseProfile id={selected} onBack={() => { setSelected(null); void refresh() }} />

  const visible = blockFilter ? rows.filter(r => r.block === blockFilter) : rows

  return (
    <div className="mx-auto grid max-w-6xl gap-4 p-4 lg:grid-cols-[1fr_320px]">
      {/* triage list */}
      <div>
        <div className="mb-3 flex items-center gap-3">
          <h2 className="text-lg font-bold">Field Officer Console — Wardha</h2>
          {district && (
            <span className="text-sm text-gray-600">
              {district.kpis.total} enterprises · <b className="text-red-700">{district.kpis.alerts} alert</b> · <b className="text-amber-700">{district.kpis.warnings} warning</b>
            </span>
          )}
          {blockFilter && (
            <button className="rounded bg-gray-200 px-2 py-0.5 text-xs" onClick={() => setBlockFilter(null)}>
              {blockFilter} ✕
            </button>
          )}
        </div>
        <div className="space-y-2">
          {visible.map(e => (
            <button key={e.id} onClick={() => setSelected(e.id)}
              className="flex w-full items-center gap-3 rounded-lg border bg-white p-3 text-left shadow-sm transition hover:shadow">
              <span className="text-xl" aria-hidden>{SECTOR_ICON[e.sector]}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-semibold text-sm">{e.name}</span>
                  <RiskBadge risk={e.risk} small />
                </div>
                <div className="text-xs text-gray-500">{SECTOR_LABEL[e.sector]} · {e.village}, {e.block}</div>
                {e.top_reason && <div className="mt-0.5 truncate text-xs text-gray-700">→ {e.top_reason.text_en}</div>}
              </div>
              {e.reason_count > 0 && (
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold">{e.reason_count}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* right rail: cascade map + signals + scenario controls */}
      <div className="space-y-4">
        {district && (
          <>
            <section className="rounded-lg border bg-white p-3 shadow-sm">
              <h3 className="mb-2 text-sm font-bold">District Risk Map</h3>
              <DistrictMap d={district} onSelectBlock={setBlockFilter} />
            </section>
            <section className="rounded-lg border bg-white p-3 shadow-sm">
              <h3 className="mb-2 text-sm font-bold">Active Signals</h3>
              <SignalTicker signals={district.signals} />
            </section>
          </>
        )}
        <section className="rounded-lg border border-dashed border-gray-300 bg-white p-3 shadow-sm">
          <h3 className="mb-2 text-sm font-bold text-gray-600">Scenario Simulator <span className="font-normal">(demo)</span></h3>
          <div className="flex flex-wrap gap-2">
            <button disabled={busy} onClick={() => runShock('feed_spike')}
              className="rounded bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40">
              ▶ Feed-price spike
            </button>
            <button disabled={busy} onClick={() => runShock('monsoon_deficit')}
              className="rounded bg-sky-700 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40">
              ▶ Monsoon deficit
            </button>
            <button disabled={busy} onClick={runReset}
              className="rounded bg-gray-500 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40">
              ↺ Reset
            </button>
          </div>
          {busy && <div className="mt-2 text-xs text-gray-500">Running cascade…</div>}
        </section>
      </div>
    </div>
  )
}
