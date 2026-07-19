import { useEffect, useState } from 'react'
import { api, type Profile } from '../lib/api'
import { recordTxn, pendingCount, drainOutbox } from '../lib/offline'
import { useT } from '../lib/i18n'
import { fmtINR } from './shared'
import { SaakhReport } from './SaakhReport'

const LAKSHMI_ID = 1 // pinned protagonist (see simulator.py)

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
    <div className="space-y-3 p-4">
      {/* tap 1: what kind */}
      <div className="grid grid-cols-2 gap-2">
        {types.map(k => (
          <button key={k} onClick={() => setType(k)}
            className={`rounded-xl border-2 p-3 text-sm font-semibold ${type === k ? 'border-green-700 bg-green-50' : 'border-gray-200 bg-white'}`}>
            {k === 'income' ? '💰' : k === 'expense' ? '🛒' : k === 'savings' ? '🏦' : '📄'} {t(k)}
          </button>
        ))}
      </div>
      {/* tap 2: how much */}
      <input inputMode="numeric" value={amount} onChange={e => setAmount(e.target.value.replace(/\D/g, ''))}
        placeholder={t('amount')} className="w-full rounded-xl border-2 border-gray-200 p-3 text-lg" />
      <input value={note} onChange={e => setNote(e.target.value)} placeholder={t('note')}
        className="w-full rounded-xl border-2 border-gray-200 p-3 text-sm" />
      {/* tap 3: save */}
      <button onClick={save} className="w-full rounded-xl bg-green-800 p-3 text-lg font-bold text-white">
        {t('save')}
      </button>
      {msg && <div className="rounded-lg bg-emerald-50 p-2 text-center text-sm text-emerald-800">{msg}</div>}
    </div>
  )
}

