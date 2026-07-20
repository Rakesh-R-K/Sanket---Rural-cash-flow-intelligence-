import { useEffect, useState } from 'react'
import { api, type Profile } from '../lib/api'
import { recordTxn, pendingCount, drainOutbox } from '../lib/offline'
import { useT } from '../lib/i18n'
import { fmtINR } from './shared'
import { Icon } from './icons'
import { SaakhReport } from './SaakhReport'

const LAKSHMI_ID = 1

type Tab = 'home' | 'entry' | 'alerts' | 'saakh'

function useOnline() {
  const [online, setOnline] = useState(navigator.onLine)
  useEffect(() => {
    const up = () => setOnline(true), down = () => setOnline(false)
    window.addEventListener('online', up); window.addEventListener('offline', down)
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', down) }
  }, [])
  return online
}

const TYPE_ICON = { income: Icon.income, expense: Icon.expense, savings: Icon.savings, loan_repayment: Icon.loan } as const

function EntryForm({ onSaved }: { onSaved: () => void }) {
  const { t } = useT()
  const online = useOnline()
  const [type, setType] = useState<'income' | 'expense' | 'savings' | 'loan_repayment'>('income')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [msg, setMsg] = useState('')

  const save = async () => {
    const n = Number(amount)
    if (!n || n <= 0) return
    await recordTxn({
      enterprise_id: LAKSHMI_ID, type, amount: n, note,
      entered_at: new Date().toISOString().slice(0, 10),
    })
    setAmount(''); setNote('')
    setMsg(online ? t('savedOnline') : t('savedOffline'))
    setTimeout(() => setMsg(''), 3500)
    onSaved()
  }

  const types = ['income', 'expense', 'savings', 'loan_repayment'] as const
  return (
    <div className="stagger space-y-3 p-4">
      <div className="grid grid-cols-2 gap-2">
        {types.map(k => {
          const I = TYPE_ICON[k]
          return (
            <button key={k} onClick={() => setType(k)}
              className={`flex items-center gap-2 rounded-xl border-2 p-3 text-sm font-semibold transition-all active:scale-95 ${type === k ? 'border-[var(--p-good)] bg-[var(--p-good-soft)] text-[var(--p-ink)]' : 'border-[var(--p-edge)] bg-[var(--p-card)] text-[var(--p-ink)]'}`}>
              <I size={16} className={type === k ? 'text-[var(--p-good)]' : 'text-[var(--p-dim)]'} />
              {t(k)}
            </button>
          )
        })}
      </div>
      <input inputMode="numeric" value={amount} onChange={e => setAmount(e.target.value.replace(/\D/g, ''))}
        placeholder={t('amount')}
        className="num w-full rounded-xl border-2 border-[var(--p-edge)] p-3 text-lg outline-none transition focus:border-[var(--p-good)]" />
      <input value={note} onChange={e => setNote(e.target.value)} placeholder={t('note')}
        className="w-full rounded-xl border-2 border-[var(--p-edge)] p-3 text-sm outline-none transition focus:border-[var(--p-good)]" />
      <button onClick={save}
        className="w-full rounded-xl bg-[var(--p-good)] p-3.5 text-lg font-bold text-white shadow-md transition hover:bg-green-900 active:scale-[.98]">
        {t('save')}
      </button>
      {msg && (
        <div className="fade flex items-center justify-center gap-2 rounded-lg bg-[var(--p-good-soft)] p-2.5 text-sm text-[var(--p-good)]">
          <Icon.check size={14} /> {msg}
        </div>
      )}
    </div>
  )
}

