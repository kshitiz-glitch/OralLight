// src/services/sync.ts
/**
 * Week 5: Background sync service for Red/Amber cases
 * 
 * Handles automatic synchronization of high-priority cases using the
 * Background Sync API with fallback to manual sync for unsupported browsers.
 */

import type { CaseBundle } from '../store/types'
import { uploadCase, shouldSync } from '../api/upload'
import { updateCaseSyncStatus, getEncryptedCase, deriveKey } from '../store/db'

const SYNC_TAG = 'sync-cases'
const MAX_RETRY_ATTEMPTS = 5
const BASE_BACKOFF_MS = 1000 // 1 second

/**
 * Register a case for background sync
 * Falls back to immediate sync if Background Sync API is unavailable
 */
export async function registerSync(caseId: string): Promise<void> {
    if ('serviceWorker' in navigator && 'sync' in (self as any).registration) {
        try {
            const registration = await navigator.serviceWorker.ready
            await (registration as any).sync.register(SYNC_TAG)
            console.log(`[Sync] Registered background sync for case ${caseId}`)
        } catch (error) {
            console.warn('[Sync] Background Sync registration failed, falling back to immediate sync:', error)
            // Fallback: try to sync immediately
            await syncCase(caseId)
        }
    } else {
        console.warn('[Sync] Background Sync API not available, syncing immediately')
        await syncCase(caseId)
    }
}

/**
 * Sync a single case with retry logic and exponential backoff
 */
export async function syncCase(caseId: string): Promise<boolean> {
    try {
        // Retrieve the case bundle
        const key = await deriveKey('DEMO_SITE', 'DEMO_WORKER')
        const bundle = await getEncryptedCase(caseId, key)

        // Check if case should be synced
        if (!shouldSync(bundle)) {
            console.log(`[Sync] Case ${caseId} is ${bundle.ml.decision}, skipping sync`)
            return false
        }

        // Check if already sent
        if (bundle.sync_status === 'sent') {
            console.log(`[Sync] Case ${caseId} already sent, skipping`)
            return true
        }

        // Check retry limit
        if (bundle.sync_attempts >= MAX_RETRY_ATTEMPTS) {
            console.error(`[Sync] Case ${caseId} exceeded max retry attempts (${MAX_RETRY_ATTEMPTS})`)
            await updateCaseSyncStatus(caseId, 'failed')
            return false
        }

        // Update status to pending
        await updateCaseSyncStatus(caseId, 'pending')

        // Attempt upload
        console.log(`[Sync] Uploading case ${caseId} (attempt ${bundle.sync_attempts + 1}/${MAX_RETRY_ATTEMPTS})`)
        const response = await uploadCase(bundle)

        if (response.success) {
            // Success - update status
            await updateCaseSyncStatus(caseId, 'sent', response.server_case_id)
            console.log(`[Sync] ✓ Case ${caseId} synced successfully. Server ID: ${response.server_case_id}`)
            return true
        } else {
            // Failed - apply exponential backoff and retry
            const backoffMs = calculateBackoff(bundle.sync_attempts)
            console.warn(`[Sync] ✗ Upload failed for case ${caseId}: ${response.error}`)
            console.log(`[Sync] Retrying in ${backoffMs}ms...`)

            await new Promise(resolve => setTimeout(resolve, backoffMs))

            // Update status back to unsent for retry
            await updateCaseSyncStatus(caseId, 'unsent')

            // Recursive retry
            return await syncCase(caseId)
        }
    } catch (error) {
        console.error(`[Sync] Error syncing case ${caseId}:`, error)
        await updateCaseSyncStatus(caseId, 'failed')
        return false
    }
}

/**
 * Sync all pending cases (unsent + failed)
 * Used by service worker sync event and manual "Sync All" button
 */
export async function syncAllPending(): Promise<{ success: number; failed: number }> {
    try {
        const key = await deriveKey('DEMO_SITE', 'DEMO_WORKER')
        const { getUnsentCases } = await import('../store/db')
        const unsentCases = await getUnsentCases(key)

        console.log(`[Sync] Found ${unsentCases.length} unsent cases`)

        let success = 0
        let failed = 0

        for (const bundle of unsentCases) {
            if (shouldSync(bundle)) {
                const result = await syncCase(bundle.meta.case_id)
                if (result) {
                    success++
                } else {
                    failed++
                }
            }
        }

        console.log(`[Sync] Sync complete: ${success} succeeded, ${failed} failed`)
        return { success, failed }
    } catch (error) {
        console.error('[Sync] Error in syncAllPending:', error)
        return { success: 0, failed: 0 }
    }
}

/**
 * Calculate exponential backoff delay
 * 1s, 2s, 4s, 8s, 16s (capped at 16s)
 */
function calculateBackoff(attemptNumber: number): number {
    const backoff = BASE_BACKOFF_MS * Math.pow(2, attemptNumber)
    return Math.min(backoff, 16000) // Cap at 16 seconds
}

/**
 * Check if Background Sync API is supported
 */
export function isBackgroundSyncSupported(): boolean {
    return 'serviceWorker' in navigator && 'sync' in (self as any).registration
}
