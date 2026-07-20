import { useState } from 'react'
import { LangContext, type Lang } from './lib/i18n'
import { OfficerConsole } from './components/OfficerConsole'
import { EnterpriseApp } from './components/EnterpriseApp'
import { Icon } from './components/icons'

type Role = 'officer' | 'enterprise'

export default function App() {
  const [role, setRole] = useState<Role>('officer')
  const [lang, setLang] = useState<Lang>('en')

  return (
    <LangContext.Provider value={{ lang, setLang }}>
      {/* ambient terminal layers */}
      <div className="terminal-bg" />
      <div className="terminal-grid" />

      <header className="no-print sticky top-0 z-20 border-b border-[var(--edge)] bg-[rgba(10,16,32,.82)] backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl border border-[rgba(45,212,160,.35)] bg-[rgba(45,212,160,.08)] text-[var(--sig-green)]"
              style={{ boxShadow: '0 0 18px -4px var(--sig-green-glow)', animation: 'floaty 4s ease-in-out infinite' }}>
              <Icon.signal size={18} />
            </span>
            <div className="leading-tight">
              <div className="text-sm font-black tracking-wide text-[var(--text)]">
                संकेत <span className="text-[var(--text-faint)]">SANKET</span>
              </div>
              <div className="mono hidden text-[9px] uppercase tracking-[.18em] text-[var(--text-faint)] sm:block">
                Rural cash-flow intelligence · early warning
              </div>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <div className="flex rounded-full border border-[var(--edge)] bg-[var(--deep)] p-0.5 text-xs font-bold">
              <button onClick={() => setRole('officer')}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-all ${role === 'officer'
                  ? 'bg-[rgba(45,212,160,.14)] text-[var(--sig-green)] shadow-[inset_0_0_0_1px_rgba(45,212,160,.35)]'
                  : 'text-[var(--text-faint)] hover:text-[var(--text-dim)]'}`}>
                <Icon.users size={12} /> Field Officer
              </button>
              <button onClick={() => setRole('enterprise')}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-all ${role === 'enterprise'
                  ? 'bg-[rgba(45,212,160,.14)] text-[var(--sig-green)] shadow-[inset_0_0_0_1px_rgba(45,212,160,.35)]'
                  : 'text-[var(--text-faint)] hover:text-[var(--text-dim)]'}`}>
                <Icon.home size={12} /> Enterprise
              </button>
            </div>
            <button onClick={() => setLang(lang === 'en' ? 'hi' : 'en')}
              className="rounded-full border border-[var(--edge)] bg-[var(--deep)] px-3 py-1.5 text-xs font-bold text-[var(--text-dim)] transition hover:border-[rgba(45,212,160,.4)] hover:text-[var(--sig-green)]">
              {lang === 'en' ? 'हिंदी' : 'EN'}
            </button>
          </div>
        </div>
      </header>

      <main className="pb-8 pt-3" key={role}>
        <div className="fade">
          {role === 'officer' ? <OfficerConsole /> : (
            <div className="px-4 pt-4"><EnterpriseApp /></div>
          )}
        </div>
      </main>
    </LangContext.Provider>
  )
}