function HealthCard({ p }: { p: Profile }) {
  const { t } = useT()
  const thisMonth = p.history[p.history.length - 1]
  const tight = p.forecast?.points.filter(pt => pt.net < 0) ?? []
  return (
    <div className="stagger space-y-3 p-4">
      <div className="day-card p-4">
        <div className="day-title">{t('healthCard')}</div>
        <div className="mt-2 flex justify-between">
          <div>
            <div className="flex items-center gap-1 text-xs text-[var(--p-dim)]">
              <Icon.income size={11} className="text-[var(--p-good)]" /> {t('thisMonth')} · {t('in_')}
            </div>
            <div className="num text-2xl font-bold text-[var(--p-good)]">{fmtINR(thisMonth?.income ?? 0)}</div>
          </div>
          <div className="text-right">
            <div className="flex items-center justify-end gap-1 text-xs text-[var(--p-dim)]">
              <Icon.expense size={11} /> {t('thisMonth')} · {t('out')}
            </div>
            <div className="num text-2xl font-bold text-[var(--p-ink)]">
              {fmtINR((thisMonth?.expense ?? 0) + (thisMonth?.repayment ?? 0))}
            </div>
          </div>
        </div>
      </div>

      <div className={`day-card p-4 ${tight.length ? '!border-[var(--p-warn-border)] !bg-[var(--p-warn-soft)]' : '!border-[var(--accent-border)] !bg-[var(--p-good-soft)]/60'}`}>
        <div className="day-title">{t('nextMonths')}</div>
        <p className="mt-1.5 flex items-center gap-1.5 text-sm font-medium">
          {tight.length
            ? <><Icon.warning size={15} className="text-[var(--p-warn)]" /> {t('tightMonths')}: {tight.map(m => m.month.slice(5)).join(', ')}</>
            : <><Icon.healthy size={15} className="text-[var(--p-good)]" /> {t('looksSteady')}</>}
        </p>
        <div className="mt-3 flex gap-1.5">
          {p.forecast?.points.map((pt, i) => (
            <div key={pt.month} className="flex-1 text-center">
              <div className={`rise h-9 rounded-md ${pt.net < 0 ? 'bg-[var(--p-warn)]' : 'bg-[var(--p-good)]'}`}
                style={{ animationDelay: `${i * 60}ms` }} />
              <div className="mt-1 text-[9px] text-[var(--p-dim)]">{pt.month.slice(5)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function Alerts({ p, onAction }: { p: Profile; onAction: () => void }) {
  const { t, pick } = useT()
  const flags = p.flags
  if (!flags.length)
    return (
      <div className="flex flex-col items-center gap-2 p-8 text-center text-sm text-[var(--p-dim)]">
        <Icon.healthy size={28} className="text-[var(--p-good)]" />
        {t('noAlerts')}
      </div>
    )
  return (
    <div className="stagger space-y-3 p-4">
      {flags.map(f => (
        <div key={f.id} className="day-card !border-[var(--p-warn-border)] p-4">
          <div className="mb-2 flex items-center gap-1.5 text-sm font-bold text-[var(--p-warn)]">
            <Icon.warning size={15} /> {f.level.toUpperCase()}
          </div>
          <ul className="space-y-1.5 text-sm text-[var(--p-ink)]">
            {f.reasons.map((r, i) => (
              <li key={i} className="flex gap-1.5">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[var(--p-warn)]" />
                {pick(r)}
              </li>
            ))}
          </ul>
          {f.suggestions.length > 0 && (
            <div className="mt-3 border-t border-[var(--p-edge)] pt-2.5">
              <div className="day-title mb-1.5">{t('suggestions')}</div>
              {f.suggestions.map(s => (
                <div key={s.id} className="mb-2 flex items-start gap-2 last:mb-0">
                  <p className="flex-1 text-sm text-[var(--p-ink)]">{pick(s)}</p>
                  {s.action_status === 'done'
                    ? <Icon.check size={15} className="mt-0.5 shrink-0 text-[var(--p-good)]" />
                    : <button onClick={() => api.suggestionDone(s.id).then(onAction)}
                        className="shrink-0 rounded-md bg-[var(--p-good)] px-2.5 py-1 text-xs font-semibold text-white transition hover:opacity-90 active:scale-95">
                        {t('markDone')}
                      </button>}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

export function EnterpriseApp() {
  const { t, lang } = useT()
  const online = useOnline()
  const [tab, setTab] = useState<Tab>('home')
  const [p, setP] = useState<Profile | null>(null)
  const [pending, setPending] = useState(0)

  const load = async () => {
    try { setP(await api.profile(LAKSHMI_ID)) } catch { /* offline: cached shell */ }
    setPending(await pendingCount())
  }
  useEffect(() => { void load() }, [])
  useEffect(() => { if (online) void drainOutbox().then(load) }, [online])

  if (tab === 'saakh') return <SaakhReport id={LAKSHMI_ID} onBack={() => setTab('home')} />

  const NAV: { key: Tab; icon: keyof typeof Icon; label: string }[] = [
    { key: 'home', icon: 'home', label: t('home') },
    { key: 'entry', icon: 'plus', label: t('addEntry') },
    { key: 'alerts', icon: 'bell', label: t('alerts') },
  ]

  return (
    <div className="phone-frame">
      <div className="phone-notch" />
      {/* status bar */}
      <div className="flex items-center justify-between bg-gradient-to-r from-green-900 to-green-800 px-5 pb-3 pt-10 text-white">
        <div>
          <div className="font-bold leading-tight">{t('appName')}</div>
          <div className="text-[10px] opacity-70">{p?.name.split('(')[0].trim() ?? t('tagline')}</div>
        </div>
        <div className="text-right">
          <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ${online ? 'bg-emerald-600/80' : 'bg-stone-600/80'}`}>
            {online ? <Icon.wifi size={11} /> : <Icon.wifiOff size={11} />}
            {online ? t('online') : t('offline')}
          </div>
          {pending > 0 && (
            <div className="num mt-1 text-[10px] opacity-90">{pending} {t('pendingSync')}</div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto" key={tab}>
        {p ? (
          <>
            {tab === 'home' && (
              <>
                <HealthCard p={p} />
                <div className="px-4 pb-4">
                  <button onClick={() => setTab('saakh')}
                    className="day-card day-card-hover flex w-full items-center gap-3 p-3.5 text-left">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--p-good-soft)] text-[var(--p-good)]">
                      <Icon.report size={18} />
                    </span>
                    <div className="flex-1">
                      <div className="text-sm font-bold text-[var(--p-good)]">{t('getSaakh')}</div>
                      <div className="text-xs text-[var(--p-dim)]">{t('saakhSub')}</div>
                    </div>
                    <Icon.arrowRight size={16} className="text-[var(--p-faint)]" />
                  </button>
                </div>
              </>
            )}
            {tab === 'entry' && <EntryForm onSaved={load} />}
            {tab === 'alerts' && <Alerts p={p} onAction={load} />}
          </>
        ) : (
          <div className="space-y-3 p-4">
            <div className="skeleton h-24" /><div className="skeleton h-32" />
          </div>
        )}
      </div>

      {/* bottom nav */}
      <nav className="grid grid-cols-3 border-t border-[var(--p-edge)] bg-[var(--p-card)]">
        {NAV.map(({ key, icon, label }) => {
          const I = Icon[icon]
          const active = tab === key
          const badge = key === 'alerts' ? (p?.flags.length ?? 0) : 0
          return (
            <button key={key} onClick={() => setTab(key)}
              className={`relative flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-semibold transition ${active ? 'text-[var(--p-good)]' : 'text-[var(--p-dim)] hover:text-[var(--p-dim)]'}`}>
              <span className={`grid h-7 w-12 place-items-center rounded-full transition ${active ? 'bg-[var(--p-good-soft)]' : ''}`}>
                <I size={17} />
              </span>
              {label}
              {badge > 0 && (
                <span className="num absolute right-[calc(50%-22px)] top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-red-600 px-1 text-[9px] font-bold text-white">
                  {badge}
                </span>
              )}
            </button>
          )
        })}
      </nav>
      <div className="bg-[var(--p-card)] pb-1.5 text-center text-[9px] text-[var(--p-faint)]">
        {lang === 'hi' ? 'संकेत — नाबार्ड हैकाथॉन' : 'Sanket — NABARD Hackathon'}
      </div>
    </div>
  )
}
