// Cascade playback: when a shock is injected, the screen narrates the
// pipeline as a staged sequence driven by REAL response data from the API.
// This is the demo's money moment rendered as motion graphics.
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
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
    <motion.div className="cascade-veil" onClick={onDone}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="cascade-stage" onClick={e => e.stopPropagation()}>
        <div className="mb-5">
          <div className="kicker">Live pipeline trace</div>
          <div className="display mt-2 text-2xl font-bold text-[var(--ink)]">
            The cascade, <span className="serif-accent text-[var(--lime)]">as it happens.</span>
          </div>
        </div>

        {/* step 1: shock enters */}
        {step >= 1 && (
          <>
            <motion.div className="cascade-step" initial={{ opacity: 0, x: -28, filter: 'blur(6px)' }}
              animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
              transition={{ type: 'spring', stiffness: 260, damping: 26 }}>
              <div className="cascade-node active bg-[var(--amber-soft)] text-[var(--sig-amber)]">
                <Icon.signal size={18} />
              </div>
              <div>
                <div className="text-sm font-bold text-[var(--text)]">Market shock enters the district</div>
                <div className="mono mt-0.5 text-xs text-[var(--text-dim)]">{result.shock}</div>
              </div>
            </motion.div>
            {step >= 2 && <div className="cascade-connector" />}
          </>
        )}

        {/* step 2: signal detected */}
        {step >= 2 && sig && (
          <>
            <motion.div className="cascade-step" initial={{ opacity: 0, x: -28, filter: 'blur(6px)' }}
              animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
              transition={{ type: 'spring', stiffness: 260, damping: 26 }}>
              <div className="cascade-node active bg-[var(--red-soft)] text-[var(--sig-red)]">
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
            </motion.div>
            {step >= 3 && <div className="cascade-connector" />}
          </>
        )}

        {/* step 3: exposure mapping */}
        {step >= 3 && (
          <>
            <motion.div className="cascade-step" initial={{ opacity: 0, x: -28, filter: 'blur(6px)' }}
              animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
              transition={{ type: 'spring', stiffness: 260, damping: 26 }}>
              <div className="cascade-node active bg-[var(--blue-soft)] text-[var(--sig-blue)]">
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
            </motion.div>
            {step >= 4 && <div className="cascade-connector" />}
          </>
        )}

        {/* step 4: flags raised */}
        {step >= 4 && (
          <motion.div className="cascade-step" style={{ borderColor: 'var(--red-border)' }}
            initial={{ opacity: 0, x: -28, filter: 'blur(6px)' }}
            animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}>
            <div className="cascade-node active bg-[var(--red-soft)] text-[var(--sig-red)]">
              <Icon.bell size={18} />
            </div>
            <div className="flex-1">
              <div className="text-sm font-bold text-[var(--text)]">
                {result.flagged} of {result.enterprises} enterprises flagged — every flag with reasons
              </div>
              <div className="mono mt-1.5 flex gap-4 text-xs">
                {(['alert', 'warning', 'watch'] as const).map(l => (
                  <span key={l} className={l === 'alert' ? 'text-[var(--sig-red)]' : l === 'warning' ? 'text-[var(--sig-amber)]' : 'text-[var(--watch)]'}>
                    {levels[l] ?? 0} {l}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {step >= 5 && (
          <div className="fade mt-5 text-center text-xs text-[var(--text-faint)]">
            Alerts queued for enterprises and field officer · tap anywhere to continue
          </div>
        )}
      </div>
    </motion.div>
  )
}
