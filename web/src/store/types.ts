export type QCResult = { blurVar: number; glarePct: number }
export type Decision = 'green' | 'amber' | 'red'
export type SyncStatus = 'unsent' | 'pending' | 'sent' | 'failed'

export type CaseMeta = {
  case_id: string
  created_at: number
  decision: Decision
  probability: number
  uncertainty: number
  // Week 6: Consent tracking
  consent_obtained: boolean
  consent_timestamp?: string
  participant_id?: string
  site_id: string
  worker_id: string
  device_hash: string
  capture_ts: string
  view_set: string[]
  qc_summary: QCResult
  // Week-2 additions:
  wb_gains?: [number, number, number]
  gamma?: number
}

export type CaseImage = { view: 'front' | 'left' | 'right' | string; blob: Blob }

export type CaseBundle = {
  meta: CaseMeta
  images: CaseImage[]
  ml: { p_suspicious: number; decision: Decision }
  // Week 5: Sync metadata
  sync_status: SyncStatus
  sync_attempts: number
  last_sync_attempt?: string  // ISO timestamp
  server_case_id?: string      // ID returned from server after successful upload
}
