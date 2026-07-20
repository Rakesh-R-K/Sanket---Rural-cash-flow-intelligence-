// Cascade playback: when a shock is injected, the screen narrates the
// pipeline as a staged sequence driven by REAL response data from the API.
// This is the demo's money moment rendered as motion graphics.
import { useEffect, useState } from 'react'
import { Icon } from './icons'
import { SECTOR_LABEL } from './shared'

export interface CascadeResult {
  shock: string
  signals: { commodity: string; kind: string; magnitude_z: number }[]
  flagged: number
  enterprises: number
  by_level?: Record<string, number>
  by_sector?: Record<string, number>
}

const STEP_MS = 1100

export function CascadeOverlay({ result, onDone }: { result: CascadeResult; onDone: () => void }) {
  const [step, setStep] = useState(0)
  useEffect(() => {
    if (step > 4) { const t = setTimeout(onDone, 1400); return () => clearTimeout(t) }
    const t = setTimeout(() => setStep(s => s + 1), step === 0 ? 500 : STEP_MS)
    return () => clearTimeout(t)
  }, [step, onDone])

  const sig = result.signals[0]
  const sectors = Object.entries(result.by_sector ?? {}).sort((a, b) => b[1] - a[1])
  const levels = result.by_level ?? {}

  return (
    <div className="cascade-veil" onClick={onDone}>
      <div className="cascade-stage" onClick={e => e.stopPropagation()}>
        <div className="mono mb-4 flex items-center gap-2 text-[11px] uppercase tracking-[.2em] text-[var(--text-faint)]">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--sig-green)]" style={{ animation: 'blink 1s infinite' }} />
          Sanket cascade · live pipeline trace
        </div>

        {/* step 1: shock enters */}
        {step >= 1 && (
          <>
            <div className="cascade-step">
              <div className="cascade-node active bg-[rgba(251,191,36,.12)] text-[var(--sig-amber)]">
                <Icon.signal size={18} />
              </div>
              <div>
                <div className="text-sm font-bold text-[var(--text)]">Market shock enters the district</div>
                <div className="mono mt-0.5 text-xs text-[var(--text-dim)]">{result.shock}</div>
              </div>
            </div>
            {step >= 2 && <div className="cascade-connector" />}
          </>
        )}

        {/* step 2: signal detected */}
        {step >= 2 && sig && (
          <>
            <div className="cascade-step">
              <div className="cascade-node active bg-[rgba(251,95,95,.12)] text-[var(--sig-red)]">
                <Icon.alert size={18} />
              </div>
              <div className="flex-1">
                <div className="text-sm font-bold text-[var(--text)]">Statistical detector fires</div>
                <div className="mono mt-0.5 text-xs text-[var(--text-dim)]">
                  {sig.commodity.toUpperCase()} · {sig.kind.replace('_', ' ')} ·
                  <span className="ml-1 text-[var(--sig-red)]">z = {sig.magnitude_z}</span>
                  <span className="ml-2 text-[var(--text-faint)]">30-day mean vs trailing year</span>
                </div>
              </div>
            </div>
            {step >= 3 && <div className="cascade-connector" />}
          </>
        )}

        {/* step 3: exposure mapping */}
        {step >= 3 && (
          <>
            <div className="cascade-step">
              <div className="cascade-node active bg-[rgba(56,189,248,.12)] text-[var(--sig-blue)]">
                <Icon.map size={18} />
              </div>
              <div className="flex-1">
                <div className="text-sm font-bold text-[var(--text)]">Sector exposure mapped · forecasts re-run</div>
                <div className="mt-1.5 space-y-1">
                  {sectors.slice(0, 3).map(([s, n], i) => (
                    <div key={s} className="flex items-center gap-2">
                      <span className="mono w-28 text-[10px] uppercase tracking-wide text-[var(--text-dim)]">{SECTOR_LABEL[s]}</span>
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--edge)]">
                        <div className="h-full origin-left rounded-full bg-[var(--sig-blue)]"
                          style={{ width: `${(n / Math.max(...sectors.map(x => x[1]))) * 100}%`, animation: `barGrow .7s ${i * .15}s cubic-bezier(.2,.85,.25,1) both` }} />
                      </div>
                      <span className="mono num w-8 text-right text-xs text-[var(--text)]">{n}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {step >= 4 && <div className="cascade-connector" />}
          </>
        )}

        {/* step 4: flags raised */}
        {step >= 4 && (
          <div className="cascade-step" style={{ borderColor: 'rgba(251,95,95,.35)' }}>
            <div className="cascade-node active bg-[rgba(251,95,95,.15)] text-[var(--sig-red)]">
              <Icon.bell size={18} />
            </div>
            <div className="flex-1">
              <div className="text-sm font-bold text-[var(--text)]">
                {result.flagged} of {result.enterprises} enterprises flagged — every flag with reasons
              </div>
              <div className="mono mt-1.5 flex gap-4 text-xs">
                {(['alert', 'warning', 'watch'] as const).map(l => (
                  <span key={l} className={l === 'alert' ? 'text-[var(--sig-red)]' : l === 'warning' ? 'text-[var(--sig-amber)]' : 'text-[#fde047]'}>
                    {levels[l] ?? 0} {l}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {step >= 5 && (
          <div className="pop mt-5 text-center text-xs text-[var(--text-faint)]">
            Alerts queued for enterprises and field officer · tap anywhere to continue
          </div>
        )}
      </div>
    </div>
  )
}
