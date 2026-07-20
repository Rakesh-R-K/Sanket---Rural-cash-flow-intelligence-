// Landing — the scroll experience. Reference patterns implemented for real:
// pinned step-sequencer (motion.page), parallax orbs + word reveals (ponder/
// refokus), giant count-up stat wall (qount), dual-direction marquee,
// 3D scroll-rotating SAAKH paper (studio-arde-style object moment).
import { useRef } from 'react'
import {
  motion, useInView, useScroll, useSpring, useTransform,
  useMotionValue, type MotionValue,
} from 'framer-motion'
import { Icon } from './icons'
import { useT, LangContext } from '../lib/i18n'
import { useContext } from 'react'

const EASE = [.22, .8, .22, 1] as const

/* ───────────────────────── shared bits ───────────────────────── */

function WordReveal({ text, className = '', delay = 0 }: { text: string; className?: string; delay?: number }) {
  return (
    <motion.span className={className} initial="off" whileInView="on" viewport={{ once: true, margin: '-10%' }}
      variants={{ on: { transition: { staggerChildren: .07, delayChildren: delay } } }}>
      {text.split(' ').map((w, i) => (
        <span key={i} className="inline-block overflow-hidden pb-[0.12em] -mb-[0.12em] align-bottom">
          <motion.span className="inline-block"
            variants={{ off: { y: '110%', rotate: 4 }, on: { y: 0, rotate: 0, transition: { duration: .7, ease: EASE } } }}>
            {w}&nbsp;
          </motion.span>
        </span>
      ))}
    </motion.span>
  )
}

function CountUp({ to, suffix = '', decimals = 0, className = '' }:
  { to: number; suffix?: string; decimals?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '-15%' })
  const mv = useMotionValue(0)
  const springy = useSpring(mv, { stiffness: 60, damping: 20 })
  if (inView) mv.set(to)
  return (
    <span ref={ref} className={`num ${className}`}>
      <motion.span>{useTransform(springy, v => v.toFixed(decimals))}</motion.span>{suffix}
    </span>
  )
}

function Orb({ progress, factor, className, size }:
  { progress: MotionValue<number>; factor: number; className: string; size: number }) {
  const y = useTransform(progress, [0, 1], [0, factor])
  return (
    <motion.div aria-hidden className={`pointer-events-none absolute rounded-full ${className}`}
      style={{ y, width: size, height: size, filter: 'blur(90px)' }} />
  )
}

/* ───────────────────────── sections ───────────────────────── */

interface NavCtl { theme: 'dark' | 'light'; setTheme: (t: 'dark' | 'light') => void }