function HealthCard({ p }: { p: Profile }) {
  const { t } = useT()
  const thisMonth = p.history[p.history.length - 1]
  const tight = p.forecast?.points.filter(pt => pt.net < 0) ?? []
  return (
    <div className="space-y-3 p-4">
      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <h3 className="text-sm font-bold text-gray-500">{t('healthCard')}</h3>
        <div className="mt-2 flex justify-between">
          <div>
            <div className="text-xs text-gray-500">{t('thisMonth')} · {t('in_')}</div>
            <div className="text-xl font-bold text-emerald-700">{fmtINR(thisMonth?.income ?? 0)}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-500">{t('thisMonth')} · {t('out')}</div>
            <div className="text-xl font-bold text-gray-700">{fmtINR((thisMonth?.expense ?? 0) + (thisMonth?.repayment ?? 0))}</div>
          </div>
        </div>
      </div>
      <div className={`rounded-2xl p-4 shadow-sm ${tight.length ? 'bg-amber-50 border border-amber-200' : 'bg-emerald-50 border border-emerald-200'}`}>
        <h3 className="text-sm font-bold">{t('nextMonths')}</h3>
        <p className="mt-1 text-sm">
          {tight.length
            ? `⚠ ${t('tightMonths')}: ${tight.map(m => m.month.slice(5)).join(', ')}`
            : `✓ ${t('looksSteady')}`}
        </p>
        {/* six-month strip: simple squares, readable at arm's length */}
        <div className="mt-2 flex gap-1">
          {p.forecast?.points.map(pt => (
            <div key={pt.month} className="flex-1 text-center">
              <div className={`h-8 rounded ${pt.net < 0 ? 'bg-amber-400' : 'bg-emerald-400'}`} />
              <div className="mt-0.5 text-[9px] text-gray-500">{pt.month.slice(5)}</div>
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
    return <div className="p-6 text-center text-sm text-gray-600">{t('noAlerts')}</div>
  return (
    <div className="space-y-3 p-4">
      {flags.map(f => (
        <div key={f.id} className="rounded-2xl border border-amber-200 bg-white p-4 shadow-sm">
          <div className="mb-2 flex items-center gap-2 text-sm font-bold text-amber-800">
            ⚠ {f.level.toUpperCase()}
          </div>
          <ul className="space-y-1 text-sm">
            {f.reasons.map((r, i) => <li key={i}>• {pick(r)}</li>)}
          </ul>
          {f.suggestions.length > 0 && (
            <div className="mt-3 border-t pt-2">
              <div className="mb-1 text-xs font-bold text-gray-500">{t('suggestions')}</div>
              {f.suggestions.map(s => (
                <div key={s.id} className="mb-2 flex items-start gap-2">
                  <p className="flex-1 text-sm">{pick(s)}</p>
                  {s.action_status === 'done'
                    ? <span className="text-xs text-emerald-700">✓</span>
                    : <button onClick={() => api.suggestionDone(s.id).then(onAction)}
                        className="shrink-0 rounded bg-emerald-700 px-2 py-1 text-xs font-semibold text-white">
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
    try { setP(await api.profile(LAKSHMI_ID)) } catch { /* offline: cached shell + last state */ }
    setPending(await pendingCount())
  }
  useEffect(() => { void load() }, [])
  useEffect(() => { if (online) void drainOutbox().then(load) }, [online])

  if (tab === 'saakh') return <SaakhReport id={LAKSHMI_ID} onBack={() => setTab('home')} />

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-md flex-col rounded-3xl border bg-[#fafaf5] shadow-lg">
      {/* status bar */}
      <div className="flex items-center justify-between rounded-t-3xl bg-green-800 px-4 py-3 text-white">
        <div>
          <div className="font-bold">{t('appName')} · {p?.name.split('(')[0] ?? ''}</div>
          <div className="text-[10px] opacity-80">{t('tagline')}</div>
        </div>
        <div className="text-right text-[10px]">
          <div className={`rounded-full px-2 py-0.5 font-semibold ${online ? 'bg-emerald-600' : 'bg-gray-600'}`}>
            {online ? t('online') : t('offline')}
          </div>
          {pending > 0 && <div className="mt-1 opacity-90">{pending} {t('pendingSync')}</div>}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {p ? (
          <>
            {tab === 'home' && <HealthCard p={p} />}
            {tab === 'entry' && <EntryForm onSaved={load} />}
            {tab === 'alerts' && <Alerts p={p} onAction={load} />}
            {tab === 'home' && (
              <div className="px-4 pb-4">
                <button onClick={() => setTab('saakh')}
                  className="w-full rounded-2xl border-2 border-green-800 bg-white p-3 text-left">
                  <div className="font-bold text-green-900">📄 {t('getSaakh')}</div>
                  <div className="text-xs text-gray-500">{t('saakhSub')}</div>
                </button>
              </div>
            )}
          </>
        ) : <div className="p-8 text-center text-sm text-gray-400">…</div>}
      </div>

      {/* bottom nav */}
      <nav className="grid grid-cols-3 border-t bg-white rounded-b-3xl">
        {(['home', 'entry', 'alerts'] as Tab[]).map(k => (
          <button key={k} onClick={() => setTab(k)}
            className={`py-3 text-xs font-semibold ${tab === k ? 'text-green-800' : 'text-gray-400'}`}>
            {k === 'home' ? '🏠' : k === 'entry' ? '➕' : '🔔'}<br />
            {t(k === 'entry' ? 'addEntry' : k === 'home' ? 'home' : 'alerts')}
            {k === 'alerts' && (p?.flags.length ?? 0) > 0 && <span className="ml-1 rounded-full bg-red-600 px-1.5 text-[9px] text-white">{p!.flags.length}</span>}
          </button>
        ))}
      </nav>
      <div className="pb-1 text-center text-[9px] text-gray-400">{lang === 'hi' ? 'संकेत — नाबार्ड हैकाथॉन' : 'Sanket — NABARD Hackathon'}</div>
    </div>
  )
}
