import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
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
      <div className="mesh" />
      <div className="grain" />

      <header className="no-print sticky top-0 z-20 border-b border-[var(--edge)] bg-[rgba(11,11,9,.75)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-5 py-3">
          <motion.div className="flex items-center gap-3"
            initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: .6, ease: [.2, .8, .2, 1] }}>
            <span className="relative grid h-9 w-9 place-items-center rounded-full border border-[rgba(201,242,75,.4)] bg-[rgba(201,242,75,.07)] text-[var(--lime)]"
              style={{ boxShadow: '0 0 24px -6px var(--lime-glow)' }}>
              <Icon.signal size={17} />
              <span className="absolute inset-0 rounded-full border border-[rgba(201,242,75,.25)]"
                style={{ animation: 'ripple 3s ease-out infinite' }} />
            </span>
            <div className="leading-none">
              <div className="display text-[15px] font-bold tracking-tight text-[var(--ink)]">
                संकेत <span className="text-[var(--ink-faint)]">SANKET</span>
              </div>
              <div className="mono mt-1 hidden text-[8.5px] uppercase tracking-[.3em] text-[var(--ink-faint)] sm:block">
                cash-flow intelligence · early warning
              </div>
            </div>
          </motion.div>

          <div className="ml-auto flex items-center gap-2.5">
            <div className="relative flex rounded-full border border-[var(--edge)] bg-[var(--bg-2)] p-1 text-xs font-bold">
              {(['officer', 'enterprise'] as Role[]).map(r => (
                <button key={r} onClick={() => setRole(r)}
                  className={`relative z-10 flex items-center gap-1.5 rounded-full px-3.5 py-1.5 transition-colors duration-300 ${role === r ? 'text-[#111]' : 'text-[var(--ink-faint)] hover:text-[var(--ink-dim)]'}`}>
                  {role === r && (
                    <motion.span layoutId="role-pill" className="absolute inset-0 -z-10 rounded-full bg-[var(--lime)]"
                      transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                      style={{ boxShadow: '0 0 20px -4px var(--lime-glow)' }} />
                  )}
                  {r === 'officer' ? <Icon.users size={12} /> : <Icon.home size={12} />}
                  {r === 'officer' ? 'Field Officer' : 'Enterprise'}
                </button>
              ))}
            </div>
            <motion.button whileHover={{ scale: 1.06 }} whileTap={{ scale: .94 }}
              onClick={() => setLang(lang === 'en' ? 'hi' : 'en')}
              className="rounded-full border border-[var(--edge)] bg-[var(--bg-2)] px-3.5 py-1.5 text-xs font-bold text-[var(--ink-dim)] transition-colors hover:border-[rgba(201,242,75,.4)] hover:text-[var(--lime)]">
              {lang === 'en' ? 'हिंदी' : 'EN'}
            </motion.button>
          </div>
        </div>
      </header>

      <main className="pb-12 pt-2">
        <AnimatePresence mode="wait">
          <motion.div key={role}
            initial={{ opacity: 0, y: 24, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -16, filter: 'blur(6px)' }}
            transition={{ duration: .45, ease: [.2, .8, .2, 1] }}>
            {role === 'officer' ? <OfficerConsole /> : (
              <div className="px-4 pt-6"><EnterpriseApp /></div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </LangContext.Provider>
  )
}
