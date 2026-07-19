// Minimal i18n: static maps, no library needed at this scale.
// Reason/suggestion strings arrive bilingual from the API (text_en/text_hi);
// this file covers UI chrome only.
import { createContext, useContext } from 'react'

export type Lang = 'en' | 'hi'

const STRINGS = {
  en: {
    appName: 'Sanket',
    tagline: 'Early signals for your business',
    home: 'Home', addEntry: 'Add Entry', alerts: 'Alerts', saakh: 'My Saakh',
    income: 'Income', expense: 'Expense', savings: 'Savings', loan_repayment: 'Loan EMI',
    amount: 'Amount (₹)', note: 'Note (optional)', save: 'Save',
    savedOffline: 'Saved on your phone — will sync when network returns',
    savedOnline: 'Saved & synced',
    pendingSync: 'entries waiting to sync',
    healthCard: 'Business Health', nextMonths: 'Next 6 months',
    tightMonths: 'Tight months ahead', looksSteady: 'Cash flow looks steady',
    thisMonth: 'This month', in_: 'In', out: 'Out',
    suggestions: 'What you can do', markDone: 'Done ✓',
    getSaakh: 'Get my Saakh Report', saakhSub: 'Your cash-flow record, ready for the bank',
    offline: 'Offline', online: 'Online',
    noAlerts: 'No alerts right now. Keep entries regular — it builds your Saakh.',
  },
  hi: {
    appName: 'संकेत',
    tagline: 'आपके व्यवसाय के लिए शुरुआती संकेत',
    home: 'होम', addEntry: 'एंट्री जोड़ें', alerts: 'चेतावनी', saakh: 'मेरी साख',
    income: 'आय', expense: 'खर्च', savings: 'बचत', loan_repayment: 'ऋण EMI',
    amount: 'राशि (₹)', note: 'टिप्पणी (वैकल्पिक)', save: 'सहेजें',
    savedOffline: 'फ़ोन पर सहेजा गया — नेटवर्क आने पर सिंक होगा',
    savedOnline: 'सहेजा और सिंक हुआ',
    pendingSync: 'एंट्री सिंक की प्रतीक्षा में',
    healthCard: 'व्यवसाय की सेहत', nextMonths: 'अगले 6 महीने',
    tightMonths: 'आगे तंग महीने हैं', looksSteady: 'नकदी प्रवाह ठीक दिख रहा है',
    thisMonth: 'इस महीने', in_: 'आया', out: 'गया',
    suggestions: 'आप क्या कर सकते हैं', markDone: 'हो गया ✓',
    getSaakh: 'मेरी साख रिपोर्ट बनाएँ', saakhSub: 'बैंक के लिए तैयार, आपका नकदी-प्रवाह रिकॉर्ड',
    offline: 'ऑफ़लाइन', online: 'ऑनलाइन',
    noAlerts: 'अभी कोई चेतावनी नहीं। नियमित एंट्री करते रहें — इसी से साख बनती है।',
  },
} as const

export type StringKey = keyof typeof STRINGS.en

export const LangContext = createContext<{ lang: Lang; setLang: (l: Lang) => void }>({
  lang: 'en', setLang: () => {},
})

export function useT() {
  const { lang } = useContext(LangContext)
  return {
    lang,
    t: (k: StringKey) => STRINGS[lang][k],
    // bilingual API payloads: pick the right field
    pick: (obj: { text_en: string; text_hi: string }) => (lang === 'hi' ? obj.text_hi : obj.text_en),
  }
}
