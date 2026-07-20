import { useRef, useState } from 'react'
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { LangContext, type Lang } from './lib/i18n'
import { Landing } from './components/Landing'
import { OfficerConsole } from './components/OfficerConsole'
import { EnterpriseApp } from './components/EnterpriseApp'
import { Icon } from './components/icons'

type View = 'landing' | 'officer' | 'enterprise'

/* 3D mouse-tilt stage for the phone */
function TiltStage({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const mx = useMotionValue(0.5), my = useMotionValue(0.5)
  const rX = useSpring(useTransform(my, [0, 1], [10, -10]), { stiffness: 150, damping: 20 })
  const rY = useSpring(useTransform(mx, [0, 1], [-12, 12]), { stiffness: 150, damping: 20 })
  return (
    <div ref={ref} style={{ perspective: 1400 }}
      onPointerMove={e => {
        const r = ref.current!.getBoundingClientRect()
        mx.set((e.clientX - r.left) / r.width); my.set((e.clientY - r.top) / r.height)
      }}
      onPointerLeave={() => { mx.set(.5); my.set(.5) }}>
      <motion.div style={{ rotateX: rX, rotateY: rY, transformStyle: 'preserve-3d' }}>
        {children}
      </motion.div>
    </div>
  )
}

/* Enterprise view = full-width showcase scene, not a lonely phone */
function EnterpriseScene() {
  return (
    <div className="mx-auto grid w-full max-w-[1500px] items-center gap-12 px-6 py-10 md:grid-cols-[1fr_minmax(380px,480px)] md:px-12">
      <div>
        <div className="kicker">The enterprise side</div>
        <h2 className="display mt-5 text-[clamp(2rem,4.5vw,3.6rem)] font-extrabold leading-[1.05] tracking-tight">
          Lakshmi's pocket officer,{' '}
          <span className="serif-accent font-normal text-[var(--lime)]">works without network.</span>
        </h2>
        <div className="mt-8 space-y-5">
          {[
            { icon: 'wifiOff' as const, t: 'Offline by construction', s: 'Entries save on the phone first, sync when the network returns. Try airplane mode.' },
            { icon: 'bell' as const, t: 'Alerts that explain themselves', s: 'Every warning carries reasons and a next step — in Hindi or English.' },
            { icon: 'report' as const, t: 'SAAKH on request', s: 'One tap compiles her record into a bank-ready dossier. Her data, her consent.' },
          ].map((f, i) => {
            const I = Icon[f.icon]
            return (
              <motion.div key={f.t} className="flex items-start gap-4"
                initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }}
                transition={{ duration: .6, delay: .15 + i * .12, ease: [.22, .8, .22, 1] }}>
                <span className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[var(--edge)] bg-[var(--surface)] text-[var(--lime)]">
                  <I size={17} />
                </span>
                <div>
                  <div className="text-sm font-bold">{f.t}</div>
                  <p className="mt-0.5 max-w-[46ch] text-xs leading-relaxed text-[var(--ink-dim)]">{f.s}</p>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
      <TiltStage><EnterpriseApp /></TiltStage>
    </div>
  )
}

export default function App() {
  const [view, setView] = useState<View>('landing')
  const [lang, setLang] = useState<Lang>('en')

  return (
    <LangContext.Provider value={{ lang, setLang }}>
      <div className="mesh" />
      <div className="grain" />

      {view !== 'landing' && (
        <header className="no-print sticky top-0 z-20 border-b border-[var(--edge)] bg-[rgba(11,11,9,.75)] backdrop-blur-xl">
          <div className="flex w-full items-center gap-4 px-5 py-3 md:px-8">
            <button onClick={() => setView('landing')} className="flex items-center gap-2.5">
              <span className="grid h-8 w-8 place-items-center rounded-full border border-[rgba(201,242,75,.4)] bg-[rgba(201,242,75,.07)] text-[var(--lime)]">
                <Icon.signal size={15} />
              </span>
              <span className="display text-sm font-bold tracking-tight">संकेत SANKET</span>
              <span className="mono ml-1 hidden text-[8px] uppercase tracking-[.25em] text-[var(--ink-faint)] md:block">← overview</span>
            </button>
            <div className="ml-auto flex items-center gap-2.5">
              <div className="relative flex rounded-full border border-[var(--edge)] bg-[var(--bg-2)] p-1 text-xs font-bold">
                {(['officer', 'enterprise'] as View[]).map(r => (
                  <button key={r} onClick={() => setView(r)}
                    className={`relative z-10 flex items-center gap-1.5 rounded-full px-3.5 py-1.5 transition-colors duration-300 ${view === r ? 'text-[#111]' : 'text-[var(--ink-faint)] hover:text-[var(--ink-dim)]'}`}>
                    {view === r && (
                      <motion.span layoutId="role-pill" className="absolute inset-0 -z-10 rounded-full bg-[var(--lime)]"
                        transition={{ type: 'spring', stiffness: 400, damping: 32 }} />
                    )}
                    {r === 'officer' ? <Icon.users size={12} /> : <Icon.home size={12} />}
                    {r === 'officer' ? 'Field Officer' : 'Enterprise'}
                  </button>
                ))}
              </div>
              <motion.button whileHover={{ scale: 1.06 }} whileTap={{ scale: .94 }}
                onClick={() => setLang(lang === 'en' ? 'hi' : 'en')}
                className="rounded-full border border-[var(--edge)] bg-[var(--bg-2)] px-3.5 py-1.5 text-xs font-bold text-[var(--ink-dim)] transition-colors hover:text-[var(--lime)]">
                {lang === 'en' ? 'हिंदी' : 'EN'}
              </motion.button>
            </div>
          </div>
        </header>
      )}

      <main className={view === 'landing' ? '' : 'pb-14 pt-1'}>
        <AnimatePresence mode="wait">
          <motion.div key={view}
            initial={{ opacity: 0, y: 28, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -20, filter: 'blur(8px)' }}
            transition={{ duration: .5, ease: [.22, .8, .22, 1] }}>
            {view === 'landing' && <Landing onEnter={setView} />}
            {view === 'officer' && <OfficerConsole />}
            {view === 'enterprise' && <EnterpriseScene />}
          </motion.div>
        </AnimatePresence>
      </main>
    </LangContext.Provider>
  )
}