function Hero({ onEnter, theme, setTheme }: { onEnter: (v: 'officer' | 'enterprise') => void } & NavCtl) {
  const { t, lang } = useT()
  const setLang = useContext(LangContext).setLang
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const fade = useTransform(scrollYProgress, [0, .8], [1, 0])
  const rise = useTransform(scrollYProgress, [0, 1], [0, -140])
  return (
    <section ref={ref} className="relative flex min-h-[100svh] flex-col overflow-hidden">
      <Orb progress={scrollYProgress} factor={220} size={520} className="left-[-8%] top-[8%] bg-[rgba(201,242,75,.16)]" />
      <Orb progress={scrollYProgress} factor={-160} size={420} className="right-[-6%] top-[30%] bg-[rgba(74,222,128,.12)]" />
      <Orb progress={scrollYProgress} factor={120} size={380} className="left-[35%] bottom-[-15%] bg-[rgba(96,165,250,.1)]" />

      {/* landing nav */}
      <nav className="z-10 flex items-center justify-between px-6 py-5 md:px-12">
        <motion.div className="flex items-center gap-2.5" initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .7, ease: EASE }}>
          <span className="grid h-9 w-9 place-items-center rounded-full border border-[var(--accent-border)] bg-[var(--accent-soft)] text-[var(--lime)]">
            <Icon.signal size={16} />
          </span>
          <span className="display text-sm font-bold tracking-tight">संकेत SANKET</span>
        </motion.div>
        <motion.div className="flex items-center gap-2" initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .7, delay: .1, ease: EASE }}>
          <button onClick={() => setLang(lang === 'en' ? 'hi' : 'en')}
            className="rounded-full border border-[var(--edge)] bg-[var(--surface)] px-3.5 py-2 text-xs font-bold text-[var(--ink-dim)] transition-colors hover:text-[var(--lime)]">
            {lang === 'en' ? 'हिंदी' : 'EN'}
          </button>
          <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label="toggle theme"
            className="grid h-8 w-8 place-items-center rounded-full border border-[var(--edge)] bg-[var(--surface)] text-[var(--ink-dim)] transition-colors hover:text-[var(--lime)]">
            {theme === 'dark' ? <Icon.sun size={14} /> : <Icon.moon size={14} />}
          </button>
          <button onClick={() => onEnter('officer')}
            className="rounded-full bg-[var(--accent-btn)] px-5 py-2.5 text-xs font-bold text-[var(--on-accent)] transition-transform hover:scale-105 active:scale-95"
            style={{ boxShadow: '0 0 30px -8px var(--lime-glow)' }}>
            {t('lLaunch')}
          </button>
        </motion.div>
      </nav>

      {/* hero copy */}
      <motion.div style={{ opacity: fade, y: rise }} className="z-10 flex flex-1 flex-col justify-center px-6 md:px-12">
        <motion.div className="kicker" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: .3 }}>
          {t('lKicker')}
        </motion.div>
        <h1 className="display mt-6 max-w-[13ch] text-[clamp(3rem,9.5vw,8.5rem)] font-extrabold leading-[.98] tracking-tight">
          <WordReveal key={lang + 1} text={t('lHero1')} delay={.35} />
          <br />
          <WordReveal key={lang + 2} text={t('lHero2')} delay={.55} />
          <span className="serif-accent font-normal text-[var(--lime)]" style={{ textShadow: '0 0 50px var(--lime-glow)' }}>
            <WordReveal key={lang + 3} text={' ' + t('lHero3')} delay={.75} />
          </span>
        </h1>
        <motion.p className="mt-8 max-w-xl text-base leading-relaxed text-[var(--ink-dim)] md:text-lg"
          initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .8, delay: 1, ease: EASE }}>
          {t('lSub')}
        </motion.p>
        <motion.div className="mt-10 flex flex-wrap gap-3"
          initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .8, delay: 1.15, ease: EASE }}>
          <button onClick={() => onEnter('officer')}
            className="group flex items-center gap-2 rounded-full bg-[var(--ink)] px-6 py-3.5 text-sm font-bold text-[var(--on-accent)] transition-transform hover:scale-[1.04] active:scale-95">
            <Icon.users size={15} /> {t('lCtaOfficer')}
            <span className="transition-transform group-hover:translate-x-1"><Icon.arrowRight size={15} /></span>
          </button>
          <button onClick={() => onEnter('enterprise')}
            className="group flex items-center gap-2 rounded-full border border-[var(--edge-lit)] bg-[var(--surface)] px-6 py-3.5 text-sm font-bold text-[var(--ink)] transition-all hover:border-[var(--accent-border)] hover:scale-[1.04] active:scale-95">
            <Icon.home size={15} /> {t('lCtaEnterprise')}
          </button>
        </motion.div>
      </motion.div>

      {/* scroll cue */}
      <motion.div className="z-10 flex justify-center pb-8"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.8 }}>
        <motion.div className="mono flex flex-col items-center gap-2 text-[9px] uppercase tracking-[.3em] text-[var(--ink-faint)]"
          animate={{ y: [0, 8, 0] }} transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}>
          {t('lScroll')}
          <span className="block h-8 w-px bg-gradient-to-b from-[var(--lime)] to-transparent" />
        </motion.div>
      </motion.div>
    </section>
  )
}

