// Types mirror the FastAPI payloads (single source: /docs)
export type Risk = 'alert' | 'warning' | 'watch' | 'healthy'

export interface EnterpriseRow {
  id: number; name: string; sector: string; village: string; block: string
  district: string; members: number; risk: Risk; reason_count: number
  top_reason: { text_en: string; text_hi: string } | null
}

export interface Reason { code: string; text_en: string; text_hi: string }
export interface Suggestion { id: number; text_en: string; text_hi: string; action_status: string }
export interface Flag {
  id: number; level: Risk; opened_at: string; status: string
  reasons: Reason[]; suggestions: Suggestion[]
}
export interface MonthPoint { month: string; income: number; expense: number; savings: number; repayment: number; net: number }
export interface ForecastPoint { month: string; net: number; income: number; expense: number }
export interface Profile extends Omit<EnterpriseRow, 'risk' | 'reason_count' | 'top_reason'> {
  history: MonthPoint[]
  forecast: { points: ForecastPoint[]; band: { month: string; lo: number; hi: number }[]; model_tag: string } | null
  loan: { principal: number; outstanding: number; emi: number; lender: string } | null
  flags: Flag[]
  recent_transactions: { type: string; amount: number; note: string; entered_at: string; source: string }[]
  interventions: { officer_note: string; logged_at: string; outcome: string }[]
}
export interface Bulletin {
  sector: string; driver: string; z: number
  exposed_units: number; stressed_units: number; text: string
}
export interface DistrictRisk {
  district: string
  blocks: Record<string, { levels: Record<string, number>; sectors: Record<string, Record<string, number>> }>
  signals: { commodity: string; kind: string; magnitude_z: number; detected_at: string }[]
  kpis: { total: number; alerts: number; warnings: number }
  bulletins: Bulletin[]
}
export interface LeadTime {
  flags_with_projected_distress: number
  median_lead_days: number | null
  min_lead_days: number | null
  max_lead_days: number | null
  target_days: number
}

const BASE = '/api'

async function get<T>(path: string): Promise<T> {
  const r = await fetch(BASE + path)
  if (!r.ok) throw new Error(`${r.status} ${path}`)
  return r.json()
}

export const api = {
  enterprises: () => get<EnterpriseRow[]>('/enterprises'),
  profile: (id: number) => get<Profile>(`/enterprises/${id}`),
  district: (d = 'Wardha') => get<DistrictRisk>(`/risk/district/${d}`),
  leadtime: () => get<LeadTime>('/validation/leadtime'),
  saakh: (id: number) => get<Profile & { discipline: Record<string, number | string>; generated_at: string; disclaimer_en: string }>(`/saakh/${id}`),
  shock: (key: string) => fetch(`${BASE}/simulate/shock/${key}`, { method: 'POST' }).then(r => r.json()),
  reset: () => fetch(`${BASE}/admin/reset`, { method: 'POST' }).then(r => r.json()),
  intervene: (body: { enterprise_id: number; flag_id?: number; officer_note: string; outcome?: string }) =>
    fetch(`${BASE}/interventions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json()),
  suggestionDone: (id: number) => fetch(`${BASE}/suggestions/${id}/done`, { method: 'POST' }).then(r => r.json()),
  syncTxns: (txns: object[]) =>
    fetch(`${BASE}/transactions/batch`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(txns) }).then(r => r.json()),
}
