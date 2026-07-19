// Offline layer: Dexie outbox. Entries are written locally FIRST (source of
// truth for the enterprise user), then drained to the API when online.
// This is the airplane-mode demo, by construction.
import Dexie, { type Table } from 'dexie'
import { api } from './api'

export interface LocalTxn {
  id?: number
  enterprise_id: number
  type: 'income' | 'expense' | 'savings' | 'loan_repayment'
  amount: number
  note: string
  entered_at: string
  source: 'manual'
  synced: 0 | 1
}

class SanketDB extends Dexie {
  outbox!: Table<LocalTxn, number>
  constructor() {
    super('sanket')
    this.version(1).stores({ outbox: '++id, synced, enterprise_id' })
  }
}

export const localdb = new SanketDB()

export async function recordTxn(t: Omit<LocalTxn, 'id' | 'synced' | 'source'>) {
  await localdb.outbox.add({ ...t, source: 'manual', synced: 0 })
  void drainOutbox() // fire-and-forget; fails silently offline
}

export async function pendingCount(): Promise<number> {
  return localdb.outbox.where('synced').equals(0).count()
}

export async function drainOutbox(): Promise<number> {
  const pending = await localdb.outbox.where('synced').equals(0).toArray()
  if (!pending.length || !navigator.onLine) return 0
  try {
    await api.syncTxns(pending.map(({ id, synced, ...t }) => t))
    await localdb.outbox.bulkUpdate(pending.map(p => ({ key: p.id!, changes: { synced: 1 as const } })))
    return pending.length
  } catch {
    return 0 // still offline or API down; retry on next 'online' event
  }
}

// auto-drain whenever connectivity returns
window.addEventListener('online', () => void drainOutbox())
