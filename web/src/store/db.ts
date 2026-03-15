import { openDB } from 'idb'
import type { CaseBundle } from './types'

const DB_NAME = 'oralight-db'
const STORE = 'cases'

const dbp = openDB(DB_NAME, 2, {
  upgrade(db, oldVersion, newVersion, transaction) {
    if (!db.objectStoreNames.contains(STORE)) {
      const store = db.createObjectStore(STORE, { keyPath: 'id' })
      // Add index for sync_status to enable efficient filtering
      store.createIndex('sync_status', 'sync_status', { unique: false })
    } else if (oldVersion < 2) {
      // Migration from v1 to v2: add sync_status index
      const store = transaction.objectStore(STORE)
      if (!store.indexNames.contains('sync_status')) {
        store.createIndex('sync_status', 'sync_status', { unique: false })
      }
    }
  }
})

// --- AES-GCM helpers ---
async function getSalt(site: string, worker: string): Promise<ArrayBuffer> {
  const enc = new TextEncoder()
  // return the underlying ArrayBuffer
  return enc.encode(`oralight:${site}:${worker}:v1`).buffer
}

export async function deriveKey(site: string, worker: string): Promise<CryptoKey> {
  const enc = new TextEncoder()
  const base = enc.encode(`${site}|${worker}`)
  const salt = await getSalt(site, worker)
  const keyMaterial = await crypto.subtle.importKey('raw', base, 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 120000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  )
}

async function encryptBytes(key: CryptoKey, data: ArrayBuffer) {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data)
  return { iv: iv.buffer, ct } // both ArrayBuffers
}

async function decryptBytes(key: CryptoKey, iv: ArrayBuffer, ct: ArrayBuffer): Promise<ArrayBuffer> {
  return await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct)
}

export async function saveEncryptedCase(bundle: CaseBundle, key: CryptoKey) {
  // serialize meta + images + ml as a compact JSON
  const images = await Promise.all(
    bundle.images.map(async (im) => ({
      view: im.view,
      bytes: Array.from(new Uint8Array(await im.blob.arrayBuffer()))
    }))
  )
  const rawObj = { meta: bundle.meta, ml: bundle.ml, images }
  const raw = new TextEncoder().encode(JSON.stringify(rawObj))
  const { iv, ct } = await encryptBytes(key, raw.buffer)

  const db = await dbp
  await db.put(STORE, {
    id: bundle.meta.case_id,
    iv,
    ct,
    created_at: Date.now(),
    // Week 5: Store sync metadata
    sync_status: bundle.sync_status,
    sync_attempts: bundle.sync_attempts,
    last_sync_attempt: bundle.last_sync_attempt,
    server_case_id: bundle.server_case_id
  })
}

// --- Retrieval functions ---
export async function getAllCaseIds(): Promise<Array<{ id: string; created_at: number }>> {
  const db = await dbp
  const all = await db.getAll(STORE)
  return all.map(item => ({ id: item.id, created_at: item.created_at }))
}

export async function getEncryptedCase(caseId: string, key: CryptoKey): Promise<CaseBundle> {
  const db = await dbp
  const record = await db.get(STORE, caseId)
  if (!record) throw new Error(`Case ${caseId} not found`)

  const { iv, ct } = record
  const decrypted = await decryptBytes(key, iv, ct)
  const json = new TextDecoder().decode(decrypted)
  const obj = JSON.parse(json)

  // Reconstruct blobs from byte arrays
  const images = obj.images.map((im: any) => ({
    view: im.view,
    blob: new Blob([new Uint8Array(im.bytes)], { type: 'image/jpeg' })
  }))

  return {
    meta: obj.meta,
    images,
    ml: obj.ml,
    // Week 5: Restore sync metadata from IndexedDB record
    sync_status: record.sync_status || 'unsent',
    sync_attempts: record.sync_attempts || 0,
    last_sync_attempt: record.last_sync_attempt,
    server_case_id: record.server_case_id
  }
}

export async function deleteCase(caseId: string) {
  const db = await dbp
  await db.delete(STORE, caseId)
}

// --- Week 5: Sync management functions ---
export async function updateCaseSyncStatus(
  caseId: string,
  status: import('./types').SyncStatus,
  serverCaseId?: string
) {
  const db = await dbp
  const record = await db.get(STORE, caseId)
  if (!record) throw new Error(`Case ${caseId} not found`)

  record.sync_status = status
  record.sync_attempts = (record.sync_attempts || 0) + 1
  record.last_sync_attempt = new Date().toISOString()
  if (serverCaseId) {
    record.server_case_id = serverCaseId
  }

  await db.put(STORE, record)
}

export async function getUnsentCases(key: CryptoKey): Promise<Array<import('./types').CaseBundle>> {
  const db = await dbp
  const all = await db.getAll(STORE)

  // Filter for cases that are not successfully sent
  const unsent = all.filter(record => record.sync_status !== 'sent')

  // Decrypt and return bundles
  const bundles = await Promise.all(
    unsent.map(async (record) => {
      try {
        return await getEncryptedCase(record.id, key)
      } catch (e) {
        console.error(`Failed to decrypt case ${record.id}:`, e)
        return null
      }
    })
  )

  return bundles.filter(Boolean) as Array<import('./types').CaseBundle>
}

export async function getCasesByStatus(
  status: import('./types').SyncStatus,
  key: CryptoKey
): Promise<Array<import('./types').CaseBundle>> {
  const db = await dbp
  const all = await db.getAll(STORE)

  const filtered = all.filter(record => record.sync_status === status)

  const bundles = await Promise.all(
    filtered.map(async (record) => {
      try {
        return await getEncryptedCase(record.id, key)
      } catch (e) {
        console.error(`Failed to decrypt case ${record.id}:`, e)
        return null
      }
    })
  )

  return bundles.filter(Boolean) as Array<import('./types').CaseBundle>
}