function MarqueeBand() {
  const rows = [
    ['1.9% NPA — RURAL INDIA REPAYS', '46% OF SHGs UNSEEN BY BANKS', '45-DAY EARLY WARNING', '168 ENTERPRISES · 4 DISTRICTS'],
    ['DAIRY · POULTRY · FOOD PROCESSING · HANDICRAFTS · RETAIL', 'OFFLINE-FIRST', 'हिंदी + ENGLISH', 'AGMARKNET LIVE · IMD CALIBRATED', 'NO BLACK BOXES'],
  ]
  return (
    <section className="border-y border-[var(--edge)] py-6">
      {rows.map((row, r) => (
        <div key={r} className={`marquee ${r ? 'mt-4' : ''}`}>
          <div className="marquee-track display text-2xl font-bold tracking-tight md:text-4xl"
            style={{ animationDirection: r ? 'reverse' : 'normal', animationDuration: r ? '36s' : '30s' }}>
            {[...row, ...row].map((t, i) => (
              <span key={i} className={`flex items-center gap-8 ${i % 2 ? 'text-[var(--ink-faint)]' : 'text-[var(--ink)]'}`}>
                {t}<span className="h-2 w-2 rounded-full bg-[var(--accent-btn)]" style={{ opacity: .6 }} />
              </span>
            ))}
          </div>
        </div>
      ))}
    </section>
  )
}

function StatWall() {
  const { t, lang } = useT()
  const stats = [
    { v: 1.9, d: 1, suffix: '%', label: t('lStat1'), tone: 'var(--lime)' },
    { v: 46, d: 0, suffix: '%', label: t('lStat2'), tone: 'var(--ink)' },
    { v: 8, d: 0, suffix: '/10', label: t('lStat3'), tone: 'var(--ink)' },
  ]
  return (
    <section className="px-6 py-28 md:px-12 md:py-40">
      <div className="kicker">{t('lStatKicker')}</div>
      <h2 className="display mt-6 max-w-[16ch] text-[clamp(2rem,5vw,4.2rem)] font-extrabold leading-[1.04] tracking-tight">
        <WordReveal key={lang + "sw"} text={t('lStatHl1')} />
        <span className="serif-accent font-normal text-[var(--lime)]"><WordReveal key={lang + "sw2"} text={t('lStatHl2')} delay={.3} /></span>
      </h2>
      <div className="mt-20 grid gap-12 md:grid-cols-3 md:gap-8">
        {stats.map((s, i) => (
          <motion.div key={i} className="border-t border-[var(--edge)] pt-8"
            initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-10%' }} transition={{ duration: .8, delay: i * .15, ease: EASE }}>
            <div className="display text-[clamp(4rem,8vw,7rem)] font-extrabold leading-none tracking-tight" style={{ color: s.tone }}>
              <CountUp to={s.v} decimals={s.d} suffix={s.suffix} />
            </div>
            <p className="mt-4 max-w-[28ch] text-sm leading-relaxed text-[var(--ink-dim)]">{s.label}</p>
          </motion.div>
        ))}
      </div>
    </section>
  )
}

/* pinned scroll sequencer — the motion.page pattern */
const STEPS = [
  { icon: 'signal', title: 'Predict', body: '3–6-month cash-flow forecasts, one model per sector\'s real economics — 10-day milk cycles, 42-day broiler batches, festival demand.', color: 'var(--lime)' },
  { icon: 'alert', title: 'Detect', body: 'Statistical detectors watch real mandi prices and rainfall. A maize spike in the district registers before it reaches anyone\'s ledger.', color: 'var(--sig-amber)' },
  { icon: 'map', title: 'Cascade', body: 'One district signal maps through sector exposure onto every enterprise — poultry at 65% feed cost, dairy at 35%. Every flag explains itself.', color: 'var(--sig-red)' },
  { icon: 'report', title: 'Prove', body: 'Months of tracked discipline compile into SAAKH — a bank-legible dossier the enterprise generates at her own request. Grants → credit.', color: 'var(--sig-green)' },
] as const

function PinnedSteps() {
  const { t } = useT()
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] })
  return (
    <section ref={ref} className="relative" style={{ height: `${(STEPS.length + 1) * 100}vh` }}>
      <div className="sticky top-0 flex h-[100svh] flex-col justify-center overflow-hidden px-6 md:px-12">
        <div className="kicker">{t('lHowKicker')}</div>
        <div className="mt-4 grid items-center gap-10 md:grid-cols-[1fr_1.2fr]">
          {/* step index rail */}
          <div className="space-y-5">
            {STEPS.map((s, i) => (
              <StepRow key={s.title} step={s} index={i} progress={scrollYProgress} />
            ))}
          </div>
          {/* big active number */}
          <div className="relative hidden h-[420px] md:block">
            {STEPS.map((s, i) => (
              <StepArt key={s.title} step={s} index={i} progress={scrollYProgress} />
            ))}
          </div>
        </div>
        {/* progress bar */}
        <div className="mt-10 h-px w-full bg-[var(--edge)]">
          <motion.div className="h-full origin-left bg-[var(--accent-btn)]" style={{ scaleX: scrollYProgress, boxShadow: '0 0 12px var(--lime-glow)' }} />
        </div>
      </div>
    </section>
  )
}

