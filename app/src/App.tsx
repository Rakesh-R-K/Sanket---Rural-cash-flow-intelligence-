import { useState } from 'react'
import { LangContext, type Lang } from './lib/i18n'
import { OfficerConsole } from './components/OfficerConsole'
import { EnterpriseApp } from './components/EnterpriseApp'

type Role = 'officer' | 'enterprise'

export default function App() {
  const [role, setRole] = useState<Role>('officer')
  const [lang, setLang] = useState<Lang>('en')

  return (
    <LangContext.Provider value={{ lang, setLang }}>
      <header className="no-print sticky top-0 z-10 flex items-center gap-3 border-b bg-white/90 px-4 py-2 backdrop-blur">
        <span className="text-lg font-black text-green-900">संकेत SANKET</span>
        <span className="hidden text-xs text-gray-400 sm:inline">Early-warning & cash-flow intelligence for rural micro enterprises</span>
        <div className="ml-auto flex items-center gap-2">
          <div className="flex rounded-full border bg-gray-50 p-0.5 text-xs font-semibold">
            <button onClick={() => setRole('officer')}
              className={`rounded-full px-3 py-1 ${role === 'officer' ? 'bg-green-800 text-white' : 'text-gray-500'}`}>
              Field Officer
            </button>
            <button onClick={() => setRole('enterprise')}
              className={`rounded-full px-3 py-1 ${role === 'enterprise' ? 'bg-green-800 text-white' : 'text-gray-500'}`}>
              Enterprise (Lakshmi)
            </button>
          </div>
          <button onClick={() => setLang(lang === 'en' ? 'hi' : 'en')}
            className="rounded-full border px-3 py-1 text-xs font-semibold">
            {lang === 'en' ? 'हिंदी' : 'EN'}
          </button>
        </div>
      </header>
      <main className="py-2">
        {role === 'officer' ? <OfficerConsole /> : <EnterpriseApp />}
      </main>
    </LangContext.Provider>
  )
}
