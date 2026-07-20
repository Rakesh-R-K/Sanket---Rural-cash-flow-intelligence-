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
      <header className="no-print sticky top-0 z-10 border-b border-stone-200/80 bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-green-800 text-white">
              <Icon.signal size={17} />
            </span>
            <div className="leading-tight">
              <div className="text-sm font-black tracking-wide text-green-900">
                संकेत <span className="text-stone-400">SANKET</span>
              </div>
              <div className="hidden text-[10px] text-stone-400 sm:block">
                Early-warning &amp; cash-flow intelligence · rural micro enterprises
              </div>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="flex rounded-full border border-stone-200 bg-stone-50 p-0.5 text-xs font-semibold">
              <button onClick={() => setRole('officer')}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-all ${role === 'officer' ? 'bg-green-800 text-white shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}>
                <Icon.users size={12} /> Field Officer
              </button>
              <button onClick={() => setRole('enterprise')}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-all ${role === 'enterprise' ? 'bg-green-800 text-white shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}>
                <Icon.home size={12} /> Enterprise
              </button>
            </div>
            <button onClick={() => setLang(lang === 'en' ? 'hi' : 'en')}
              className="rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-600 transition hover:border-green-700 hover:text-green-800">
              {lang === 'en' ? 'हिंदी' : 'EN'}
            </button>
          </div>
        </div>
      </header>
      <main className="py-3" key={role}>
        <div className="fade">
          {role === 'officer' ? <OfficerConsole /> : <EnterpriseApp />}
        </div>
      </main>
    </LangContext.Provider>
  )
}