/* scroll segment with offsets clamped to [0,1] and strictly increasing —
   Chrome's ScrollTimeline rejects anything outside that contract */
function seg(index: number, n: number, spread: number): [number, number, number] {
  const mid = (index + .5) / n
  const lo = Math.max(0, mid - spread)
  const hi = Math.min(1, mid + spread)
  const m = Math.min(Math.max(mid, lo + 1e-3), hi - 1e-3)
  return [lo, m, hi]
}

function StepRow({ step, index, progress }: { step: typeof STEPS[number]; index: number; progress: MotionValue<number> }) {
  const n = STEPS.length
  const active = useTransform(progress, seg(index, n, .5 / n), [0, 1, index === n - 1 ? 1 : 0])
  const opacity = useTransform(active, [0, 1], [.25, 1])
  const x = useTransform(active, [0, 1], [0, 18])
  const I = Icon[step.icon]
  return (
    <motion.div style={{ opacity, x }} className="flex items-start gap-4">
      <span className="mt-1 grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-[var(--edge)] bg-[var(--surface)]" style={{ color: step.color }}>
        <I size={19} />
      </span>
      <div>
        <div className="display text-xl font-bold tracking-tight md:text-2xl">
          <span className="mono mr-2 text-xs text-[var(--ink-faint)]">0{index + 1}</span>{step.title}
        </div>
        <p className="mt-1 max-w-[52ch] text-sm leading-relaxed text-[var(--ink-dim)]">{step.body}</p>
      </div>
    </motion.div>
  )
}

function StepArt({ step, index, progress }: { step: typeof STEPS[number]; index: number; progress: MotionValue<number> }) {
  const n = STEPS.length
  const active = useTransform(progress, seg(index, n, .55 / n), [0, 1, index === n - 1 ? 1 : 0])
  const scale = useTransform(active, [0, 1], [.8, 1])
  const rotate = useTransform(active, [0, 1], [8, 0])
  const I = Icon[step.icon]
  return (
    <motion.div className="absolute inset-0 grid place-items-center" style={{ opacity: active, scale, rotate }}>
      <div className="relative grid h-72 w-72 place-items-center rounded-[2.5rem] border border-[var(--edge)] bg-[var(--surface)]"
        style={{ boxShadow: `0 0 120px -40px ${step.color}` }}>
        <span style={{ color: step.color }}><I size={110} strokeWidth={1.1} /></span>
        <span className="display absolute -right-5 -top-8 text-[7rem] font-extrabold leading-none text-[var(--ink)]" style={{ opacity: .08 }}>
          0{index + 1}
        </span>
        <span className="absolute inset-0 rounded-[2.5rem] border" style={{ borderColor: step.color, opacity: .25, animation: 'ripple 2.4s ease-out infinite' }} />
      </div>
    </motion.div>
  )
}

/* SAAKH — 3D scroll-rotating paper */
function SaakhShowcase() {
  const { t, lang } = useT()
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const rotateX = useTransform(scrollYProgress, [0, .5, 1], [38, 0, -12])
  const y = useTransform(scrollYProgress, [0, 1], [80, -80])
  return (
    <section ref={ref} className="grid items-center gap-14 overflow-hidden px-6 py-28 md:grid-cols-2 md:px-12 md:py-44">
      <div>
        <div className="kicker">{t('lSaakhKicker')}</div>
        <h2 className="display mt-6 text-[clamp(2rem,4.5vw,3.8rem)] font-extrabold leading-[1.05] tracking-tight">
          <WordReveal key={lang+"sa"} text={t('lSaakhHl1')} />
          <span className="serif-accent font-normal text-[var(--lime)]"><WordReveal key={lang+"sb"} text={t('lSaakhHl2')} delay={.25} /></span>
        </h2>
        <p className="mt-6 max-w-lg text-sm leading-relaxed text-[var(--ink-dim)] md:text-base">
          {t('lSaakhSub')}
        </p>
      </div>
      <div style={{ perspective: 1400 }} className="flex justify-center">
        <motion.div style={{ rotateX, y, transformStyle: 'preserve-3d' }}
          className="w-[min(400px,85vw)] rounded-xl bg-[#fffdf6] p-7 text-[#1c1917] shadow-[0_60px_120px_-40px_rgba(0,0,0,.9)]">
          <div className="flex items-start justify-between border-b-4 border-green-900 pb-3">
            <div>
              <div className="display text-xl font-extrabold text-green-900">SAAKH रिपोर्ट</div>
              <div className="text-[9px] text-stone-500">Cash-Flow Evidence Dossier</div>
            </div>
            <Icon.report size={22} className="text-green-900" />
          </div>
          <div className="mt-4 space-y-1 text-[11px]">
            <div className="font-bold">Gokul Dugdh SHG (Lakshmi Devi)</div>
            <div className="text-stone-500">Dairy · Pulgaon, Wardha · 12 members</div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 text-center">
            {[['96%', 'savings regularity'], ['96%', 'repayment record'], ['25', 'months tracked'], ['1', 'shock survived']].map(([v, l]) => (
              <div key={l} className="rounded-lg bg-green-50 py-2.5">
                <div className="display num text-lg font-extrabold text-green-900">{v}</div>
                <div className="text-[8px] text-stone-500">{l}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 border-t pt-2 text-[8px] leading-relaxed text-stone-400">
            Generated at the enterprise's request · an evidence dossier, not a credit score
          </div>
        </motion.div>
      </div>
    </section>
  )
}

function ClosingCTA({ onEnter }: { onEnter: (v: 'officer' | 'enterprise') => void }) {
  const { t, lang } = useT()
  return (
    <section className="px-6 pb-24 pt-10 md:px-12">
      <h2 className="display max-w-[16ch] text-[clamp(2.4rem,6vw,5rem)] font-extrabold leading-[1.02] tracking-tight">
        <WordReveal key={lang+"c1"} text={t('lClosing1')} />
        <span className="serif-accent font-normal text-[var(--lime)]" style={{ textShadow: '0 0 40px var(--lime-glow)' }}>
          <WordReveal key={lang+"c2"} text={t('lClosing2')} delay={.4} />
        </span>
      </h2>
      <div className="mt-16 grid gap-5 md:grid-cols-2">
        {[
          { v: 'officer' as const, icon: 'users' as const, title: t('lCtaOfficer'), sub: t('lCardOffSub') },
          { v: 'enterprise' as const, icon: 'home' as const, title: t('lCtaEnterprise'), sub: t('lCardEntSub') },
        ].map((c, i) => {
          const I = Icon[c.icon]
          return (
            <motion.button key={c.v} onClick={() => onEnter(c.v)}
              initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ duration: .7, delay: i * .12, ease: EASE }}
              whileHover={{ y: -8, transition: { type: 'spring', stiffness: 320, damping: 22 } }}
              className="panel panel-lit group flex items-center gap-5 p-8 text-left">
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[var(--accent-soft)] text-[var(--lime)]">
                <I size={24} />
              </span>
              <span className="flex-1">
                <span className="display block text-xl font-bold tracking-tight">{c.title}</span>
                <span className="mt-1 block text-xs text-[var(--ink-dim)]">{c.sub}</span>
              </span>
              <span className="text-[var(--ink-faint)] transition-all group-hover:translate-x-2 group-hover:text-[var(--lime)]">
                <Icon.arrowRight size={22} />
              </span>
            </motion.button>
          )
        })}
      </div>
      <div className="mono mt-20 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--edge)] pt-6 text-[9px] uppercase tracking-[.25em] text-[var(--ink-faint)]">
        <span>संकेत Sanket — NABARD Hackathon @ GFF 2026</span>
        <span>Sanket sees trouble early · Saakh proves reliability</span>
      </div>
    </section>
  )
}

export function Landing({ onEnter, theme, setTheme }: { onEnter: (v: 'officer' | 'enterprise') => void } & NavCtl) {
  return (
    <div className="relative">
      <Hero onEnter={onEnter} theme={theme} setTheme={setTheme} />
      <MarqueeBand />
      <StatWall />
      <PinnedSteps />
      <SaakhShowcase />
      <ClosingCTA onEnter={onEnter} />
    </div>
  )
}
